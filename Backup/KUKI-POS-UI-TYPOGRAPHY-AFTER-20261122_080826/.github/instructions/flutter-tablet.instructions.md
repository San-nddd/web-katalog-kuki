---
applyTo: "kasir/**/*.{dart,yaml,gradle,kts,xml,plist,pbxproj}"
---
# Instruksi khusus Flutter POS tablet Kuki
- Target Flutter tablet Android & iPadOS; mulai dengan environment audit. Jangan `flutter create` pada `kasir/` tanpa konfirmasi kosong.
- UI diadaptasi dari screenshot referensi yang DISETUJUI, mengikuti brand Kuki; inspirasi alur Qasir bukan izin mengkloning.
- Prioritaskan ukuran tap dan layout landscape tablet, state loading/error/offline, aksesibilitas.
- Login pegawai + absensi masuk kembali dalam requirement. Biometrics untuk buka sesi lokal opsional; jangan ambil data wajah, GPS, atau identitas tersembunyi.
- Scanner mendukung kamera dan Bluetooth/USB HID; jangan install SDK kamera/printer tanpa audit package/hardware.
- Waktu absensi dari API server, bukan jam perangkat sebagai bukti resmi.
- Token di secure storage; jangan commit API key/backend secrets. `API_BASE_URL` per environment bukan token.
- Offline transaksi memerlukan desain idempotency/reconciliation disetujui; jangan menyimpan/mengirim transaksi dummy sebagai nyata.
- Rancang komponen reusable; jangan refactor folder existing kecuali scope eksplisit.
- Audit-only sampai user memberikan approval sesuai AGENTS.md.


**Autonomous v0.2:** Perbaikan bug kecil, tes, dokumentasi, error-state non-visual dalam tugas READY+AUTO boleh langsung dikerjakan. Perubahan UI terkunci, auth/role/schema, sensitif, install dependency, atau operasi migrasi/deploy tetap APPROVAL. Selalu buat log per task.
