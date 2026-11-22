# STATUS PROYEK KUKI — Untuk Melanjutkan Sesi Copilot

**Terakhir disusun:** 12 November 2026
**Status:** DRAFT / BASELINE AUDIT AWAL SELESAI; AREA FITUR BELUM DIAUDIT MENYELURUH

## Konsolidasi stylesheet Admin — KUKI-ADMIN-CSS-001 (DONE, 12 November 2026)
- Seluruh isi `admin-refined.css` dipindahkan ke bagian akhir `admin.css` agar aturan dan urutan CSS tetap dipertahankan; import terpisah dilepas dari Admin, Management, dan Login, kemudian file `admin-refined.css` dihapus.
- `npm run build` **PASS** (Vite menampilkan warning chunk >500 kB yang sudah ada); `git diff --check` **PASS**; pencarian source/docs memastikan tidak ada referensi `admin-refined.css` yang tertinggal.

## POS auto-sync online — KUKI-POS-SYNC-001 (DONE, 12 November 2026)
- POS memeriksa konektivitas jaringan dan keterjangkauan API POS sebelum mengirim antrean otomatis. Pemicu yang tersedia: jaringan kembali, aplikasi resume, setelah checkout, serta pemeriksaan ulang 45 detik selama aplikasi aktif.
- Saat jaringan terputus atau API tidak dapat dijangkau, transaksi tetap tersimpan di SQLite dan tidak dikirim otomatis. Tombol sync manual tetap tersedia; format antrean, ID/idempotensi, dan kebijakan konflik tidak berubah. Status UI menunjukkan keterjangkauan server, bukan sekadar Wi-Fi.
- `connectivity_plus` disetujui owner pada 2026-11-12 (DEC-POS-002). Tes konektivitas/API/widget terarah **6/6 PASS**; `flutter build apk --debug` **PASS**. `flutter analyze` tidak menemukan error, tetapi melaporkan info lint existing pada `main.dart` dan `settings_screen.dart`.
- `flutter test` seluruh suite **FAIL** pada satu ekspektasi pesan UI Windows di `database_lifecycle_test.dart`; kegagalan lama tersebut sudah tercatat pada status KUKI-MOB-DB-002 dan bukan bagian sinkronisasi. Android runtime serta iPadOS belum diuji. Rincian ada di `docs/modules/flutter-pos.md`.
- **Next READY AUTO:** `KUKI-CLEAN-002` (task cleanup terpisah; tidak dilanjutkan dalam scope ini).

## Identitas logo Admin dan POS — KUKI-ASSET-001 (DONE, 12 November 2026)
- Navbar Admin menggunakan `Kuki.png`; navbar POS menggunakan `Kuki-Mascot.png`; ikon aplikasi launcher POS Android/iOS memakai `Kuki.png`. Aset asli dipertahankan dan disalin ke `kasir/assets/branding/` agar Flutter dapat membundelnya.
- Navbar dan alur navigasi tidak diubah selain mengganti mark/icon dengan aset brand. Android ikon launcher dibuat pada lima density; iOS seluruh ukuran yang didefinisikan di AppIcon Contents.json dibuat dengan dimensi piksel yang tepat.
- `flutter build apk --debug` **PASS**; hash aset Flutter sama dengan file sumber, dan dimensi PNG launcher cocok dengan seluruh ukuran yang didefinisikan. Focused ESLint AdminLayout **FAIL** hanya pada error `react-hooks/set-state-in-effect` di effect notifikasi line 259, yang sudah ada dan tidak terkait patch logo. iOS build belum dapat diuji pada Windows.

## Perapian logo navbar Admin/Management — KUKI-ASSET-002 (DONE, 12 November 2026)
- Logo pada dua navbar diseragamkan menjadi 44×44 dengan `object-fit: contain`, tanpa border/background; wrapper Management yang menambah bingkai dihapus.
- ESLint `ManagementLayout.jsx` **PASS**. `git diff --check` pada file terkait menandai trailing whitespace existing di `admin.css:102`; tidak diubah karena di luar scope.

## Laporan Penjualan Management — KUKI-FIN-002 (DONE, 12 November 2026)
- Halaman yang tertaut di menu kini tersedia di `/management/laporan-penjualan` dan `/admin/management/laporan-penjualan`; sumbernya transaksi nyata dari tabel `pos_transaksi`, bukan mock.
- Ada filter tanggal (maksimal 93 hari), ringkasan total/jumlah/rata-rata, total per metode pembayaran, rincian transaksi berpaginasi, dan unduh CSV.
- Backend menggunakan Sanctum + Gate `view-management-dashboard`. Tidak mengubah data transaksi dan tidak menampilkan HPP/laba-rugi; keputusan DEC-FIN-001 masih pending.
- `npm run build`, ESLint frontend terarah, `php -l`, `route:list -v`, dan uji query/CSV SQLite in-memory **PASS**. PHPUnit feature test terarah terhalang migration lokal yang hanya mendukung MySQL, sedangkan test suite memakai SQLite. Tidak ada database toko yang diakses.

## Shift dan laporan POS — KUKI-MOB-SHIFT-001 (DONE)
- Dialog nominal modal awal dihapus; shift lokal dimulai dengan nominal nol dan Chrome memakai endpoint shift Laravel yang tersedia.
- Laporan pendapatan menggunakan total transaksi; estimasi kas shift tetap memasukkan modal tersimpan untuk shift lama serta transaksi tunai.
- Header autentikasi API mengirim bearer token. Flutter tests terarah **3/3 PASS**, analyzer terarah exit 0 (10 info lint), dan `flutter build web --debug` **PASS**. Login, shift, serta transaksi terhadap database MySQL nyata belum diuji.

## Guard readiness database POS — KUKI-MOB-DB-002 (DONE)
- `LocalDb.isOpen` dan `PosController.databaseReady` menyediakan status kesiapan SQLite; `syncPending()` sekarang melewati sync sebelum menyentuh DB yang belum terbuka.
- Tes lifecycle terarah PASS; `dart analyze` pada controller, DB, dan tes exit 0 tanpa error.
- Saat menjalankan seluruh `database_lifecycle_test.dart`, tes Windows lama gagal karena pesan yang dicari tidak ditampilkan oleh `KukiApp` saat ini; kegagalan itu tidak terkait readiness dan tidak diubah.

## Penyelarasan login kasir — KUKI-MOB-LOGIN-002 (DONE)
- Layar aktif kini meminta kode pegawai (contoh `KASIR01`) dan PIN, mengirim `kode`/`pin` ke `POST /api/pos/login`, lalu membaca token serta nama pegawai dari respons POS. Validasi PIN di layar mengikuti format server 4–8 digit.
- Tes Flutter client dan widget: **PASS (2/2)**. Analisis tiga file login: exit 0, tanpa error (10 info lint yang ada pada source). Analisis seluruh proyek masih menampilkan diagnostics di halaman legacy; runtime Android/iPadOS tidak diuji.
- Backend, akun/PIN, role, schema, dan transaksi tidak diubah. Rincian ada di `docs/logs/WORK_LOG.md`.

## Kompatibilitas client POS lama — KUKI-MOB-CLIENT-002 (DONE)
- Client di `kasir/lib/api_client.dart` kembali menyediakan singleton dan adapter ke endpoint POS yang dipakai halaman legacy (katalog, shift, transaksi, riwayat, laporan); login tetap memakai kode/PIN.
- `dart analyze` pada client dan enam halaman POS terkait exit 0 tanpa error (hanya 2 info lint). Backend dan aturan endpoint tidak diubah.

## Recovery error database Flutter — KUKI-MOB-DB-001 (DONE)
- Bukti laporan awal: stack trace Flutter web mencapai `didChangeAppLifecycleState` → `PosController.syncPending()` → `LocalDb.sales()` dan melempar `Bad state: Database belum dibuka`. `PosController.draft` juga dapat melempar `No element` bila daftar draft kosong. Gambar lanjutan menunjukkan `databaseFactory not initialized`, cocok dengan Windows desktop yang tidak didukung konfigurasi `sqflite` saat ini.
- Perubahan: web dan platform selain Android/iOS menampilkan pesan platform tidak didukung tanpa inisialisasi SQLite/orientasi tablet; lifecycle sync hanya berjalan saat database terbuka; authenticated shell tidak dibangun tanpa draft siap. Login tetap tersedia pada platform POS yang didukung saat pengguna belum terautentikasi.
- Verifikasi terbaru: focused Flutter tests Windows + sync tanpa DB + login PASS (3/3); `flutter analyze --no-pub` PASS; `flutter build web --release` PASS. Build web melaporkan warning font CupertinoIcons yang tidak ditemukan; build berhasil. Runtime Android/iPadOS belum diuji.
- Batas: tidak menambah database web/dependency, tidak mengubah API/login/transaksi, dan tidak mengubah desain POS tablet. KUKI-MOB-RECOVERY-001 tetap BLOCKED sampai build target iOS dapat diverifikasi.

## Pembaruan audit logika — KUKI-AUDIT-001 (BLOCKED; 2026-10-29)
- Perbaikan terverifikasi: pertanyaan lokasi yang menyebut kata produk tidak lagi memicu kartu; query nama produk exact hanya menampilkan exact match; kartu ditautkan FIFO ke pertanyaan pengguna yang menunggu; highlight menggunakan ID pesan unik; request chat/handover digandakan per sesi dicegah dan respons sesi lama diabaikan.
- Bug schema terverifikasi: migration nullable `metadata_ai` yang disebut sudah ada pada dokumen ternyata tidak ada di source. Migration additive forward-only dipulihkan sesuai DEC-QA-002; tidak dijalankan pada database persistent.
- Verifikasi: `npm run build` PASS; test algoritma chat PASS; ESLint terarah untuk `ChatWindow.jsx` dan matcher PASS; `php artisan test` PASS (49/49, 259 assertions); `flutter analyze` dan `flutter test` PASS. `npm run lint` tetap FAIL (25 errors/1 warning), termasuk dua error hook yang telah ada di `KukiAssistant.jsx`.
- **Keputusan owner:** Maps memang sengaja digunakan kembali; tidak diubah dan tidak diaudit lebih lanjut pada task ini (DEC-AUDIT-001).
- **Area approval:** worktree memuat login pegawai, absensi/shift, route dan transaksi POS. Audit menemukan permukaan ini, tetapi tidak mengubahnya karena keputusan auth/pegawai, referensi desain, dan kebijakan transaksi masih pending.
- `KUKI-AUDIT-001` BLOCKED untuk area POS/pegawai dan audit penuh yang tersisa. `.env` lokal tetap tidak dibuka; tidak ada migration production, seeding, atau deployment.

## Catatan historis — KUKI-MAP-001 (2026-10-29)
- Maps, peta interaktif, pencarian alamat, geolocation navigasi, dan rute interaktif sudah dihapus dari homepage dan API Laravel.
- Alamat toko teks biasa tetap ada pada Footer dan ContactPage; styling sosial, rekomendasi produk, dan pertanyaan populer di `kukiExperience.css` tetap dipertahankan. Folder Flutter `kasir/` tidak disentuh.
- Smoke browser terintegrasi pada `/` dan `/katalog`: halaman tampil dengan judul Kuki Bakehouse, tidak ada console/page error, selector peta berjumlah 0; alamat teks terlihat di homepage.
- `npm run build`: PASS (exit 0; peringatan chunk >500 kB tetap). `npm run lint`: FAIL (21 errors/1 warning); focused lint homepage juga menemukan satu `set-state-in-effect` yang sudah ada pada baseline.
- Laravel `route:list --except-vendor`: PASS (86 route); `route:list --path=kuki-maps`: tidak ada route Maps. `php artisan test`: 47 passed, 1 failed, 1 error; hasil sama sebelum patch.
- **Next READY AUTO:** tidak ada. Task `KUKI-POS-001` tetap aktif dan tidak termasuk scope perubahan ini.

## Keadaan terverifikasi — audit 2026-10-26 14:55 WIB
- Git root: `E:/Ekosistem-kuki`; branch `main`, HEAD `252e5b7` (`2026-10-23 bahasa`), tracking `origin/main`.
- Working tree sudah berisi banyak perubahan tracked dan untracked sebelum audit; tidak ada yang dibersihkan atau di-reset. Daftar rinci dapat diperoleh dengan `git status --short --branch`.
- Web: Node `v25.1.0`, npm `11.6.2`, React `19.3.0`, Vite `8.3.4`; `npm run build` **PASS** (exit 0), ada peringatan chunk >500 kB. Baseline `npm run lint` mencatat 24 errors/1 warning; setelah `KUKI-QA-002`–`KUKI-QA-004`, hasil terkini **21 errors/1 warning** (exit 1).
- Backend: PHP `8.5.0`, Composer `2.9.3`, Laravel `13.36.0`; `php artisan route:list --except-vendor` **PASS** (exit 0, 67 route terdaftar). Route management dashboard/laporan inventaris ditemukan; pendaftaran route bukan bukti role/API bekerja end-to-end.
- Backend test baseline awal: `php artisan test` **FAIL** (exit 2; 43 tes, 33 passed, 9 failed, 1 error). Setelah keputusan owner untuk auth/role, schema metadata, proteksi ledger, dan publikasi testimonial dicatat, migration additive serta ekspektasi test diselaraskan. Full suite terkini: **49 tests, 49 passed, 259 assertions** (exit 0). Migration teruji melalui SQLite in-memory; belum dijalankan terhadap production.
- Flutter `kasir/`: Flutter `3.35.7` stable, Dart `3.9.2`; source memuat login, shell POS, pesanan, riwayat, laporan, dan scanner. Audit 2026-11-06 via Dart SDK MCP: analyze **PASS** (no errors), widget test **PASS** (1 login test). Tidak ada perubahan kode Flutter pada sesi ini. Referensi POS dan keputusan auth/pegawai/transaksi masih pending; Android SDK/device status terakhir dicatat 2026-10-29 dan belum diperiksa ulang.
- Audit dan hasil nyata: [baseline-audit.md](./modules/baseline-audit.md). P0-001 tidak menjalankan migration/seed manual atau mengakses DB lokal; test terarah P0-004 memakai SQLite in-memory.

## Wajib diisi Agent pada sesi pertama
| Aspek | Hasil aktual | Bukti path/perintah | Terakhir dicek |
|---|---|---|---|
| Git root(s) dan working tree | `E:/Ekosistem-kuki`, `main`, dirty | `git status --short --branch`; HEAD `252e5b7` | 2026-10-26 |
| React version/build/lint | Build PASS; lint terkini FAIL 25 errors/1 warning | `npm run build`; `npm run lint` | 2026-10-29 |
| Laravel version/route/test | Laravel 13.36.0; 88 route; suite 49/49 pass, 259 assertions | `php artisan --version`; `php artisan route:list --except-vendor`; `php artisan test` | 2026-10-29 |
| Migrasi & schema & seed | NOT_AUDITED | Tidak diperiksa/dijalankan pada P0-001 | 2026-10-26 |
| Flutter project & SDK | Login kode/PIN; tests 5/5/analyze/debug APK PASS; debug HTTP hanya diizinkan ke emulator 10.0.2.2; iOS build belum diverifikasi | Dart SDK MCP analyze/run_tests; `flutter build apk --debug`; AAPT manifest inspect | 2026-11-07 |
| Referensi desain POS/absensi tersedia | NEED REFERENCE sesuai register; screenshot tidak diverifikasi | `docs/DESIGN_REFERENCE_REGISTER.md` | 2026-10-26 |
| Tes alur Admin/Owner/Inventory | Suite backend terkini PASS 49/49, 259 assertions; tidak mewakili semua alur end-to-end | `php artisan test`; rincian di [baseline-audit.md](./modules/baseline-audit.md) | 2026-10-26 |

## Saat ini
- **Active Task:** `KUKI-MOB-RECOVERY-001` BLOCKED; pemulihan Android dan test selesai, tetapi file baseline iOS `Podfile` tidak tersedia.
- **Last Done Task:** `KUKI-ADMIN-CSS-001` — menggabungkan styling Admin/Management ke `admin.css`.
- **Next READY AUTO:** `KUKI-CLEAN-002` — lanjutkan cleanup frontend/backend bertahap pada file bersih; pertahankan batas UI, auth, POS, Assistant, dan Maps.
- **Blocker/risiko:** Login memakai `POST /api/pos/login` dengan kode pegawai + PIN sesuai kontrak; endpoint route terdaftar dan request/response diuji dengan mock, tetapi akun pegawai aktif/PIN live belum diverifikasi. HTTP debug hanya diizinkan ke `10.0.2.2` (emulator); perangkat fisik perlu URL HTTPS untuk tetap memakai kebijakan aman. Build APK/debug manifest PASS, tetapi tidak ada emulator/perangkat Android yang tersambung untuk login live. `ios/Podfile` dibuat dari template Flutter SDK lokal yang revision-nya cocok dengan `.metadata`, dengan target iOS 13.0 sesuai Xcode project dan seizin owner. iOS tetap belum dapat diverifikasi karena host Windows tidak menyediakan macOS/Xcode/CocoaPods. Build web PASS dengan warning chunk >500 kB. Full `npm run lint` terakhir FAIL (16 errors/1 warning); sebagian temuan berada di file dirty/untracked atau area terlindungi dan tidak disentuh. Laravel suite baseline terakhir PASS (49/49, 259 assertions); tes katalog POS terarah 1/1 (7 assertions) PASS. Tidak ada akses database produksi; keputusan desain/otorisasi/transaksi POS lainnya tetap pending.
- **Risiko data:** Jangan eksekusi migrate/seed/database perubahan secara otomatis.
- **Catatan handoff:** Baca `docs/TASK_BOARD.md` lalu jalankan prompt `.github/prompts/00-start-autonomous.prompt.md`.

## Format update berikutnya (agent isi setelah setiap task)
```text
Updated at: 2026-10-26 15:20 WIB
Working tree & branch: main / dirty; HEAD 252e5b7
Task ID + status: KUKI-P0-002 / DONE (route inventory dan CSV authorization dites)
Changed paths: `web-katalog/src/services/laporanInventarisService.js`, `web-katalog/src/services/laporanInventarisExportService.js`, `backend-web-katalog/tests/Feature/LaporanInventarisAccessTest.php`; docs status/module/logs
Commands and exit status: `php artisan test tests/Feature/LaporanInventarisAccessTest.php` exit 0 (3 tests/28 assertions); `npm run build` exit 0; `npx eslint` dua service exit 0; `php -l` test exit 0
Tests: summary/CSV Admin+Owner PASS; guest 401; customer 403; input 422; unknown route 404
Blockers: P0-003 perlu tinjauan layout PDF; P0-004 root cause agregat produksi belum diketahui; baseline full lint/backend suite masih gagal
Next READY AUTO: none
```

### Task cleanup Homepage — 2026-11-06
- Permintaan awal ditahan sampai owner menentukan target; scope akhirnya Homepage/katalog dengan cleanup nonvisual.
- `KUKI-UI-CLEAN-001` **DONE**: lint terarah `HomePage.jsx` PASS dan `npm run build` PASS (warning chunk >500 kB tetap).
- Perubahan hanya di initializer visibility pada `HomePage.jsx`; tidak mengubah CSS, struktur section, route, data, atau alur testimonial.
- Tidak ada test browser/interaksi khusus dijalankan; perubahan tidak menyentuh markup maupun style. Detail command tercatat di WORK_LOG.

### Hasil cleanup lanjutan — 2026-11-06
- `KUKI-CODE-CLEAN-001` selesai: hapus binding tak terpakai di `ManagementLayout.jsx`; focused ESLint dan build PASS.
- `KUKI-BACKEND-CLEAN-001` selesai: Laravel Pint memformat satu notification class; Pint terarah, PHP syntax, dan 49/49 backend tests PASS.
- `KUKI-BACKEND-CLEAN-002` selesai: formatting-only controller laporan; Pint/PHP syntax PASS dan dua test suite laporan/ledger lulus (6 tes/52 assertions).
- `KUKI-BACKEND-CLEAN-003` selesai: format notification handover; Pint terarah dan PHP syntax PASS.
- `KUKI-BACKEND-CLEAN-004` selesai: 18 file PHP bersih yang terdeteksi drift diformat; Pint terarah serta full backend suite PASS (49/49).
- `KUKI-FRONTEND-CLEAN-001` selesai: reset state dipindahkan dari effect ke handler filter/retry pada dua file; focused ESLint PASS. Full ESLint ulang masih menemukan 21 errors dan 1 warning di file lain.
- `KUKI-CLEAN-002` masih IN_PROGRESS: batch pertama membersihkan `BarcodePrintButton.jsx`, `ImageUploadEditor.jsx`, dan `ProduksiHarianPage.jsx`; focused ESLint/build PASS, full lint turun dari 21 ke 17 errors/1 warning.
- Lanjutan `KUKI-CLEAN-002`: `ProdukVarianPage.jsx` juga lolos focused ESLint; build PASS. Full lint terakhir 16 errors/1 warning; temuan lain ada pada file dirty/untracked atau area Assistant/Maps/POS/inventory yang perlu penanganan terpisah.
- `KUKI-MOB-CATALOG-001` (2026-11-07): Katalog Flutter memakai `/api/pos/catalog` (sumber `katalog_produk`). Parsing model menolak field wajib yang malformed; tes model 3/3, widget test 1/1, endpoint Laravel 1/7 assertions PASS. Tidak mengakses database produksi; kontrak harga Rupiah bulat tidak diubah.
- Cleanup kode lainnya belum dapat dibatasi ke satu modul/file; `KUKI-CLEAN-002` BLOCKED, source lain tidak diubah.
- Flutter POS sudah memiliki source, bukan template counter. Analyze PASS dan widget test login PASS (1/1), tetapi implementasi lanjutan UI/alur kasir menunggu keputusan yang tercatat di `DECISIONS_PENDING.md`; tidak ada kode Flutter diubah.
