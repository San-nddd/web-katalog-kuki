<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

---

# Kuki Bakehouse — REST API

Backend Laravel untuk **Web Katalog Kuki Bakehouse**: katalog publik, Admin Content Management, dan Kuki Assistant (OpenRouter).

## Setup

```bash
composer install
cp .env.example .env         # isi DB, OPENROUTER_*, ADMIN_*
php artisan key:generate
php artisan migrate --seed   # admin + 6 kategori + 12 produk
php artisan storage:link     # penyimpanan gambar produk
php artisan serve            # http://localhost:8000
```

## Environment Variables

| Variabel | Keterangan |
| --- | --- |
| `DB_*` | Koneksi MySQL (`kuki_BakehouseDB`) |
| `OPENROUTER_API_KEY` | API key OpenRouter — hanya di backend |
| `OPENROUTER_MODEL` | Model OpenRouter, default `openai/gpt-4o-mini` (ganti bebas: `google/gemini-2.5-flash`, `anthropic/claude-haiku`, model `:free`, dll.) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Akun admin hasil seeder (`admin@kukibakehouse.com` / `kukibakehouse`) |

## Authentication (Laravel Sanctum)

- `POST /api/auth/login` `{email, password}` -> `{token, user}` (throttle 10/menit).
- Kirim token sebagai `Authorization: Bearer <token>`.
- `GET /api/auth/user`, `POST /api/auth/logout` memerlukan token.
- Endpoint tulis (produk/kategori/upload) berada di grup `auth:sanctum`; endpoint publik terbuka.

## Endpoint

| Method | Endpoint | Auth | Keterangan |
| --- | --- | --- | --- |
| GET | `/api/produk` | publik | Daftar produk + relasi kategori (array) |
| GET | `/api/produk/{id}` | publik | Detail produk |
| POST/PUT/DELETE | `/api/produk[/{id}]` | token | CRUD produk (wrapper `{success, message, data}`) |
| POST | `/api/produk/{id}/gambar` | token | Upload gambar (`gambar`) |
| GET | `/api/kategori[/{id}]` | publik | Daftar/detail kategori |
| POST/PUT/DELETE | `/api/kategori[/{id}]` | token | CRUD kategori |
| POST | `/api/auth/login` | publik | Login admin |
| GET/POST | `/api/auth/user`, `/api/auth/logout` | token | Profil & logout |
| POST | `/api/assistant/chat` | publik | Chat Kuki Assistant (throttle 10/menit) |
| GET | `/api/assistant/obrolan/{sessionId}` | publik | Riwayat percakapan |

## Kuki Assistant & OpenRouter

- `POST /api/assistant/chat` menerima `{session_id, message, product_id?}` dan mengembalikan `{session_id, reply, needs_admin, product_context}`.
- `OpenRouterService` memanggil `POST https://openrouter.ai/api/v1/chat/completions` (format OpenAI) dengan header `Authorization: Bearer <key>`, `HTTP-Referer`, `X-Title`; API key tidak pernah berada di frontend.
- Satu endpoint untuk semua provider/model: ganti model lewat `OPENROUTER_MODEL` tanpa ubah kode.
- `KukiAssistantService` menyusun prompt (scope katalog, info toko, konteks produk opsional, 12 pesan terakhir) lalu memvalidasi jawaban.
- Kegagalan OpenRouter menghasilkan `503` dengan pesan ramah: "Maaf, Kuki Assistant sedang mengalami kendala. Silakan coba lagi."

## Database Chat

Migration `2026_10_08_120000_create_obrolan_tables` membuat:

- `obrolan` — `session_id` (unique), `pertanyaan_awal`, `product_id` (FK), `status_handover` (`tidak_perlu`/`membutuhkan_admin`), `status`.
- `pesan_obrolan` — `obrolan_id` (FK cascade), `tipe_pengirim` (`user`/`bot`/`admin`), `pesan`.

Model: `App\Models\Obrolan`, `App\Models\PesanObrolan`.

## Testing

```bash
php artisan test
```

29 tests / 127 assertions (sqlite `:memory:`, `Storage::fake()` untuk upload): `AdminAuthTest`, `ProdukApiTest`, `KategoriApiTest`, `AssistantApiTest`, `KatalogIntegrationTest`.
