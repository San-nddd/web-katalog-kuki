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

## 2026-10-29 — KUKI-MAP-001: batasan validasi dan perintah awal
- **Kesalahan perintah awal:** `npm run build`, `npm run lint`, `php artisan route:list`, dan `php artisan test` pertama kali dipanggil dari root repo, sehingga gagal (npm tidak menemukan `package.json`; PHP tidak menemukan `artisan`). `npm uninstall leaflet` yang tidak sengaja dipanggil dari root membuat dua manifest kosong; keduanya diperiksa dan dihapus karena dibuat oleh perintah tersebut. Tidak ada perubahan lain yang dibersihkan.
- **Solusi:** Jalankan perintah frontend setelah `Set-Location web-katalog` dan Artisan setelah `Set-Location backend-web-katalog`. Hasil build, lint, route, dan tes final dicatat di WORK_LOG; path Maps memang tidak terdaftar.
- **Lint baseline:** Full ESLint sebelum patch FAIL dengan 24 errors/4 warnings; sesudah Maps dihapus tersisa 21 errors/1 warning. Focused lint `HomePage.jsx` gagal pada `set-state-in-effect` (sebelum patch juga terdeteksi pada baris 457; sesudah removal pada baris 456). Tidak terkait implementasi Maps; tidak diubah di luar scope.
- **Test baseline Laravel:** `php artisan test` sebelum dan sesudah patch menghasilkan 47 passed, 1 failed, 1 error (exit 2). Failure teramati pada `ProdukApiTest::test_produk_dapat_ditambahkan_dengan_token` (HTTP 500); error teramati pada `AssistantApiTest::test_chat_dengan_product_id_mengirim_konteks_produk_ke_openrouter` karena kolom `metadata_ai` tidak tersedia pada tabel SQLite test. Penyebab belum ditelusuri pada task ini; tidak ada perubahan test/schema/database.
- **Status:** Blocker ini tidak disebabkan oleh penghapusan Maps dan tidak mengubah penerimaan KUKI-MAP-001. Jangan klaim full lint atau suite Laravel lulus.

### ERR-20261029-001 — RESOLVED
Waktu + timezone: 2026-10-29 WIB
Terkait TASK-ID: KUKI-AUDIT-001
Lingkungan dan command: Node 25; `web-katalog`; `node tests/test-chat-products.mjs` dan ESLint terarah.
Ringkasan error: Query lokasi toko yang menyebut nama/kategori produk seperti “roti” salah diklasifikasikan sebagai permintaan produk; `ChatWindow` juga memakai variabel `questionForReply` yang ditulis ulang di callback render.
Reproduksi: Sebelum patch, `selectProductsForChat(catalog, 'Di mana lokasi toko roti?')` mengembalikan produk roti. Focused ESLint menemukan `react-hooks/immutability` pada `ChatWindow.jsx`.
Dampak pengguna: Kartu produk tidak relevan dapat ditampilkan untuk permintaan lokasi, dan pemasangan kartu pada balasan bergantung pada variabel mutable selama render.
Hipotesis vs fakta: Reproduksi Node menghasilkan kartu ID 2 pada pertanyaan lokasi. Kode matcher memang memberi prioritas pada cue kata produk, dan mapper hanya menyimpan pertanyaan terakhir.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu patch menjadikan intent produk eksplisit sebagai prioritas saat ada cue nonproduk; helper membangun pasangan jawaban FIFO tanpa mutasi render.
Hasil nyata tes: Test regresi matcher PASS; focused ESLint `ChatWindow.jsx`/matcher PASS; build PASS.
Keputusan/Next action: RESOLVED untuk classifier dan pairing. Tidak mengubah kartu visual, harga, API, atau data produk.

### ERR-20261029-002 — RESOLVED
Waktu + timezone: 2026-10-29 WIB
Terkait TASK-ID: KUKI-AUDIT-001 / DEC-QA-002
Lingkungan dan command: Laravel + PHPUnit SQLite in-memory; `php artisan test`.
Ringkasan error: Full test suite gagal 2 kasus terkait produk/Assistant; `katalog_produk` tidak mempunyai kolom `metadata_ai`.
Reproduksi: Full suite baseline menghasilkan 47 passed, 1 failed, 1 error; test Assistant menampilkan SQLite `no column named metadata_ai`. Penelusuran seluruh migration menunjukkan migration yang disebut dalam keputusan/docs tidak ada di source saat audit.
Dampak pengguna: Payload metadata bahan produk menyebabkan insert/update produk atau test konteks Assistant gagal pada schema tanpa kolom tersebut.
Hipotesis vs fakta: Kode model/controller/service dan test menggunakan `metadata_ai`; semua migration aktual tidak menambah kolom itu.
Percobaan perbaikan (maks 2 untuk error yang sama): Migration additive nullable `longText` forward-only ditambahkan sesuai approval DEC-QA-002. Tidak menjalankan migrasi terhadap database persistent.
Hasil nyata tes: `php artisan test` PASS 49 tests/259 assertions; focused Produk + Assistant PASS 17 tests/76 assertions; `php -l` migration PASS.
Keputusan/Next action: RESOLVED untuk test SQLite lokal. Migration production belum dijalankan; jangan menganggap schema production telah berubah.

### ERR-20261029-003 — OPEN (baseline lint)
Waktu + timezone: 2026-10-29 WIB
Terkait TASK-ID: KUKI-AUDIT-001
Lingkungan dan command: Windows; `web-katalog`; `npm run lint`.
Ringkasan error: Full ESLint masih gagal dengan 25 errors dan 1 warning. Focused lint `KukiAssistant.jsx` melaporkan dua `set-state-in-effect` pada effect pemuatan katalog dan polling.
Reproduksi: Jalankan `npm run lint` dari `web-katalog`, atau `npx eslint src/components/KukiAssistant.jsx`.
Dampak pengguna: Belum ditentukan; warning/error lint bukan bukti langsung regresi runtime.
Hipotesis vs fakta: Output ESLint teramati. Penyebab dan dampak seluruh temuan lain belum diaudit. Dua error terarah bukan disebabkan guard sesi pada task ini; tidak ada perubahan pada effect tersebut.
Percobaan perbaikan (maks 2 untuk error yang sama): Tidak ada; perbaikan effect bukan bagian dari akar bug sesi dan membutuhkan task terpisah.
Hasil nyata tes: Focused lint untuk matcher dan `ChatWindow.jsx` PASS; full lint FAIL (25/1); build PASS.
Keputusan/Next action: OPEN. Buat task tersendiri untuk menilai error lint satu per satu; jangan menonaktifkan aturan atau mengklaim full lint lulus.

### ERR-20261029-004 — RESOLVED
Waktu + timezone: 2026-10-29 WIB
Terkait TASK-ID: KUKI-AUDIT-001
Lingkungan dan command: Node; `web-katalog`; test `test-chat-message-identity.mjs`.
Ringkasan error: Highlight menggunakan penggabungan sender + teks, sehingga dua pesan identik dari pengirim yang sama memiliki key dan node scroll yang sama.
Reproduksi: Buat dua pesan bot dengan teks identik tetapi ID server berbeda; key lama menghasilkan nilai yang sama karena ID diabaikan.
Dampak pengguna: Menandai atau menghapus highlight satu pesan dapat memengaruhi pesan identik lain; tautan scroll dapat menuju node yang salah.
Hipotesis vs fakta: Fakta dari implementasi `pinKey` dan `messageNodesRef`, ditambah regression test dengan dua ID pesan berbeda.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu patch memakai sender + ID pesan yang sudah dinormalisasi.
Hasil nyata tes: Test identity PASS; focused ESLint `ChatWindow.jsx` dan helper PASS; build PASS.
Keputusan/Next action: RESOLVED. Highlight tetap tersimpan hanya di memori komponen sesuai requirement.

### ERR-20261029-005 — RESOLVED
Waktu + timezone: 2026-10-29 WIB
Terkait TASK-ID: KUKI-AUDIT-001
Lingkungan dan command: Node; test matcher katalog.
Ringkasan error: Pertanyaan nama produk lengkap seperti “Berapa harga Saltbread OG?” dapat mengembalikan produk lain yang hanya memiliki kategori “Saltbread”.
Reproduksi: Fixture berisi `Saltbread OG` dan `Saltbread Coklat`; hasil awal berdasarkan token kategori dapat mengembalikan keduanya.
Dampak pengguna: Kartu produk kurang spesifik saat pelanggan menanyakan harga/nama item yang exact.
Hipotesis vs fakta: Skor kategori/partial match tetap menyertakan item lain walau nama produk exact ada dalam query.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu patch mengembalikan exact name match lebih dahulu; query kategori tanpa nama lengkap tetap memakai pemeringkatan yang ada.
Hasil nyata tes: `node tests/test-chat-products.mjs` PASS; focused ESLint dan `npm run build` PASS.
Keputusan/Next action: RESOLVED. Sumber harga/stok tetap katalog Laravel.

### ERR-20261107-001 — RESOLVED
Waktu + timezone: 2026-11-07 WIB
Terkait TASK-ID: KUKI-MOB-RECOVERY-001
Lingkungan dan command: Windows; Flutter widget test pada `kasir/`.
Ringkasan error: Test masih memanggil `KukiPosApp` dan mengharapkan label login dari screen lama setelah entry point berpindah ke `KukiApp`.
Reproduksi: Dart analyze melaporkan `creation_with_non_type`; test awal gagal compile. Setelah nama class disesuaikan, test gagal pada label lama dan mendeteksi overflow karena ukuran default bukan viewport tablet.
Dampak pengguna: Test tidak bisa memvalidasi login source saat ini; overflow hanya muncul pada fixture test kecil, bukan hasil build Android.
Hipotesis vs fakta: Nama class terbukti berbeda pada `main.dart` dan `widget_test.dart`; string aktual `Masuk ke Kasir`, `Email kasir`, `Kata sandi` ada pada login screen. Fixture landscape 1280x800 menghindari viewport uji yang tidak mewakili tablet.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu perubahan test menyamakan widget/label dan mengatur ukuran tablet; tidak mengubah UI production.
Hasil nyata tes: Widget test terarah PASS (1/1); analyze PASS; Android debug build PASS.
Keputusan/Next action: RESOLVED untuk test contract; tidak menyiratkan seluruh alur login atau server telah diuji.

### ERR-20261107-002 — OPEN
Waktu + timezone: 2026-11-07 WIB
Terkait TASK-ID: KUKI-MOB-RECOVERY-001
Lingkungan dan command: Windows; inspeksi `kasir/ios/` dan riwayat Git.
Ringkasan error: `kasir/ios/Podfile` tidak ada, walau project iOS dan dependency plugin tercantum.
Reproduksi: Pemeriksaan file menghasilkan `Test-Path=False`; `git ls-tree` dan `git log --all -- kasir/ios/Podfile` tidak menunjukkan versi tracked.
Dampak pengguna: Integrasi CocoaPods/build iOS belum dapat dibuktikan; iPadOS belum dapat dinyatakan siap.
Hipotesis vs fakta: Ketiadaan file serta riwayat kosong terverifikasi. Penyebab penghapusan/tidak pernah dibuat dan isi versi sebelumnya tidak diketahui.
Percobaan perbaikan (maks 2 untuk error yang sama): Owner menyatakan backup tidak tersedia dan mengizinkan pembuatan. `kasir/ios/Podfile` dibuat dari template Flutter SDK lokal yang revision-nya sama dengan `.metadata`; target 13.0 mengikuti `Runner.xcodeproj`.
Hasil nyata tes: Android debug build PASS. Isi Podfile cocok dengan template SDK lokal; validasi Ruby/CocoaPods/iOS build NOT_RUN (Ruby/CocoaPods/Xcode tidak tersedia pada host Windows).
Keputusan/Next action: OPEN sampai `pod install` dan build diverifikasi di macOS/Xcode; file lama yang hilang tidak dapat dipulihkan dari Git.

### ERR-20261107-003 — RESOLVED
Waktu + timezone: 2026-11-07 WIB
Terkait TASK-ID: KUKI-MOB-LOGIN-001
Lingkungan dan command: Flutter client; audit kontrak source Laravel dan `php artisan route:list --path=pos/login`.
Ringkasan error: Login Flutter mengirim email/password ke endpoint Admin (`/api/login`), sedangkan login kasir backend menerima kode pegawai/PIN di `/api/pos/login`.
Reproduksi: Bandingkan `LoginScreen`/`ApiClient.login` dengan `routes/pos.php` dan `PosController::login`; route POS terdaftar dan memvalidasi field `kode`, `pin`.
Dampak pengguna: Kasir tidak dapat memakai kredensial kode/PIN POS melalui layar login baru.
Hipotesis vs fakta: Mismatch endpoint dan payload terverifikasi langsung pada client dan controller. Legacy screen menunjukkan format kode `KASIR01`; itu bukan bukti akun tersebut tersedia di database.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu patch Flutter memakai endpoint POS existing, memetakan token/nama pegawai, serta menampilkan field kode/PIN. Catalog path juga diarahkan ke route POS aktual setelah login.
Hasil nyata tes: API client mock + widget test PASS (2/2); Dart analyze PASS; route-list PASS; tidak ada autentikasi ke akun/server live.
Keputusan/Next action: RESOLVED untuk contract mismatch. Jika login masih ditolak, Admin perlu memastikan kode pegawai aktif dan PIN yang sesuai pada backend; jangan kirim PIN melalui chat.

### ERR-20261107-004 — RESOLVED (runtime belum diuji)
Waktu + timezone: 2026-11-07 WIB
Terkait TASK-ID: KUKI-MOB-CONNECTION-001
Lingkungan dan command: Windows, Android debug APK; probe lokal Laravel tanpa kredensial.
Ringkasan error: Kemungkinan koneksi HTTP dari Android Emulator ke endpoint Laravel ditolak oleh kebijakan cleartext default Android.
Reproduksi/bukti: Default URL app `http://10.0.2.2:8000`; manifest debug tidak memiliki network security config; endpoint lokal membalas HTTP 422 JSON (server/route hidup). Tidak ada Android device/emulator terhubung untuk mereproduksi error UI secara langsung.
Dampak pengguna: Permintaan login dari emulator dapat gagal sebelum mencapai endpoint; pada perangkat fisik alamat 10.0.2.2 juga bukan host komputer.
Hipotesis vs fakta: Ketiadaan pengecualian cleartext dan URL HTTP terverifikasi; penyebab spesifik pesan runtime belum ditangkap log Android karena tidak ada emulator yang terhubung.
Percobaan perbaikan: Pengecualian cleartext ditambahkan hanya untuk `10.0.2.2` pada Android debug; domain lain tetap cleartext-disabled.
Hasil nyata tes: Debug APK build PASS; AAPT mengonfirmasi konfigurasi tergabung; probe Laravel menerima 422. Runtime login NOT_RUN.
Keputusan/Next action: RESOLVED untuk hambatan konfigurasi emulator yang teridentifikasi; jika masih gagal, periksa alamat server/perangkat dan gunakan HTTPS untuk tablet fisik. Jangan kirim PIN lewat chat.

### ERR-20261107-005 — RESOLVED (runtime device belum diuji)
Waktu + timezone: 2026-11-07 WIB
Terkait TASK-ID: KUKI-MOB-DB-001
Lingkungan: Stack trace awal Flutter web debug (`js_dev_runtime`); gambar lanjutan menunjukkan `databaseFactory not initialized`, cocok dengan Windows desktop yang mencoba memakai `sqflite` tanpa database factory platform. POS memakai SQLite `sqflite` tanpa dukungan FFI Windows.
Ringkasan error: Lifecycle dapat memanggil sync saat database belum dibuka (`Bad state: Database belum dibuka`); Windows desktop gagal menyiapkan database (`databaseFactory not initialized`); empty draft juga dapat memicu `Bad state: No element`.
Bukti: Stack awal menunjukkan `didChangeAppLifecycleState` → `PosController.syncPending()` → `LocalDb.sales()` → getter `LocalDb.db`. Gambar berikutnya menyebut `databaseFactory not initialized`. Getter `draft` fallback ke `drafts.first` bila koleksi kosong.
Dampak: Browser/Windows tidak memiliki storage POS yang dikonfigurasi, lalu aplikasi crash alih-alih memberi pesan platform tidak didukung.
Perbaikan: Hanya Android/iOS yang menginisialisasi DB dan orientasi tablet; web/Windows/target lain menampilkan pesan platform yang didukung. Lifecycle sync tetap diguard saat DB belum terbuka; shell POS menunggu DB/draft siap.
Hasil tes nyata: Flutter analyze PASS; tes guard Windows, sync tanpa DB, dan widget login PASS (3/3); build web release PASS. Runtime Android/iPadOS belum diuji. Warning CupertinoIcons pada build web bukan kegagalan build.
Status: RESOLVED untuk batas platform dan guard yang diuji; runtime perangkat tetap NOT_RUN.

### ERR-20261110-001 — RESOLVED
Waktu + timezone: 2026-11-10 WIB
Terkait TASK-ID: KUKI-MOB-LOGIN-002
Lingkungan dan command: Flutter tests Windows; `test/api_client_test.dart` dan `test/widget_test.dart`.
Ringkasan error: Layar login aktif mengirim Email/password ke endpoint Admin, sedangkan API POS hanya menerima kode pegawai dan PIN.
Reproduksi: Baseline tests gagal: client mengharapkan role dari respons `/api/auth/login` dan widget tidak menemukan field kode pegawai.
Dampak pengguna: Kasir tidak dapat memakai ID seperti `KASIR01` dan PIN untuk masuk melalui layar aplikasi yang aktif.
Hipotesis vs fakta: Terbukti dari entry point `KukiApp`, parameter `PosController.login`, kontrak validator Laravel `POST /api/pos/login`, dan output dua tes gagal.
Percobaan perbaikan (maks 2 untuk error yang sama): Satu perubahan menyelaraskan form, controller, dan Flutter API client ke payload/respons POS; backend tidak diubah.
Hasil nyata tes: Kedua tes terarah PASS (2/2); analisis tiga file terarah exit 0, tanpa error. Runtime akun kasir belum diuji.
Keputusan/Next action: RESOLVED untuk kontrak aplikasi. Uji login pada perangkat/server yang disetujui sebelum operasional; jangan mengirim PIN lewat chat.

### ERR-20261110-002 — RESOLVED
Waktu + timezone: 2026-11-10 WIB
Terkait TASK-ID: KUKI-MOB-CLIENT-002
Lingkungan dan command: Flutter/Dart analyzer pada `kasir`.
Ringkasan error: Halaman riwayat dan pesanan mereferensikan `ApiClient.instance`, tetapi client root hanya menyediakan constructor instance biasa dan tidak memiliki helper API legacy.
Reproduksi: `dart analyze lib/history_page.dart lib/orders_page.dart` menghasilkan tiga error `undefined_getter`.
Dampak pengguna: Halaman riwayat/pesanan lama tidak dapat dianalisis dan client tidak menyediakan pemanggilan endpoint yang dipakai halaman tersebut.
Hipotesis vs fakta: Terbukti dari analyzer, referensi halaman POS, dan route POS backend yang sudah tersedia.
Percobaan perbaikan (maks 2 untuk error yang sama): Menambahkan singleton dan adapter client bertipe yang diperlukan; tidak mengubah route/backend.
Hasil nyata tes: Analisis enam file terkait exit 0 tanpa error; tes Flutter API/widget lulus 2/2.
Keputusan/Next action: RESOLVED untuk error analyzer; validasi runtime transaksi tetap mengikuti approval dan prosedur operasional.

### ERR-20261110-003 — RESOLVED (tes Windows terpisah masih gagal)
Waktu + timezone: 2026-11-10 WIB
Terkait TASK-ID: KUKI-MOB-DB-002
Lingkungan dan command: `kasir`; Dart analyzer dan Flutter test terarah.
Ringkasan error: Lifecycle test merujuk `PosController.databaseReady`, tetapi getter tersebut belum tersedia; sync juga belum memeriksa apakah SQLite terbuka.
Reproduksi: Analyzer pada `test/database_lifecycle_test.dart` melaporkan `undefined_getter`; tes khusus sync memverifikasi kondisi database belum dibuka.
Dampak pengguna: Status kesiapan database tidak dapat dipakai, dan percobaan sync berpotensi mengakses database tertutup.
Hipotesis vs fakta: Fakta diverifikasi dari analyzer, `_db` privat pada `LocalDb`, dan jalur baca queue pada `syncPending()`.
Percobaan perbaikan (maks 2 untuk error yang sama): Tambahkan getter readiness pada DB/controller dan guard sync.
Hasil nyata tes: Tes sync terarah PASS; analyzer tiga file exit 0 tanpa error. Tes file lengkap masih gagal pada ekspektasi pesan UI Windows yang tidak ditemukan oleh `KukiApp`; tidak disebabkan getter/sync.
Keputusan/Next action: Error getter resolved. Ketidakcocokan tes tampilan Windows perlu task terpisah.

### ERR-20261110-004 — RESOLVED
Waktu + timezone: 2026-11-10 WIB
Terkait TASK-ID: KUKI-MOB-SHIFT-001
Lingkungan dan command: Flutter; `test/api_client_test.dart`, `test/widget_test.dart`, dan `flutter build web --debug`.
Ringkasan error: Request POS terautentikasi tidak mengirim nilai bearer token yang dapat diterima Laravel.
Reproduksi: Tes request `GET /api/pos/me` memeriksa header Authorization terhadap token sesi; sebelum perbaikan, header berisi placeholder, bukan bearer token.
Dampak pengguna: Login dapat berhasil tetapi pemanggilan endpoint shift/katalog/transaksi terautentikasi akan ditolak.
Hipotesis vs fakta: Terbukti oleh implementasi header client dan assertion test.
Percobaan perbaikan (maks 2 untuk error yang sama): Ganti nilai placeholder dengan `Bearer <token>`; tambahkan assertion atas header yang benar.
Hasil nyata tes: Flutter API/widget tests PASS (3/3); analyzer file terkait exit 0 (10 info lint); web debug build PASS. Tidak diuji terhadap server live.
Keputusan/Next action: RESOLVED untuk header client; verifikasi login operasional harus dilakukan pada backend pengembangan yang disetujui.

### ERR-20261112-001 — DEFERRED
Waktu + timezone: 2026-11-12 09:00 WIB
Terkait TASK-ID: KUKI-FIN-002
Lingkungan dan command: Windows; `backend-web-katalog`; `php artisan test --filter=LaporanPenjualanAccessTest` exit 2.
Ringkasan error (redaksi aman): Ketiga test berhenti saat setup database, sebelum assertion, karena migration `2026_11_12_120000_prepare_hard_delete_produk_with_history.php` melempar `Migration ini hanya untuk MySQL.` pada konfigurasi SQLite in-memory.
Reproduksi: Jalankan command focused di atas; output menunjukkan error yang sama pada awal ketiga test.
Dampak pengguna: Tidak ada dampak produksi yang teramati. Test akses Admin/Owner dan ekspor CSV belum dapat dijalankan melalui PHPUnit.
Hipotesis vs fakta: Fakta yang terbukti adalah migration membatasi engine ke MySQL sementara PHPUnit menggunakan SQLite; tidak disimpulkan apakah migration tersebut benar/salah atau aman untuk diubah.
Percobaan perbaikan (maks 2 untuk error yang sama): Tidak ada perubahan pada migration dan tidak diarahkan ke DB toko; query laporan diuji terpisah dengan tabel SQLite in-memory sementara.
Hasil nyata tes: PHPUnit BLOCKED; `php -l`, route registration/middleware, serta query ringkasan/filter/pagination/CSV pada SQLite in-memory PASS.
Keputusan/Next action: DEFERRED; minta keputusan terpisah untuk kompatibilitas test migration atau jalankan PHPUnit hanya pada database test MySQL yang terisolasi setelah konfigurasi dipastikan aman.
