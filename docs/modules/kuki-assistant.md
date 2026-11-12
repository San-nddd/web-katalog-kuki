# Modul Kuki Assistant dan Handover Admin

## Tujuan dan status nyata
Assistant menjawab pertanyaan tentang Kuki Bakehouse, dapat membawa konteks produk, menyimpan riwayat obrolan, dan mengalihkan sesi kepada Admin manusia. Modul **ADA**. Keberhasilan provider eksternal dan alur handover belum tervalidasi end-to-end pada sesi ini.

## Alur
```text
KukiAssistant
  -> assistantService (session_id disimpan di localStorage)
  -> POST /api/assistant/chat
  -> AssistantController / KukiAssistantService
  -> simpan obrolan + pesan, konteks katalog/produk
  -> OpenRouterService (kredensial dibaca dari config backend)

Tombol handover
  -> POST /api/assistant/handover
  -> status menunggu + pesan sistem
  -> notifikasi Admin jika push subscription tersedia
  -> AdminChatController menangani balasan/status
```

## Endpoint dan validasi teramati
| Method | Path | Catatan |
|---|---|---|
| POST | `/api/assistant/chat` | Throttle 10 per menit; validasi `message` wajib/max 2000, `session_id` opsional/max 64, `product_id` opsional dan harus ada |
| GET | `/api/assistant/obrolan/{sessionId}` | Riwayat sesi; 404 jika sesi tidak ditemukan |
| POST | `/api/assistant/handover` | Throttle 5 per menit; `session_id` harus menunjuk obrolan untuk melanjutkan handover |
| GET/POST | `/api/admin/obrolan/...` | Route Admin untuk membaca, mengambil, membalas, dan menyelesaikan percakapan |

Frontend berada di `web-katalog/src/components/KukiAssistant.jsx`, `src/components/chatUtils.js`, `src/services/assistantService.js`, dan `src/services/chatAdminService.js`. Backend berada di `AssistantController.php`, `Services/KukiAssistantService.php`, `Services/OpenRouterService.php`, dan `AdminChatController.php`.

Komponen tampilan chat yang dipakai ulang ada di `web-katalog/src/components/ChatWindow.jsx`. Timestamp awal untuk countdown handover diinisialisasi secara lazy dengan `useState(() => Date.now())`, sehingga fungsi render tetap murni tanpa mengubah nilai awal atau interval countdown.

## Status percakapan dan error
- Browser membuat atau membaca `session_id` lokal untuk menyambungkan pesan dengan riwayat.
- Saat sesi berada pada status handover/menunggu Admin/Admin aktif, backend menyimpan pesan baru tanpa memanggil AI lagi.
- Jika koneksi/provider gagal, backend mengembalikan pesan error yang ramah; frontend menampilkan error tanpa detail provider.
- Respons Assistant tidak menaruh API key provider di kode service frontend yang diperiksa. Provider dikonfigurasi/dipanggil dari backend.
- Contoh data dummy: `session_id="session-uji-01"`, pertanyaan `"Apa isi Roti Uji?"`; jangan gunakan sesi pelanggan nyata untuk tes.

## Tes dan keterbatasan
`AssistantApiTest.php` berisi test HTTP fake untuk chat, konteks produk, handover, error, dan riwayat. Jika `session_id` tidak dikirim, controller meneruskan `null`; service kini menerima parameter nullable lalu membuat UUID sebelum menyimpan obrolan. Dua tes untuk pembuatan sesi otomatis dan kerahasiaan API key lulus setelah perbaikan ini.

Kolom `metadata_ai` sekarang disediakan oleh migration additive nullable yang disetujui owner. Migration berjalan dalam test Laravel SQLite in-memory; tidak ada migration production dijalankan. Test konteks produk dan permintaan sesi otomatis lulus.

Suite Laravel terakhir: 49 tests / 259 assertions PASS. Dua respons 503 sebelumnya berasal dari argumen `session_id` null yang bertentangan dengan tipe parameter service; parameter kini nullable dan service membuat UUID otomatis. Tes menggunakan HTTP fake; provider eksternal tidak dipanggil.

Pada `KUKI-QA-002`, pelanggaran purity initializer `Date.now()` di `ChatWindow.jsx` diperbaiki dengan lazy initializer. ESLint terarah untuk file tersebut PASS; build production PASS. Full lint frontend masih FAIL dengan 21 errors/1 warning; error lain tidak diubah karena beberapa file terkait sudah memiliki perubahan lokal pengguna.

### Pembaruan audit algoritma — KUKI-AUDIT-001 (2026-10-29)
- Klasifikasi intent sekarang memprioritaskan pertanyaan lokasi/alamat ketika hanya nama/kategori produk yang disebut. Kartu tetap muncul untuk intent produk yang eksplisit seperti harga, stok, pilihan, atau rekomendasi.
- Jika nama produk muncul lengkap pada pertanyaan, hasil dibatasi ke produk dengan nama exact tersebut; query kategori umum tetap dapat menampilkan beberapa produk dalam kategori yang sama.
- `buildProductCardRows()` menghubungkan balasan bot dengan pertanyaan pengguna yang masih menunggu secara FIFO; balasan Admin menghapus antrean. Ini menghindari kartu menggunakan pertanyaan pengguna yang lebih baru ketika ada lebih dari satu pesan menunggu.
- Pengiriman chat dan handover memakai pengaman in-flight per `session_id`. Respons dari sesi yang sudah diganti tidak mengubah pesan/status sesi baru.
- Highlight memakai `sender + message.id`, bukan teks pesan, sehingga dua pesan identik tetap dapat ditandai/dihapus secara terpisah.
- Test regresi `web-katalog/tests/test-chat-products.mjs` mencakup lokasi + istilah produk, intent eksplisit, exact match, urutan pasangan balasan, dan reset saat Admin membalas. `test-chat-message-identity.mjs` memeriksa ID highlight yang berbeda untuk teks identik.
- Audit menemukan file migration `metadata_ai` tidak ada walau keputusan DEC-QA-002 menyatakan sudah diterapkan. Migration nullable forward-only telah dibuat sesuai approval yang tercatat; tidak ada migrasi database production yang dijalankan.
- Verifikasi 2026-10-29: Node test produk PASS; ESLint terarah untuk matcher dan `ChatWindow.jsx` PASS; build PASS (peringatan chunk >500 kB); full lint FAIL (25 error/1 warning); Laravel 49 test/259 assertion PASS. ESLint terarah `KukiAssistant.jsx` masih melaporkan dua temuan `set-state-in-effect` pada effect katalog dan polling; tidak diubah karena bukan akar bug sesi yang diperbaiki.

## Risiko / hal yang belum tervalidasi
- Pengiriman push notifikasi bergantung pada subscription dan konfigurasi lingkungan, tidak dibuktikan di sini.
- Siklus timeout handover, isolasi sesi antar pelanggan, dan jawaban provider perlu uji terarah sebelum klaim siap produksi.
- Rendering browser, polling lambat lintas sesi, dan permintaan bersamaan belum diuji melalui test UI/integrasi frontend.
- Owner menetapkan Maps aktif dengan sengaja; area itu dikecualikan dari audit/perubahan KUKI-AUDIT-001. POS/pegawai masih memerlukan approval.
- Jangan mengekspos credential provider ke browser atau log/dokumentasi.

**Sumber:** `KukiAssistant.jsx`, `assistantService.js`, `AssistantController.php`, `KukiAssistantService.php`, `OpenRouterService.php`, `AdminChatController.php`, `routes/api.php`, `AssistantApiTest.php`.  
**TASK-ID:** `KUKI-P0-005` — 2026-10-26.
