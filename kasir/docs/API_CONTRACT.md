# Kontrak API Laravel untuk Kuki POS

**Status: kontrak usulan.** Ini bukan klaim route yang sudah ada. Pertahankan tabel `kategoris` dan `katalog_produk` yang sekarang; satu rasa/ukuran = satu produk mandiri (`kategori_id`, `sku`, `barcode`, `harga_produk`, `stok`). Tidak ada tabel `produk_varian`.

## 1. Login

`POST /api/login`

```json
{"email":"kasir@example.invalid","password":"contoh"}
```

Respons minimal:

```json
{"token":"sanctum-personal-access-token","user":{"id":9,"name":"Kasir Kuki","role":"kasir"}}
```

`401` untuk login gagal, `403` akun tanpa akses; jangan simpan password di perangkat. Backend harus mengenakan rate limits dan kebijakan akses yang sesuai.

## 2. Katalog

`GET /api/produk`, header `Authorization: Bearer <token>` jika API dilindungi.

```json
{"data":[
  {"id":101,"nama_produk":"Saltbread OG","kategori_id":5,
   "kategori":{"id":5,"nama":"Saltbread"},"sku":"SAL-OG",
   "barcode":"899000000001","harga_produk":14000,"stok":36,"stok_minimum":8,
   "gambar_url":"https://example.invalid/storage/og.jpg"}
]}
```

Dukungan respons: array langsung atau `{data: []}`. **Jika endpoint paginated**, frontend harus diubah untuk mengambil seluruh halaman; saat ini hanya membaca halaman pertama.

## 3. Transaksi baru (WAJIB untuk sync)

`POST /api/pos/transaksi`

Header:

```text
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: <client_uuid yang sama saat retry>
```

Body contoh:

```json
{
 "client_uuid":"6e0f5a28-7049-49b7-b5eb-bd4d295ec941",
 "client_created_at":"2026-11-07T09:30:00Z",
 "cashier":"Kasir Kuki", "shift_client_uuid":"uuid-shift-lokal",
 "payment_method":"cash", "subtotal":28000, "discount":0,
 "total":28000, "paid":30000,"note":"",
 "items":[{"produk_id":"101","jumlah":2,"harga_satuan":14000}]
}
```

Aturan kritis backend:

1. `client_uuid` disimpan dalam **kolom unik** (unique index), diproses dalam satu database transaction. Request ulang UUID yang sama **harus mengembalikan hasil sukses sebelumnya** tanpa mengurangi stok dua kali.
2. Backend mengambil harga dan stok terkini dari database, memverifikasi harga dan total/discount pada payload (atau mendefinisikan kebijakan harga terkunci). **Jangan percaya nominal dari client**.
3. Kunci baris produk terkait (`SELECT ... FOR UPDATE` atau setara) dan kurangi stok serta insert transaksi+detail di transaksi SQL **atomik**. Menolak stok minus dengan `409 Conflict`.
4. `payment_method` hanya `cash`, `transfer`, `qris_manual`; pembayaran manual ditandai sesuai kebijakan verifikasi kasir, bukan transaksi gateway yang berhasil otomatis.
5. Tolak UUID sama dengan payload berubah; jangan membuat transaksi baru.
6. Endpoint memvalidasi role `kasir`/`admin`, kuantitas positif, produk valid, dan menyimpan audit waktu.
7. Balas `200` untuk UUID yang sudah pernah diproses dan `201` untuk order baru. Balas `409` untuk konflik stok, `422` untuk validasi, `401`/`403` untuk autentikasi.
8. Bila penjualan diterima, stok katalog global yang dibaca React harus mencerminkan transaksi. Hubungkan dengan mutasi stok jika migrasi saat ini mendukungnya.

Respons contoh:

```json
{"id":2501,"client_uuid":"6e0f5a28-7049-49b7-b5eb-bd4d295ec941","status":"accepted"}
```

**PENTING:** Dalam mode offline, beberapa tablet bisa menganggap stok masih ada. Setelah tersambung, server tetap menjadi sumber kebenaran. Konflik ditampilkan untuk rekonsiliasi Admin, tidak boleh dihapus otomatis; proses retur/reversal belum ada.

## 4. Hal yang perlu dicocokkan dengan source backend

- `routes/api.php` (path dan middleware Sanctum)
- Model User dan penamaan `role`
- Migrasi `katalog_produk`, `transaksi`, `detail_transaksi`, `mutasi_stok`
- Kebijakan saat stok habis, diskon, transaksi duplikat, refund
- CORS, HTTPS, alamat server LAN, storage gambar

**Jangan langsung menyalin migrasi tabel baru dari contoh bila tabel existing sudah ada.** Gunakan adapter endpoint tanpa mengubah source yang disetujui.
