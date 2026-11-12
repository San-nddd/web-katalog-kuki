# Modul Katalog Publik

## Tujuan dan status nyata
Menampilkan produk dan kategori Kuki Bakehouse untuk pencarian serta pemesanan manual. Tidak ada alur checkout pada route yang diperiksa. Modul **ADA**, tetapi halaman katalog menggunakan data lokal cadangan ketika API gagal atau mengembalikan daftar kosong; karena itu tampilan tidak selalu mencerminkan data backend.

## Alur dan komponen
```text
React Router
  -> KatalogPage
  -> produkService.getProduk() + kategoriService.getKategori()
  -> api.js (fetch ke VITE_API_URL atau /api)
  -> Laravel GET /api/produk dan /api/kategori
  -> produk / kategori di database
```

Route web publik di `web-katalog/src/App.jsx`: `/`, `/category`, `/contact`, `/bakers`, `/katalog`, `/produk/:id`.

## Maps dan navigasi
Fitur peta interaktif, pencarian alamat, geolocation untuk rute, dan routing menuju toko telah dihapus dari website. Tidak ada lagi endpoint `/api/public/kuki-maps/search` atau `/api/public/kuki-maps/route` di Laravel. Alamat toko tetap ditampilkan sebagai teks biasa pada `web-katalog/src/components/Footer.jsx` dan `web-katalog/src/pages/ContactPage.jsx`; `MapPinIcon` hanya ikon dekoratif di samping teks, bukan tautan peta atau akses lokasi.

## Route API yang diverifikasi
| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/produk` | Daftar produk |
| GET | `/api/produk/{id}` | Detail produk |
| GET | `/api/produk/{produk}/varian` | Varian produk untuk pembaca publik |
| GET | `/api/kategori` | Daftar kategori |
| GET | `/api/kategori/{id}` | Detail kategori |

Implementasi berada pada `backend-web-katalog/routes/api.php`, `app/Http/Controllers/produkController.php`, dan `app/Http/Controllers/kategoriController.php`. Service React memetakan nama/harga/stok/gambar produk serta nama/slug/gambar kategori ke bentuk yang dipakai komponen.

## Perilaku, input dan error
- `KatalogPage.jsx` memuat produk dan kategori secara terpisah. Jika permintaan gagal atau daftar API kosong, state data dummy dari `utils/mockData` dipertahankan; error API tidak ditampilkan sebagai error-state pada halaman katalog.
- URL API default `/api`, dapat dioverride lewat `VITE_API_URL`. `api.js` mengubah kegagalan jaringan dan HTTP menjadi `ApiError`.
- Backend memvalidasi input pada operasi admin; operasi tulis tidak termasuk route publik ini.
- Contoh data tes dummy: produk `Roti Uji`, kategori `Roti`, stok `4`; gunakan hanya pada test lokal.

## Hak akses dan batasan
Pembacaan katalog bersifat publik. Route katalog tidak menambahkan checkout, pembayaran, atau pemesanan otomatis; pesanan tetap di luar transaksi web. Perubahan desain publik tidak termasuk task dokumentasi ini.

## Tes dan keterbatasan
- `npm run build` (`web-katalog/`): **PASS**, exit 0, pada baseline 2026-10-26.
- Lint baseline sebelum perbaikan: **FAIL**, 24 errors/1 warning. Hasil terkini seluruh frontend setelah KUKI-QA-002..004: **FAIL**, 21 errors/1 warning; belum dipisahkan per modul.
- Backend test baseline awal: **FAIL**, 33 passed/9 failed/1 error. Suite pada 2026-10-29 saat KUKI-MAP-001: **FAIL**, 47 passed/1 failed/1 error, sama sebelum dan sesudah patch; hasil sebelumnya 49/49 pada 2026-10-26 tidak tereproduksi. Belum ada validasi khusus render katalog end-to-end.
- `ProductCarousel.jsx` memakai `currentIndexRef` dan `translateX` sebagai sumber posisi. State `currentIndex` yang tidak dibaca dihapus pada KUKI-QA-003; focused ESLint dan build PASS, tanpa perubahan tampilan.
- `DetailProdukPage.jsx` tidak memakai nilai varian dari callback `PilihanVarianProduk`; state/callback parent yang tidak dibaca dihapus pada KUKI-QA-004. Selector tetap mengelola pilihannya sendiri dan UI detail tidak berubah.
- Lint penuh terbaru setelah perbaikan terisolasi pada `ChatWindow.jsx`, `ProductCarousel.jsx`, dan `DetailProdukPage.jsx`: **FAIL**, 21 errors dan 1 warning. Tidak semua error merupakan temuan modul katalog.

## Risiko / hal yang belum tervalidasi
- Fallback dummy dapat membuat tampilan tetap terisi saat backend gagal atau data produksi kosong. Jangan menganggap data tampilan fallback sebagai data katalog resmi.
- Smoke browser pada task KUKI-MAP-001 memuat `/` dan `/katalog` tanpa console/page error dan tanpa elemen peta interaktif; ini bukan tes end-to-end API penuh.

**Sumber:** `web-katalog/src/App.jsx`, `src/pages/KatalogPage.jsx`, `src/services/api.js`, `src/services/produkService.js`, `src/services/kategoriService.js`, `backend-web-katalog/routes/api.php`, controller produk/kategori.  
**TASK-ID:** `KUKI-P0-005` — 2026-10-26.
