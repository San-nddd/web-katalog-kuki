# Kontrak API Laravel untuk Kuki POS

**Status:** Implementasi klien Flutter cocok dengan route POS Laravel di `backend-web-katalog/routes/pos.php` dan `PosController`. Root server default adalah `https://kukibakehouse.smkn1sumedang.sch.id`; override pengembangan tersedia melalui `API_BASE_URL`. Jangan menambahkan `/api` ke alamat root.

Semua endpoint selain login memakai `Authorization: Bearer <token>`. Respons sukses dibungkus dalam `{"success":true,"data":...}`.

## Login dan sesi

`POST /api/pos/login`

```json
{"kode":"KASIR01","pin":"1234"}
```

Respons `data` berisi `token`, `expires_in_seconds`, dan `pegawai` (`id`, `kode`, `nama`). PIN kasir harus dibuat/diatur melalui alur Admin; jangan menyimpan kredensial di source.

- `GET /api/pos/me`
- `POST /api/pos/logout`

## Katalog dan shift

- `GET /api/pos/catalog` mengembalikan produk dengan `id`, `nama`, `harga`, `stok`, `barcode`, `kategori`, dan `gambar`.
- `GET /api/pos/shift` mengembalikan `active` dan riwayat shift kasir.
- `POST /api/pos/shift/start`
- `POST /api/pos/shift/end`

## Riwayat dan laporan

- `GET /api/pos/transactions?page=1` mengembalikan `items`, `page`, `last_page`, dan `total`.
- `GET /api/pos/report?dari=YYYY-MM-DD&sampai=YYYY-MM-DD` mengembalikan jumlah transaksi, total penjualan, dan ringkasan metode bayar.

## Checkout

`POST /api/pos/transactions`

```json
{
  "id_client":"6e0f5a28-7049-49b7-b5eb-bd4d295ec941",
  "items":[{"produk_id":101,"jumlah":2}],
  "metode_bayar":"tunai",
  "dibayar":30000,
  "verifikasi_manual":true,
  "jenis_pesanan":"takeaway",
  "nomor_meja":null,
  "nama_pelanggan":null,
  "catatan":null
}
```

Server memeriksa shift aktif, stok dan harga dari database, lalu menyimpan transaksi dan mutasi stok dalam transaksi database. `id_client` menjadi kunci idempotensi agar retry dengan ID yang sama tidak menggandakan penjualan. Metode yang didukung: `tunai`, `qris`, dan `transfer`; QRIS/transfer tetap diverifikasi manual, bukan melalui payment gateway.

## Status verifikasi hosted

Pada 12 November 2026, pemeriksaan tanpa kredensial ke `GET /api/pos/me` mengembalikan `401` (endpoint terlindungi tersedia). Preflight CORS mengembalikan `204` dengan origin dan header yang mengizinkan aplikasi. Login kasir dan checkout tidak diuji agar tidak membuat sesi atau transaksi pada server operasional.
