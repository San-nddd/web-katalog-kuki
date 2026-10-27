# Kontrak API Mobile — USULAN, BUKAN ROUTE AKTIF

**DILARANG** langsung menambahkan route berikut ke Laravel. Audit dahulu `AuthController`, Gate, `User` model, database, dan role mapping. Endpoint final dapat berbeda.

## Login mobile pegawai
- `POST /api/pegawai/auth/login`
- Request (usulan): `email`, `password`, `device_name`.
- Response (usulan): `data: { token, user: { id, name, role }, permissions }`.
- Secure: throttle, validasi role, revoke, token ability, API HTTPS, simpan token di secure storage.
- `GET /api/auth/user` mungkin bisa reuse setelah otorisasi diverifikasi. Jangan membuat duplikat auth endpoint kalau reuse aman.

## Absensi
- `GET /api/pegawai/absensi/saya?bulan=YYYY-MM`: status/riwayat diri.
- `POST /api/pegawai/absensi/masuk`: server time, device/session, idempotency identifier.
- `POST /api/pegawai/absensi/pulang`: validasi status sebelumnya.
- `GET /api/admin/absensi`: daftar dengan tanggal/pegawai/paginasi; role guard.
- `POST /api/admin/absensi/{id}/koreksi`: nilai baru + alasan; audit append-only.

### Data konseptual (nama model/table belum disetujui)
`employees` atau relasi `users`, `attendance_records`, `attendance_corrections`, `device_sessions`. **Jangan membuat tabel sebelum audit skema yang ada.**

### Contract error
- 401 tidak login/token expired; 403 tanpa izin; 409 konflik/double-check-in; 422 input salah; 429 rate limit; 503 server unavailable. Gunakan pola error API yang sudah ada jika berbeda.
- Waktu dari server dan ID unik; gunakan UTC untuk persistence dan Asia/Jakarta untuk tampilan.
- Audit koreksi (old/new values, reason, actor, timestamp) wajib.

## Transaksi POS masa depan
- `POST /api/pos/transaksi` (usulan saja). Menggunakan `client_transaction_id` unik untuk idempotensi; detail item/varian/harga snapshot, method payment, kasir, waktu.
- Refund/void harus endpoint audit tersendiri dengan role gate; jangan hapus row secara permanen.
- Tentukan device/offline conflict sebelum implementasi.
