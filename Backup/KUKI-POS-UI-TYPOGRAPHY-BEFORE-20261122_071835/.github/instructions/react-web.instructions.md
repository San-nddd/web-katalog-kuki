---
applyTo: "web-katalog/**/*.{js,jsx,ts,tsx,css}"
---
# Instruksi khusus React/Vite Kuki
- UI/layout/tipografi/transisi/asset/route yang sudah disetujui harus DIPERTAHANKAN, kecuali ID tugas dan file yang diizinkan secara eksplisit.
- Jangan ganti `App.jsx`, `AdminLayout.jsx`, `ManagementLayout.jsx`, atau auth guard secara menyeluruh hanya untuk menambah satu menu. Patch minimal, tidak mengganti seluruh file dengan template versi lama.
- Route Admin dan Management berbeda: `/admin/management/laporan-inventaris` dan `/management/laporan-inventaris`; jangan redirect ke `/` untuk error role.
- Backend memutuskan izin melalui endpoint. Tangani 401 (login), 403 (akses ditolak), 404 (endpoint), 429 dan 5xx dengan status nyata.
- Jangan menambah React checkout web e-commerce.
- Excel `.xlsx`, PDF, print harus memiliki layout bersih dan angka dari data server. File Excel koreksi bukan update DB otomatis.
- Komponen baru harus matching identitas Kuki dan referensi, bukan UI generik baru.
- Audit-only sampai user memberikan approval sesuai AGENTS.md.


**Autonomous v0.2:** Perbaikan bug kecil, tes, dokumentasi, error-state non-visual dalam tugas READY+AUTO boleh langsung dikerjakan. Perubahan UI terkunci, auth/role/schema, sensitif, install dependency, atau operasi migrasi/deploy tetap APPROVAL. Selalu buat log per task.
