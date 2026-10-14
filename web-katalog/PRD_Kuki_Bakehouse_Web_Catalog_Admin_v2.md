# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# Kuki Bakehouse — Web Catalog & Admin Content Management
**Versi:** 3.0  
**Status:** Acuan Implementasi Aktif  
**Platform:** Web  
**Frontend:** React.js + Vite + JavaScript + ESLint  
**Backend:** Laravel 11 REST API + Sanctum  
**Database:** MySQL / MariaDB  
**AI Provider:** OpenRouter  
**Security / Edge Layer:** Cloudflare
---
## 1. Ringkasan Produk
Kuki Bakehouse Web Catalog adalah website publik yang digunakan untuk menampilkan informasi produk dan informasi toko Kuki Bakehouse kepada pelanggan.
Web Catalog merupakan **katalog publik, bukan e-commerce**. Sistem tidak menyediakan shopping cart, checkout, maupun pembayaran online.
Web Catalog terhubung dengan backend Laravel REST API dan database terpusat. Traffic produksi melewati Cloudflare sebagai security/edge layer sebelum mencapai frontend atau Laravel API. Data produk dan kategori yang ditampilkan pada website dikelola melalui **Admin Content Management**, sehingga Admin dapat memperbarui konten katalog tanpa mengubah source code frontend publik.
Alur utama pengelolaan dan penyajian data katalog:
**Admin → Laravel API → Database → Web Catalog**
---
## 2. Latar Belakang
Kuki Bakehouse membutuhkan media digital untuk memudahkan pelanggan mendapatkan informasi produk secara mandiri. Berdasarkan rancangan proyek, Web Catalog digunakan sebagai media informasi produk dan Kuki Assistant, sedangkan konten katalog dapat dikelola melalui Dashboard Admin tanpa mengubah source code Web Catalog.
Sistem secara keseluruhan menggunakan Laravel 11 sebagai backend REST API terpusat, React.js untuk Web Catalog dan Dashboard Admin & Management, serta MySQL/MariaDB sebagai database utama.
---
## 3. Tujuan Produk
### 3.1 Tujuan Umum
Membangun Web Catalog Kuki Bakehouse yang informatif, responsif, mudah dipelihara, dan terhubung dengan sistem manajemen konten Admin.
### 3.2 Tujuan Khusus
1. Menampilkan informasi produk Kuki Bakehouse secara terstruktur.
2. Memudahkan pelanggan mencari dan memfilter produk.
3. Menampilkan informasi kategori dan detail produk.
4. Menampilkan informasi toko kepada pengunjung.
5. Memungkinkan Admin mengelola data kategori dan produk.
6. Memungkinkan perubahan data katalog ditampilkan pada Web Catalog melalui API tanpa mengubah source code frontend.
7. Mengintegrasikan Kuki Assistant berbasis OpenRouter sebagai asisten AI resmi Kuki Bakehouse.
---
## 4. Target Pengguna
### 4.1 Pengunjung Web Catalog
Pengunjung tidak perlu login.
Pengunjung dapat:
- melihat Landing Page;
- melihat katalog produk;
- melihat kategori;
- mencari produk;
- melihat detail produk;
- melihat informasi toko;
- menggunakan Kuki Assistant.
### 4.2 Admin
Admin menggunakan Dashboard Admin untuk mengelola konten katalog.
Admin dapat:
- login;
- melihat daftar kategori;
- menambah kategori;
- mengubah kategori;
- menghapus kategori;
- melihat daftar produk;
- menambah produk;
- mengubah produk;
- menghapus produk;
- mengatur kategori produk;
- mengatur harga;
- mengatur deskripsi;
- mengatur gambar;
- mengatur barcode;
- mengatur stok;
- mengatur stok minimum;
- mengatur ketersediaan produk.
---
## 5. Ruang Lingkup Sistem
### 5.1 Public Web Catalog
```text
Public Web Catalog
├── Landing Page
├── Katalog Produk
│   ├── Semua Produk
│   ├── Search
│   └── Filter Kategori
├── Detail Produk
├── Informasi Toko
└── Kuki Assistant
```
### 5.2 Admin Content Management
```text
Admin
├── Login
├── Dashboard
├── Kelola Kategori
└── Kelola Produk
```
### 5.3 Backend API
```text
Laravel 11
├── API Kategori
├── API Produk
├── Authentication / Authorization
└── Storage Gambar
```
---
## 6. Batasan Produk
### 6.1 Web Catalog bukan e-commerce
Tidak terdapat:
- shopping cart;
- checkout;
- pembayaran online;
- payment gateway;
- transaksi pelanggan secara online.
### 6.2 Di luar scope implementasi Web Catalog saat ini
- POS Kasir Flutter;
- Offline-First POS;
- barcode scanner pada POS;
- printer thermal;
- aplikasi Owner/Manager;
- fitur absensi;
- face verification.
### 6.3 Fitur AI aktif dan fitur lanjutan
Kuki Assistant saat ini menjadi bagian aktif dari pengembangan.
Fitur aktif:
- Kuki Assistant berbasis OpenRouter;
- Kuki Assistant pada Homepage;
- Kuki Assistant kontekstual pada Detail Produk;
- riwayat percakapan per sesi;
- product context;
- error handling untuk provider AI.
Fitur lanjutan:
- handover percakapan ke Admin;
- live chat;
- fallback model/provider yang lebih lanjut.
---
## 7. Fitur Fungsional
### 7.1 Landing Page
Landing Page menjadi halaman utama Web Catalog.
Komponen utama:
- Navbar;
- Hero Section;
- Kategori Produk;
- Produk Unggulan;
- Tentang Kuki Bakehouse;
- Informasi Toko;
- Kuki Assistant;\n\n- Footer.
### Ketentuan visual
Tampilan Landing Page yang telah disetujui dianggap **FROZEN** pada tahap integrasi data.
Integrasi backend tidak boleh mengubah:
- layout;
- typography;
- ukuran font;
- warna;
- spacing;
- animation;
- navbar;
- hero;
- card;
- responsive behavior.
Perubahan visual hanya boleh dilakukan jika user secara eksplisit meminta perubahan visual. Bug backend, API, security, AI, atau integrasi tidak boleh dijadikan alasan untuk mengubah UI.
---
### 7.2 Katalog Produk
Katalog menampilkan seluruh produk yang tersedia dari API.
Fungsi:
- menampilkan daftar produk;
- pencarian produk;
- filter kategori;
- Product Card;
- informasi harga;
- informasi ketersediaan;
- navigasi ke detail produk.
Katalog menggunakan data dari Laravel API dan tidak bergantung pada mock data setelah integrasi selesai.
---
### 7.3 Detail Produk
Detail produk menampilkan:
- nama produk;
- gambar;
- kategori;
- harga;
- deskripsi;
- ketersediaan.
---
### 7.4 Informasi Toko
Menampilkan informasi toko seperti:
- jam buka;
- lokasi;
- kontak.
---
### 7.5 Admin — Kelola Kategori
Admin dapat melakukan CRUD kategori.
Data minimal:
- nama;
- slug.
Kategori yang digunakan oleh produk tidak boleh dihapus secara sembarangan jika masih memiliki relasi produk.
---
### 7.6 Admin — Kelola Produk
Admin dapat melakukan CRUD produk.
Data produk:
- nama;
- kategori;
- barcode;
- slug;
- deskripsi;
- harga;
- stok;
- stok minimum;
- gambar;
- metadata AI.
Admin dapat mengunggah atau mengganti gambar produk menggunakan Laravel Storage.
---
## 8. Data Model
Database utama sistem terdiri dari delapan tabel:
| No | Tabel | Fungsi |
|---|---|---|
| 1 | `pengguna` | Menyimpan akun dan peran pengguna |
| 2 | `kategori` | Menyimpan kategori produk |
| 3 | `produk` | Menyimpan informasi produk |
| 4 | `transaksi` | Menyimpan transaksi penjualan POS |
| 5 | `detail_transaksi` | Menyimpan rincian produk pada transaksi |
| 6 | `log_stok` | Menyimpan riwayat perubahan stok |
| 7 | `obrolan` | Menyimpan sesi percakapan |
| 8 | `pesan_obrolan` | Menyimpan pesan dalam sesi obrolan |
Untuk milestone **Admin Content Management + Web Catalog**, tabel yang digunakan langsung adalah:
- `kategori`;
- `produk`;
- `pengguna` untuk autentikasi Admin.
Tabel lainnya digunakan pada modul sistem lain atau tahap berikutnya.
---
## 9. Struktur Data Produk
```text
produk
├── id
├── kategori_id
├── barcode
├── nama
├── slug
├── deskripsi
├── harga
├── stok
├── stok_minimum
├── gambar
├── metadata_ai
├── created_at
└── updated_at
```
Relasi:
```text
kategori 1 ──────── N produk
```
---
## 10. Struktur Data Kategori
```text
kategori
├── id
├── nama
├── slug
├── created_at
└── updated_at
```
---
## 11. Backend API
Backend menggunakan Laravel 11 REST API.
### Format response sukses
```json
{
  "success": true,
  "message": "Data berhasil diambil.",
  "data": []
}
```
### Format response error
```json
{
  "success": false,
  "message": "Terjadi kesalahan.",
  "data": null
}
```
### 11.1 API Produk
Endpoint minimal:
```text
GET    /api/produk
POST   /api/produk
GET    /api/produk/{id}
PUT    /api/produk/{id}
DELETE /api/produk/{id}
```
### 11.2 API Kategori
Endpoint minimal:
```text
GET    /api/kategori
POST   /api/kategori
GET    /api/kategori/{id}
PUT    /api/kategori/{id}
DELETE /api/kategori/{id}
```
### 11.3 API yang sudah tersedia
Pada pengembangan backend saat ini telah tersedia:
```text
GET  /api/produk
POST /api/produk
```
Endpoint yang sudah berjalan harus dipertahankan dan dikembangkan tanpa membuat ulang fungsi yang sama.
---
## 12. Authentication dan Authorization
Authentication API menggunakan Laravel Sanctum.
Area Admin harus dilindungi. Endpoint management hanya dapat digunakan oleh Admin yang terautentikasi dan berwenang.
Gunakan mekanisme authentication yang sudah tersedia pada backend. Jangan membuat authentication terpisah tanpa kebutuhan.
---
## 13. Integrasi Data
Alur data utama:
```text
               ┌─────────────────┐
               │  Admin React    │
               │ Content Manager │
               └────────┬────────┘
                        │
                        ▼
                Laravel REST API
                        │
                        ▼
                  MySQL/MariaDB
                        │
                        ▼
                Laravel REST API
                        │
                        ▼
               Public React Web
                  Catalog
```
Contoh:
```text
Admin mengubah harga
        ↓
PUT /api/produk/{id}
        ↓
Database diperbarui
        ↓
GET /api/produk
        ↓
Web Catalog menampilkan harga terbaru
```
Perubahan data oleh Admin harus dapat terlihat pada Web Catalog setelah data berhasil disimpan pada backend.
---
## 14. Frontend Architecture
### Public
```text
src/
├── components/
│   ├── Navbar.jsx
│   ├── Hero.jsx
│   ├── CategoryCard.jsx
│   ├── ProductCard.jsx
│   ├── SearchBar.jsx
│   └── Footer.jsx
│
├── pages/
│   ├── LandingPage.jsx
│   └── KatalogPage.jsx
│
├── services/
│   ├── produkService.js
│   └── kategoriService.js
│
└── data/
    └── (mock data hanya untuk development awal)
```
### Admin
```text
src/
├── pages/
│   └── admin/
│       ├── Login.jsx
│       ├── Dashboard.jsx
│       ├── Produk.jsx
│       ├── TambahProduk.jsx
│       ├── EditProduk.jsx
│       ├── Kategori.jsx
│       ├── TambahKategori.jsx
│       └── EditKategori.jsx
│
├── components/
│   └── admin/
│
└── services/
    ├── produkService.js
    └── kategoriService.js
```
Struktur dapat disesuaikan selama tanggung jawab komponen tetap terpisah dan tidak membuat satu file terlalu besar.
---
## 15. Admin Content Management UI
Dashboard Admin minimal memiliki:
### Navigation
- Dashboard;
- Produk;
- Kategori;
- Logout.
### Daftar Produk
Kolom minimal:
- gambar;
- nama;
- kategori;
- harga;
- stok;
- ketersediaan;
- aksi.
Aksi:
- edit;
- hapus.
### Form Produk
- Nama Produk;
- Kategori;
- Barcode;
- Harga;
- Deskripsi;
- Stok;
- Stok Minimum;
- Gambar;
- Status/Ketersediaan.
### Daftar Kategori
- Nama;
- Slug;
- jumlah produk jika tersedia;
- aksi.
---
## 16. State pada Admin
Admin harus memiliki kondisi:
### Loading
```text
Memuat data...
```
### Empty
```text
Belum ada produk.
```
atau:
```text
Belum ada kategori.
```
### Error
```text
Gagal memuat data.
```
### Success
```text
Produk berhasil disimpan.
```
Feedback harus sederhana dan jelas.
---
## 17. Validasi
### Produk
- nama wajib diisi;
- kategori wajib dipilih;
- harga wajib dan valid;
- stok berupa angka;
- stok minimum berupa angka;
- gambar mengikuti aturan upload backend;
- slug valid dan tidak bentrok.
### Kategori
- nama wajib diisi;
- slug valid dan tidak bentrok.
Validasi wajib dilakukan di backend. Frontend validation digunakan untuk meningkatkan UX.
---
## 18. Search dan Filter
### Search
Search produk berdasarkan nama produk.
### Filter
Filter berdasarkan kategori.
Search dan filter tidak boleh mengubah desain Product Card.
---
## 19. Design System
Design system publik mengacu pada desain Web Catalog yang telah disetujui.
Karakter visual:
- dark brown;
- cream;
- orange accent;
- rounded cards;
- typography display yang bold;
- editorial / retro bakery;
- sticker / label dekoratif;
- layout playful dan modern;
- animasi reveal/scroll yang sudah disetujui.
### Aturan utama
**PUBLIC UI = FROZEN**
Integrasi API tidak boleh menjadi alasan untuk melakukan redesign.
**Data boleh berubah. Visual tetap.**
---
## 20. Responsive Design
Web Catalog harus berjalan pada:
- desktop;
- tablet;
- mobile.
Admin harus nyaman digunakan pada desktop dan memiliki responsive dasar.
Public Web Catalog harus mempertahankan karakter desain yang sudah disetujui ketika responsive.
---
## 21. Non-Functional Requirements
### Usability
Antarmuka harus sederhana dan mudah dipahami.
### Performance
Data produk dan kategori harus ditampilkan secara responsif.
### Security
Endpoint pengelolaan Admin harus terlindungi oleh authentication/authorization.
### Maintainability
Frontend, backend, dan service API dipisahkan berdasarkan tanggung jawab.
### Reliability
Error API ditangani dengan state loading, empty, dan error.
### Compatibility
Web berjalan pada browser modern.
---
## 22. Acceptance Criteria
### Public Web Catalog
- [ ] Landing Page berjalan.
- [ ] Katalog berjalan.
- [ ] Search berjalan.
- [ ] Filter kategori berjalan.
- [ ] Detail produk dapat diakses.
- [ ] Data produk berasal dari API.
- [ ] Data kategori berasal dari API.
- [ ] Tidak ada cart.
- [ ] Tidak ada checkout.
- [ ] Tidak ada payment.
- [ ] UI publik tidak berubah dari desain yang disetujui.
### Admin
- [ ] Admin dapat login.
- [ ] Admin dapat melihat dashboard.
- [ ] Admin dapat melihat kategori.
- [ ] Admin dapat menambah kategori.
- [ ] Admin dapat mengubah kategori.
- [ ] Admin dapat menghapus kategori.
- [ ] Admin dapat melihat produk.
- [ ] Admin dapat menambah produk.
- [ ] Admin dapat mengubah produk.
- [ ] Admin dapat menghapus produk.
- [ ] Admin dapat mengunggah gambar produk.
- [ ] Admin dapat mengubah stok.
- [ ] Admin dapat mengatur ketersediaan.
- [ ] Endpoint management terlindungi.
### Integrasi
- [ ] Admin mengubah produk → database berubah.
- [ ] Web Catalog mengambil data terbaru dari API.
- [ ] Tidak perlu mengubah source code React ketika data katalog berubah.
- [ ] Loading state berjalan.
- [ ] Error state berjalan.
- [ ] Empty state berjalan.
---
## 23. Milestone Implementasi
### Milestone 1 — Public UI
- [x] Landing Page
- [x] Katalog UI
- [x] Search UI
- [x] Filter UI
- [x] Responsive
- [x] Design refinement
### Milestone 2 — Backend Catalog
- [x] Laravel project
- [x] API Produk awal
- [ ] CRUD Produk lengkap
- [ ] API Kategori
- [ ] Validation
- [ ] Upload gambar
- [ ] Authentication Admin
### Milestone 3 — Admin Content Management
- [ ] Admin Login
- [ ] Admin Dashboard
- [ ] CRUD Kategori
- [ ] CRUD Produk
- [ ] Upload gambar
- [ ] Validation
- [ ] Error/loading/success state
### Milestone 4 — Integration
- [ ] Admin → API
- [ ] API → Database
- [ ] Web Catalog → API
- [ ] Replace mock data
- [ ] Testing integrasi
### Milestone 5 — Fitur Lanjutan
- [x] Kuki Assistant
- [x] OpenRouter API
- [ ] AI scope validation
- [ ] Handover ke Admin
- [ ] Live Chat
---
## 24. Testing
### API
- GET produk;
- POST produk;
- GET detail produk;
- PUT produk;
- DELETE produk;
- GET kategori;
- POST kategori;
- PUT kategori;
- DELETE kategori;
- validation;
- unauthorized access.
### Admin
- Login;
- Create;
- Read;
- Update;
- Delete;
- Upload gambar.
### Public Catalog
- Product list;
- Search;
- Filter;
- Detail;
- API error;
- Empty data;
- Responsive.
### Integrasi
Skenario utama:
```text
Admin login
    ↓
Tambah/edit produk
    ↓
Server menyimpan data
    ↓
Database berubah
    ↓
Web Catalog meminta data terbaru
    ↓
Produk terbaru tampil
```
---
## 25. Dokumentasi
README project harus menjadi dokumentasi hidup.
Minimal berisi:
- deskripsi project;
- tech stack;
- struktur folder;
- cara menjalankan frontend;
- cara menjalankan backend;
- environment variable;
- API endpoint;
- authentication;
- database;
- admin content management;
- cara upload gambar;
- status implementasi;
- testing.
---
## 26. Aturan Pengembangan untuk AI Coding Agent
AI coding agent seperti OpenCode wajib mengikuti aturan berikut:
1. Public UI dianggap FROZEN. Jangan mengubah layout, CSS, warna, typography, spacing, animasi, responsive behavior, navbar, hero, card, footer, atau struktur visual kecuali user secara eksplisit meminta perubahan UI.
2. Jangan melakukan redesign ketika mengintegrasikan API, AI, Cloudflare, authentication, database, atau fitur backend.
3. Gunakan Minimal Change Principle: ubah sesedikit mungkin file dan baris yang diperlukan untuk menyelesaikan task.
4. Sebelum mengubah kode, identifikasi root cause terlebih dahulu. Jangan menebak atau langsung rewrite.
5. Jangan melakukan scan/inspect seluruh repository jika tidak diperlukan.
6. Inspect hanya file yang relevan dengan task.
7. Gunakan endpoint, service, controller, component, dan utility yang sudah ada sebelum membuat yang baru.
8. Jangan membuat dependency baru jika masalah dapat diselesaikan dengan stack yang sudah tersedia.
9. Jangan membuat duplikasi service, controller, route, component, atau helper.
10. Jangan melakukan refactor besar, rename massal, perpindahan folder, atau perubahan arsitektur tanpa permintaan eksplisit user.
11. Jangan menghapus fitur yang sudah bekerja untuk menyelesaikan bug lokal.
12. Setiap perubahan harus menjaga perilaku desktop dan mobile yang sudah ada kecuali user meminta perubahan responsive.
13. Untuk bug, gunakan urutan: observe → identify layer → root cause → minimal fix → validate → report.
14. Selalu validasi implementasi dengan lint/build/test yang relevan jika tersedia.
15. Jangan mengklaim "berhasil" jika belum diuji. Jelaskan dengan jujur apakah build/test sudah atau belum dijalankan.
16. Jika menemukan improvement di luar scope, laporkan saja dan jangan mengubahnya diam-diam.
17. Secret seperti OpenRouter key, Cloudflare secret, database password, token, dan credential lain tidak boleh disimpan di frontend, source code, log, atau README.
18. Update README setelah milestone penting selesai.
19. Jika agent ragu apakah sebuah perubahan diperlukan, jangan ubah sampai ada alasan teknis yang jelas.
20. Instruksi user memiliki prioritas tertinggi untuk scope implementasi.
### 26.1 Protokol wajib sebelum edit
Sebelum mengedit file, OpenCode harus menjawab secara internal:
1. Apa sebenarnya yang diminta user?
2. Apa root cause masalah?
3. File apa yang benar-benar perlu diubah?
4. Apakah perubahan ini mengubah UI?
5. Apakah user meminta perubahan UI?
6. Apakah ada solusi yang lebih kecil?
7. Fitur apa yang harus tetap tidak berubah?
Jika perubahan akan mengubah UI tetapi user tidak meminta perubahan UI:
STOP. JANGAN UBAH UI.
---
## 27. Hal yang Tidak Boleh Dimasukkan Kembali
Fitur berikut berada di luar scope dan tidak boleh ditambahkan:
- absensi;
- face verification;
- penyimpanan data wajah untuk absensi.
---
## 27A. Kuki Assistant — OpenRouter
Kuki Assistant adalah asisten AI resmi Kuki Bakehouse.
Arsitektur:

React Web

   ↓

Laravel API

   ↓

OpenRouter

   ↓

Laravel API

   ↓

React Web

Frontend tidak boleh memanggil OpenRouter secara langsung dan tidak boleh menyimpan API key provider.
### 27A.1 Endpoint utama

POST /api/assistant/chat

Payload minimal:
{
  "session_id": "string",
  "message": "string",
  "product_id": null
}
Jika pengguna berada pada Detail Produk, product_id dapat diisi agar assistant menerima konteks produk tersebut.
### 27A.2 Intelligence Requirements
Kuki Assistant harus:
- menggunakan riwayat percakapan untuk memahami pertanyaan lanjutan;
- memahami product context jika product_id tersedia;
- menjawab secara natural, singkat, ramah, dan relevan;
- meminta klarifikasi jika pertanyaan ambigu;
- tidak mengulang jawaban template jika context tersedia;
- tetap berada dalam scope Kuki Bakehouse.
### 27A.3 Anti-Hallucination
Kuki Assistant dilarang mengarang:
- harga;
- stok;
- bahan;
- promo;
- kategori;
- alamat;
- jam operasional;
- status halal;
- data produk lain.
Jika data tidak tersedia, assistant harus mengatakan bahwa informasi tersebut belum tersedia pada data Kuki Bakehouse.
### 27A.4 Error Handling OpenRouter
Backend harus membedakan jenis kegagalan provider:

401 → API key / authentication provider

404 → endpoint / model / resource

429 → rate limit / quota / upstream provider limit

5xx → provider sedang bermasalah

timeout → koneksi provider terlalu lama

Frontend tidak boleh mengubah semua error menjadi pesan "server tidak dapat dihubungi".
Contoh:
{
  "success": false,
  "message": "Kuki Assistant sedang sibuk. Silakan coba beberapa saat lagi.",
  "code": "AI_RATE_LIMIT",
  "data": null
}
Jika model utama terkena 429, backend boleh menggunakan fallback model yang dikonfigurasi. Hindari infinite retry.
Environment:

OPENROUTER_API_KEY=...

OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

OPENROUTER_MODEL=...

OPENROUTER_FALLBACK_MODEL=...

Secret tidak boleh dikirim ke frontend maupun ditulis ke log.
---
## 27B. Cloudflare Security Integration
Cloudflare digunakan sebagai security dan edge layer untuk deployment production Kuki Bakehouse.
Tujuan utama:
- melindungi frontend dan Laravel API dari traffic berbahaya;
- membantu mitigasi DDoS;
- menerapkan HTTPS yang benar;
- membantu filtering request pada edge;
- membatasi abuse pada endpoint sensitif;
- mengurangi bot abuse pada login, form, dan Kuki Assistant;
- membantu menyembunyikan origin dari akses publik langsung jika infrastructure memungkinkan.
Cloudflare bukan pengganti validation, authentication, authorization, atau security Laravel. Keamanan tetap harus diterapkan pada dua layer: Cloudflare + aplikasi.
### 27B.1 Arsitektur produksi

Pengunjung / Admin

        ↓

Cloudflare Edge

DNS Proxy

TLS / HTTPS

WAF / Security Rules

DDoS Protection

Rate Limiting

Bot / Challenge Layer

        ↓

Frontend / Laravel Origin

        ↓

Laravel 11 REST API

        ↓

MySQL / MariaDB

        ↓

OpenRouter (untuk Kuki Assistant)

Contoh hostname:

www.kukibakehouse.com  → Public React

admin.kukibakehouse.com → Admin React

api.kukibakehouse.com  → Laravel API

Nama domain aktual dapat disesuaikan dengan deployment.
### 27B.2 DNS dan Proxy
Untuk hostname production yang mendukung proxy Cloudflare:
- DNS dikelola melalui Cloudflare;
- record frontend dan API menggunakan Cloudflare proxy jika sesuai dengan hosting;
- origin address tidak ditampilkan ke user melalui source code;
- frontend harus menggunakan hostname API production, bukan IP origin langsung.
Development lokal tidak wajib melewati Cloudflare.
### 27B.3 SSL/TLS
Target production:

SSL/TLS Mode: Full (strict)

Origin harus memiliki certificate yang valid atau certificate origin yang sesuai.
Dilarang menggunakan mode yang menurunkan keamanan hanya untuk menghilangkan error deployment.
HTTPS harus digunakan untuk:
- Public Web;
- Admin;
- API;
- authentication;
- Kuki Assistant.
### 27B.4 WAF / Security Rules
Aktifkan proteksi WAF dan security rules yang tersedia pada plan Cloudflare yang digunakan.
Prioritas proteksi:

/api/admin/*

/api/login

/api/assistant/chat

/api/produk management

/api/kategori management

Security rules tidak boleh memblokir request normal aplikasi.
Setiap rule harus diuji sebelum dianggap selesai.
Fitur Cloudflare berbayar tidak boleh dijadikan dependency wajib apabila project dapat berjalan aman dengan fitur yang tersedia pada plan saat ini.
### 27B.5 Rate Limiting
Gunakan rate limiting secara berlapis:

Cloudflare rate limit

        +

Laravel rate limiter

Endpoint prioritas:
- login Admin;
- Kuki Assistant;
- endpoint write/create/update/delete;
- endpoint yang berpotensi mahal.
Kuki Assistant perlu rate limit khusus karena setiap request dapat memanggil provider AI.
Rate limit harus cukup longgar untuk penggunaan normal tetapi mampu mengurangi spam/bot abuse.
Nilai limit final ditentukan melalui testing dan tidak boleh di-hardcode secara sembarangan ke banyak file.
### 27B.6 Cloudflare Turnstile
Cloudflare Turnstile dapat digunakan untuk mengurangi bot abuse.
Prioritas integrasi:
1. Admin Login;
2. form publik jika tersedia;
3. Kuki Assistant jika terjadi abuse atau spam otomatis.
Alur:

React

  ↓ menghasilkan Turnstile token

Laravel

  ↓ validasi token server-side

Cloudflare Siteverify

  ↓

Laravel melanjutkan request jika valid

sitekey dapat berada pada frontend.
secret key hanya boleh berada pada backend .env.
Contoh environment:

CLOUDFLARE_TURNSTILE_SITE_KEY=...

CLOUDFLARE_TURNSTILE_SECRET_KEY=...

Laravel wajib melakukan server-side validation. Validasi client-side saja tidak dianggap aman.
Turnstile tidak boleh mengubah visual public website secara signifikan. Gunakan mode yang paling tidak mengganggu UX selama tetap aman.
### 27B.7 Origin Protection
Jika backend di-host pada VPS/server yang memungkinkan firewall network:
- batasi akses langsung ke origin jika memungkinkan;
- izinkan traffic web melalui Cloudflare sesuai kebutuhan;
- jangan expose service database ke internet publik;
- port database tidak boleh terbuka secara publik;
- gunakan firewall server selain Cloudflare;
Jika hosting tidak memungkinkan aturan origin khusus, requirement ini menjadi best-effort dan bukan blocker deployment.
### 27B.8 Laravel Behind Cloudflare
Laravel harus tetap dapat mengenali request HTTPS dan IP client secara benar saat berada di belakang reverse proxy.
Konfigurasi proxy/header harus dilakukan menggunakan mekanisme Laravel yang sesuai dengan versi project.
Jangan mempercayai header proxy dari sumber yang tidak dipercaya secara sembarangan.
CORS hanya mengizinkan origin frontend/admin production yang memang digunakan.
Contoh production origin:

https://www.kukibakehouse.com

https://admin.kukibakehouse.com

### 27B.9 Cache Rules
Cloudflare caching boleh digunakan untuk asset statis:
- JavaScript build;
- CSS;
- font;
- gambar produk publik jika aman;
- asset frontend lain.
Jangan cache response sensitif atau personal secara publik:
- Admin API;
- authentication;
- user/session data;
- write request;
- Kuki Assistant conversation;
- endpoint yang memakai cookie/token private.
### 27B.10 Security Headers
Production harus menggunakan security headers yang sesuai, misalnya:
- HTTPS enforcement;
- HSTS setelah HTTPS stabil;
- X-Content-Type-Options;
- referrer policy;
- frame protection / CSP sesuai kebutuhan.
CSP harus diuji karena frontend menggunakan resource eksternal tertentu seperti Cloudflare Turnstile.
Jangan menerapkan CSP terlalu ketat tanpa testing karena dapat merusak frontend.
### 27B.11 Secret Management
Credential Cloudflare tidak boleh:
- dimasukkan ke Git;
- ditulis ke React source;
- dikirim ke browser kecuali public sitekey;
- dicatat ke log;
- dimasukkan ke README sebagai nilai asli.
File .env harus tetap di-ignore dari Git.
### 27B.12 Logging dan Monitoring
Untuk incident security, backend sebaiknya mencatat:
- failed login;
- API validation failure penting;
- provider AI error;
- rate limit event aplikasi;
- exception penting.
Log tidak boleh menyimpan:
- password;
- API key;
- Turnstile secret;
- bearer token;
- session secret.
### 27B.13 Development vs Production
Local development:

React → Laravel lokal

Production:

React/User → Cloudflare → Laravel/Hosting

Jangan memaksa local development menggunakan Cloudflare jika tidak diperlukan.
### 27B.14 Cloudflare Acceptance Criteria
- [ ] Domain production menggunakan DNS Cloudflare.
- [ ] Hostname production yang sesuai diproxy melalui Cloudflare.
- [ ] HTTPS production aktif.
- [ ] SSL/TLS menggunakan Full (strict) ketika origin siap.
- [ ] API tetap berjalan normal di belakang Cloudflare.
- [ ] Login Admin memiliki proteksi anti-abuse.
- [ ] Kuki Assistant memiliki rate limiting.
- [ ] Turnstile tervalidasi server-side pada endpoint yang dipilih.
- [ ] Endpoint sensitif tidak di-cache publik.
- [ ] Database tidak terbuka ke internet publik.
- [ ] Secret Cloudflare tidak terdapat di frontend atau Git.
- [ ] Cloudflare tidak mengubah Public UI.
- [ ] Security rules diuji agar tidak memblokir user normal.
---
## 28. Ringkasan Arsitektur Final

                    INTERNET

                       │

                       ▼

              ┌───────────────────┐

              │    CLOUDFLARE     │

              │ DNS • TLS • WAF   │

              │ Rate Limit • DDoS │

              │ Turnstile         │

              └─────────┬─────────┘

                        │

          ┌─────────────┴─────────────┐

          │                           │

          ▼                           ▼

┌──────────────────────┐    ┌──────────────────────┐

│ PUBLIC WEB CATALOG   │    │ ADMIN DASHBOARD      │

│ React.js             │    │ React.js             │

│                      │    │                      │

│ Landing • Katalog    │    │ Login • Dashboard    │

│ Detail • Search      │    │ Kategori • Produk    │

│ Kuki Assistant UI    │    │                      │

└──────────┬───────────┘    └──────────┬───────────┘

           │                            │

           └────────────┬───────────────┘

                        │ REST API

                        ▼

              ┌───────────────────────┐

              │      LARAVEL 11       │

              │      REST API         │

              │      Sanctum          │

              │                       │

              │ Produk • Kategori     │

              │ Admin • Storage       │

              │ Kuki Assistant        │

              │ Turnstile Validation  │

              └───────┬────────┬──────┘

                      │        │

            ┌─────────┘        └─────────┐

            ▼                            ▼

┌───────────────────────┐      ┌───────────────────────┐

│ MYSQL / MARIADB       │      │ OPENROUTER            │

│                       │      │ AI Provider Gateway   │

│ pengguna              │      └───────────────────────┘

│ kategori              │

│ produk                │

│ transaksi             │

│ detail_transaksi      │

│ log_stok              │

│ obrolan               │

│ pesan_obrolan         │

└───────────────────────┘

Catatan:
- Cloudflare berada pada layer sebelum origin production.
- OpenRouter hanya dipanggil dari Laravel.
- Database tidak diakses langsung oleh frontend.
- Secret tidak disimpan di React.
- Public UI tetap FROZEN kecuali user meminta perubahan visual.
---
## 29. Prinsip Utama Produk
**Public Web Catalog menampilkan data.**
**Admin Content Management mengelola data.**
**Laravel API menjadi penghubung.**
**Database menjadi sumber data terpusat.**
**Perubahan konten tidak membutuhkan perubahan source code Public Web Catalog.**
**Public UI yang telah disetujui tetap frozen selama integrasi.**\n\n****Kuki Assistant menggunakan OpenRouter melalui Laravel, bukan langsung dari frontend.**\n\n**Cloudflare menjadi security/edge layer production tanpa mengubah design system aplikasi.**\n\n**Security diterapkan berlapis: Cloudflare + Laravel + database/infrastructure.****