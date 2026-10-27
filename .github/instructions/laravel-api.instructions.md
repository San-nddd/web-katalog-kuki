---
applyTo: "backend-web-katalog/**/*.php"
---
# Instruksi khusus Laravel API Kuki
- Jangan mengubah migrasi lama, schema, seeder, Gate/Policy, atau auth sebelum audit dan approval.
- `auth:sanctum` + gate/policy di backend; jangan mengandalkan kontrol UI untuk keamanan.
- Pertahankan API lama & status code; setiap endpoint baru wajib validasi, otorisasi, pagination jika diperlukan, dan tes.
- Koreksi stock/attendance/transaction dengan entri bertanda alasan, aktor, waktu, before/after; operasi atomik dan concurrency-safe.
- Semua mutasi stok harus tercatat sekali (idempotent bila integrasi POS).
- POS mobile butuh token per-device, secure storage di client, revoke on logout, scopes/abilities setelah audit.
- Waktu absensi harus berpatokan waktu server, UTC storage dan Asia/Jakarta display.
- Jangan menulis data dummy ke DB production, menjalankan `migrate:fresh`/`db:wipe`, atau mengekspose `.env`.
- Audit-only sampai user memberikan approval sesuai AGENTS.md.


**Autonomous v0.2:** Perbaikan bug kecil, tes, dokumentasi, error-state non-visual dalam tugas READY+AUTO boleh langsung dikerjakan. Perubahan UI terkunci, auth/role/schema, sensitif, install dependency, atau operasi migrasi/deploy tetap APPROVAL. Selalu buat log per task.
