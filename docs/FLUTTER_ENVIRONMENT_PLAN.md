# Persiapan Environment Flutter Tablet POS — RENCANA, BELUM DIJALANKAN

**Scope:** Android tablet + target iPadOS, satu codebase Flutter. **Tahap ini belum menginstal apa pun dan tidak mengubah folder `kasir/`.**

## 1. Verifikasi perangkat/dev workstation Windows
- Punya Flutter SDK yang tersedia di PATH, Android Studio dengan Android SDK, SDK Command-line Tools, platform tools dan emulator atau tablet fisik.
- Gunakan perintah **read-only** saat diizinkan: `flutter --version`, `flutter doctor -v`, `flutter devices`, `where.exe flutter`.
- Instalasi Flutter SDK, Android SDK, lisensi dan driver USB dilakukan pemilik/dev setelah rencana disetujui, mengikuti docs resmi.
- Android AVD sebaiknya konfigurasi **tablet landscape** yang mendekati perangkat nyata dan diuji juga portrait/reflow. Model perangkat harus dicatat, bukan diasumsikan.
- `flutter doctor --android-licenses` adalah langkah menerima syarat software, jangan otomatis dilakukan agen.

## 2. Audit sebelum menyentuh folder lama
Periksa `E:\Ekosistem-kuki\kasir\`:
1) Apakah ada `pubspec.yaml`, `lib/main.dart`, `android/`, `ios/`, test, `.gitignore`?
2) Apakah folder memiliki perubahan kerja belum di-commit? `git status --short`.
3) SDK constraint, Flutter channel/version, package lock, existing plugin scanner/printer.
4) Apa API base URL nonsecret? Adakah dependency arsitektur lama yang harus dipertahankan?
5) Apakah proyek lama sudah `flutter analyze`/`flutter test` berfungsi?

**Tidak boleh** jalankan `flutter create .` atau overwrite `kasir/` sebelum audit. Jika folder tidak berisi proyek Flutter, Copilot harus mengajukan pilihan membuat subfolder baru, bukan memutuskan sendiri.

## 3. iPadOS target
- Flutter shared Dart/UI mengizinkan target iPadOS, tetapi untuk **build, signing dan uji iOS** diperlukan **macOS dengan Xcode**; ini tidak dapat selesai sepenuhnya dari Windows.
- Persiapan UI, arsitektur, test Dart dan Android boleh dimulai di Windows, tetapi jangan mengklaim versi iPadOS sudah diuji.
- Saat tersedia Mac/Xcode, siapkan signing/devices, pilih deployment target kompatibel, uji plugin kamera/scanner/printer yang berbeda.

## 4. Struktur Flutter yang DIUSULKAN (jangan create sampai disetujui)
```text
kasir/
├── lib/
│   ├── main.dart
│   ├── app/              # router, tema Kuki, konfigurasi
│   ├── core/             # http, auth secure storage, errors, validators
│   ├── features/
│   │   ├── auth/         # login pegawai / session unlock
│   │   ├── attendance/   # check-in/out, riwayat, status
│   │   ├── catalog/      # produk, kategori, pencarian
│   │   ├── cart/         # keranjang dan varian
│   │   ├── checkout/     # transaksi POS, pembayaran (bukan checkout web)
│   │   ├── history/      # riwayat transaksi
│   │   └── scanner/      # kamera + external HID adapter
│   └── shared/           # reusable widgets
├── test/
└── integration_test/
```
Struktur bisa berubah bila codebase sudah memiliki arsitektur lain; jangan memaksakan folder baru.

## 5. Pengelolaan konfigurasi
- `API_BASE_URL` konfigurasi per debug/staging/release, misal lewat `--dart-define` setelah user menyetujui. `http://localhost` pada Android device merujuk **device itu sendiri**, bukan PC Laravel.
- Untuk emulator Android umumnya host-loopback khusus emulator dapat digunakan, tapi alamat harus diuji sesuai emulator, Docker, firewall, Wi-Fi, HTTPS.
- Token mobile Sanctum per-device melalui HTTPS dan secure-storage OS, refresh/revoke strategy disepakati. Jangan letakkan kunci rahasia OpenRouter di Flutter.
- Semua `.env.example` hanya placeholder tanpa kredensial.

## 6. Login/Absensi pegawai, tahapan implementasi
- Sebelum coding: tetapkan identitas pegawai, role/gate, time zone, jam kerja, transisi `belum masuk -> masuk -> pulang`, edge case shift lintas hari.
- Backend server timestamp & audit; UI tablet menampilkan status dan history pegawai sendiri.
- Owner melihat rekap; Admin dapat koreksi sesuai permission dengan alasan.
- Default usulan: absensi online-only untuk data resmi. Jika offline diwajibkan, harus ada ADR reconciliation antarmuka jelas.
- Login biometrik `local_auth` atau alternatif **opsional** untuk unlock perangkat setelah autentikasi server; jangan otomatis menambah plugin tanpa review. Bukan fitur face recognition absensi.

## 7. Scanner/periferal
- Kamera melalui plugin terpilih setelah daftar model tablet dan support iPadOS diverifikasi.
- Scanner Bluetooth HID / USB HID umumnya memasukkan input keyboard; pakai input focus/debounce dan validasi barcode produk.
- Printer kasir menunggu jenis interface dan protokol dari perangkat fisik. Jangan memilih library ESC/POS secara acak.

## 8. Kandidat tests & acceptance
- `flutter analyze`, `flutter test`, `flutter test integration_test` (jika setup dan device tersedia).
- Android tablet: login/logout, role guard, absensi server, 401/403, pencarian produk, input barcode, network off/on.
- iPadOS: hanya tandai PASS setelah benar-benar dijalankan di Mac/device iPad.
- QA manual: ukuran target tap, landscape/portrait reflow, keyboard hardware/soft keyboard, state offline, loading/error.

## 9. Keputusan terbuka
- Model tablet Android dan iPad (resolusi/OS)?
- Apakah saat ini Mac tersedia untuk build iPadOS?
- Scanner dan printer merek/model apa?
- Apakah absensi boleh offline? Apakah biometric unlock diperlukan di tahap pertama?
- Pilihan state management dan local DB (jangan diputuskan sebelum audit dependensi).

## Rujukan resmi
- https://docs.flutter.dev/platform-integration/android/setup
- https://docs.flutter.dev/platform-integration/ios/setup
- https://docs.flutter.dev/testing/integration-tests
