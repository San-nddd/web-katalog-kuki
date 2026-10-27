# Modul Inventaris: Produksi, Mutasi, Opname, dan Laporan

## Tujuan dan status nyata
Mencatat produksi, perubahan stok, hitung fisik, dan ringkasan pergerakan inventaris. Modul **ADA** pada source yang diperiksa. Tes integritas khusus dan hasil role/API end-to-end belum terbukti; jangan menganggap fitur telah lulus hanya karena route ada.

## Alur inti
```text
Admin mencatat produksi / melakukan koreksi / menyelesaikan opname
  -> service React -> route Laravel + Gate Admin
  -> perubahan stok dalam transaksi jika operasi membukukan stok
  -> MutasiStok sebagai riwayat perubahan

Admin/Owner membuka ringkasan
  -> GET /api/management/laporan-inventaris
  -> agregasi stok terkini + mutasi periode + informasi produksi/opname
  -> frontend menampilkan; ekspor Excel/PDF/cetak memakai data server
```

## Route dan akses yang terlihat
| Method | Path | Akses pada deklarasi route |
|---|---|---|
| GET/POST | `/api/admin/produksi-harian` | `auth:sanctum` + `can:manage-admin` |
| POST | `/api/admin/produksi-harian/{produksiHarian}/konfirmasi-cetak` | Admin |
| GET | `/api/admin/mutasi-stok` | `auth:sanctum` + `can:view-management-dashboard` |
| POST | `/api/admin/mutasi-stok/koreksi` | `auth:sanctum` + `can:manage-admin` |
| GET | `/api/admin/opname-stok`, detail, ringkasan pengeluaran | Admin/Owner via Gate Management |
| POST/PUT | `/api/admin/opname-stok` dan detail/update/finalisasi/pembatalan/pengeluaran | Admin |
| GET | `/api/management/laporan-inventaris` | Admin/Owner via Gate Management |
| GET | `/api/management/laporan-inventaris/export` | Admin/Owner; CSV stream |

Implementasi UI/service di `web-katalog/src/pages/admin/` dan `src/services/{produksiHarianService,mutasiStokService,opnameStokService,laporanInventarisService,laporanInventarisExportService}.js`. Controller terkait: `ProduksiHarianController`, `MutasiStokController`, `StockOpnameController`, `LaporanInventarisController`.

## Invarians yang tampak pada source
- Koreksi stok memakai `DB::transaction` dan `lockForUpdate`; klien wajib mengirim stok sebelumnya, dan server menolak jika stok sudah berubah atau target sama.
- Stock opname dibuat sebagai draft dengan snapshot stok sistem. Menyimpan hasil hitung fisik **belum** mengubah stok. Finalisasi menolak draft yang belum lengkap atau snapshot yang sudah stale; kemudian transaksi menulis stok dan satu mutasi untuk setiap produk yang berubah. Draft dapat dibatalkan tanpa perubahan stok.
- Pengeluaran rusak/kedaluwarsa memeriksa stok sebelumnya dan jumlah tidak boleh melampaui stok tersedia; perubahan stok dan mutasi disimpan bersama dalam transaksi.
- Laporan memakai mutasi sebagai sumber total masuk/keluar; produksi ditampilkan sebagai informasi tersendiri agar tidak dihitung ganda.
- Filter laporan menggunakan tanggal `Y-m-d`, default 30 hari menurut waktu Asia/Jakarta, maksimum rentang 366 hari. Agregasi tanggal produksi memakai `whereDate` untuk membandingkan hari kalender dengan aman; ini penting karena SQLite test menyimpan nilai date cast sebagai timestamp tengah malam. API ringkasan menampilkan hingga 100 mutasi terbaru; ekspor CSV melakukan streaming.
- Frontend membuat file Excel/PDF serta tampilan cetak berdasarkan CSV server dan ringkasan API. Impor lembar “Usulan Koreksi” hanya memeriksa/pratinjau; teks UI menyatakan tidak ada perubahan stok/riwayat sampai Admin menjalankan koreksi resmi. Server juga mengamankan nilai CSV yang diawali karakter formula spreadsheet.

## Contoh tes dummy
Produk `Croissant Uji` dengan stok sistem `8`, stok fisik `6`:
1. Buat draft opname untuk ID produk lokal uji.
2. Simpan stok fisik `6`; stok sistem seharusnya tetap `8` sebelum finalisasi.
3. Finalisasi; ekspektasi source: stok menjadi `6` dan satu mutasi opname merekam perubahan `-2`.

Contoh di atas adalah skenario yang dapat diuji, bukan hasil tes yang dijalankan pada task ini.

## Tes dan keterbatasan
- `php artisan test`: **PASS**, 49 tests / 259 assertions setelah keputusan QA owner. Migration metadata diuji pada SQLite in-memory; tidak dijalankan terhadap production.
- `tests/Feature/InventoryLedgerConsistencyTest.php`: **3 test / 24 assertions PASS**. Menguji satu mutasi produksi, agregat produksi summary/harian/CSV, finalisasi opname satu kali, dan penolakan snapshot stale. Akar masalah awal: raw SQLite menunjukkan `tanggal_produksi = YYYY-MM-DD 00:00:00`; `whereBetween` dengan batas akhir `YYYY-MM-DD` mengecualikan nilai tengah malam itu. Agregasi total dan harian kini memakai batas `whereDate`.
- `tests/Feature/ProdukApiTest.php`: **7 tests / 29 assertions PASS**; penghapusan produk yang memiliki mutasi ledger ditolak dengan 409 dan produk serta mutasi koreksi tetap tersimpan.
- `npm run build`: **PASS**; `npm run lint`: **FAIL** (global baseline).
- Tidak ada operasi database test khusus inventaris atau browser test yang dijalankan dalam P0-005.
- Hindari menjalankan migration/seed atau mengubah catatan historis. Perbaikan stok harus melalui mekanisme resmi yang diaudit, bukan edit Excel.

### Validasi ekspor P0-003 (fixture lokal, 2026-10-26)
- Service ekspor dijalankan lewat Node/Vite SSR dengan CSV, token, DOM unduhan, dan window cetak dummy yang dibuat di memori; tidak memakai browser production atau data nyata.
- Parser CSV **PASS** untuk delimiter titik-koma dalam nilai dan tanda kutip ganda yang di-escape.
- Excel **PASS**: file XLSX berhasil dimuat kembali menggunakan ExcelJS dan memiliki sheet `Ringkasan`, `Riwayat Mutasi`, dan `Usulan Koreksi`.
- PDF menghasilkan blob ber-header `%PDF-` dan memasukkan gambar logo. Warning AutoTable awalnya menyebut 16 unit lebar tidak terpakai; setelah approval owner, kolom Keterangan berubah dari 57 menjadi 73 mm agar jumlah lebar tabel tepat 273 mm (A4 landscape setelah margin kiri/kanan 12 mm).
- Cetak **PASS parsial**: fungsi menghasilkan HTML berisi baris fixture dan meng-escape tanda kutip sebagai `&quot;`; dialog printer tidak dibuka.
- Owner mengonfirmasi pada 2026-10-26 bahwa logo perlu dipakai. Service menanam aset existing `web-katalog/src/assets/Kuki.png` pada tiap sheet XLSX, header setiap halaman PDF, dan halaman cetak. Aset asli tidak diubah atau diduplikasi; halaman cetak menunggu logo selesai dimuat sebelum memanggil print.
- Tes fixture lanjutan: workbook XLSX dibuka kembali dan memverifikasi satu gambar pada masing-masing tiga sheet; PDF tetap memiliki signature `%PDF-` dan objek gambar PNG; HTML cetak memuat data URI logo dan memanggil fungsi print. `npm run build` dan ESLint service ekspor PASS.
- PDF dummy satu baris dan 45 baris menghasilkan satu dan lima halaman, memuat logo, dan tidak lagi mencetak warning AutoTable. Render Chrome multipage menunjukkan logo/header lanjutan serta tabel di dalam batas halaman. Printer fisik/dialog cetak sungguhan dan data produksi NOT_RUN.
- `KUKI-P0-003` ditandai DONE untuk kriteria validasi dummy: parser CSV, struktur 3 sheet XLSX + gambar per sheet, PDF dengan gambar + render visual satu/lima halaman tanpa warning, serta HTML print berisi logo dan memanggil print dalam harness. Data produksi/printer belum terverifikasi.

### Uji akses endpoint P0-002
- `tests/Feature/LaporanInventarisAccessTest.php`: 3 test / 28 assertions PASS. Role `admin` dan `owner` mendapat 200 untuk summary serta ekspor CSV; guest mendapat 401; role `customer` mendapat 403; format tanggal tidak valid mendapat 422; path yang tidak terdaftar mendapat 404.
- Selama tes route ekspor tanpa autentikasi, header `Accept: text/csv, application/json` membuat middleware mencoba redirect ke route `login` yang tidak tersedia (500). Kedua downloader CSV kini memakai urutan `Accept: application/json, text/csv` agar kegagalan auth dikenali Laravel sebagai request JSON dan mengembalikan 401. Guard Sanctum/Gate server tidak diubah.
- `npm run build`: PASS; ESLint untuk dua service yang berubah: PASS; suite backend penuh tidak dijalankan ulang dan baseline sebelumnya tetap FAIL.

## Risiko / catatan scope
- Tautan `/management/laporan-penjualan` ada di `ManagementLayout.jsx`, tetapi route React tersebut tidak terdaftar di `App.jsx` yang diperiksa. Laporan bisnis tidak diaudit atau diimplementasikan dalam task ini.
- Keberadaan transaksi/locking pada source belum membuktikan behavior database production; engine/konkurensi memerlukan test terarah.

**Sumber:** `routes/api.php`, empat controller inventaris di atas, `AppServiceProvider.php`, halaman/service Admin dan Management.  
**TASK-ID:** `KUKI-P0-005` — 2026-10-26.
