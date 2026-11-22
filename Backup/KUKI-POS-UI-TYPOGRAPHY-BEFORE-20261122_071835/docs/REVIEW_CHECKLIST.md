# Checklist Keputusan — sebelum PRD dan aturan Copilot menjadi final

Isi `[x]` pada yang disetujui dan tambahkan koreksi di bawahnya.

## A. Definisi produk
- [ ] Setuju 2 aplikasi: React Web/Laravel + Flutter tablet Android/iPadOS.
- [ ] Web tetap katalog + pemesanan manual; tanpa checkout online.
- [ ] UI web existing LOCKED; Copilot dilarang redesign tanpa approval.
- [ ] Laporan Bisnis terpisah dari Inventaris.
- [ ] Blog tidak aktif dalam fase sekarang kecuali keputusan baru.

## B. Pegawai
- [ ] Login pegawai aktif kembali.
- [ ] Absensi masuk-pulang aktif kembali.
- [ ] Tidak ada face verification/GPS otomatis.
- [ ] Koreksi absensi harus dengan alasan dan audit.
- [ ] Mode offline absensi: [ ] online only [ ] offline + rekonsiliasi (perlu desain).
- [ ] Siapa approver absensi: ____________________.
- [ ] Jadwal shift, keterlambatan, izin: ____________________.

## C. POS tablet
- [ ] Android-first untuk setup, iPadOS tetap target.
- [ ] Referensi POS aktual sudah diidentifikasi dan tercatat.
- [ ] Login UI referensi sudah tersedia.
- [ ] Referensi absensi sudah tersedia / setuju wireframe baru.
- [ ] Scanner kamera + Bluetooth/USB HID didukung.
- [ ] Printer dan scanner model: ____________________.
- [ ] Offline transaksi dan sync desain terpisah sebelum implementasi.

## D. Aturan AI
- [ ] Wajib audit + rencana dahulu (READ-ONLY by default).
- [ ] Wajib approval per TASK-ID sebelum modifikasi.
- [ ] Tidak ada script auto-merge, auto-refactor, migration, deploy, atau forced fixes.
- [ ] Setiap perubahan harus ada diff, tes, dan rollback.
- [ ] Tidak boleh expose secrets dan data pegawai.

## E. Berikutnya setelah review
- [ ] Audit repo & Flutter folder (TASK-001).
- [ ] Koreksi baseline dokumen sesuai source terbaru.
- [ ] Kunci desain UI POS/login/absensi.
- [ ] Pilih TASK implementasi kecil pertama.

## Catatan revisi pengguna

- ...

## Persetujuan dokumen
- PRD versi yang disetujui: ____________________
- Tanggal: ____________________
- Perubahan yang wajib sebelum approval: ____________________

## Review mode autonomous v0.2
- [ ] Sepakat: Copilot boleh menyelesaikan backlog `READY+AUTO` dalam satu sesi tanpa approval mikro.
- [ ] Sepakat: tugas `APPROVAL` tidak dijalankan sampai diputuskan pemilik.
- [ ] Review file docs/TASK_BOARD.md untuk skala prioritas dan label risiko.
- [ ] Review catatan logs dan status antar sesi; jangan menganggap laporan test PASS tanpa output.
- [ ] Referensi desain POS/absensi harus tersedia dan tervalidasi sebelum UI baru dibuat.
