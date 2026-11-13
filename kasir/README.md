# Kuki Bakehouse POS — UI referensi tablet V1.1

**Pembaruan desain:** halaman Kasir, Login, Riwayat, Laporan, Stok, dan sidebar telah disesuaikan dengan pola referensi POS yang dikirim pengguna, **tanpa menyalin merek atau gambar referensi**. Warna dan copy Kuki tetap dipakai. Dokumentasi per layar: `docs/UI_REFERENCE_ADAPTATION.md`.

**Penambahan fungsional lokal:** kartu draft pesanan di atas katalog, penggantian nama pesanan, jenis pesanan (bawa pulang/makan di tempat), nomor meja opsional, dan catatan; disimpan dalam SQLite sebagai JSON draft dan dirangkum di kolom catatan transaksi saat checkout. **Tidak menambah tabel meja atau manajemen lantai restoran.**

> **Status verifikasi:** Paket ini belum dicompile melalui Flutter SDK dalam lingkungan ini. Pengujian aplikasi dan backend tetap harus dilakukan di Android/iPad.

---

# Kuki Bakehouse — Tablet POS Flutter

**Target:** tablet Android landscape dan iPadOS landscape. **Arsitektur:** Flutter + SQLite di tablet + Laravel REST API dengan token sesi POS Bearer. Desain bakery cream, cokelat, dan caramel; alur kasir cepat dengan katalog dan keranjang berdampingan.

> **STATUS JUJUR:** Source POS terhubung ke kontrak Laravel di `docs/API_CONTRACT.md`. Analisis dan tes API terarah dapat dijalankan; build Android/iOS dan uji perangkat nyata belum diverifikasi. Route hosted sudah dicek tanpa kredensial, tetapi login kasir dan checkout belum diuji. Jangan gunakan transaksi nyata sebelum validasi operasional.

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

## Memakai backend Laravel

- Server default POS: `https://kukibakehouse.smkn1sumedang.sch.id`. Alamat harus berupa root domain, tanpa akhiran `/api`.
- URL tersimpan pada perangkat akan tetap dipakai. Jika sebelumnya tersimpan URL lokal, keluar dari sesi, ubah kolom **Alamat server POS** di layar login, lalu masuk kembali.
- Untuk pengembangan lokal, override default dengan `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000` pada Android Emulator. Tablet fisik gunakan IP LAN komputer; iPad gunakan HTTPS tepercaya.
- Login POS memakai kode pegawai dan PIN melalui `POST /api/pos/login`; buat/kelola akun melalui mekanisme Admin yang tersedia. Jangan memasukkan kredensial ke source atau chat.
- Katalog, shift, riwayat, laporan, dan transaksi memakai endpoint `/api/pos/*`; payload dan respons aktual tercatat di `docs/API_CONTRACT.md`.
- Pemeriksaan aman ke domain hosted: `GET /api/pos/me` tanpa token mengembalikan `401` dan preflight CORS mengembalikan `204`. Login dan checkout tidak dicoba.

## Fitur dalam source

- Login kode/PIN kasir melalui token sesi POS Bearer; PIN lokal opsional untuk mengunci antarmuka.
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

- Login kasir dan checkout belum diuji end-to-end dengan akun serta data operasional. Sebelum dipakai untuk transaksi, validasi dengan prosedur uji yang disetujui dan data non-produksi.
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
