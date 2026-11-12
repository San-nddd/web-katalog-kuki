# Kuki Bakehouse POS — UI referensi tablet V1.1

**Pembaruan desain:** halaman Kasir, Login, Riwayat, Laporan, Stok, dan sidebar telah disesuaikan dengan pola referensi POS yang dikirim pengguna, **tanpa menyalin merek atau gambar referensi**. Warna dan copy Kuki tetap dipakai. Dokumentasi per layar: `docs/UI_REFERENCE_ADAPTATION.md`.

**Penambahan fungsional lokal:** kartu draft pesanan di atas katalog, penggantian nama pesanan, jenis pesanan (bawa pulang/makan di tempat), nomor meja opsional, dan catatan; disimpan dalam SQLite sebagai JSON draft dan dirangkum di kolom catatan transaksi saat checkout. **Tidak menambah tabel meja atau manajemen lantai restoran.**

> **Status verifikasi:** Paket ini belum dicompile melalui Flutter SDK dalam lingkungan ini. Pengujian aplikasi dan backend tetap harus dilakukan di Android/iPad.

---

# Kuki Bakehouse — Tablet POS Flutter

**Target:** tablet Android landscape dan iPadOS landscape. **Arsitektur:** Flutter + SQLite di tablet + Laravel REST API/Sanctum. Desain bakery cream, cokelat, dan caramel; alur kasir cepat dengan katalog dan keranjang berdampingan.

> **STATUS JUJUR:** Source Dart lengkap untuk alur POS lokal dan demo tersedia. Folder native `android/` dan `ios/` **dibuat dengan Flutter SDK menggunakan setup** karena Flutter tidak terinstal di lingkungan pembuatan arsip. Project **belum lolos `flutter pub get`, `flutter analyze`, build Android/iOS, atau uji perangkat nyata** di lingkungan ini. Integrasi ke backend memerlukan endpoint POS dan payload yang sesuai dengan kontrak di `docs/API_CONTRACT.md`. Jangan langsung operasikan untuk transaksi nyata sebelum uji end-to-end.

## Cara cepat menjalankan (Windows / VS Code)

1. Instal **Flutter SDK** kompatibel Dart 3.9+ (mis. Flutter 3.35.x), Android Studio/Android SDK, dan VS Code Flutter extension. `flutter doctor` harus menunjukkan Android toolchain.
2. Ekstrak ZIP ke `E:\Ekosistem-kuki\kasir` atau folder pilihan.
3. Buka PowerShell di folder project dan jalankan:

```powershell
./setup_windows.ps1
flutter run
```

Jika PowerShell memblokir skrip, jalankan perintah manual berikut dari terminal project:

```powershell
flutter create --org id.kukibakehouse --platforms=android,ios --project-name=kuki_pos --no-pub .
flutter pub get
flutter analyze
flutter run
```

Setelah `flutter create`, jalankan `./configure_platforms.ps1` agar izin kamera dan akses jaringan debug ditambahkan. **Jangan menjalankan `flutter create --overwrite`**, agar file Dart Kuki tidak tertimpa.

4. Di layar login pilih **Mode DEMO** untuk mencobanya tanpa Laravel. Demo menggunakan `kuki_pos_demo.db` terpisah dan tidak mengirim transaksi ke server.
5. Buka **Shift** → masukkan modal awal → masuk **Kasir** → tambah produk → pembayaran → cetak struk dari dialog sistem.

## Memakai Laravel lokal

- **Android Emulator:** API default `http://10.0.2.2:8000`, jalankan Laravel `php artisan serve --host=0.0.0.0` pada jaringan pengembangan terisolasi.
- **Tablet Android fisik:** ganti URL menjadi `http://IP-LAN-KOMPUTER:8000`. Jangan menggunakan `localhost` tablet.
- **iPad:** sebaiknya API HTTPS tepercaya. Pada server lokal HTTP bisa perlu pengecualian ATS dan izin local network iOS; lihat `docs/PLATFORMS.md`.
- Login saat ini mengasumsikan `POST /api/login` mengembalikan Bearer token Sanctum dan objek `user` berisi `name`, `role` (`kasir`/`cashier`/`admin`). Jika backend berbeda, edit hanya `lib/data/api_client.dart`.
- Katalog `GET /api/produk` membaca `katalog_produk` (produk tiap rasa/ukuran mandiri, bukan master varian).
- Transaksi `POST /api/pos/transaksi` membutuhkan idempotensi server `client_uuid` dan pengurangan stok atomik. **Endpoint ini belum diverifikasi ada** di Laravel milikmu.

## Fitur dalam source

- Login Laravel Bearer Sanctum + role check; PIN lokal opsional untuk mengunci antarmuka.
- Layout kasir tablet, katalog, filter kategori, pencarian produk/SKU/barcode, indikator stok rendah.
- Keranjang, atur jumlah, 6 tab pesanan aktif yang tersimpan di SQLite, diskon nominal, hitung total/kembalian.
- Pembayaran **tunai**, **transfer manual**, **QRIS manual** (kasir wajib centang telah memverifikasi pembayaran; tidak ada gateway).
- Scan kamera via `mobile_scanner`; scanner **Bluetooth HID/USB HID** melalui field keyboard dan akhiran Enter; input SKU manual.
- Transaksi disimpan **atomik di SQLite**, stok lokal dikurangi, UUID unik disimpan dan dikirim lagi dengan ID yang sama saat retry.
- Antrean otomatis diperiksa saat jaringan kembali, aplikasi aktif lagi, checkout selesai, dan tiap 45 detik. Transaksi hanya dikirim jika API POS dapat dijangkau; saat offline transaksi tetap tersimpan lokal. Tombol sync manual tetap tersedia dan konflik 400/409/422 tidak otomatis hilang.
- Buka/tutup **shift uang kasir** (bukan modul absensi), modal awal, kas penutupan, hitung estimasi kas.
- Riwayat/filter status, laporan penjualan lokal, produk terlaris, cetak struk PDF 58/80 mm via printer dialog sistem.
- UI tema Kuki warna cream/cocoa/caramel; label DEMO; catatan fitur yang masih bergantung backend di layar.

## Belum bisa disebut selesai untuk produksi

- Backend Laravel transaksi/idempotensi/locking stok belum disediakan atau diuji terhadap migrasi aktual.
- Verifikasi otomatis QRIS/payment gateway belum ada; transfer & QRIS dicatat manual setelah konfirmasi kasir.
- ESC/POS Bluetooth thermal **langsung tanpa dialog** belum ada; printer via sistem memerlukan driver/AirPrint/layanan printer yang kompatibel.
- Sync shift ke server, refund/retur, approval pembayaran, dashboard multi-cabang, hardening offline multi-tablet, dan biometrik belum ada.
- Tidak ada template Android/iOS native tercantum di ZIP, karena harus dibuat dari Flutter SDK dengan script yang disertakan.

## Struktur

```
lib/
  main.dart
  core/{models,theme}.dart
  data/{api_client,local_db}.dart
  state/pos_controller.dart
  screens/{login,pos_shell,register,inventory,history,shift,report,settings}_screen.dart
  services/{camera_scanner,receipt_service}.dart
  widgets/common.dart
assets/images/README.txt
docs/{API_CONTRACT,PLATFORMS,FEATURE_STATUS,CHECKLIST}.md
test/models_test.dart
setup_windows.ps1, configure_platforms.ps1, setup_macos.sh
```

**Desain:** tidak menyalin kode atau UI Qasir. Logo asli dapat ditambahkan nanti tanpa mengubah sistem. Tidak ada fitur absensi, blog, ataupun product-varian induk.
