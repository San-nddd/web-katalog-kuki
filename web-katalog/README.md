# Kuki Bakehouse — Web Katalog + Admin Content Management + Kuki Assistant

Web katalog publik Kuki Bakehouse (React + Vite) yang terhubung dengan Laravel REST API, dilengkapi **Admin Content Management** dan **Kuki Assistant** (AI chat berbasis OpenRouter).

> **Bukan e-commerce.** Tidak ada keranjang belanja, checkout, pembayaran, login customer, POS, absensi, maupun face verification. UI katalog publik bersifat **frozen**: penambahan yang diizinkan hanya Kuki Assistant, entry point-nya, dan CTA produk kontekstual.

---

## Daftar Isi

1. [Tech Stack](#1-tech-stack)
2. [Cara Menjalankan](#2-cara-menjalankan)
3. [Environment Variables](#3-environment-variables)
4. [Authentication](#4-authentication)
5. [Admin Content Management](#5-admin-content-management)
6. [Kuki Assistant](#6-kuki-assistant)
7. [API Assistant](#7-api-assistant)
8. [Contextual Product Assistant](#8-contextual-product-assistant)
9. [OpenRouter Configuration](#9-openrouter-configuration)
10. [Database Chat](#10-database-chat)
11. [API Katalog (Produk & Kategori)](#11-api-katalog-produk--kategori)
12. [Testing](#12-testing)
13. [Struktur Folder](#13-struktur-folder)

---

## 1. Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | React 19 + Vite, React Router, CSS murni (CSS Variables) |
| Backend | Laravel (PHP 8.5), Laravel Sanctum, MySQL, PHPunit (sqlite `:memory:` untuk test) |
| AI | OpenRouter API (`/v1/chat/completions`), dipanggil **hanya dari backend** |
| Lint/Build | ESLint (`npm run lint`), Vite (`npm run build`) |

Dua project terpisah dalam satu folder ini:

- `web-katalog/` → frontend (React)
- `backend-web-katalog/` → backend (Laravel REST API)

---

## 2. Cara Menjalankan

### Backend

```bash
cd backend-web-katalog
composer install
cp .env.example .env          # lalu isi DB, ADMIN_*, OPENROUTER_*
php artisan key:generate
php artisan migrate --seed    # membuat admin + data katalog
php artisan storage:link      # untuk gambar produk hasil upload
php artisan serve             # http://localhost:8000
```

### Frontend

```bash
cd web-katalog
npm install
npm run dev                   # http://localhost:5173
```

Pastikan `VITE_API_URL` menunjuk ke backend (default `http://localhost:8000/api`).

---

## 3. Environment Variables

### Frontend (`web-katalog/.env`)

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000/api` | Base URL REST API Laravel |

### Backend (`backend-web-katalog/.env`)

| Variabel | Keterangan |
| --- | --- |
| `APP_URL` | Base URL aplikasi (dipakai `storage:link` / gambar produk) |
| `DB_*` | Koneksi MySQL (`kuki_BakehouseDB`) |
| `OPENROUTER_API_KEY` | API key OpenRouter — **hanya di backend, tidak pernah dikirim ke frontend** |
| `OPENROUTER_MODEL` | Model OpenRouter (default: `openai/gpt-4o-mini`) |
| `ADMIN_EMAIL` | Email admin bawaan hasil seeder (default: `admin@kukibakehouse.com`) |
| `ADMIN_PASSWORD` | Password admin bawaan hasil seeder (default: `kukibakehouse`) |

---

## 4. Authentication

- Menggunakan **Laravel Sanctum** (token bearer) untuk area Admin.
- Endpoint publik katalog (`GET /api/produk`, `GET /api/kategori`, chat assistant) **terbuka** tanpa login.
- Endpoint tulis/pengelolaan dilindungi middleware `auth:sanctum`.

Alur login:

1. `POST /api/auth/login` dengan `{ email, password }` → mengembalikan `{ token, user }`.
2. Frontend menyimpan token di `localStorage` (`kuki_admin_token`) dan mengirimkannya sebagai header `Authorization: Bearer <token>` pada setiap request Admin.
3. `POST /api/auth/logout` membatalkan token, lalu frontend menghapus sesi dari `localStorage`.
4. `GET /api/auth/user` mengembalikan data user aktif (butuh token).

Semua request API dikelola satu tempat: `web-katalog/src/services/api.js`.

---

## 5. Admin Content Management

Halaman Admin berada di rute `/admin/*` dan dilindungi guard `AdminRoute` (belum login → dialihkan ke `/admin/login`).

| Rute | Halaman | Fungsi |
| --- | --- | --- |
| `/admin/login` | `LoginPage` | Login admin |
| `/admin` | `DashboardPage` | Statistik (produk, kategori, stok menipis) + produk terbaru |
| `/admin/produk` | `ProdukAdminPage` | Daftar produk, hapus, unggah gambar |
| `/admin/produk/baru` | `ProdukFormPage` | Tambah produk |
| `/admin/produk/:id/edit` | `ProdukFormPage` | Ubah produk |
| `/admin/kategori` | `KategoriAdminPage` | Tambah/ubah/hapus kategori |

Fitur:

- CRUD produk: nama, deskripsi, harga, kategori, barcode/SKU, slug (auto `Str::slug`), stok, stok minimum, metadata AI, gambar.
- CRUD kategori: nama + slug (otomatis bila kosong).
- Upload gambar produk ke disk `public` (`produk/`), bisa dari tabel daftar maupun form.
- Tampilan mengikuti design system katalog (token warna & font yang sama), responsif.

Kredensial bawaan (hasil seeder): `admin@kukibakehouse.com` / `kukibakehouse`.

---

## 6. Kuki Assistant

AI chat publik yang menjawab pertanyaan tentang Kuki Bakehouse dan produknya.

- **Entry point (Homepage):** floating button `ChatButton` + `ChatWindow` yang dirender oleh komponen `KukiAssistant` di `HomePage.jsx`.
- **Contextual (Detail Produk):** halaman `DetailProdukPage` merender `KukiAssistant` dengan `open`/`onOpenChange` terkontrol dan `product` sebagai konteks.
- Sesi disimpan di `localStorage` (`kuki_assistant_session`, UUID) sehingga riwayat percakapan tetap terhubung antar kunjungan.
- Status loading: *"Kuki sedang berpikir..."*; pesan error: *"Maaf, Kuki Assistant sedang mengalami kendala. Silakan coba lagi."*
- Jika pertanyaan di luar scope atau user meminta bantuan manusia, balasan ditandai handover dan obrolan ditandai `membutuhkan_admin`.
- Frontend **tidak pernah** memanggil OpenRouter langsung; semua lewat backend.

Komponen:

- `src/components/KukiAssistant.jsx` — state, kirim pesan, greeting kontekstual
- `src/components/ChatWindow.jsx` + `ChatWindow.css` — bubble chat, input, loading, error
- `src/components/ChatButton.jsx` + `ChatButton.css` — tombol mengambang
- `src/services/assistantService.js` — `kirimPesanAssistant()`, `getSessionId()`, `ambilRiwayat()`

---

## 7. API Assistant

### `POST /api/assistant/chat`

Request:

```json
{
  "session_id": "uuid-dari-frontend",
  "message": "Apakah ada roti tanpa gula?",
  "product_id": 5
}
```

`product_id` bersifat **opsional**. Rate limit: `10 request / menit`.

Response sukses (`200`):

```json
{
  "success": true,
  "message": "Pesan berhasil diproses.",
  "data": {
    "session_id": "uuid-dari-frontend",
    "reply": "Jawaban Kuki Assistant...",
    "needs_admin": false,
    "product_context": null
  }
}
```

Error backend OpenRouter/LLM → `503` dengan wrapper `{ success: false, message: "Maaf, Kuki Assistant sedang mengalami kendala. Silakan coba lagi." }`.

### `GET /api/assistant/obrolan/{sessionId}`

Mengambil riwayat percakapan (pesan + siapa pengirimnya) untuk sesi tersebut. Bila belum ada → `404`.

Implementasi: `AssistantController` + `KukiAssistantService` + `OpenRouterService`.

---

## 8. Contextual Product Assistant

Pada halaman **Detail Produk** (`/produk/:id`), tombol **"Tanya Kuki tentang produk ini"** membuka Kuki Assistant dengan konteks produk yang sedang dilihat:

- Greeting berubah menjadi: *"Halo! Saya bisa membantu menjelaskan tentang {nama produk}. Apa yang ingin kamu ketahui?"*
- Header chat menampilkan `Konteks: {nama produk}`.
- `product_id` ikut dikirim ke `POST /api/assistant/chat`, sehingga backend memuat data produk (nama, harga, kategori, stok, metadata AI) dan memasukkannya ke prompt.
- Bila produk tidak ditemukan di API, fallback ke mock data; bila keduanya kosong → status "Produk Tidak Ditemukan".

Product card di katalog kini tertaut ke halaman detail: `ProductCard` dibungkus `Link` ke `/produk/:id`.

---

## 9. OpenRouter Configuration

- Konfigurasi di `backend-web-katalog/config/services.php` (`openrouter.key`, `openrouter.model`, `openrouter.timeout`) + `config/kuki.php` untuk info toko.
- `OpenRouterService` memanggil `POST https://openrouter.ai/api/v1/chat/completions` (format OpenAI) dengan header `Authorization: Bearer <OPENROUTER_API_KEY>`, `HTTP-Referer`, dan `X-Title` — **API key hanya hidup di `.env` backend**.
- Karena OpenRouter bersifat multi-provider, **model bisa diganti kapan saja lewat `OPENROUTER_MODEL`** tanpa mengubah kode (mis. `openai/gpt-4o-mini`, `google/gemini-2.5-flash`, `anthropic/claude-haiku`, atau model `:free`).
- `KukiAssistantService` menyusun system prompt: batasan scope (katalog saja, bukan e-commerce, tidak mengarang promo/stok), info toko (alamat, telepon, jam buka), konteks produk (opsional), daftar katalog terbatas (60 produk), serta 12 pesan terakhir sebagai riwayat. Prompt dikirim sebagai `messages[0]` dengan `role: system`, riwayat sebagai `user`/`assistant`.
- Respons dibereskan (marker `[[HANDOVER]]` dihapus dari teks) dan dideteksi untuk status handover.
- Bila API key kosong atau panggilan gagal, service melempar error → controller menjawab `503` dengan pesan ramah (chat tetap UI-first, tidak crash).

---

## 10. Database Chat

Dua tabel dibuat oleh migration `2026_10_08_120000_create_obrolan_tables.php`:

**`obrolan`** — satu baris per sesi percakapan

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | bigint PK | |
| `session_id` | string, unique | UUID dari frontend |
| `pertanyaan_awal` | text, nullable | Pertanyaan pertama pada sesi |
| `product_id` | FK → `produk`, nullable | Konteks produk kontekstual |
| `status_handover` | string, default `tidak_perlu` | `tidak_perlu` / `membutuhkan_admin` |
| `status` | string, default `aktif` | Status obrolan |
| timestamps | | |

**`pesan_obrolan`** — setiap pesan

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | bigint PK | |
| `obrolan_id` | FK → `obrolan`, cascade delete | |
| `tipe_pengirim` | string | `user` / `bot` / `admin` |
| `pesan` | text | Isi pesan |
| timestamps | | |

Model: `App\Models\Obrolan`, `App\Models\PesanObrolan`.

---

## 11. API Katalog (Produk & Kategori)

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/produk` | publik | Daftar produk (array, dengan relasi kategori) |
| GET | `/api/produk/{id}` | publik | Detail produk |
| POST | `/api/produk` | token | Tambah produk (wrapper `{success, message, data}`, `201`) |
| PUT | `/api/produk/{id}` | token | Ubah produk |
| DELETE | `/api/produk/{id}` | token | Hapus produk |
| POST | `/api/produk/{id}/gambar` | token | Upload gambar (`multipart`, field `gambar`) |
| GET | `/api/kategori` | publik | Daftar kategori |
| GET | `/api/kategori/{id}` | publik | Detail kategori |
| POST | `/api/kategori` | token | Tambah kategori |
| PUT | `/api/kategori/{id}` | token | Ubah kategori |
| DELETE | `/api/kategori/{id}` | token | Hapus kategori |

Frontend memetakan response Laravel (`nama_produk`, `deskripsi_produk`, `harga_produk`, `gambar_produk`) ke bentuk UI (`nama`, `deskripsi`, `harga`, `gambar`) di `src/services/produkService.js`.

---

## 12. Testing

### Backend (PHPUnit)

```bash
cd backend-web-katalog
php artisan test
```

Hasil terakhir: **29 tests, 127 assertions — semua lulus.**

| File | Cakupan |
| --- | --- |
| `tests/Feature/AdminAuthTest.php` | Login, logout, `/auth/user`, proteksi endpoint |
| `tests/Feature/ProdukApiTest.php` | CRUD produk, validasi, upload gambar, endpoint publik |
| `tests/Feature/KategoriApiTest.php` | CRUD kategori, validasi |
| `tests/Feature/AssistantApiTest.php` | Chat, sesi/riwayat, validasi input |
| `tests/Feature/KatalogIntegrationTest.php` | Integrasi katalog publik |

Test memakai sqlite `:memory:` (lihat `phpunit.xml`) dan `Storage::fake()` untuk upload.

### Frontend

```bash
cd web-katalog
npm run lint     # ESLint — tanpa error
npm run build    # Build production — sukses
```

---

## 13. Struktur Folder

```text
web-katalog/src/
├── assets/            # Gambar statis
├── components/        # Navbar, Footer, ProductCard, SearchBar, KukiAssistant, ChatButton, ChatWindow, dll
├── hooks/             # useInView
├── pages/             # HomePage, KatalogPage, DetailProdukPage, ContactPage, dll
│   └── admin/         # AdminLayout, AdminRoute, LoginPage, DashboardPage,
│                      # ProdukAdminPage, ProdukFormPage, KategoriAdminPage, admin.css
├── services/          # api.js, produkService.js, kategoriService.js, authService.js, assistantService.js
├── utils/             # mockData.js (fallback saat backend tidak tersedia)
├── App.jsx            # Routing publik + /admin/*
└── index.css          # Design tokens (CSS Variables)

backend-web-katalog/
├── app/Http/Controllers/   # AuthController, produkController, kategoriController, AssistantController
├── app/Models/             # Obrolan, PesanObrolan, User (Sanctum), Produk, Kategori
├── app/Services/           # OpenRouterService, KukiAssistantService
├── config/                 # kuki.php, services.php (openrouter)
├── database/migrations/    # + create_obrolan_tables
├── database/seeders/       # DatabaseSeeder (admin), KatalogSeeder (6 kategori, 12 produk)
└── routes/api.php          # Seluruh endpoint
```

---

## Dokumen Terkait

- `PRD_Kuki_Bakehouse_Web_Catalog_Admin_v2.md` — PRD resmi (data model, format response, design system, UI admin).

**Developer:** Senior Frontend Developer — UKK Kuki Bakehouse Project
