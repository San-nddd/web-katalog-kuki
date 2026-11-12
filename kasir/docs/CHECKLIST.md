# Checklist uji penerimaan (jalankan seperlunya)

1. `flutter pub get`, `flutter analyze`, dan `flutter run` Android tablet berhasil.
2. DEMO memuat produk, kategori, harga, barcode masing-masing tanpa produk varian induk.
3. Buka shift modal awal → tambahkan SKU → hitung total, diskon, kembalian.
4. Dua order/tab dipakai bersamaan, app restart, draft order masih ada.
5. Tap kamera: scan Code 128/EAN fisik; hasil menambah produk sesuai barcode.
6. HID: pasangkan scanner keyboard via USB/Bluetooth, buka dialog HID, scan beberapa barcode beruntun dengan Enter.
7. Matikan internet → transaksi tersimpan lokal, stok lokal turun, pending bertambah.
8. Nyalakan internet dan backend idempotent → sync hanya sekali; retry UUID yang sama tidak double stock decrement.
9. Coba konflik stok di server → sale ditandai `conflict` tanpa hilang, admin bisa memeriksa UUID.
10. Bayar tunai vs QRIS/transfer manual, cetak struk via printer dialog sistem, ukur 58mm/80mm.
11. Tutup shift dan cocokkan modal + uang tunai dari riwayat tablet.
12. Uji iPadOS pada Mac/Xcode: kamera, landscape, jaringan LAN/HTTPS, UI dan printer.

**Jangan buka pilot real sales sebelum 1–10, auth backend, dan penanganan konflik terpenuhi.**
