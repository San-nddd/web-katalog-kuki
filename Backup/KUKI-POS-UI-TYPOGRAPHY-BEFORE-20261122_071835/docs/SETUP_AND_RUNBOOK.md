# Runbook Pengembangan Kuki — Aman untuk Windows

## Root workspace
Buka folder `E:\Ekosistem-kuki` di VS Code. Pastikan di dalamnya benar-benar ada `web-katalog`, `backend-web-katalog`, `kasir`, dan root repo. Proyek ini dapat terdiri dari **beberapa repo Git terpisah**; audit `git status` pada tiap repo. File root `AGENTS.md` dan `.github` harus terdeteksi oleh sesi Copilot yang benar (buka folder root). Jika tidak terdeteksi, ikuti instruksi VS Code soal folder workspace dan parent repo; jangan otomatis menggandakan aturan di semua repo tanpa cek konflik.

## 1. Web React/Vite
```powershell
cd E:\Ekosistem-kuki\web-katalog
node --version
npm --version
npm ls --depth=0
npm run build
```
Jalankan `npm run dev` untuk preview setelah audit konfigurasi URL API. `npm install`, audit fix force, dan ganti major dependency butuh review perubahan lockfile terlebih dahulu.

## 2. Backend Laravel
```powershell
cd E:\Ekosistem-kuki\backend-web-katalog
php --version
php artisan --version
php artisan route:list
php artisan test
```
Jangan menjalankan `php artisan migrate`, seed, migrate:fresh, db:wipe tanpa izin spesifik + backup/test plan. Nama DB dan secret disimpan di `.env` lokal, jangan ditempel ke log.

## 3. Flutter tablet POS
```powershell
cd E:\Ekosistem-kuki\kasir
flutter --version
flutter doctor -v
flutter devices
```
Periksa dulu apakah `pubspec.yaml`, `lib/`, `android/`, `ios/` sudah ada. Flutter Android di Windows; build iPadOS memerlukan Mac/Xcode. `flutter create`, plugin install/update, `flutter pub get` yang mengubah lockfile hanya setelah audit dan izin. Jangan menyimpan private API key dalam Flutter app.

## 4. Tugas Copilot
- Pilih mode **Agent** atau custom agent **Kuki Builder** di VS Code Chat, tempel `PROMPT_MASTER_COPILOT.md`.
- Pastikan perubahan dan perintah agent bisa ditinjau. Jangan aktifkan auto-approval semua perintah untuk repo dengan kredensial/database nyata.
- Untuk sesi berikutnya, pakai `.github/prompts/05-resume-from-log.prompt.md`.
- Setelah sesi, periksa `docs/PROJECT_STATUS.md`, `docs/logs/WORK_LOG.md`, `docs/logs/ERROR_LOG.md`, git diff.

## 5. Checklist review owner
`git diff --stat`, `git diff`, hasil tes, pekerjaan DONE vs BLOCKED, file docs/modules yang berubah, cek URL Admin/Owner, PDF/Excel/print, stok dan absensi privat. Merge/release hanya setelah review.
