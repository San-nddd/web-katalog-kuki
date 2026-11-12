# Instruksi GitHub Copilot — Kuki Bakehouse (Mode Hemat Token)

Jawab dalam Bahasa Indonesia. Kerjakan tugas yang diminta saja; **minimal diff, minimal command, minimal output**. Gunakan skill `.github/skills/kuki-clean-ui-code/SKILL.md` untuk tugas merapikan UI atau kode.

## Wajib
- Baca **hanya file aktual yang berkaitan** dengan tugas beserta pemanggil/dependensi langsung jika perlu. Jangan menebak struktur proyek atau memindai seluruh repository tanpa alasan.
- UI publik, Admin/Management, Maps, dan Kuki Assistant yang telah disetujui **tidak boleh di-redesign** kecuali diminta. Pertahankan perilaku dan responsivitas.
- Kode sederhana: nama jelas, fungsi secukupnya, CSS lokal, tanpa abstraksi/helper/dependency/komentar berlebihan. Jangan membuat kode jadi rumit demi terlihat canggih.
- Hindari AI slop: glassmorphism, glow/gradient berlebihan, shadow besar, emoji dekoratif, badge/kartu generik, animasi tanpa fungsi, atau semua teks bold. Ikuti warna/font/spacing existing.
- Jangan ubah fitur di luar tugas atau menambahkan Blog, absensi, e-commerce/checkout web, tabel `produk_varian`, atau aplikasi Owner terpisah. Produk adalah baris mandiri dalam `katalog_produk` berelasi ke `kategoris`. POS Flutter masih terpisah.
- URL Instagram/TikTok diatur sesuai `KukiSocialLinks.jsx` aktual. Jangan buat URL palsu atau mengubah cara konfigurasi tanpa diminta.

## Kebijakan pengujian — HEMAT TOKEN, proporsional risiko
1. **CSS, teks, spacing, ikon, perubahan visual kecil:** cukup baca diff dan lakukan pengecekan manual terarah bila tersedia. **Tidak perlu** `npm run build`, `npm run lint`, test suite, browser otomatis, screenshot multi-viewport, atau menambah test baru secara default.
2. **JSX/React sederhana (import, render, tombol):** cukup **maksimal satu** pemeriksaan terarah yang relevan (mis. lint file yang diubah) bila alat sudah tersedia. Jangan jalankan lint seluruh proyek hanya untuk satu komponen.
3. **Logika fitur, state, route, atau integrasi:** uji kasus terkait perubahan saja. Build hanya bila perubahan lintas modul membuatnya perlu atau pengguna meminta.
4. **Auth, permission, database, stok, transaksi, keamanan, perubahan destruktif:** lakukan validasi/pengujian yang memadai sesuai risiko; jangan mengorbankan keamanan untuk hemat token. Tes lebih luas bila memang diperlukan.
5. **Full test suite, audit semua halaman, dan banyak viewport** hanya bila pengguna meminta, atau ada alasan teknis kuat yang dijelaskan singkat.

Jangan menjalankan command yang sama berkali-kali tanpa perubahan relevan. Jika satu pemeriksaan gagal, telusuri penyebabnya dan perbaiki sebelum mengulang. Jangan membuat file test, script test, atau laporan panjang untuk edit kecil. Jangan menginstal package hanya untuk testing tanpa kebutuhan. Jangan mengklaim lulus test yang belum dijalankan.

## Respons akhir (maks. 4 baris/butir untuk tugas kecil)
- **Diubah:** file dan inti perubahannya.
- **Tetap:** UI/fitur yang dijaga (jika relevan).
- **Cek:** jenis pengecekan yang benar-benar dilakukan, atau "belum diuji".
- **Perlu tindakan:** hanya bila ada langkah manual penting.

Langsung kerjakan tugas; jangan membuat rencana, tabel audit, atau uraian panjang untuk perubahan sederhana kecuali pengguna meminta.
