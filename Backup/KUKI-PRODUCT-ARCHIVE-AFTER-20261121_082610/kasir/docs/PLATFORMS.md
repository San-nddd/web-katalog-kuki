# Menjalankan pada Android & iPadOS

## Windows — tablet Android

- Install Flutter SDK, Android Studio SDK, JDK sesuai versi Flutter. `flutter doctor`.
- Jalankan `./setup_windows.ps1`, lalu `flutter devices` dan `flutter run`.
- Android emulator memakai `10.0.2.2:8000` untuk mengakses server lokal di host.
- Untuk tablet fisik, isi IP laptop/PC pada jaringan LAN yang sama di login (`http://192.168.x.x:8000`) jika development.
- Script konfigurasi membuat `android.permission.CAMERA`, `android.permission.INTERNET` dan **cleartext traffic hanya untuk DEBUG Android**; untuk release wajib server HTTPS.
- Scanner HID USB membutuhkan OTG/adapter yang kompatibel. Bluetooth HID dipasangkan lewat pengaturan OS, mode keyboard-wedge. Field scanner harus fokus dan scanner mengirim suffix Enter.

## iPadOS (butuh Mac untuk build/signing)

- Project iOS dibangkitkan oleh `flutter create`.
- Untuk build dan install ke iPad wajib **macOS + Xcode + Apple signing**; Windows tidak bisa menghasilkan build iOS asli.
- Konfigurasi plist: `NSCameraUsageDescription`, `NSLocalNetworkUsageDescription`, `NSAllowsLocalNetworking` untuk dev lokal. Prioritaskan HTTPS asli di produksi.
- Orientasi landscape diprioritaskan. `UIRequiresFullScreen` memberi izin orientasi terkunci pada iPad; ini menonaktifkan multitasking split-screen, sesuaikan jika diperlukan.
- Cetak memakai dialog printer sistem (AirPrint/printer kompatibel), **tidak langsung ESC/POS lewat BLE**.

## Perintah manual (jika script gagal)

```shell
flutter create --org id.kukibakehouse --platforms=android,ios --project-name=kuki_pos --no-pub .
flutter pub get
flutter analyze
flutter run
```

Gunakan `configure_platforms.ps1` atau `configure_platforms.sh` untuk izin platform. Jangan jalankan dengan `--overwrite`.
