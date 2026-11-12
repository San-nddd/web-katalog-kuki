# DECISION LOG / ADR Ringkas

Rekam keputusan pemilik proyek yang **benar-benar** disetujui, bukan asumsi agent. Rujuk `docs/DECISIONS_PENDING.md`.

## Keputusan baseline dari arahan user
- 2026-10-26 — PRD tetap **DRAFT** untuk review.
- 2026-10-26 — Copilot harus dapat melaksanakan tugas coding sendiri (autonomous dalam sesi), menulis dokumentasi dan log.
- 2026-10-26 — Absensi dan login pegawai kembali masuk kebutuhan; detail kebijakan, privasi dan desain belum disepakati.
- UI web yang sudah disetujui tidak boleh diubah diam-diam; referensi visual POS harus dipakai jika tersedia.
- 2026-10-26 — Owner menyetujui penyesuaian minimal hanya pada lebar tabel PDF inventaris untuk mengatasi warning AutoTable (DEC-REPORT-002); tidak mengizinkan perubahan halaman UI, API, atau data.
- 2026-10-26 — Implementasi DEC-REPORT-002 selesai: kolom Keterangan 57→73 mm membuat total lebar tabel 273 mm; fixture PDF 1/45 baris tidak lagi memunculkan warning.
- 2026-10-26 — `KUKI-MOB-001` mengonfirmasi `kasir/` masih scaffold Flutter counter demo. Tidak ada keputusan implementasi baru yang dibuat; `KUKI-MOB-002` tetap memerlukan approval scope dan referensi desain POS/login/absensi sebelum pengembangan UI atau dependency.
- 2026-10-26 19:11 WIB — Owner menyetujui DEC-QA-001..004: pertahankan manager→admin dan tolak akun tanpa role; tambahkan metadata_ai nullable dengan migration forward-only; pertahankan proteksi ledger 409; pertahankan publikasi langsung testimonial/komentar. Implementasi diuji penuh pada SQLite in-memory; migration tidak dijalankan di production.
- 2026-11-12 — Owner menyetujui laporan penjualan read-only memakai transaksi POS yang benar-benar tersimpan. Cakupan: filter tanggal, total/jumlah/rata-rata transaksi, agregat metode bayar, daftar transaksi, dan CSV untuk Admin/Owner. Tidak ada HPP/laba-rugi, refund, atau mutasi transaksi; keputusan HPP/kas-akrual DEC-FIN-001 tetap pending.

## TEMPLATE UNTUK APPROVAL TEKNIS
```text
ADR-ID:
Tanggal:
TASK-ID:
Keputusan eksplisit pemilik:
Konteks/fakta:
Opsi ditolak:
Dampak & risiko:
Implementasi:
Rollback:
```
