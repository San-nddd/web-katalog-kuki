---
name: kuki-clean-ui-code
description: Gunakan ketika diminta merapikan UI Kuki Bakehouse agar tidak AI slop, membuat JSX/CSS/JavaScript sederhana dan mudah dimengerti, atau memperbaiki responsivitas. Pertahankan desain yang disetujui, minimal diff, dan pengujian hemat token sesuai risiko.
---

# Kuki Clean UI & Simple Code — Fast Mode

**Tujuan:** merapikan source yang ada, bukan membuat desain/arsitektur baru. Hemat token dan hindari pengujian berlebihan.

## Cara kerja singkat
1. Temukan masalah dari **source aktual**. Baca file target dan dependensi langsung yang dibutuhkan saja.
2. Jaga layout, warna, font, class, copywriting, alur data, dan interaksi yang sudah disetujui. Untuk fitur Instagram/TikTok, jangan pindah lokasi pengisian URL tanpa diminta.
3. Buat perubahan terkecil yang menyelesaikan tugas. Edit file existing bila cukup; jangan membuat util, hook, service, script, atau dependency baru tanpa alasan kuat.
4. Validasi secukupnya menggunakan tabel di bawah. **Tidak wajib menjalankan semua jenis test.**
5. Laporkan hasil singkat, tanpa menempel log terminal/test panjang.

## Desain: rapi, bukan "AI slop"
- Gunakan token, palet bakery Kuki, tipografi, ukuran, dan pola komponen existing; bukan desain bakery generik.
- Prioritaskan keterbacaan, hierarki, alignment, kontras, spacing, dan mobile usability.
- Hindari grid kartu 3 kolom yang dipaksakan, glassmorphism, glow, gradient/shadow berlebihan, emoji dekoratif, label/badge tanpa fungsi, dan animasi yang tidak perlu.
- Teks isi gunakan font-weight normal/medium; bold hanya untuk penekanan atau judul.
- Pertahankan komponen CSS terisolasi. Hindari selector global, `!important` baru, dan CSS override berlapis kecuali masalahnya sudah terbukti.
- Gunakan ikon/library yang **sudah ada di proyek**; jangan tambah dependency untuk ikon tunggal.

## Kode: sederhana dan mudah dipahami
- Utamakan React/JS/CSS bawaan. Gunakan nama variabel/fungsi yang jelas.
- Jangan refactor massal, rename class, pindah file, atau format ulang file besar di luar ruang lingkup tugas.
- Pisah komponen hanya bila benar-benar mengurangi duplikasi atau kompleksitas.
- Hapus import/kode mati **hanya pada area yang disentuh**, setelah memeriksa pemakaiannya.
- Komentar untuk menjelaskan *mengapa*, bukan menjelaskan setiap baris.
- Jangan mengganti logika auth, API, transaksi, produk, testimoni, handover AI, Maps, atau Admin saat hanya diminta mengubah UI.

## Aturan testing hemat token

| Perubahan | Default validasi |
| --- | --- |
| CSS kecil, padding, warna, typography, teks | Cek diff/selector terkait. **Tanpa build, lint proyek, screenshot, test baru.** |
| Responsif hanya satu komponen | Cek CSS breakpoint dan satu preview manual **jika alat sudah tersedia dan memang membantu**. Bukan banyak viewport otomatis. |
| JSX komponen/import sederhana | Satu pemeriksaan lint/sintaks **khusus file terdampak**, jika tersedia. Tidak perlu full build otomatis. |
| State, event handler, interaksi | Uji satu/dua alur yang terdampak; hanya perluasan bila menemukan masalah. |
| Auth, stok, database, pembayaran, keamanan | Uji secukupnya untuk keamanan dan integritas data; boleh lebih luas jika risiko menuntut. |

- Jangan otomatis menjalankan `npm run lint`, `npm run build`, `npm test`, Cypress/Playwright, browser screenshot, atau test semua viewport setiap kali mengedit.
- Jangan menciptakan unit test untuk perubahan CSS/teks sederhana kecuali diminta.
- Maksimal **satu putaran pemeriksaan** untuk perubahan kecil yang lolos. Jika gagal, perbaiki penyebabnya, lalu ulangi pemeriksaan terkait saja.
- Jangan menjalankan pemeriksaan yang sama setelah tidak ada perubahan kode.
- Hemat output: cukup status singkat; jangan mencetak ratusan baris log atau membuat tabel hasil tes panjang.
- Jika pengujian tidak tersedia, tulis **"belum diuji"**, bukan mengarang hasil.
- Bila pengguna secara eksplisit meminta testing lengkap, ikuti permintaan.

## Konteks proyek yang tidak boleh dilanggar
- Web React/Vite = katalog publik + Admin/Management; Laravel REST API + Sanctum; POS Flutter tablet-first terpisah dan ditunda.
- Web bukan e-commerce: jangan buat cart/checkout.
- Tidak ada Blog atau absensi. Jangan menambah aplikasi Owner terpisah.
- Setiap rasa/ukuran adalah produk mandiri di `katalog_produk` dengan `kategori_id`; **bukan** tabel `produk_varian`.
- Testimonial pengunjung langsung tampil, Admin bisa membuat manual, komentar dapat dimoderasi.
- Pertahankan Maps Leaflet/OSM, Kuki Assistant, dan fitur handover.

## Format jawaban singkat
**Diubah:** `NamaFile` — perbaikan inti.  
**Dijaga:** komponen/fitur terkait yang tidak berubah.  
**Cek:** pemeriksaan yang benar-benar dijalankan, atau "belum diuji".

Jangan menyebut "sudah terpasang di komputer pengguna" jika hanya membuat file atau patch.
