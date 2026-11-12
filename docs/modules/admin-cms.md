# Modul Admin CMS dan Management

## Tujuan dan status nyata
CMS mengelola produk, kategori, produksi harian, testimonial/komentar, dan percakapan yang dialihkan ke Admin. Area Management menyediakan ringkasan serta pembacaan inventaris. Modul **ADA**; tidak semua route atau role telah tervalidasi end-to-end.

## Alur autentikasi dan hak akses
```text
LoginPage -> authService.login()
  -> POST /api/auth/login
  -> Laravel membuat token Sanctum untuk Admin/Owner
  -> api.js menyimpan token dan user di localStorage
  -> Protected React page
  -> Laravel auth:sanctum + Gate (otorisasi server)
```

`AdminRoute.jsx` memeriksa sesi/role tersimpan untuk navigasi UI. `ManagementRoute.jsx` meminta ulang `/api/auth/user`; ini membantu UX, tetapi bukan pengganti pemeriksaan backend. `AppServiceProvider` mendefinisikan `manage-admin`, `manage-testimonials`, dan `view-management-dashboard`. `User::roleForAuthorization()` memetakan role legacy `manager` ke `admin`.

## Permukaan yang ditemukan
| Bagian | React | Endpoint backend terdaftar |
|---|---|---|
| Produk | `/admin/produk`, form baru/edit | POST/PUT/DELETE `/api/produk`, POST `/api/produk/{id}/gambar` |
| Kategori | `/admin/kategori` | CRUD `/api/kategori`, POST `/api/kategori/{id}/gambar` |
| Produksi | `/admin/produksi-harian` | GET/POST `/api/admin/produksi-harian`, POST konfirmasi cetak |
| Testimonial | `/admin/testimonial` | `/api/admin/testimonial` dan `/komentar` (moderasi, foto, kelola) |
| Chat pelanggan | `/admin/chat` | `/api/admin/obrolan` (daftar, detail, pesan, balas, ambil, selesai, baca) |
| Management | `/management/dashboard`, laporan inventaris/penjualan, opname/mutasi | `/api/management/*`, sebagian GET `/api/admin/*` dengan Gate baca Management |

Sumber halaman/service berada di `web-katalog/src/pages/admin/` dan `src/services/`. Route serta middleware ada di `backend-web-katalog/routes/api.php`; implementasi izin ada di `app/Providers/AppServiceProvider.php` dan `app/Models/User.php`.

## Identitas Admin
Sidebar Admin dan Management menampilkan logo `web-katalog/src/assets/Kuki.png` melalui import asset pada `AdminLayout.jsx` dan `ManagementLayout.jsx`. Ukuran 44×44 menggunakan `object-fit: contain`, tanpa bingkai pada gambar/wrapper. Teks brand dan susunan navigasi dipertahankan.

Styling Admin, Management, dan Login dipusatkan di `web-katalog/src/pages/admin/admin.css`; aturan responsive dan tema refined diletakkan setelah style dasarnya agar urutan cascade yang dipakai tetap konsisten.

## Batas role teramati
- Login backend menerima role terotorisasi `admin` dan `owner`; token dibuat via Sanctum.
- `manage-admin` dan `manage-testimonials` meminta Admin; `view-management-dashboard` menerima Admin/Owner hasil normalisasi role.
- Route tulis produk, produksi, mutasi koreksi, opname, chat, dan push berada di area autentikasi Admin. Owner diberikan pembacaan untuk beberapa route Management/inventaris; jangan menyimpulkan semua route memiliki matriks sama tanpa uji.
- Contoh tes dummy: akun `owner@example.test` dengan password factory `password`; hanya untuk database tes.

## Temuan baseline yang relevan
- Owner memutuskan mempertahankan kompatibilitas role saat ini: `manager` lama dinormalisasi menjadi `admin`; akun tanpa kolom/nilai role ditolak. Test `AdminAuthTest` dan `ManagementDashboardTest` diselaraskan dengan kontrak ini tanpa mengubah auth/controller/Gate.
- Moderasi testimonial/komentar saat ini publik langsung. Owner memilih mempertahankan perilaku tersebut. Hook model menetapkan testimonial `published` dan komentar `approved`; tes submission, daftar publik, dan komentar kini memverifikasi hasil yang sama.
- Produk yang sudah memiliki riwayat mutasi stok tidak dapat dihapus melalui endpoint dan menerima 409. Owner menyetujui perlindungan ledger; test kini memastikan produk dan riwayatnya tetap ada.
- Migration additive nullable `metadata_ai` menyelaraskan schema dengan model/form/Assistant. Migration ini belum dijalankan terhadap database production.
- `php artisan test`: **PASS**, 49 tes / 259 assertions. Pengujian menggunakan SQLite in-memory.
- Route laporan penjualan sebelumnya belum terdaftar di React walaupun menu Management sudah menautkannya. `KUKI-FIN-002` menambahkan halaman `/management/laporan-penjualan` (serta route CMS Admin) dan API read-only `/api/management/laporan-penjualan`.

## Laporan penjualan
```text
Management/Admin
  -> LaporanPenjualanPage.jsx
  -> laporanPenjualanService.js
  -> GET /api/management/laporan-penjualan[ /export ]
  -> LaporanPenjualanController
  -> pos_transaksi + relasi pos_pegawai
```

- Backend memaksa `auth:sanctum` dan Gate `view-management-dashboard` (Admin/Owner); frontend route memakai guard yang sesuai.
- Filter tanggal membaca `dibayar_pada`, maksimal 93 hari; laporan menampilkan total, jumlah dan rata-rata transaksi, agregat metode pembayaran, serta rincian 30 transaksi per halaman.
- Batas tanggal dihitung sebagai hari kalender Asia/Jakarta lalu dikonversi ke UTC, sesuai `config/app.php` dan timestamp POS; laporan Management dan endpoint `/api/pos/report` memakai batas yang sama.
- Ekspor CSV memakai periode yang sama. Halaman tidak memakai angka mock; periode kosong menampilkan hasil agregat nol dan tabel kosong dari query database.
- Batas keputusan: angka adalah total transaksi tersimpan, bukan laba/HPP; laporan ini tidak mengubah, membatalkan, atau menghapus transaksi. Aturan HPP, akuntansi dan refund masih menunggu DEC-FIN-001.
- Tes fitur dibuat di `tests/Feature/LaporanPenjualanAccessTest.php`. Pada 2026-11-12, runner PHPUnit SQLite terhalang migration lokal yang hanya mendukung MySQL. Query agregat, filter tanggal, pagination, dan CSV diuji terpisah memakai schema SQLite in-memory; middleware route diperiksa dengan `route:list -v`.

## Tes dan keterbatasan
- `php artisan route:list --except-vendor`: **PASS**, 67 route terdaftar; ini hanya bukti pendaftaran route.
- `php artisan test`: **PASS**, exit 0; 49 tes / 259 assertions pada SQLite in-memory.
- `ProdukApiTest.php`: memastikan delete produk yang sudah ber-ledger memberi 409, mempertahankan produk dan mutasi koreksi.
- Build frontend **PASS**; lint frontend **FAIL** sesuai baseline.
- Tidak ada smoke test browser atau uji role baru pada P0-005.

## Risiko / pembelajaran teknis
Menyembunyikan route di React bukan perlindungan data. Setiap endpoint privat tetap harus menegakkan autentikasi dan Gate di Laravel. Token disimpan di localStorage oleh alur frontend yang ada; perubahan kebijakan atau penyimpanan sesi tidak termasuk cakupan task dokumentasi.

**Sumber:** `web-katalog/src/App.jsx`, `src/pages/admin/AdminRoute.jsx`, `ManagementRoute.jsx`, `src/services/authService.js`, `src/services/api.js`, `backend-web-katalog/routes/api.php`, `AuthController.php`, `AppServiceProvider.php`, `User.php`, test `ManagementDashboardTest.php`.  
**TASK-ID:** `KUKI-P0-005` — 2026-10-26.
