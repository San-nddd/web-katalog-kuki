# Audit Persiapan Flutter POS

## Identitas visual POS — KUKI-ASSET-001 (2026-11-12)
Ikon aplikasi Android/iOS memakai logo `Kuki.png`; header navigasi POS memakai `Kuki-Mascot.png` sambil mempertahankan teks KUKI dan layout yang ada. Kedua file sumber dari `web-katalog/src/assets/` dibundel di `kasir/assets/branding/`. Launcher icons native mengikuti ukuran Android density serta seluruh ukuran pada iOS `AppIcon.appiconset/Contents.json`; aset brand lain tidak ditimpa.

## Auto-sync antrean POS — KUKI-POS-SYNC-001 (2026-11-12)
Antrean transaksi tetap disimpan di SQLite dengan ID yang sama saat retry. Perubahan ini hanya mengatur kapan antrean yang sudah ada dikirim:

```text
jaringan pulih / aplikasi resume / checkout / retry 45 detik
  -> cek antarmuka jaringan
  -> GET /api/pos/me untuk memastikan server POS terjangkau
  -> jika terjangkau: kirim antrean dan tandai hasil sesuai aturan lama
  -> jika tidak: biarkan antrean tetap lokal, lalu coba lagi nanti
```

`connectivity_plus` mendeteksi status jaringan perangkat, tetapi status itu sendiri tidak membuktikan internet/server tersedia. Karena itu sync otomatis juga memeriksa respons API sebelum mengirim transaksi. Respons HTTP (termasuk 401) membuktikan server merespons; request transport yang gagal mencegah pengiriman otomatis. Tombol sync manual tetap tersedia. Kebijakan idempotensi, konflik, pembayaran, dan transaksi tidak diubah.

Validasi 2026-11-12: tes API reachability, mapping jaringan, API client, dan widget **6/6 PASS**; `flutter build apk --debug` **PASS**. Seluruh `flutter test` masih gagal pada ekspektasi pesan UI Windows lama di `database_lifecycle_test.dart` (juga dicatat pada KUKI-MOB-DB-002). `flutter analyze` tidak menemukan error; info lint flow-control yang sudah ada tersisa pada `main.dart` dan `settings_screen.dart`. Runtime Android dan iPadOS belum diuji.

## Shift dan laporan — 2026-11-10
Dialog nominal pembukaan shift dihapus. Shift lokal dimulai dengan nilai pembukaan nol; estimasi kas masih menghitung nilai pembukaan yang sudah tersimpan pada shift lama beserta transaksi tunainya. Laporan pendapatan dijumlahkan dari transaksi: SQLite pada perangkat atau agregat endpoint Laravel saat berjalan di Chrome. API Laravel tetap menjadi perantara ke MySQL; koneksi database tidak dibuat langsung dari browser.

Validasi terarah: Flutter API/widget tests **3/3 PASS**, analyzer file terkait exit 0 dengan 10 info lint, dan `flutter build web --debug` **PASS**. Belum ada login atau transaksi pada server/database MySQL live.

## Aktualisasi implementasi — 2026-11-07
Catatan scaffold di bawah adalah audit historis 2026-10-26 dan tidak menggambarkan source saat ini. Flutter `kasir/` sekarang memuat POS, login pegawai, shift, katalog, pesanan, riwayat, laporan, dan scanner.

Katalog produk tidak disimpan sebagai mock atau dibaca langsung dari database oleh Flutter:
```text
OrdersPage -> ApiClient.catalog()
  -> GET /api/pos/catalog + token POS
  -> PosController membaca katalog_produk dan relasi kategoris
  -> JSON produk dipetakan ke PosProduct
```

Server menyediakan ID, nama, harga, stok, barcode, kategori, dan URL gambar. Daftar dimuat saat halaman kasir dibuka, tersedia tombol muat ulang, dan dimuat kembali setelah transaksi. `PosProduct.fromJson` memvalidasi ID/nama/harga/stok wajib; respons malformed sekarang menghasilkan error yang ditampilkan sebagai kegagalan katalog, bukan produk palsu dengan harga/stok nol. Nilai stok `0` tetap valid. Tes menggunakan fixture terisolasi; database produksi tidak diakses.

Kontrak POS yang ada mengubah harga katalog menjadi Rupiah bulat; endpoint checkout juga menolak harga produk pecahan. Ini perilaku API/backend saat ini, bukan perubahan pada task sinkronisasi ini.

Validasi 2026-11-07: Flutter analyze **PASS**; model + widget tests **4/4 PASS**; Laravel `PosCatalogTest` **1 test / 7 assertions PASS**; Pint test file **PASS**.

## Pemulihan environment — 2026-11-07
Source aktual mendefinisikan root widget `KukiApp`, tetapi `test/widget_test.dart` masih memanggil `KukiPosApp` dan menguji label login dari alur lama. Test diperbarui agar menguji label login yang benar-benar dirender pada viewport tablet landscape; tidak ada perubahan pada screen atau alur login.

Validasi pemulihan: Dart analyze **PASS**; widget test terarah **1/1 PASS**; `flutter build apk --debug` **PASS**. Build mengeluarkan peringatan kompilasi Kotlin, tetapi menghasilkan APK debug. Dependency, lockfile, Android/iOS native config, API, dan database lokal tidak diubah.

**Status iOS belum terverifikasi:** owner menyatakan file lama/backup tidak tersedia dan mengizinkan pemulihan. `kasir/ios/Podfile` dibuat dari template Flutter SDK lokal (revision sama dengan `.metadata`), dengan `platform :ios, '13.0'` sesuai deployment target `Runner.xcodeproj`. Host Windows tidak dapat menjalankan build iOS; validasi CocoaPods/Xcode tetap perlu dilakukan di macOS.

## Login kasir — 2026-11-07
Backend POS menyediakan `POST /api/pos/login` dengan payload `kode` dan `pin`, lalu mengembalikan token sesi serta data pegawai. Endpoint admin `/api/auth/login` memakai email/password dan tidak ditujukan untuk login kasir. Layar Flutter kini meminta **Kode pegawai** (contoh `KASIR01`) dan **PIN**, merapikan kode menjadi huruf besar, lalu membaca token/nama dari respons POS. `KASIR01` hanya contoh format; keberadaan akun aktif dan PIN harus disiapkan Admin pada data pegawai backend.

Setelah login, katalog dimuat dari `GET /api/pos/catalog`. Tes client memakai mock payload (bukan akun/server sungguhan) dan memastikan path, body, serta mapping nama/token. Backend, role, schema, dan transaksi tidak diubah. Verifikasi 2026-11-07: Flutter tests **5/5 PASS**, analyze **PASS**, route Laravel terdaftar, Android debug build **PASS**; akun kasir live belum dicoba.

## Koneksi Android debug — 2026-11-07
Alamat bawaan `http://10.0.2.2:8000` adalah alamat host komputer dari **Android Emulator**, bukan alamat untuk perangkat fisik. Android menolak HTTP cleartext secara default; `android/app/src/debug/res/xml/network_security_config.xml` kini memberi pengecualian hanya untuk host emulator tersebut, dengan semua host lain tetap `cleartextTrafficPermitted=false`. Konfigurasi hanya dipasang pada manifest debug; release tetap memerlukan HTTPS.

Probe Laravel lokal tanpa kredensial menerima HTTP 422 dari `POST /api/pos/login`, menandakan route merespons dan field memang diperlukan. APK debug berhasil dibangun dan AAPT mengonfirmasi resource keamanan jaringan tergabung. Tidak ada emulator/perangkat yang tersambung, jadi login dari aplikasi belum diuji end-to-end. Untuk tablet fisik gunakan endpoint HTTPS; jangan masukkan PIN sungguhan melalui HTTP publik.

## Audit historis 2026-10-26 (sudah tidak berlaku)
Folder `kasir/` **ADA**, tetapi isinya masih berupa scaffold standar Flutter `counter demo`, bukan implementasi POS Kuki. Task `KUKI-MOB-001` mengaudit kondisi ini tanpa membuat ulang proyek, mengubah UI, memasang dependency, atau mengubah platform config.

## Isi proyek yang diperiksa
- `kasir/pubspec.yaml`: package `kasir`, versi `1.0.0+1`, batas Dart `^3.9.2`; dependency aplikasi hanya Flutter SDK dan `cupertino_icons`. Belum ada dependency API, autentikasi, scanner, printer, atau state management.
- `kasir/lib/main.dart`: `MaterialApp` dengan tema seed ungu, halaman `Flutter Demo Home Page`, counter, dan tombol tambah.
- `kasir/test/widget_test.dart`: satu smoke test yang memastikan counter berubah dari 0 ke 1.
- `kasir/android/`: scaffold Android dengan application ID `com.example.kasir`, label `kasir`, dan SDK compile/target mengikuti nilai Flutter.
- `kasir/ios/`: scaffold iOS; `Info.plist` menyediakan orientasi portrait dan landscape untuk iPad. Ini hanya konfigurasi template, bukan bukti alur POS atau dukungan operasional tervalidasi.
- Scaffold platform lain juga tersedia (Windows, Linux, macOS, web). Tidak ada perubahan kode aplikasi atau dependency dalam audit ini.

## Hasil lingkungan aktual — 2026-10-26
- Flutter **3.35.7 stable**, Dart **3.9.2**.
- `flutter doctor -v`: Flutter/Windows/Android Studio/Chrome terdeteksi; Android SDK 36.0.0, Java 21.0.8. Android toolchain memberi peringatan karena sebagian lisensi SDK belum diterima. Visual Studio tidak memiliki komponen C++ yang diperlukan untuk build Windows native.
- `flutter devices`: Windows desktop, Chrome, dan Edge tersedia; tidak ada Android device/emulator terdeteksi.
- iOS build dan simulator tidak tersedia dari Windows karena memerlukan macOS/Xcode.
- `flutter pub deps --style=compact`: dependency yang terkunci hanya scaffold Flutter/test dan `cupertino_icons 1.0.9`; perintah baca ini tidak mengubah lockfile.

## Alur dan tes yang ada
```text
main() -> MyApp -> MaterialApp -> MyHomePage
       -> tombol tambah -> setState -> counter demo diperbarui
```

Tidak ada service, route/API client, model bisnis, database, login pegawai, absensi, katalog kasir, stok, transaksi, scanner, printer, maupun sinkronisasi offline pada source yang diaudit.

- `flutter analyze` dari `kasir/`: **PASS**, `No issues found`.
- `flutter test` dari `kasir/`: **PASS**, satu widget test counter demo.
- Tidak menjalankan `flutter pub get`, build APK, atau emulator; tidak ada perangkat Android/emulator dan lisensi SDK belum lengkap. Tes iOS NOT_RUN karena host Windows.

## Keputusan dan risiko
- Jangan menganggap counter demo sebagai fitur POS atau sebagai UI yang telah disetujui.
- `KUKI-MOB-002` tetap **NEED_APPROVAL**: sebelum scaffold/implementasi diubah, owner perlu menyetujui scope target dan keputusan dependency/platform. Desain POS/login/absensi tetap menunggu referensi terdaftar; keputusan role/auth/privacy absensi masih pending.
- Penyelesaian lisensi Android memerlukan tindakan operator melalui `flutter doctor --android-licenses`; audit ini tidak menjalankannya.
- Jangan menambah plugin, login/absensi, payment, schema, atau transaksi dari hasil audit saja.

**TASK-ID:** `KUKI-MOB-001` — 2026-10-26. Tidak ada file source Flutter yang diubah.

## Database lokal dan batas platform — KUKI-MOB-DB-001
- POS memakai SQLite melalui `sqflite` untuk data lokal. Targetnya Android/iPadOS; web dan Windows desktop bukan target POS. Root app menampilkan pesan platform yang didukung dan tidak menjalankan inisialisasi database atau pengaturan orientasi tablet pada target yang tidak didukung.
- Lifecycle resume hanya meminta `syncPending()` bila database sudah terbuka. `PosShell` tidak dirender sampai database terbuka dan daftar draft tersedia, sehingga getter draft tidak dipanggil pada state kosong.
- Alur startup native: buka database → pulihkan sesi → muat katalog/draft/riwayat → tampilkan login atau POS. Bila database gagal dibuka untuk sesi terautentikasi, aplikasi menampilkan error startup, bukan mengakses SQLite yang belum siap.
- Verifikasi: Flutter analyzer, tes guard Windows, tes sync saat database belum terbuka, tes widget login, dan build web berhasil. Build bukan bukti runtime POS; aplikasi kasir tetap ditargetkan Android/iPadOS.
