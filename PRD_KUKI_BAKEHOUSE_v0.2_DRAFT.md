# PRODUCT REQUIREMENTS DOCUMENT — KUKI BAKEHOUSE

**Versi:** 0.2 — DRAFT UNTUK REVIEW  
**Tanggal dokumen:** 26 Oktober 2026  
**Status keputusan:** BELUM DISETUJUI  
**Jenis produk:** Ekosistem digital Kuki Bakehouse: website + backend terpusat + aplikasi Flutter tablet POS  
**Dokumen rujukan:** `README_PROJECT_DRAFT.md`, `AGENTS.md`, `docs/FLUTTER_ENVIRONMENT_PLAN.md`, `docs/DESIGN_REFERENCE_REGISTER.md`

> Dokumen ini merupakan rancangan kebutuhan masa depan. Tidak semua kemampuan sudah tersedia. Pelaksanaan otomatis diperbolehkan hanya pada tugas risiko rendah dalam backlog yang sudah ditetapkan; pekerjaan sensitif memerlukan persetujuan. Lihat `docs/AUTONOMOUS_WORKFLOW.md`.

## 1. Konteks & tujuan
Kuki Bakehouse mengoperasikan katalog web publik, CMS/Admin, dashboard manajemen, inventaris, AI assistant dengan eskalasi ke Admin, dan nantinya tablet Point of Sale (POS). Beberapa modul inventaris telah dibuat bertahap; fokus berikutnya adalah stabilisasi web lalu menyiapkan fondasi mobile dan autentikasi/absensi pegawai dengan aman.

**Tujuan utama:**
1. Satu sumber data Laravel API, tanpa duplikasi logika bisnis di React dan Flutter.
2. Operasional toko: produk, kategori, varian, stok, produksi, koreksi, opname, penjualan, pencatatan keuangan, pegawai.
3. Pengalaman pengguna profesional, sesuai referensi dan identitas Kuki Bakehouse, tanpa redesign mendadak.
4. AI developer (GitHub Copilot) mengelola backlog dan mengimplementasikan tugas risiko rendah dalam sesi agent, meninggalkan dokumentasi dan audit trail nyata.
5. Ekspor laporan bermakna dan dapat diaudit (Excel, PDF, cetak); tidak mengubah catatan resmi hanya karena Excel diedit.

## 2. Batasan yang disepakati / diusulkan
**Tetap:** dua aplikasi utama (1) React Web + Laravel API; (2) Flutter POS tablet. Flutter tablet mendukung target Android dan iPadOS; pengerjaan awal di Windows untuk Android, build/test iPadOS memerlukan macOS + Xcode.

**Website publik:** landing, katalog, detail produk, kategori, testimonial & komentar testimonial, Kuki Assistant, kontak. **Tidak ada checkout e-commerce otomatis**; pemesanan tetap manual. Jangan menambahkan keranjang checkout web tanpa permintaan baru.

**Web Admin/Owner:** CMS katalog, gambar, produksi harian, mutasi stok, stock opname, ringkasan inventaris, manajemen testimonial/komentar, chat AI handover, dashboard Owner. **Laporan Bisnis** dipisahkan dari **Inventaris**.

**Fitur yang kembali masuk scope:** login pegawai dan absensi/kehadiran pegawai. Fitur pernah dicabut pada versi sebelumnya; permintaan terbaru mengaktifkannya lagi. **Face verification tidak otomatis ikut dikembalikan**. Jangan menambah foto wajah, geolocation, tracking lokasi, atau pengenalan wajah tanpa persetujuan dan kebutuhan jelas.

**Tidak termasuk implementasi sekarang:** redesign UI publik, checkout web, perubahan gateway pembayaran, Flutter full POS siap produksi, pembacaan/penulisan data biometrik mentah, pengiriman laporan ke pihak ketiga, penghapusan histori, penyesuaian stok via import Excel otomatis.

## 3. Status baseline (harus diaudit terhadap repository terkini)
| Area | Baseline yang teridentifikasi | Status validasi |
|---|---|---|
| React/Vite web katalog dan Admin | Route publik dan Admin tersedia; endpoint API berjalan | PERLU AUDIT repo terbaru |
| Laravel API + Sanctum | Endpoint login, produk, kategori, testimonial, produksi, inventaris, management | Route terlihat pada pemeriksaan sebelumnya; perlu uji integrasi |
| Produksi harian | Mencatat produksi dan perubahan stok | PERLU TES integritas |
| Mutasi stok | Riwayat perubahan dan koreksi Admin | PERLU TES invarians |
| Stock opname | Draft/selesai, pengeluaran rusak/kedaluwarsa | PERLU TES race condition/otorisasi |
| Ringkasan inventaris / ekspor | `.xlsx`, PDF, cetak langsung, usulan koreksi Excel | PERLU TES browser, data nyata & printer |
| Kuki Assistant / handover Admin | Integrasi OpenRouter, alur chat admin | PERLU TES end-to-end |
| Testimonial & komentar | Pengiriman publik, manajemen Admin | PERLU TES moderasi sesuai versi terkini |
| Blog | Pernah dibahas, status scope terakhir tidak pasti | DITUNDA hingga disetujui lagi |
| Flutter folder `kasir/` | Ada sebagai lokasi kerja yang pernah disebut | BELUM DIAUDIT: jangan overwrite/recreate |
| Data transaksi, kas, pengeluaran | Belum ada bukti sistem end-to-end yang tervalidasi | DIBUTUHKAN untuk laporan keuangan akurat |
| Login/absensi pegawai | Masuk kembali sebagai requirement | BELUM DIIMPLEMENTASIKAN / audit dulu |

## 4. Pengguna & otorisasi
**Peran rencana** (nama kolom/role DB eksisting harus dicek, jangan migrasi asal):
- **Pengunjung:** lihat katalog, produk, testimonial/komentar publik dan Assistant; tidak berhak mengakses data internal.
- **Pegawai/Kasir:** login mobile, absensi diri, penggunaan kasir/transaksi sesuai izin. Tidak mengubah harga dan histori stok secara bebas.
- **Admin Operasional:** konten katalog, transaksi administratif sesuai izin, pegawai/absensi, mutasi/opname dan koreksi yang diaudit.
- **Owner/Management:** dashboard dan laporan lintas operasional/keuangan, bisa lihat absensi dan audit; hak edit harus eksplisit, default laporan read-only.

Semua hak akses diverifikasi **di Laravel backend** menggunakan Gate/Policy/role teruji, bukan sekadar tombol disembunyikan di React/Flutter. Pertahankan mapping role lama via `roleForAuthorization()` jika memang masih ada di kode asli. Jangan mengganti role `manager`/`admin` tanpa audit dan persetujuan.

### Matriks akses awal (DRAFT)
| Fitur | Pengunjung | Pegawai | Admin | Owner |
|---|---|---|---|---|
| Katalog publik | Baca | Baca | Kelola | Baca |
| Riwayat transaksi POS | Tidak | Transaksi diri/sesi sesuai izin | Kelola sesuai kebijakan | Baca |
| Stok/produksi | Tidak | Lihat seperlunya | Ubah melalui prosedur resmi | Baca |
| Laporan inventaris | Tidak | Tidak | Baca/ekspor | Baca/ekspor |
| Laporan keuangan | Tidak | Tidak | Sesuai izin | Baca/ekspor |
| Absensi diri | Tidak | Catat & baca sendiri | Baca/koreksi dengan alasan | Baca |
| Absensi seluruh pegawai | Tidak | Tidak | Baca | Baca |
| Mengelola pegawai/role | Tidak | Tidak | Sesuai kewenangan | Sesuai kebijakan |

**KEPUTUSAN TERTUNDA:** apakah Owner dapat menyetujui koreksi absensi? apakah kasir diperbolehkan melihat stok penuh? apakah Admin boleh mengedit seluruh transaksi keuangan? Harus ditetapkan sebelum implementasi.

## 5. Functional requirements web/API
### WEB-01 Katalog publik [pertahankan]
Produk, kategori, varian, gambar, stok yang boleh dipublikasikan, detail, kontak/pemesanan manual. Jangan ubah styling/nav yang sudah disetujui. Referensi desain web eksisting adalah source of truth sampai ada perubahan eksplisit.

**AC:** tampil desktop/mobile; data langsung dari API; loading/error/empty state; tidak ada checkout baru; halaman lama tidak regresi.

### WEB-02 CMS Admin [stabilisasi]
CRUD produk, kategori, gambar; testimonial dari Admin atau pelanggan; komentar di bawah setiap testimonial; moderasi sesuai aturan yang sudah ada. Perubahan harga/produk harus bisa ditelusuri bila berdampak transaksi.

**AC:** konten valid; upload dan fallback aman; daftar & editor tidak menghilangkan fitur yang telah berfungsi.

### WEB-03 AI Assistant + handover [stabilisasi]
Assistant produk via API backend/OpenRouter; eskalasi ke Admin; sinkronisasi pesan dua arah; status penanganan chat; jangan bocorkan API key frontend.

**AC:** timeout/rate limit ditampilkan baik; admin reply terlihat pelanggan; sesi chat tidak tercampur; tombol selesai bekerja.

### INV-01 Produksi/Mutasi/Opname [stabilisasi]
Inventaris memiliki single source of truth, perubahan stok atomik, mutasi referensi, alasan koreksi, Admin edit; Owner read-only. Hindari penjumlahan ganda produksi dalam rekap mutasi.

**AC:** setiap perubahan stok tercatat tepat satu kali; opname selesai tak bisa diedit; stok tidak negatif kecuali aturan bisnis disetujui; operasi paralel aman.

### INV-02 Ringkasan Inventaris & Ekspor [stabilisasi]
Pisahkan di menu `Inventaris > Ringkasan Inventaris` dari menu `Laporan Bisnis`. Excel `.xlsx`: sheet ringkasan, tabel/filter, angka, usulan koreksi; PDF A4 profesional; Cetak Langsung via dialog print. Seluruh data periode, bukan hanya halaman tabel. Semua angka berasal dari data terverifikasi.

**AC:** file dapat dibuka; tidak terpotong; angka konsisten dengan API; formula Excel tidak mengeksekusi formula dari input tak dipercaya; koreksi di Excel tidak otomatis update DB.

### FIN-01 Laporan Bisnis [fitur baru setelah data transaksi siap]
Tab: Transaksi, Penjualan, Keuangan/Kas, Laba Rugi. Laporan keuangan memerlukan sumber transaksi, pembayaran, pengembalian/refund, HPP dan beban operasional yang nyata. **Tidak boleh menyajikan angka estimasi sebagai angka riil.**

**AC:** filter periode dan status; pengelompokan per kasir/produk/metode; transaksi batal/refund ditangani eksplisit; ekspor bertabel dan print; total sama dengan ledger.

## 6. Flutter POS tablet — kebutuhan baru/lanjutan
### MOB-01 Environment & struktur [P1 persiapan]
Gunakan folder Flutter POS eksisting `kasir/` setelah audit: cek `pubspec.yaml`, target platform, SDK, plugin, build config, dan sumber yang sudah ada. Jangan menjalankan `flutter create` atau overwrite `android/`, `ios/`, `lib/` jika sudah ada.

Target Android tablet (implementasi/test awal dari Windows). Target iPadOS disiapkan desain dan konfigurasi arsitektur; kompilasi dan penandatanganan aplikasi iPad memerlukan Mac/Xcode. Perintah pemeriksaan read-only dapat dijalankan agent selama sesinya tersedia; tindakan mengubah dependensi, scaffold eksisting, data atau environment tetap perlu izin sesuai matriks risiko.

**AC:** `flutter doctor -v` dan `flutter devices` dapat ditinjau; proyek lama utuh; penambahan scaffold hanya dilakukan pada lokasi baru/kosong setelah diverifikasi, tidak pernah overwrite project aktif; `flutter analyze` dan widget test dasar lulus.

### MOB-02 Autentikasi Pegawai [P1]
Layar login menggunakan kredensial akun pegawai yang dibuat/dikelola pihak berwenang. Laravel menerbitkan token per perangkat dengan scope yang tepat, revoke/logout, rate limit, sesi berakhir, token disimpan menggunakan penyimpanan aman OS. PIN/biometrik perangkat hanya opsi buka-kunci sesi **setelah login pertama**, bukan pengganti otentikasi server atau pengumpulan data biometrik mentah.

**AC:** login valid; token tidak tersimpan dalam kode/repo; 401/403 ditangani; pegawai tak bisa masuk fitur Owner; perangkat berbeda dapat dicabut aksesnya; sesi offline dibatasi kebijakan.

### MOB-03 Absensi Pegawai [P1 / diaktifkan kembali]
UI ringkas: status hari ini, tombol **Masuk**, **Pulang**, jam server, daftar riwayat diri. Backend mencatat waktu server dalam UTC serta tampilan Asia/Jakarta, siapa/kapan/perangkat; cegah double-tap/duplikasi; izin Admin untuk koreksi dengan alasan dan audit trail; Owner dapat melihat rekap. Hari lintas tengah malam, jadwal fleksibel, izin/sakit/lembur belum otomatis dimasukkan—masih bahan keputusan.

**AC:** pegawai A tak bisa absensi untuk pegawai B; check-out tanpa check-in ditolak secara konsisten; validasi double-submit; rekap tidak dapat diedit tanpa izin; Admin correction mencatat sebelum/sesudah, alasan, aktor, waktu.

**Keputusan keamanan/privasi:** tidak memakai face recognition/geolokasi wajib, foto selfie, atau pelacakan latar belakang. Status absensi offline perlu persetujuan eksplisit: rekomendasi awal **online-required**, untuk menghindari konflik jam perangkat.

### MOB-04 Kasir POS [P2]
Layar orientasi landscape tablet: produk/kategori di kiri, keranjang di kanan (adaptif untuk ukuran berbeda), cari dan scan barcode, varian, qty, catatan, diskon (jika disetujui), pembayaran yang didukung, receipt, riwayat transaksi. Terinspirasi UX kasir Qasir **tanpa menjiplak aset/antarmuka**. Identitas warna, typography dan komponen Kuki mengikuti referensi yang diotorisasi.

Scan dua mode: kamera tablet, atau scanner eksternal Bluetooth HID/USB HID sebagai input keyboard; buat fallback manual jika perangkat tidak mendukung.

**AC:** item barcode sesuai produk/varian; total benar; double submit/transaksi duplikat dicegah; pembayaran dicatat sesuai fakta; UI responsive tablet Android/iPad.

### MOB-05 Offline & sinkronisasi [P3, hanya setelah desain disetujui]
Offline-first untuk draft keranjang/transaksi sesuai kebijakan; antrean sinkronisasi dengan idempotency key, retry, conflict rules, indikator status, reconciliation dan audit. Pilihan penyimpanan lokal SQLite/Hive/alternatif ditentukan setelah audit dependencies dan kebutuhan. Tidak menyinkronkan transaksi dummy ke database produksi. Aturan pembatalan offline dan stok konflik harus menjadi ADR yang disetujui.

**AC:** offline lalu online tidak menggandakan penjualan; retry aman; stok server tetap otoritatif; kegagalan sinkron terlihat dan dapat dipulihkan; tidak ada kehilangan catatan pembayaran.

### MOB-06 Perangkat printer & pembaca barcode [P3]
Dukungan perangkat printer sesuai hardware aktual toko, dengan pemisahan service/adapter; tidak memilih SDK Bluetooth/USB/printer tanpa model hardware dan izin plugin. Uji struk A/B setelah hardware diverifikasi.

## 7. Design & UX policy
1. **UI Web:** pertahankan persis komponen dan CSS yang sudah diterima; perubahan visual harus punya `DESIGN-CHANGE` tertulis.
2. **UI Flutter:** mulai dari inventaris screenshot referensi (`docs/DESIGN_REFERENCE_REGISTER.md`), spesifikasi warna/logo/typography Kuki dan wireframe/tablet sebelum coding UI. Inspirasi Qasir berarti hierarki kasir mudah dipakai, **bukan clone**.
3. Tata letak tablet adaptif, akses tombol sentuh, state loading/error/offline, kontras dan keterbacaan.
4. Jangan menggunakan placeholder acak/emoji berlebihan/komponen generik yang mengubah identitas Kuki; gunakan aset yang diberi izin.
5. Referensi gambar aktual belum diverifikasi sebagai file dalam paket ini; jangan mengklaim pixel-perfect terhadap referensi yang belum terlihat.

## 8. Arsitektur usulan
```text
Pengunjung ---> React Web ----------┐
Admin/Owner -> React CMS/Management -+--> Laravel API + Sanctum + Gate/Policy --> Database
Pegawai ----> Flutter Tablet POS ----┘           |                     |
                                                +-- AI Assistant       +-- Audit/Merch/Stock
                                                +-- Attendance         +-- Ledger/transaksi (baru)
```

- **Backend Laravel adalah sumber aturan bisnis**: stok, transaksi, absensi, otorisasi, idempotency, audit.
- React/Flutter hanya UI/state/network/cache yang diperlukan.
- Data sensitif berada di server; variabel frontend yang diawali `VITE_` tidak boleh menyimpan rahasia.
- Semua API baru mempertahankan endpoint kompatibel; jika breaking, minta rencana migrasi + persetujuan.
- Endpoint berikut hanya **usulan kontrak**, belum ada: `POST /api/pegawai/auth/login`, `POST /api/pegawai/absensi/masuk`, `POST /api/pegawai/absensi/pulang`, `GET /api/pegawai/absensi/saya`, `GET /api/admin/absensi`, `POST /api/admin/absensi/{id}/koreksi`, `POST /api/pos/transaksi`.
- Jangan membuat endpoint hingga kebijakan role, schema, metode auth, dan naming disepakati.

## 9. Non-functional requirements
- **Keamanan:** gate/policy server, validasi input, secret via `.env` aman, sanitasi Excel/CSV, audit koreksi, throttling login, logout/revokasi token.
- **Konsistensi:** transaksi DB untuk update stok dan pencatatan mutasi, idempotency POS, tidak mengedit histori final.
- **Kualitas:** React build/lint, PHP tests/route list, Flutter analyze/test, uji API 401/403/200, regresi tampilan.
- **Observabilitas:** log aman (tanpa token/password/PII berlebih), pesan error operasional, indikator sinkronisasi.
- **Performa:** paginasi/filter server, hindari memuat seluruh transaksi hanya untuk dashboard; ekspor data dengan batas dan mode streaming sesuai backend.
- **Privasi pegawai:** tampilkan hanya data absensi yang relevan dengan hak akses; retensi dan kebijakan koreksi ditentukan pemilik proyek.
- **Kesiapan offline:** skenario pengujian jelas, bukan hanya checkbox "offline ready".

## 10. Prioritas / roadmap (dasar penentuan backlog agent, bukan izin untuk perubahan berisiko)
| ID | Tahap | Output & syarat lolos |
|---|---|---|
| P0 | Audit kode & stabilisasi web | Peta repo, build/test baseline, semua alur management/inventaris aman tanpa regresi |
| P1A | Persiapan Flutter | SDK/device checks, arsitektur, dependency decision, wireframe sesuai referensi |
| P1B | Login/absensi pegawai | Auth API berbasis role dan check-in/out teraudit; UI setelah wireframe disetujui |
| P2 | Inti POS | Katalog kasir, scan, keranjang, transaksi/pembayaran, riwayat sesuai API |
| P3 | Offline/periferal | Sinkronisasi idempoten + printer/barcode eksternal setelah perangkat diketahui |
| P4 | Laporan bisnis | Penjualan, transaksi, keuangan, laba rugi berdasarkan data POS nyata |
| P5 | Hardening & deployment | Security, backup, audit akses, QA UAT, rilis bertahap |

**Ketergantungan:** FIN-01 membutuhkan POS dan ledger transaksi; P3 tidak mendahului definisi konflik; absensi tidak memerlukan face verification.

## 11. Release criteria / Definition of Done
Untuk setiap tugas yang telah diambil dari backlog sesuai klasifikasi risiko:
1. Perubahan hanya pada file yang terkait tugas; ada `git diff` dan ringkasannya, serta dokumentasi dan log.
2. Tidak ada perubahan CSS/halaman publik yang tidak disetujui.
3. Build dan tes terkait lulus, atau kegagalan dilaporkan apa adanya.
4. Tidak ada route/fitur sebelumnya hilang, auth server tetap menegakkan izin.
5. Jika skema baru, ada migration yang aman, diuji pada data dummy, plan rollback/backup; jangan `migrate:fresh`.
6. Tes role pegawai/admin/owner + guest, edge case dan double-submit.
7. Dokumentasi API/env diperbarui, tanpa menempel secret.
8. Pemilik proyek menerima preview + daftar perubahan dan meninjau merge/rilis. Tugas rendah dapat dikerjakan otomatis sampai selesai dalam sesi agent; merge/rilis tetap melalui review.

## 12. Pertanyaan keputusan sebelum pengembangan
- [ ] Konfirmasi cakupan absensi: check-in/out saja, atau shift/jadwal, keterlambatan, izin, lembur?
- [ ] Persetujuan absensi offline: rekomendasi awal **hanya online**.
- [ ] Siapa dapat mengoreksi absensi (Admin saja / Admin + Owner)? Apa alur persetujuan?
- [ ] Pegawai login via email/password, nomor pegawai+PIN, atau keduanya? (usulan awal email/password; PIN hanya unlock lokal)
- [ ] Screenshot referensi UI POS/absensi yang mana? Inventarisasi dulu ke `docs/design-references/`.
- [ ] Android dan iPadOS rilis bersama atau Android-first? (usulan Android-first, iPadOS tetap target)
- [ ] Hardware printer dan scanner yang benar-benar tersedia?
- [ ] Apakah transaksi bisa offline? Aturan konflik stok/nomor struk/sinkronisasi?
- [ ] Definisi laporan keuangan (metode kas vs akrual, HPP, refund, potongan biaya) dan siapa boleh mengoreksi?
- [ ] Apakah Blog kembali masuk scope? Saat ini **tidak termasuk prioritas aktif**.
- [ ] Struktur repo terkini, CI, versi Laravel/PHP/Flutter terpasang, tanpa asumsi.

## 13. Perubahan requirement dibanding versi lama
- 2026-10-26: Login & absensi pegawai dimasukkan kembali atas permintaan terbaru; **tidak termasuk face verification**.
- 2026-10-26: Flutter Tablet POS ditetapkan Android + target iPadOS; folder POS lama wajib dilindungi dari overwrite.
- 2026-10-26: Perubahan kode risiko rendah dapat dikerjakan autonomous dalam sesi Copilot Agent setelah audit dan backup; perubahan sensitif tetap butuh persetujuan.
- 2026-10-26: Laporan Bisnis dipisahkan dari Ringkasan Inventaris; keduanya harus bisa ekspor/cetak secara profesional saat data ada.

## 14. Operasional Autonomous Developer (Tambahan v0.2 — DRAFT)
- **Mode:** GitHub Copilot Agent aktif dalam sesi editor; memulai pekerjaan dari `docs/TASK_BOARD.md`, menjalankan siklus baca → patch → tes → catat → lanjut. Tidak memerlukan instruksi mikro tiap file untuk tugas kategori **AUTO**.
- **Sumber kebenaran:** keadaan kode yang diverifikasi, PRD ini, `docs/DECISIONS_PENDING.md`, dan `docs/DESIGN_REFERENCE_REGISTER.md`. Jika bertentangan, **berhenti pada bagian konflik** dan log masalah.
- **Wajib otomatis:** memperbarui `docs/PROJECT_STATUS.md`, `docs/logs/WORK_LOG.md`, `docs/logs/ERROR_LOG.md` bila ada kegagalan, `docs/logs/DECISION_LOG.md` bila ada keputusan, dan dokumentasi API/fitur saat berubah.
- **Larangan bypass:** agent tidak boleh auto-menyetujui keputusan bisnis, perubahan UI terkunci, auth/RBAC, keuangan/transaksi, privasi/absensi pegawai, atau operasi destruktif. Jangan menggunakan flag force atau menonaktifkan tes untuk memperoleh status hijau.
- **Verifikasi:** tiap implementasi perlu hasil tes yang **nyata**, jangan tulis 'PASS' jika perintah belum dijalankan atau gagal.
- **Keterbatasan:** dokumen ini bukan scheduler; kemampuan melanjutkan pekerjaan tanpa pengguna bergantung pada fitur dan izin sesi Copilot. Tidak ada jaminan Copilot bekerja terus ketika VS Code mati.

### AC tambahan fitur Pegawai & Absensi
- Pegawai dapat login dengan kredensial aman; role dibatasi backend; tidak ada pengumpulan data biometrik mentah secara default.
- Kehadiran masuk/pulang dicegah dobel, punya timestamp server serta jejak revisi dengan alasan; akses daftar kehadiran dibatasi role.
- Semua migration, perubahan roles, retensi data pegawai dan kebijakan koreksi memerlukan keputusan/persetujuan pemilik proyek sebelum eksekusi.
