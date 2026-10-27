# STATUS PROYEK KUKI — Untuk Melanjutkan Sesi Copilot

**Terakhir disusun:** 26 Oktober 2026, 19:52 WIB
**Status:** DRAFT / BASELINE AUDIT AWAL SELESAI; AREA FITUR BELUM DIAUDIT MENYELURUH

## Keadaan terverifikasi — audit 2026-10-26 14:55 WIB
- Git root: `E:/Ekosistem-kuki`; branch `main`, HEAD `252e5b7` (`2026-10-23 bahasa`), tracking `origin/main`.
- Working tree sudah berisi banyak perubahan tracked dan untracked sebelum audit; tidak ada yang dibersihkan atau di-reset. Daftar rinci dapat diperoleh dengan `git status --short --branch`.
- Web: Node `v25.1.0`, npm `11.6.2`, React `19.3.0`, Vite `8.3.4`; `npm run build` **PASS** (exit 0), ada peringatan chunk >500 kB. Baseline `npm run lint` mencatat 24 errors/1 warning; setelah `KUKI-QA-002`–`KUKI-QA-004`, hasil terkini **21 errors/1 warning** (exit 1).
- Backend: PHP `8.5.0`, Composer `2.9.3`, Laravel `13.36.0`; `php artisan route:list --except-vendor` **PASS** (exit 0, 67 route terdaftar). Route management dashboard/laporan inventaris ditemukan; pendaftaran route bukan bukti role/API bekerja end-to-end.
- Backend test baseline awal: `php artisan test` **FAIL** (exit 2; 43 tes, 33 passed, 9 failed, 1 error). Setelah keputusan owner untuk auth/role, schema metadata, proteksi ledger, dan publikasi testimonial dicatat, migration additive serta ekspektasi test diselaraskan. Full suite terkini: **49 tests, 49 passed, 259 assertions** (exit 0). Migration teruji melalui SQLite in-memory; belum dijalankan terhadap production.
- Flutter `kasir/`: Flutter `3.35.7` stable, Dart `3.9.2`; audit P1 `KUKI-MOB-001` selesai. `flutter analyze` **PASS** (no issues); `flutter test` **PASS** (1 counter demo test). Android SDK terdeteksi, tetapi sebagian lisensi belum diterima dan tidak ada perangkat Android/emulator terdeteksi. Windows, Chrome, dan Edge tersedia; iOS build/test tidak dapat dijalankan di Windows.
- Audit dan hasil nyata: [baseline-audit.md](./modules/baseline-audit.md). P0-001 tidak menjalankan migration/seed manual atau mengakses DB lokal; test terarah P0-004 memakai SQLite in-memory.

## Wajib diisi Agent pada sesi pertama
| Aspek | Hasil aktual | Bukti path/perintah | Terakhir dicek |
|---|---|---|---|
| Git root(s) dan working tree | `E:/Ekosistem-kuki`, `main`, dirty | `git status --short --branch`; HEAD `252e5b7` | 2026-10-26 |
| React version/build/lint | React 19.3.0; build PASS; lint terkini FAIL 21 errors/1 warning | `npm ls react vite --depth=0`; `npm run build`; `npm run lint` | 2026-10-26 |
| Laravel version/route/test | Laravel 13.36.0; 67 route; baseline awal 33/43 pass; suite terkini 49/49 pass, 259 assertions | `php artisan --version`; `php artisan route:list --except-vendor`; `php artisan test` | 2026-10-26 |
| Migrasi & schema & seed | NOT_AUDITED | Tidak diperiksa/dijalankan pada P0-001 | 2026-10-26 |
| Flutter project & SDK | Flutter 3.35.7 / Dart 3.9.2; `flutter analyze` PASS dan `flutter test` PASS (1 demo test) | `flutter --version`; `flutter analyze`; `flutter test` | 2026-10-26 |
| Referensi desain POS/absensi tersedia | NEED REFERENCE sesuai register; screenshot tidak diverifikasi | `docs/DESIGN_REFERENCE_REGISTER.md` | 2026-10-26 |
| Tes alur Admin/Owner/Inventory | Suite backend terkini PASS 49/49, 259 assertions; tidak mewakili semua alur end-to-end | `php artisan test`; rincian di [baseline-audit.md](./modules/baseline-audit.md) | 2026-10-26 |

## Saat ini
- **Active Task:** `KUKI-POS-001` — UI kasir tablet dimulai dalam batas aman sebagai mockup single-screen dengan login + dashboard yang mempertahankan persyaratan Kuki; masih menunggu referensi desain final untuk menyelesaikan approval penuh.
- **Last Done Task:** `KUKI-QA-005` — keputusan owner diimplementasikan pada migration additive dan ekspektasi tes; full suite backend lulus 49/49.
- **Next READY AUTO:** Tidak ada. `KUKI-QA-002`–`004` memperbaiki tiga lint issue terisolasi; lint tersisa berada pada file lokal yang telah berubah atau memerlukan evaluasi behavior lebih lanjut. `KUKI-MOB-002` tetap NEED_APPROVAL dan memerlukan scope/dependency serta referensi POS.
- **Blocker/risiko:** Flutter masih belum aplikasi kasir siap pakai; saat ini hanya mockup login + dashboard yang dibuat dari referensi yang tersedia dan belum final. Android SDK belum menerima semua lisensi dan tiada device/emulator; iOS memerlukan macOS/Xcode. Lint penuh terkini masih FAIL untuk area web, bukan untuk Flutter. Migration `metadata_ai` belum dijalankan pada production; kebijakan login pegawai, absensi, dan integrasi mobile tetap pending. Task `KUKI-POS-001` tetap harus ditinjau ulang pada referensi atau approval final sebelum melangkah ke alur pembayaran/print/scan nyata.
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
