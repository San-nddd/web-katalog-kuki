# Register Referensi Desain — Kuki Bakehouse

**Status:** Referensi desain web dianggap locked. User pernah menyebut POS menyerupai flow Qasir; **file/screenshot referensi POS/absensi yang tepat belum tersedia dan belum diverifikasi pada paket dokumen ini**. Copilot tidak boleh mengisi kekosongan dengan desain asal.

## Aturan referensi
1. Setiap screenshot yang diserahkan pemilik diberi ID `REF-WEB-01`, `REF-POS-01`, `REF-ATT-01`, dst, disimpan di lokasi yang disepakati **di repo** tanpa data sensitif. Jangan copy asset pihak ketiga secara ilegal.
2. Catat: nama file, layar, orientasi, elemen yang dicontoh, elemen yang **tidak** boleh dicontoh, perubahan untuk Kuki, tanggal persetujuan, reviewer.
3. Untuk web yang sudah diterima, source saat ini lebih kuat daripada mockup baru yang belum disetujui.
4. Untuk POS, inspirasi Qasir hanya pola usability umum: produk, kategori, keranjang berdampingan, pembayaran cepat, akses barcode. Jangan salin logo, nama, foto, code, ikon/aset proprietari atau layout pixel-perfect.
5. Setiap usulan desain Flutter melewati urutan: referensi terverifikasi -> wireframe -> prototype -> persetujuan -> implementation.
6. State error/loading/empty, ukuran touch target, orientasi landscape tablet dan aksesibilitas harus tetap dirancang.

## Tabel referensi untuk diisi saat review
| Ref ID | File / lokasi aktual | Layar | Yang dipertahankan | Yang diubah untuk Kuki | Status |
|---|---|---|---|---|---|
| REF-WEB-BASE | Source frontend yang telah disetujui | Website publik | Seluruh UI approved | Tidak ada tanpa izin | LOCKED |
| REF-POS-01 | *Menunggu screenshot yang dipastikan tersedia* | POS tablet | Hirarki kasir cepat (inspirasi Qasir) | Logo, warna, font, produk Kuki | NEED REFERENCE |
| REF-AUTH-01 | *Menunggu referensi* | Login pegawai | Kejelasan input & auth state | Brand Kuki | NEED REFERENCE |
| REF-ATT-01 | *Menunggu referensi* | Absensi pegawai | Status hari ini dan riwayat | Identitas Kuki, akses per role | NEED REFERENCE |
| REF-REPORT-01 | Ekspor `.xlsx`/PDF Kuki sekarang | Laporan inventaris | Informasi factual, profesional | Pisah inventaris & laporan bisnis | AUDIT REQUIRED |

## Design approval record
```text
REF ID:
Screenshot/pautan lokal:
Sudah terlihat oleh Copilot? YA/TIDAK
Yang boleh diikuti:
Yang harus berbeda:
Komponen Kuki yang wajib dipakai:
Orientasi & perangkat target:
Status: DRAFT / APPROVED / REJECTED
Tanggal & reviewer:
```
