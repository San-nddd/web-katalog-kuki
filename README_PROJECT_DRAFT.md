# Kuki Bakehouse — README Proyek (DRAFT REVIEW)

> Dokumen ini belum menggantikan README proyek asli. Jangan overwrite README aktif sampai kontennya dibandingkan dan disetujui.

## Ringkasan
Kuki Bakehouse adalah ekosistem operasional bakery dengan:
- **Web Publik** React/Vite: landing, katalog tanpa checkout e-commerce, produk/kategori/varian, testimonial & komentar, asisten produk.
- **Web Admin & Owner** React/Vite: CMS, chat handover AI, inventaris (produksi, mutasi, opname, ringkasan), dashboard dan laporan.
- **Backend Laravel API + Sanctum**: auth, otorisasi, sumber data bisnis dan transaksi.
- **Flutter Tablet POS** (folder `kasir/`, *harus diaudit*): kasir tablet Android + target iPadOS, login pegawai, absensi, scanner, transaksi, offline sync pada tahap berikutnya.

## Struktur folder berdasarkan riwayat proyek — verifikasi dulu
```text
E:\Ekosistem-kuki\
├── backend-web-katalog/     # Laravel API; nama folder sudah teridentifikasi
├── web-katalog/             # React/Vite; nama folder sudah teridentifikasi
├── kasir/                   # Flutter POS atau draft, isi belum diaudit
├── monitor_kuki/            # Folder tercatat; fungsi saat ini belum diverifikasi
├── scripts/                 # Script integrasi lama; JANGAN dijalankan otomatis
├── docs/                    # Dokumentasi (proposal)
├── .github/                 # Aturan Copilot (proposal)
├── AGENTS.md                # Kontrak agen (proposal)
└── README.md                # README root (proposal; simpan yang lama)
```

Jika Git repo ternyata berada di `web-katalog/` dan `backend-web-katalog/` terpisah, instruksi Copilot **harus diletakkan pada root repo/workspace relevan**, bukan dianggap otomatis berlaku pada semua folder. Tidak memindahkan repo tanpa izin.

## Prioritas aktif saat dokumen ditulis
1. Audit current-state (route, auth, UI, DB schema, tests) tanpa mengubah kode.
2. Stabilisasi inventaris dan laporan/ekspor; pemisahan menu laporan bisnis, dicatat dengan work log.
3. Persiapan lingkungan Flutter/tablet dan katalog aset referensi.
4. Login + absensi pegawai sebagai fitur aktif kembali (desain & RBAC disetujui dulu).
5. POS transaksi, payment, hardware, offline sync.

## Prinsip domain
- Backend menyimpan dan memvalidasi perubahan stok, transaksi, absensi, role.
- Riwayat final/mutasi lama tidak boleh dihapus atau ditimpa untuk "perbaikan"; lakukan entri koreksi baru dengan aktor, alasan, before/after, timestamp.
- Excel `.xlsx` adalah **ekspor dan dokumen usulan**; mengubah Excel tidak otomatis melakukan POST ke database.
- PDF diunduh; `Cetak Langsung` melalui print view dan dialog browser. Format sebaiknya formal tanpa sidebar.
- Informasi keuangan hanya dari transaksi dan beban yang benar-benar tercatat; tidak menghitung laba dari data produk semata.

## Status integrasi (bersifat tentatif)
- API Management dashboard, laporan inventaris, export CSV pernah terdaftar; **harus dicek ulang** pada project saat ini.
- Frontend Admin dan Owner routes telah pernah diperbaiki; jangan replace `App.jsx` dengan versi lawas.
- Paket ExcelJS/jsPDF/jspdf-autotable pernah dipasang pada `web-katalog` dan terdaftar di `npm ls` pengguna; jangan install ulang tanpa alasan.
- Web Blog dan Attendance pernah masuk-keluar ruang lingkup; absensi sekarang aktif di draft, Blog belum aktif.

## Perintah pemeriksaan aman (dijalankan manusia atau agent setelah izin)
```powershell
cd E:\Ekosistem-kuki\web-katalog
npm run build

cd E:\Ekosistem-kuki\backend-web-katalog
php artisan route:list --path=api/management
php artisan test

cd E:\Ekosistem-kuki\kasir
flutter --version
flutter doctor -v
flutter devices
```
`flutter pub get` yang mengubah lockfile, install dependency, migration, seed, `flutter create` dan `npm audit fix` membutuhkan keputusan dan audit dampak, kecuali ada izin tertulis yang sesuai task.

## Lingkungan & konfigurasi
- Frontend menggunakan konfigurasi URL API yang ada; inventarisasi key `.env.example`, jangan menebak nama variabel.
- Flutter baru mengusulkan `--dart-define=API_BASE_URL=https://...` (base URL non-rahasia); pastikan hostname tepat untuk emulator/perangkat nyata. Jangan pakai `localhost` di perangkat fisik untuk mengarah ke PC backend.
- Kunci OpenRouter hanya di backend, bukan `.env` React yang ter-bundle atau di Flutter.
- Jangan commit `.env`, token, password, keys, database dump, screenshot data pegawai.
- iPadOS membutuhkan macOS + Xcode untuk build/test/penandatanganan.

## Prosedur tugas Copilot Autonomous v0.2
1. Baca `AGENTS.md`, PRD v0.2, `docs/AUTONOMOUS_WORKFLOW.md`, `docs/TASK_BOARD.md`, dan `docs/PROJECT_STATUS.md`.
2. Agent memeriksa state aktual, memilih task `READY + AUTO`, lalu **mengimplementasikan**, menguji, mencatat, dan melanjutkan task aman lain dalam sesi.
3. Untuk tugas sensitif `APPROVAL`, agent harus mencatat keputusan yang diperlukan dan mengerjakan task aman yang lain sembari menunggu.
4. Setelah tiap task, update `docs/PROJECT_STATUS.md`, log, dokumentasi modul dan status Task Board.
5. Pemilik proyek meninjau git diff, tes nyata, dan hasil; merge/deploy tidak dilakukan otomatis.

## Definisi selesai
Bukan sekadar halaman terbuka. Wajib build/lint/test yang relevan, API auth benar, role guard, tidak ada regresi UI/route/stok, uji scenario happy/negative, dan dokumentasi.

## Referensi resmi
- GitHub Copilot custom instructions: https://docs.github.com/en/copilot/how-tos/copilot-in-your-ide/customize-copilot/configure-custom-instructions/add-repository-instructions-in-your-ide
- Flutter Android setup: https://docs.flutter.dev/platform-integration/android/setup
- Flutter iOS setup: https://docs.flutter.dev/platform-integration/ios/setup
- Flutter integration tests: https://docs.flutter.dev/testing/integration-tests
- Laravel Sanctum: https://laravel.com/docs/12.x/sanctum (cek kesesuaian versi Laravel aktual)

## Catatan mode autonomous terbaru
Lihat `docs/AUTONOMOUS_WORKFLOW.md`. Copilot **boleh langsung mengedit kode tugas rendah yang sudah READY+AUTO**, bukan berhenti di rencana; hasil harus diuji dan ditulis dalam `docs/logs/`. Kemampuan ini berlangsung selama sesi agent aktif dan tidak berarti bekerja di latar belakang secara permanen.
