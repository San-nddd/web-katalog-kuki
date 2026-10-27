# ERROR LOG — Masalah Teknis Kuki

Catat error nyata, waktu, task, cara reproduksi, root cause (jika terbukti), command/test, solusi, status. **Jangan mencatat secret atau data pegawai.** Jangan mengarang detail error tanpa output asli.

## TEMPLATE
```text
### ERR-YYYYMMDD-001 — OPEN/RESOLVED/DEFERRED
Waktu + timezone:
Terkait TASK-ID:
Lingkungan dan command:
Ringkasan error (redaksi aman):
Reproduksi:
Dampak pengguna:
Hipotesis vs fakta:
Percobaan perbaikan (maks 2 untuk error yang sama):
Hasil nyata tes:
Keputusan/Next action:
```

Tidak ada insiden produksi baru yang diverifikasi. Temuan kegagalan lint/test audit dicatat berikut ini.

### ERR-20261026-001 — OPEN
Waktu + timezone: 2026-10-26 14:55 WIB
Terkait TASK-ID: KUKI-P0-001 (baseline audit; masalah ditemukan, bukan diperbaiki pada task audit).
Lingkungan dan command: Windows; `E:\Ekosistem-kuki\web-katalog`; `npm run lint` exit 1. `E:\Ekosistem-kuki\backend-web-katalog`; `php artisan test` exit 2.
Ringkasan error (redaksi aman): ESLint melaporkan 24 error dan 1 warning; Laravel PHPUnit melaporkan 43 test, 33 passed, 9 failed, 1 error.
Reproduksi: Jalankan ulang dua command di folder masing-masing. PHP test memakai konfigurasi PHPUnit `DB_CONNECTION=sqlite`, `DB_DATABASE=:memory:`.
Dampak pengguna: Belum ditentukan; merupakan temuan lint/test otomatis, bukan bukti terjadinya insiden produksi.
Hipotesis vs fakta: Fakta kegagalan dan ringkasan assertion tercatat pada `docs/modules/baseline-audit.md`. Penyebab mendasar belum diperiksa; jangan diasumsikan berasal dari task ini.
Percobaan perbaikan (maks 2 untuk error yang sama): Tidak ada; scope task hanya audit dan perubahan source dilarang/tidak diperlukan.
Hasil nyata tes: `npm run lint` FAIL; `php artisan test` FAIL. `npm run build` PASS; `php artisan route:list --except-vendor` PASS.
Keputusan/Next action: OPEN; analisis akar masalah harus menjadi task terpisah setelah pemeriksaan kode baseline dan risiko yang terkait.

### ERR-20261026-002 — RESOLVED
Waktu + timezone: 2026-10-26 15:11 WIB
Terkait TASK-ID: KUKI-P0-004
Lingkungan dan command: Windows; backend Laravel, PHPUnit memakai SQLite in-memory; `php artisan test tests/Feature/InventoryLedgerConsistencyTest.php` (dua kali, exit 1).
Ringkasan error (redaksi aman): Satu assertion menerima `data.produksi.jumlah = 0`, padahal data uji memasukkan `jumlah_produksi = 5` dan mutasi produksi sebesar 5 untuk periode laporan.
Reproduksi: Jalankan focused test di atas; test produksi mengirim POST ke endpoint produksi, memverifikasi produk/produksi/mutasi, lalu GET laporan dengan tanggal mutasi sebagai rentang.
Dampak pengguna: Belum ditentukan. Ketidakcocokan terjadi di test lokal; tidak diuji terhadap database production.
Hipotesis vs fakta: Raw SQLite mengonfirmasi nilai kolom date berisi `YYYY-MM-DD 00:00:00`. Perbandingan string `BETWEEN 'YYYY-MM-DD' AND 'YYYY-MM-DD'` mengecualikan nilai yang memiliki suffix jam saat batas akhir dibandingkan; date-only comparison mencakup seluruh hari. Bukan perbedaan tanggal/zona waktu antara baris produksi dan mutasi.
Percobaan perbaikan (maks 2 untuk error yang sama): Dua variasi tanggal awal tidak memperbaiki masalah. Setelah diagnosis raw DB/SQL, kedua query agregasi diubah ke `whereDate` (satu perbaikan akar masalah).
Hasil nyata tes: `php artisan test tests/Feature/InventoryLedgerConsistencyTest.php`: 3 test / 24 assertions PASS; mencakup ringkasan, agregasi harian, CSV, finalisasi opname, dan snapshot stale. `LaporanInventarisAccessTest.php`: 3/28 PASS. PHP syntax check controller dan test PASS. Selama penambahan assertion CSV, satu run awal gagal karena `fputcsv` menambahkan kutip pada field berisi spasi; assertion disesuaikan dengan output CSV sebenarnya, run berikutnya lulus.
Keputusan/Next action: RESOLVED pada fixture SQLite lokal. Tidak ada perubahan migration/schema, auth, ledger, atau data produksi; implementasi hanya membuat filter batas tanggal sesuai semantik hari kalender.

### ERR-20261026-003 — RESOLVED
Waktu + timezone: 2026-10-26 15:20 WIB
Terkait TASK-ID: KUKI-P0-003
Lingkungan dan command: Windows; Node 25.1.0 + Vite SSR, menjalankan service ekspor terhadap fixture CSV dummy. Harness awal Node tanpa polyfill browser gagal saat jsPDF membaca `window.atob`; setelah `window.atob`/`window.btoa` dipetakan ke fungsi Node, harness berjalan.
Ringkasan error (redaksi aman): Ekspor PDF menghasilkan blob valid, tetapi jsPDF-AutoTable mengeluarkan warning `Of the table content, 16 units width could not fit page`.
Reproduksi: Jalankan service `downloadLaporanInventarisPdf` dengan fixture satu baris dan stub unduhan; warning keluar sebelum hasil PDF dilaporkan.
Dampak pengguna: Belum diketahui tanpa render halaman PDF; berpotensi mempengaruhi tata letak/lebar kolom.
Hipotesis vs fakta: Fakta warning menyebut 16 unit lebar tabel tidak muat. Apakah ada kolom yang terpotong di file hasil belum diverifikasi secara visual.
Percobaan perbaikan (maks 2 untuk error yang sama): Tidak ada; perubahan layout/ekspor di luar scope validasi dan membutuhkan review desain.
Hasil nyata tes: Parser CSV, workbook Excel tiga sheet, signature PDF `%PDF-`, serta HTML cetak lolos pemeriksaan dummy; warning PDF tetap terbuka. Tes browser/print fisik NOT_RUN.
Keputusan/Next action: Owner kemudian menyetujui penyesuaian lebar tabel khusus (DEC-REPORT-002). Kolom Keterangan ditambah 16 mm; warning hilang pada fixture satu dan lima halaman dan render multipage diperiksa. Data produksi dan printer fisik tetap NOT_RUN.

### ERR-20261026-004 — RESOLVED
Waktu + timezone: 2026-10-26 15:20 WIB
Terkait TASK-ID: KUKI-P0-002
Lingkungan dan command: Windows; `php artisan test tests/Feature/LaporanInventarisAccessTest.php`.
Ringkasan error (redaksi aman): Request ekspor CSV guest dengan header `Accept: text/csv, application/json` menerima 500 `Route [login] not defined` alih-alih 401.
Reproduksi: Test route ekspor menggunakan header `Accept` yang sama seperti service frontend; summary JSON tidak mengalami masalah ini.
Dampak pengguna: Guest/token tidak valid pada route CSV dapat menerima 500 HTML/error route login alih-alih respons API 401 yang dapat ditangani.
Hipotesis vs fakta: Fakta: prioritas media type `text/csv` menghindari jalur `expectsJson()` autentikasi Laravel dan memicu redirect; setelah urutan diganti, test terarah lulus. Tidak ada perubahan pada auth/Gate.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu perubahan minimal: kedua service downloader mengurutkan `application/json` terlebih dahulu.
Hasil nyata tes: 3 test/28 assertion PASS; summary+CSV Admin/Owner 200, guest 401, customer 403, tanggal invalid 422, route unknown 404. Build frontend dan ESLint service terkait PASS.
Keputusan/Next action: RESOLVED untuk preferensi response auth CSV; tidak mengubah layout, role, schema, atau API.

### ERR-20261026-005 — RESOLVED
Waktu + timezone: 2026-10-26 15:48 WIB
Terkait TASK-ID: KUKI-P0-003
Lingkungan dan command: Fixture Node/Vite SSR menggunakan mock browser untuk validasi logo pada XLSX/PDF/cetak.
Ringkasan error (redaksi aman): Percobaan awal harness berhenti dengan `window.setTimeout is not a function` saat cleanup URL blob; mock `window` belum menyediakan timer yang digunakan aplikasi.
Reproduksi: Jalankan ekspor Excel melalui service dengan mock `window` tanpa `setTimeout`.
Dampak pengguna: Tidak ada; kegagalan hanya pada harness Node, bukan pada browser/aplikasi.
Hipotesis vs fakta: Fakta: mock window tidak lengkap; setelah `setTimeout` native dipasang pada mock, ekspor fixture berlanjut. Tidak ada perubahan source aplikasi untuk error ini.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu koreksi pada fixture: sediakan timer native di mock window.
Hasil nyata tes: XLSX berisi logo pada tiga sheet, PDF berisi objek PNG, halaman cetak memuat data URI dan memanggil print; seluruh pemeriksaan PASS. Warning layout PDF terdokumentasi terpisah pada ERR-20261026-003.
Keputusan/Next action: RESOLVED; perbaikan hanya pada harness sementara, tidak ada file harness ditambahkan ke repo.

### ERR-20261026-006 — RESOLVED (assertion fixture)
Waktu + timezone: 2026-10-26 16:17 WIB
Terkait TASK-ID: KUKI-P0-003
Lingkungan dan command: Node/Vite SSR membuat fixture PDF multipage; cek byte PDF dan render viewer Chrome.
Ringkasan error (redaksi aman): Pemeriksaan awal harness menyatakan gagal karena membandingkan jumlah objek PNG PDF (2 resource) dengan jumlah halaman (5), dengan asumsi keliru bahwa jsPDF membuat salinan objek gambar untuk setiap halaman.
Reproduksi: Generate laporan dummy 45 baris; PDF valid berisi 5 halaman dan 2 image resource, tetapi assertion `images >= pages` gagal.
Dampak pengguna: Tidak ada; kegagalan adalah assertion internal harness, bukan masalah ekspor PDF.
Hipotesis vs fakta: Fakta: file memiliki signature PDF, 5 page object, dan image resource; rendering visual memperlihatkan logo pada kop halaman pertama dan halaman lanjutan. Satu image resource dapat direferensikan ulang oleh halaman PDF, jadi jumlah resource bukan pengukuran jumlah pemakaian.
Percobaan perbaikan (maks 2 untuk error yang sama): Pemeriksaan disesuaikan untuk mengukur PDF multi-page dan keberadaan gambar, lalu file divisualisasikan di Chrome. Tidak ada kode aplikasi yang diubah.
Hasil nyata tes: Pemeriksaan byte PASS (5 halaman, 2 shared image resources). Screenshot viewer menunjukkan logo dan isi tabel pada render multi-page. Setelah lebar kolom disetujui, fixture satu/lima halaman tidak lagi menghasilkan warning AutoTable.
Keputusan/Next action: RESOLVED untuk validasi fixture. P0-003 DONE dengan keterbatasan; pengujian database produksi dan printer fisik tidak diklaim.

### ERR-20261026-007 — RESOLVED
Waktu + timezone: 2026-10-26 16:55 WIB
Terkait TASK-ID: KUKI-QA-001
Lingkungan dan command: Windows; Laravel/PHPUnit memakai SQLite in-memory; `php artisan test` sebelum dan sesudah patch.
Ringkasan error (redaksi aman): Suite awal pada tindak lanjut berisi 49 tes (39 pass, 9 fail, 1 error). Dua tes Assistant menerima 503 karena `null` diteruskan ke parameter service `string`, walaupun `session_id` opsional dan service sudah menyediakan fallback UUID.
Reproduksi baseline: `php artisan test` menunjukkan dua tes Assistant yang mengharapkan sukses menerima 503; log testing mencatat `Argument #1 ($sessionId) must be of type string, null given`. Setelah patch, kedua jalur dijalankan terarah menggunakan filter nama tes dan lulus.
Dampak pengguna: Chat Assistant tanpa session ID menerima 503, sehingga klien tidak memperoleh sesi otomatis.
Hipotesis vs fakta: Akar sebab terbukti dari log test dan signature `KukiAssistantService::chat(string $sessionId, ...)`; controller mengirim nilai nullable yang divalidasi route.
Percobaan perbaikan (maks 2 untuk error yang sama): Parameter session diubah menjadi `?string` agar fallback UUID yang sudah ada dapat berjalan. Pemeriksaan sintaks juga menemukan deprecation pada `int $productId = null`; tipe diperjelas menjadi `?int` agar nullability eksplisit.
Hasil nyata tes: tes terarah PASS (2 tests/5 assertions); `php -l app/Services/KukiAssistantService.php` PASS tanpa deprecation. Setelah owner menyetujui keputusan DEC-QA-001..004, `php artisan test` penuh PASS: 49 tests / 259 assertions. Migration schema berjalan hanya dalam SQLite in-memory test; tidak dijalankan pada production.
Keputusan/Next action: RESOLVED. Perilaku auth/role, ledger, dan publikasi dipertahankan dengan ekspektasi tes yang sesuai; kolom metadata ditambahkan lewat migration forward-only. Tidak ada migration production.

### ERR-20261026-008 — RESOLVED (satu temuan)
Waktu + timezone: 2026-10-26 18:39 WIB
Terkait TASK-ID: KUKI-QA-002
Lingkungan dan command: Windows; `web-katalog`; ESLint dan Vite build.
Ringkasan error (redaksi aman): Full ESLint melaporkan 24 errors/1 warning. Satu error `react-hooks/purity` muncul karena `Date.now()` dipanggil langsung saat render di initializer state countdown ChatWindow.
Reproduksi: `npx eslint src/components/ChatWindow.jsx` exit 1 pada `useState(Date.now())`.
Dampak pengguna: Tidak ada dampak fungsional yang dikonfirmasi; rule mendeteksi render tidak murni dan nilai waktu bisa dibuat ulang pada render.
Hipotesis vs fakta: File kandidat tidak memiliki perubahan lokal. Lazy initializer menghasilkan timestamp pada mount dan mempertahankan interval/update countdown yang sama.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu perubahan terlokalisasi `useState(() => Date.now())`.
Hasil nyata tes: ESLint terarah PASS; `npm run build` PASS dengan warning chunk >500 kB; full `npm run lint` terakhir setelah QA-002..004 tetap FAIL, 21 errors/1 warning.
Keputusan/Next action: Error spesifik ChatWindow resolved. Temuan lint lain ditahan: file-file terkait memiliki perubahan lokal atau memerlukan evaluasi behavior/UI. Tidak ada dependency baru.

### ERR-20261026-009 — RESOLVED (satu temuan)
Waktu + timezone: 2026-10-26 18:41 WIB
Terkait TASK-ID: KUKI-QA-003
Lingkungan dan command: Windows; `web-katalog`; ESLint dan Vite.
Ringkasan error (redaksi aman): ESLint melaporkan state `currentIndex` dideklarasikan tetapi nilainya tidak pernah digunakan dalam `ProductCarousel.jsx`.
Reproduksi: `npx eslint src/components/ProductCarousel.jsx` exit 1 dengan satu error `no-unused-vars`.
Dampak pengguna: Tidak ada perilaku tampilan yang bergantung pada nilai state tersebut; posisi carousel ditentukan `currentIndexRef`/`translateX`.
Hipotesis vs fakta: Pencarian semua pemakaian membuktikan state hanya disetel dua kali dan tidak pernah dibaca. Pemanggilan setter hanya memicu render ekstra.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu patch menghapus state dan kedua setter; ref dan translateX tidak diubah.
Hasil nyata tes: Focused ESLint PASS; `npm run build` PASS dengan peringatan chunk >500 kB; full lint turun 23→22 errors (warning tetap 1).
Keputusan/Next action: Temuan ini resolved. File dipastikan tidak memiliki perubahan lokal sebelum patch; tidak ada perubahan desain/layout.

### ERR-20261026-010 — RESOLVED (satu temuan)
Waktu + timezone: 2026-10-26 18:43 WIB
Terkait TASK-ID: KUKI-QA-004
Lingkungan dan command: Windows; `web-katalog`; ESLint dan Vite.
Ringkasan error (redaksi aman): ESLint melaporkan nilai state `varianDipilih` dideklarasikan tetapi tidak pernah dibaca pada `DetailProdukPage.jsx`.
Reproduksi: `npx eslint src/pages/DetailProdukPage.jsx` exit 1 dengan satu error `no-unused-vars`.
Dampak pengguna: Tidak ada perubahan visual; dropdown varian memiliki state lokal dan tetap merespons pemilihan. Nilai callback parent sebelumnya tidak pernah dipakai.
Hipotesis vs fakta: Source menunjukkan callback hanya menjalankan setter state yang tak dibaca. Prop callback yang dihapus bukan sumber state pilihan child.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu patch menghapus deklarasi state parent dan prop `onChange` saja.
Hasil nyata tes: Focused ESLint PASS; `npm run build` PASS dengan warning chunk >500 kB; full lint berkurang 22→21 errors (warning tetap 1).
Keputusan/Next action: Temuan resolved; tidak mengubah selector, ringkasan, API, atau layout visual.
