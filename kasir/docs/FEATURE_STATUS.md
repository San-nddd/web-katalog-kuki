# Status fitur — bedakan fungsi lokal, integrasi, dan rencana

| Fitur | Status source | Batasan |
|---|---|---|
| Kasir tablet, katalog, filter, keranjang | Diimplementasikan | UI perlu build dan uji perangkat |
| Tab multi-order | Diimplementasikan | Maksimal enam, tersimpan lokal |
| Diskon, tunai, kembalian | Diimplementasikan | Harga integer IDR |
| Transfer & QRIS | Pencatatan manual | Belum gateway / cek rekening otomatis |
| Barcode kamera | Source plugin `mobile_scanner` | Perlu izin & uji kamera asli |
| Scanner Bluetooth/USB HID | Kolom input + Enter | Perlu perangkat scanner keyboard-wedge |
| Offline SQLite | Ada | Hanya cache dan transaksi perangkat ini |
| Sync 45 detik | Ada, saat app aktif | Endpoint backend dan idempotensi wajib ada |
| Konflik stok server | Ditandai `conflict` | Rekonsiliasi oleh Admin, tidak auto rollback |
| Shift kasir | Lokal | Bukan absensi, belum sync ke server |
| Riwayat/laporan lokal | Ada | Tidak merangkum seluruh perangkat |
| Struk 58/80mm | PDF dialog sistem | Bukan ESC/POS langsung |
| Login Sanctum | Adapter tersedia | Endpoint/login response Laravel harus cocok |
| PIN lokal | Pengunci UI | Bukan login server; tidak menggantikan otorisasi |
| Biometrik | Belum | Perlu integrasi local_auth & uji tablet |
| Gateway QRIS dinamis | Belum | Provider & konfigurasi merchant perlu disepakati |
| Native build Android/iOS | Script generator tersedia | Butuh Flutter SDK; iPadOS build di macOS/Xcode |

**Sebelum digunakan nyata:** backend perlu membuktikan transaksi atomik dan idempotensi, stok lintas device ditangani, serta hardware pembayaran/printer sudah diuji.


## Pembaruan V1.1 (desain)
- Shell sidebar dan header status kasir bergaya Kuki; adaptif dengan drawer.
- Katalog/POS: Order List teratas, grid menu, keranjang kanan, edit nama, catatan, tipe pesanan, nomor meja manual opsional.
- History, Report, Inventory: tabel/minimalis sesuai pola referensi.
- Login: layout split Kuki pada tablet besar; form tetap autentikasi Laravel Sanctum.
- **Tidak ada** integrasi lantai/meja penuh, status dapur server, reservasi meja atau pemrosesan QRIS otomatis.
