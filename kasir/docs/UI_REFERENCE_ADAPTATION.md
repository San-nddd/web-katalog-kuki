# Acuan desain Kuki Bakehouse POS — adaptasi referensi pengguna

Versi implementasi: **V1.1 UI tablet (7 November 2026)**.

## Referensi yang dipakai

Referensi pengguna memperlihatkan aplikasi POS lain dengan sidebar putih, alur kasir tiga bagian, kartu pesanan aktif, kategori horizontal, grid produk, panel order di kanan, halaman History/Report tabular, dan login kasir. Referensi digunakan **hanya untuk mempelajari pola hierarki dan interaksi**, bukan untuk menyalin logo, foto produk, nama produk atau merek pihak ketiga.

## Implementasi di Flutter ini

| Pola referensi | Implementasi Kuki |
|---|---|
| Sidebar Kasir/History/Report/Supply | Sidebar putih, menu Kasir/Riwayat/Laporan/Stok/Shift/Pengaturan; pada layar sempit memakai drawer |
| Order List | Strip kartu draft pesanan nyata dari SQLite; pilih, tambah maks. 6, hapus dengan konfirmasi bila terisi |
| Menu kategori dan produk | Filter kategori, pencarian, gambar API/placeholder, harga dan indikator stok |
| Panel Customer/Order | Panel kanan berisi nama pesanan yang bisa diedit, tipe pesanan, nomor meja opsional, catatan, item, diskon, total dan checkout |
| Select Order Type | Bawa pulang / Makan di tempat; tersimpan di draft lokal |
| Select Table/Floor | **Tidak ada modul meja/lantai penuh.** Nomor/nama meja bisa diisi manual untuk dine-in; tidak ada occupancy/peta lantai |
| History | Tabel lokal dengan pencarian, filter sync, detail/struk |
| Report | Ringkasan 1/7/30 hari dan tabel produk terlaris lokal |
| Login dengan pilihan petugas dan PIN | Login Laravel Sanctum + PIN lokal untuk kunci perangkat. **Tidak ada akun petugas palsu atau daftar PIN sinkron server.** |

## Keterikatan data

- **Produk:** tetap satu baris `katalog_produk` per rasa/ukuran; kategori hanya pengelompokan.
- **Draft order:** field `order_type` (`takeaway`/`dine_in`) dan `table_number` tersimpan dalam JSON draft SQLite; tidak mengubah schema database dan tetap kompatibel dengan draft lama.
- **Transaksi:** label tipe pesanan, nomor meja, nama pesanan dan catatan ditambahkan ke **field `note`** yang sudah ada saat checkout. Endpoint Laravel menerima `note`; tidak ada klaim backend memiliki tabel meja.
- **Mode DEMO:** tetap memakai SQLite terpisah dengan produk contoh; tidak masuk server.
- **QRIS/transfer:** pencatatan manual setelah kasir mengonfirmasi; bukan gateway otomatis.
- **Offline sync:** kontrak `client_uuid` tetap membutuhkan idempotensi transaksi atomik di Laravel. Tidak dianggap production-ready tanpa uji backend.
- **Struk:** dialog cetak PDF sistem; printer ESC/POS langsung belum diaktifkan.
- **Foto produk:** kartu otomatis memakai URL gambar dari katalog API. Produk DEMO memakai ikon bakery sebagai placeholder, bukan gambar produk referensi.

## Identitas visual

Warna utama Kuki: `#2B1A13` (cocoa), `#FFF6D9` (cream), `#FFFBF1` (paper; gunakan kode dari theme.dart), `#F8D3B5` (peach), `#D98943` (caramel). Penggunaan kontras, jarak, tipografi dan batas komponen mengikuti gaya minimalis tanpa gradient/emoji/glassmorphism yang tidak diperlukan.

## Catatan build

Flutter SDK tidak tersedia dalam lingkungan pembuatan paket ini. Source belum divalidasi oleh Flutter analyzer, emulator atau perangkat Android/iPad asli. Jalankan `flutter pub get`, `flutter analyze`, dan `flutter run` di komputer pengembang sebelum dianggap lolos QA.
