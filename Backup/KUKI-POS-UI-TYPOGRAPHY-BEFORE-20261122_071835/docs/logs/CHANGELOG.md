# Changelog — Kuki Bakehouse

Catatan perubahan yang diverifikasi. Ini bukan riwayat release; status release/deployment tercatat terpisah di `RELEASE_LOG.md`.

## 2026-10-26
- `KUKI-P0-002`: perbaikan urutan `Accept` untuk downloader laporan inventaris agar respons guest tetap berupa JSON 401; tes route akses lulus.
- `KUKI-P0-003`: aset logo existing dipakai pada sheet ekspor Excel, header PDF, dan halaman cetak. Dengan approval owner, kolom Keterangan PDF diperlebar 57→73 mm; fixture satu/lima halaman lolos tanpa warning AutoTable.
- `KUKI-MOB-001`: dokumentasi audit menyatakan `kasir/` masih Flutter counter demo, bukan POS; tidak ada source aplikasi Flutter yang diubah. `flutter analyze` dan widget test demo lulus.
- `KUKI-P0-004`: filter agregasi tanggal produksi pada ringkasan dan harian diubah dari `whereBetween` ke `whereDate` untuk mencakup nilai date SQLite yang disimpan pada tengah malam. Fixture summary, harian, dan CSV lulus.
- `KUKI-QA-001`: `KukiAssistantService::chat()` menerima session ID nullable dan menghasilkan UUID otomatis sesuai fallback yang sudah ada; tes terkait lulus.
- `KUKI-QA-002`–`004`: tiga lint error terisolasi diselesaikan pada initializer waktu ChatWindow, state carousel tak terpakai, dan callback state varian tak terpakai. Build web lulus; lint global masih menyisakan 21 errors/1 warning.
- `KUKI-QA-005`: migration additive nullable `metadata_ai` ditambahkan forward-only; tes role legacy, proteksi hapus produk ber-ledger (409), dan publikasi langsung testimonial/komentar diselaraskan dengan keputusan owner. Full Laravel suite lulus 49/49 tests (259 assertions).

Migration schema tidak dijalankan ke production. Tidak ada deployment atau release yang dilakukan.
