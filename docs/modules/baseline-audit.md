# Audit Baseline Repository

## Tujuan dan batas
Catatan ini merekam kondisi toolchain serta hasil pemeriksaan minimal untuk `KUKI-P0-001`. Audit hanya membaca konfigurasi, source route, status Git, dan menjalankan build/lint/test; tidak menjalankan migration, seeding, atau mengubah source aplikasi.

## Status nyata (2026-10-26)
- Git root `E:/Ekosistem-kuki`, branch `main`, HEAD `252e5b7` (`2026-10-23 bahasa`), tracking `origin/main`.
- Working tree sudah dirty saat pemeriksaan pertama: ada file web/backend yang modified/deleted serta file untracked. Seluruhnya dipertahankan.
- Web: Node `v25.1.0`, npm `11.6.2`, React `19.3.0`, Vite `8.3.4`.
- Backend: PHP `8.5.0`, Composer `2.9.3`, Laravel `13.36.0`.
- Toolchain Flutter tersedia: Flutter `3.35.7` stable dan Dart `3.9.2`; folder Flutter dan aplikasi belum dianalisis pada task ini.
- `routes/api.php` mendaftarkan route public, route `auth:sanctum`, `can:manage-admin`, `can:view-management-dashboard`, dan `can:manage-testimonials`. Route Laravel yang terdaftar: 67. Pendaftaran route **tidak** memastikan behavior role benar.

## Hasil command
| Command | Hasil aktual |
|---|---|
| `git status --short --branch` | Exit 0; branch `main`, banyak perubahan lokal |
| `npm ls react vite --depth=0` | Exit 0; React 19.3.0, Vite 8.3.4 |
| `npm run build` (`web-katalog/`) | Exit 0; Vite build selesai, peringatan chunk >500 kB |
| `npm run lint` (`web-katalog/`) | Exit 1; 24 error dan 1 warning |
| `php artisan --version` (`backend-web-katalog/`) | Exit 0; Laravel Framework 13.36.0 |
| `php artisan route:list --except-vendor` (`backend-web-katalog/`) | Exit 0; 67 route |
| `php artisan test` (`backend-web-katalog/`) | Exit 2; 43 tes, 33 pass, 9 fail, 1 error |
| `flutter --version` | Exit 0; Flutter 3.35.7, Dart 3.9.2 |

### Ringkasan kegagalan yang terlihat
- ESLint: termasuk unused import/variable dan aturan React hooks/state pada beberapa komponen dan halaman; ada satu warning dependency `useEffect`. Daftar lengkap dicetak oleh `npm run lint`.
- PHPUnit: kegagalan mencakup `AdminAuthTest` (login legacy mengembalikan 422, harapan 200), `AssistantApiTest` (dua respons 503 dan satu schema error: tabel `katalog_produk` tidak memiliki kolom `metadata_ai`), `ManagementDashboardTest` (legacy role memberi 200, harapan 403), `ProdukApiTest` (500/409 dibanding 201/200), dan `TestimonialCmsTest` (status moderation serta hitungan publik berbeda dari ekspektasi).
- Fakta di atas adalah baseline yang diamati, tetapi akar penyebab belum ditelusuri. Tidak ada perbaikan dicoba pada task audit.

## Batas audit dan risiko
- Tidak dilakukan pemeriksaan schema/migration, data DB lokal, implementasi controller, atau tes role/API end-to-end.
- Build berhasil tidak menghapus peringatan ukuran bundle dan tidak membuktikan runtime UI bekerja.
- Route ada bukan berarti kebijakan authorization lolos test; route/role perlu ditinjau pada task tersendiri.
- Jangan memakai hasil test ini sebagai bukti keadaan production. Tes Laravel dikonfigurasi menggunakan SQLite in-memory.

## Alur pemeriksaan
```text
Git status + manifest/runtime
  -> Vite build dan ESLint
  -> Laravel version dan route:list
  -> Laravel PHPUnit (SQLite in-memory)
  -> ringkasan bukti di PROJECT_STATUS dan log
```

## Cara mengulang
```powershell
Set-Location E:\Ekosistem-kuki\web-katalog
npm run build
npm run lint

Set-Location E:\Ekosistem-kuki\backend-web-katalog
php artisan --version
php artisan route:list --except-vendor
php artisan test
```

**Task:** `KUKI-P0-001`  
**Perubahan task:** dokumentasi baseline saja; tidak ada perubahan source aplikasi.

## Tindak lanjut baseline Laravel — 2026-10-26
Audit lanjutan dilakukan pada SQLite in-memory. Full suite sebelum patch menghasilkan 49 tests: 39 passed, 9 failed, dan 1 error. Dua kegagalan Assistant yang mengembalikan 503 ditelusuri ke kontrak tipe: `/api/assistant/chat` menerima `session_id` nullable tetapi `KukiAssistantService::chat()` mensyaratkan `string`, padahal service sudah memiliki fallback pembuat UUID. Parameter service diubah menjadi nullable tanpa mengubah bentuk respons atau endpoint. Dua tes terarah lulus sesudah patch.

Hasil full suite setelah patch: **49 tests, 41 passed, 7 failed, 1 error** (exit 2). Kegagalan yang tersisa terklasifikasi sebagai berikut:

| Kelompok | Bukti teramati | Batas tindakan |
|---|---|---|
| Login legacy tanpa kolom role dan role `manager` | `roleForAuthorization()` mengembalikan `null` saat role tidak ada, tetapi memetakan `manager` menjadi `admin`; test meminta perilaku berbeda untuk dua kondisi tersebut. | Perubahan auth/role perlu keputusan owner; tidak diubah. |
| `metadata_ai` | Test insert produk gagal karena schema SQLite `katalog_produk` tidak memiliki kolom ini, sedangkan model/controller/test menggunakannya. Ini menyebabkan satu 500 pada create produk dan satu error pada konteks Assistant. | Perlu keputusan schema/migration; tidak dibuat atau dijalankan. |
| Hapus produk dengan riwayat stok | Update stok test membuat mutasi ledger, lalu endpoint `destroy` menolak penghapusan dengan 409. | Kebijakan ledger/arsip versus hapus permanen perlu keputusan; guard tidak diubah. |
| Moderasi testimonial/komentar | Hook `creating` di `AppServiceProvider` memaksa testimonial menjadi `published` dan komentar menjadi `approved`, bertentangan dengan test yang mengharapkan moderasi pending. | Perubahan perilaku route publik/moderasi perlu keputusan owner; tidak diubah. |

Temuan ini merupakan hasil test lokal SQLite, bukan klaim keadaan database production. Keputusan yang dibutuhkan dicatat sebagai `DEC-QA-001` sampai `DEC-QA-004` pada `docs/DECISIONS_PENDING.md`. Build, migration, seeding, dan akses database production tidak dilakukan.

## Perintah tindak lanjut
| Command | Hasil |
|---|---|
| `php artisan test` sebelum patch (backend) | FAIL; exit 2; 49 tests, 39 passed, 9 failed, 1 error |
| `php artisan test --filter='test_session_id_dibuat_otomatis_bila_tidak_dikirim|test_api_key_tidak_dikirim_ke_frontend'` | PASS; exit 0; 2 tests, 5 assertions |
| `php artisan test` sesudah perbaikan/keputusan (backend) | PASS; exit 0; 49 tests, 259 assertions |
| `php -l app/Services/KukiAssistantService.php` | PASS; exit 0; tanpa syntax error atau deprecation setelah tipe nullable ditulis eksplisit |

### Status akhir setelah keputusan owner — 2026-10-26
DEC-QA-001..004 telah disetujui dan diterapkan pada cakupan yang disepakati. Migration additive `metadata_ai` dibuat dan teruji lewat SQLite in-memory, tidak dieksekusi di production. Ekspektasi tes mencerminkan auth/role dan publikasi yang dipertahankan; test penghapusan membuktikan produk serta mutasi koreksinya tetap ada setelah 409. `php artisan test` penuh lulus 49 tes / 259 assertions. Tidak ada klaim bahwa migrasi production sudah dijalankan.

Setelah owner menyetujui DEC-QA-001..004, hasil full suite lama yang FAIL di bawah ini telah diselesaikan: perilaku auth/role dan publikasi langsung dipertahankan serta ekspektasi tes diselaraskan; test hapus produk memastikan status 409, record produk, dan mutasi koreksi tetap utuh; migration additive menambahkan `metadata_ai`. Kegagalan lama adalah baseline sebelum approval, bukan status tes terkini. Migration diuji melalui RefreshDatabase di SQLite in-memory saja.

## Tindak lanjut lint frontend — 2026-10-26
Full `npm run lint` sebelum perubahan ini menghasilkan 24 errors dan 1 warning. Satu lint error murni di `src/components/ChatWindow.jsx` menandai `Date.now()` yang dipanggil langsung saat render untuk nilai awal countdown. File tersebut dipastikan tidak memiliki perubahan lokal; initializer diubah menjadi callback lazy `useState(() => Date.now())`, yang menghasilkan timestamp awal yang sama dan hanya saat mount.

| Command | Hasil |
|---|---|
| `npx eslint src/components/ChatWindow.jsx` sebelum patch | FAIL; exit 1; 1 error purity |
| `npx eslint src/components/ChatWindow.jsx` sesudah patch | PASS; exit 0 |
| `npm run build` (`web-katalog/`) | PASS; exit 0; warning chunk >500 kB masih ada |
| `npm run lint` (`web-katalog/`) sesudah patch | FAIL; exit 1; 23 errors, 1 warning |

Error lint yang tersisa tidak diubah pada task ini. Sebagian berada di file React yang sudah modified/untracked oleh pengguna; sisanya berupa effect/state atau unused variable yang perlu dicek konteks agar tidak mengubah behavior/UI disetujui.

Tindak lanjut `KUKI-QA-003`: state `currentIndex` pada `src/components/ProductCarousel.jsx` hanya ditulis dan tidak dibaca. Seluruh pembacaan posisi dilakukan melalui `currentIndexRef`, dan style track menggunakan `translateX`. Deklarasi state dan setter yang tidak diperlukan dihapus. Focused ESLint PASS, build PASS; full lint pada saat itu 22 errors/1 warning. Perubahan hanya menghilangkan render ekstra yang tidak memberi output visual.

Tindak lanjut `KUKI-QA-004`: `DetailProdukPage.jsx` menyimpan `varianDipilih`, tetapi parent tidak membaca nilainya. Callback hanya mengubah state parent tersebut; `PilihanVarianProduk` tetap mengelola nilai dropdown secara lokal. State parent dan prop callback dihapus setelah file dipastikan bersih dari perubahan lokal. Focused ESLint dan build PASS; full lint kini 21 errors/1 warning.
