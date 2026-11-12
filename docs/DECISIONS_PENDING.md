# Keputusan Produk dan Teknis yang Menunggu Owner

Aturan: **jangan mengarang approval**. Copilot boleh mengerjakan task lain yang AUTO sambil menunggu. Setelah owner memberi keputusan eksplisit, tulis tanggal, keputusan, scope, risiko, alternatif, konsekuensi dan bukti pesan/perintah yang diterima; jangan simpan secret.

| ID | Kebutuhan keputusan | Opsi/rekomendasi awal | Status |
|---|---|---|---|
| DEC-EMP-001 | Akun pegawai: email/password, ID+PIN, session expiry? | Email/password awal; PIN untuk unlock lokal jika dibutuhkan | PENDING |
| DEC-EMP-002 | Absensi masuk/pulang, shift, izin, keterlambatan, offline? | Mulai check-in/out online; audit revisi, tanpa GPS/foto wajah | PENDING |
| DEC-EMP-003 | Role siapa yang boleh lihat dan koreksi absensi pegawai? | Admin koreksi beralasan; Owner baca, konfirmasi owner | PENDING |
| DEC-DESIGN-001 | File screenshot referensi POS/absensi dan brand asset sah | Harus ada sebelum implementasi UI baru | PENDING |
| DEC-MOB-001 | Folder Flutter eksisting dan target rilis | Android-first, iPadOS setelah Mac/Xcode | PENDING |
| DEC-POS-001 | Aturan offline/idempotency/void/refund | Belum diputuskan | PENDING |
| DEC-POS-002 | Pemicu sinkron otomatis POS | Owner menyetujui sync antrean yang sudah ada saat jaringan kembali, resume, checkout, dan retry berkala; pengiriman menunggu API POS terjangkau. Tidak mengubah kebijakan konflik, pembayaran, atau transaksi. Dependency `connectivity_plus` disetujui. | APPROVED & IMPLEMENTED 2026-11-12 |
| DEC-ASSET-001 | Penggunaan aset logo dan maskot untuk identitas navbar dan aplikasi POS | Gunakan `web-katalog/src/assets/Kuki.png` di navbar Admin dan app icon POS; gunakan `web-katalog/src/assets/Kuki-Mascot.png` di navbar POS. Layout navigasi tidak diubah. | APPROVED & IMPLEMENTED 2026-11-12 |
| DEC-ASSET-002 | Perapian logo Kuki pada navbar Admin/Management | Gunakan logo 44×44 tanpa border/background dan tanpa wadah tambahan; pertahankan susunan teks/navigation. | APPROVED & IMPLEMENTED 2026-11-12 |
| DEC-ADMIN-CSS-001 | Lokasi stylesheet Admin/Management | Pertahankan styling yang ada dengan memindahkan seluruh isi `admin-refined.css` ke `admin.css`, lalu hapus file dan import terpisah. | APPROVED & IMPLEMENTED 2026-11-12 |
| DEC-FIN-001 | HPP, kas vs akrual, metode bayar, koreksi dan refund | Belum diputuskan | PENDING |
| DEC-FIN-002 | Laporan penjualan Management dari transaksi POS yang sudah tersimpan | Owner meminta data database langsung; izinkan laporan read-only dengan filter tanggal, ringkasan, metode pembayaran, rincian transaksi, dan CSV. Tidak termasuk HPP/laba-rugi, refund, atau perubahan transaksi. | APPROVED 2026-11-12 |
| DEC-DEP-001 | Izin instalasi package/build/deploy atau migration | Ditentukan per perubahan | PENDING |
| DEC-AUDIT-001 | Status Maps pada worktree saat ini yang berbeda dari KUKI-MAP-001 | Maps memang sengaja digunakan; jangan ubah atau audit area Maps lagi pada KUKI-AUDIT-001 | APPROVED & SCOPE-LOCKED 2026-10-29 |
| DEC-QA-001 | Perilaku auth untuk akun legacy tanpa role dan role `manager` | Pertahankan kebijakan kode saat ini: akun tanpa role ditolak; `manager` lama dipetakan ke `admin` | APPROVED & TESTED 2026-10-26 |
| DEC-QA-002 | Kolom `metadata_ai` pada schema produk | Tambahkan nullable metadata melalui migration additive forward-only; jangan jalankan migration di production secara otomatis | APPROVED & IMPLEMENTED 2026-10-26 |
| DEC-QA-003 | Penghapusan produk yang memiliki mutasi stok | Pertahankan penolakan hapus 409 untuk menjaga riwayat ledger; test harus mencerminkan perlindungan tersebut | APPROVED & TESTED 2026-10-26 |
| DEC-QA-004 | Moderasi testimonial publik dan komentar | Pertahankan publikasi langsung sesuai behavior kode saat ini | APPROVED & TESTED 2026-10-26 |
| DEC-REPORT-001 | Penggunaan logo Kuki pada ekspor laporan inventaris | Gunakan aset existing pada XLSX, PDF, dan cetak | APPROVED 2026-10-26; hanya logo, bukan perubahan lebar/layout tabel |
| DEC-REPORT-002 | Penyesuaian lebar tabel PDF inventaris | Tambah ruang pada kolom keterangan untuk memakai lebar cetak tersedia | APPROVED & IMPLEMENTED 2026-10-26; hanya lebar tabel PDF |

## Blokir aktif — KUKI-POS-001
- **Permintaan task:** UI kasir tablet sesuai referensi, kontrak API dan validasi pembayaran.
- **Status:** BLOCKED / NEED_APPROVAL
- **Fakta repo (audit 2026-11-07):** `kasir/` bukan template counter; entry point kini memakai `KukiApp` dengan `PosController`, dan source berisi login, katalog, pesanan, riwayat, laporan, serta scanner. Tidak ada referensi POS yang dapat diverifikasi: `REF-POS-01` masih `NEED REFERENCE` dan `DEC-DESIGN-001` belum diapprove. Recovery audit memperbaiki test widget yang masih menyebut class/label login lama; test lulus 1/1, analyze no errors, dan Android debug build PASS. Atas izin owner, `ios/Podfile` dibuat dari template Flutter SDK yang cocok dengan `.metadata`; build iOS masih belum diverifikasi.
- **Persetujuan terbatas owner (2026-11-07):** Login kasir memakai kode pegawai seperti `KASIR01` dan PIN melalui endpoint POS yang telah ada (`POST /api/pos/login`). Flutter client diselaraskan ke payload/respons POS; backend dan data akun tidak diubah. Ini **bukan** persetujuan untuk perubahan role, pembuatan akun/PIN, kebijakan sesi, absensi, atau alur transaksi. DEC-EMP-001 tetap PENDING untuk keputusan lainnya.
- **Keputusan owner yang dibutuhkan:** kirim screenshot/reference yang disetujui untuk POS tablet (orientasi landscape, layout keranjang + produk + pembayaran), serta persetujuan brand asset dan target perangkat (Android/iPadOS).
- **Risiko bila diteruskan tanpa referensi:** desain asal, layout tidak terukur, potensi mengganti pengalaman yang sudah disetujui, serta perubahan UI/UX yang melanggar aturan.
- **Aksi yang diizinkan:** audit read-only folder `kasir/` dan tes lokal non-destruktif. Persetujuan terbatas sudah diberikan untuk mengubah field login Flutter ke kode pegawai/PIN dan mengonsumsi endpoint `/api/pos/login` yang sudah ada; backend tidak diubah. Perubahan UI lain, role/pegawai, kontrak transaksi/pembayaran, dependency, dan hardware integration tetap menunggu keputusan terkait.

## Template keputusan baru
```text
ID: DEC-...
Requested by task: KUKI-...
Tanggal permintaan: ...
Masalah / fakta dari repo: ...
Opsi dan risiko: ...
Rekomendasi: ...
Keputusan owner (isi hanya jika benar-benar disetujui): ...
Tanggal approval, scope & batas: ...
Implementasi: NOT_STARTED / IN_PROGRESS / DONE
```

## Keputusan yang telah diberikan
### DEC-AUDIT-001 — APPROVED / SCOPE-LOCKED
- **Tanggal:** 2026-10-29; keputusan owner diterima pada sesi audit.
- **Keputusan:** Maps memang sengaja digunakan kembali.
- **Scope:** Pertahankan perubahan Maps di worktree; jangan mengubah atau melanjutkan audit Maps pada KUKI-AUDIT-001.
- **Konsekuensi:** KUKI-MAP-001 tetap menjadi catatan histori, sedangkan keputusan terbaru menetapkan Maps aktif pada source lokal sekarang. Validasi Maps tidak termasuk hasil audit ini.

### DEC-QA-001 — APPROVED
- **Tanggal:** 2026-10-26 19:11 WIB; keputusan diterima pada form klarifikasi owner.
- **Keputusan:** Pertahankan kode auth saat ini: manager lama dipetakan sebagai admin; akun tanpa kolom/nilai role ditolak.
- **Scope:** Selaraskan test terhadap behavior tersebut; jangan mengubah `AuthController`, model `User`, Gate, route, atau data akun.
- **Konsekuensi:** Login manager lama dapat memakai akses admin yang dipetakan; akun yang role-nya hilang tidak memperoleh akses.
- **Status:** IMPLEMENTED/TESTED; full suite backend lulus 49 tes/259 assertions.

### DEC-QA-002 — APPROVED
- **Tanggal:** 2026-10-26 19:11 WIB; keputusan diterima pada form klarifikasi owner.
- **Keputusan:** Tambahkan kolom nullable `metadata_ai` lewat migration additive forward-only.
- **Scope:** Buat migration dan validasi lewat test Laravel lokal/SQLite. Migration tidak dijalankan terhadap database production, tidak ada backfill atau seeding.
- **Konsekuensi:** Informasi bahan/alergen yang dipakai model, form Admin, dan Assistant memiliki kolom schema yang sesuai.
- **Status:** IMPLEMENTED/TESTED; migration ada dan tes mengaplikasikannya pada SQLite in-memory. Belum dijalankan di production.

### DEC-QA-003 — APPROVED
- **Tanggal:** 2026-10-26 19:11 WIB; keputusan diterima pada form klarifikasi owner.
- **Keputusan:** Pertahankan proteksi hapus produk dengan riwayat ledger; endpoint tetap mengembalikan 409 dan tidak menghapus produk.
- **Scope:** Selaraskan test agar membuktikan konflik dan keberadaan produk/riwayat tetap utuh; tidak mengubah controller atau data stok.
- **Konsekuensi:** Produk ber-ledger tidak dapat dihapus permanen melalui endpoint ini; kebijakan arsip tetap pekerjaan terpisah.
- **Status:** IMPLEMENTED/TESTED; test memastikan 409, produk dan mutasi koreksi tetap ada.

### DEC-QA-004 — APPROVED
- **Tanggal:** 2026-10-26 19:11 WIB; keputusan diterima pada form klarifikasi owner.
- **Keputusan:** Pertahankan publikasi langsung testimonial dan komentar sesuai hook/controller yang ada.
- **Scope:** Selaraskan test submission/list publik dan komentar; jangan mengubah provider hook, controller, endpoint, atau UI.
- **Konsekuensi:** Testimonial dan komentar yang dikirim publik langsung terlihat; Admin tetap dapat memoderasi setelahnya.
- **Status:** IMPLEMENTED/TESTED; tes submission/list/komentar lulus dengan publikasi langsung.

### DEC-REPORT-001 — APPROVED
- **Tanggal:** 2026-10-26.
- **Permintaan:** KUKI-P0-003, laporan ekspor inventaris.
- **Fakta:** Aset `web-katalog/src/assets/Kuki.png` sudah ada; service sebelumnya hanya menggunakan wordmark teks.
- **Keputusan owner:** “ya tentu logo perlu d pakai”.
- **Scope:** Pakai aset yang ada pada setiap sheet XLSX, header tiap halaman PDF, dan halaman cetak laporan inventaris. Jangan mengubah file gambar asli, UI halaman laporan, API, atau data.
- **Risiko:** Gambar menambah ukuran file ekspor dan perlu dipastikan selesai dimuat sebelum print.
- **Alternatif:** Tetap menggunakan wordmark teks tanpa logo.
- **Konsekuensi:** Ekspor memakai identitas visual Kuki yang sama lintas format. Approval ini **tidak** menyetujui perubahan lebar tabel/layout PDF; warning ukuran tabel tetap perlu ditinjau terpisah.
- **Status implementasi:** Selesai; bukti tes dan file di `docs/logs/WORK_LOG.md` untuk KUKI-P0-003.

### DEC-REPORT-002 — APPROVED
- **Tanggal:** 2026-10-26.
- **Permintaan:** KUKI-P0-003, warning AutoTable pada ekspor PDF.
- **Fakta:** Lebar halaman A4 landscape yang tersedia setelah margin adalah 273 mm. Sembilan lebar tetap tabel riwayat mutasi berjumlah 257 mm; AutoTable melaporkan selisih 16 unit, bukan tabel terpotong.
- **Keputusan owner:** Menyetujui perubahan minimal pada lebar tabel PDF saja.
- **Scope:** Tambah ruang 16 mm pada kolom Keterangan (`57` menjadi `73` mm) agar jumlah lebar kolom tepat 273 mm. Tidak mengubah halaman UI, XLSX, HTML print, endpoint/API, data, dependency, warna, atau aset.
- **Risiko:** Kolom Keterangan lebih lebar dan dapat mengubah pembungkusan teks; verifikasi fixture PDF satu dan banyak halaman sebelum menyelesaikan.
- **Alternatif:** Mempertahankan ruang kosong di sisi kanan dan membiarkan warning.
- **Konsekuensi:** Tabel riwayat memakai lebar cetak yang tersedia penuh; warning diharapkan hilang tanpa mengecilkan font atau mengubah kolom lain.
- **Status implementasi:** DONE; kolom Keterangan 57→73 mm, warning tidak muncul pada fixture 1 dan 45 baris; build/lint PASS.
