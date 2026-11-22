# Dokumentasi Teknis Modul

Copilot wajib membuat/menjaga satu berkas `.md` untuk setiap modul yang diimplementasikan atau diaudit. **Jangan menulis fakta kode yang tidak diperiksa.** Contoh nama: `inventaris.md`, `kuki-assistant.md`, `pegawai-absensi.md`, `pos-transaksi.md`.

## Template modul
- **Tujuan bisnis** dan batasan fitur
- **Status nyata:** ADA/PARSIAL/BUG/BELUM ADA/TIDAK DIAUDIT + lokasi sumber
- **Alur pengguna** (dengan contoh sederhana)
- **Diagram teks:** UI → service → API → model/database
- **Model/route/service** dengan path + method asli
- **Input, validasi, output**, hak akses & audit
- **Contoh data dummy untuk tes** (tanpa data rahasia)
- **Risiko, edge case, error state** dan rollback
- **Cara menjalankan tes / output nyata**
- **Daftar perubahan, TASK-ID, tanggal**

Gunakan bahasa Indonesia yang mudah dipahami siswa RPL; jelaskan *mengapa* solusi bekerja, bukan hanya apa yang diedit.

## Modul yang sudah diaudit
- [Audit baseline repository](./baseline-audit.md) — toolchain, route terdaftar, dan hasil build/lint/test aktual.
- [Katalog publik](./katalog.md) — route React, API publik, fallback data, dan batas pemesanan manual.
- [Admin CMS dan Management](./admin-cms.md) — alur token, Gate server, halaman pengelolaan, serta konflik role yang terlihat pada baseline.
- [Kuki Assistant](./kuki-assistant.md) — chat, konteks produk, riwayat, dan handover ke Admin.
- [Inventaris](./inventaris.md) — produksi, mutasi, opname, laporan read-only, dan ekspor.
- [Persiapan Flutter POS](./flutter-pos.md) — audit scaffold `kasir/`, toolchain, platform, tes, dan keputusan lanjutan.
