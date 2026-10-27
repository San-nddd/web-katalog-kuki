# Sistem Kerja Autonomous — Kuki Builder v0.2 (DRAFT)

## Tujuan nyata
Copilot mengerjakan proyek secara aktif: membuat patch React/Laravel/Flutter untuk tugas siap, menulis tes, memperbaiki error, mendokumentasikan implementasi dan menyimpan log. Pemilik proyek tidak perlu memberi perintah per baris kode. Namun ini bekerja **dalam sesi VS Code Copilot Agent**, bukan jaminan proses terus berjalan saat komputer/editor mati.

## Sumber dan alur
1. **PRD** menjelaskan apa yang boleh dan tidak boleh dibuat.
2. **TASK_BOARD** menentukan tugas satu per satu dan dependency.
3. **Git + source code** adalah bukti kondisi aktual. Audit hasil build/test dan jangan mengarang keberhasilan.
4. **PROJECT_STATUS** menyimpan state singkat yang harus di-update tiap selesai tugas.
5. **WORK_LOG/ERROR_LOG/DECISION_LOG** menyimpan urutan kerja dan alasan teknis.
6. **docs/modules/** menjelaskan implementasi dengan bahasa Indonesia sehingga pemilik proyek bisa belajar.

```text
START SESSION
  -> baca rules, PRD, tasks, status, git
  -> pilih READY + AUTO (risiko rendah)
  -> baseline test, patch minimal, test
  -> PASS? update docs/log/status => task DONE => next AUTO
  -> FAIL? perbaiki wajar (max dua putaran akar masalah)
           => log BLOCKED + lanjut tugas AUTO tak terkait
  -> kebutuhan migrasi/auth/keuangan/UI baru/etc?
           => tulis DECISION REQUIRED => lewati sampai disetujui
```

## Matriks izin
| Kelompok | Status | Boleh dilakukan tanpa approval per-task? |
|---|---|---|
| Membaca kode, mapping, docs, lint, build/test lokal | AUTO | Ya, jika perintah tidak destruktif |
| Menambah tes, memperbaiki bug UI/API kecil dalam task terdefinisi tanpa kontrak berubah | AUTO | Ya |
| Perbaikan lint spesifik, error state, dokumentasi, aksesibilitas nonvisual | AUTO | Ya |
| Mengubah layout, warna, tipografi, perilaku navigasi, animasi, aset publik | APPROVAL | Tidak |
| Menambah/mengubah login, hak akses, auth Sanctum, data pegawai, absensi & kebijakan privasi | APPROVAL | Tidak |
| Membuat atau menjalankan migrations/seed, edit historis transaksi/stok/keuangan | APPROVAL | Tidak |
| Install/upgrade dep, Flutter scaffold ke direktori baru, pilihan plugin hardware, server API kontrak baru | APPROVAL | Tidak |
| Payment/refund/QRIS/offline conflict policy, cloud deployment/CI secrets | APPROVAL | Tidak |
| Hapus file, reset hard, force update, edit production DB, me-rewrite history | FORBIDDEN | Tidak pernah secara otomatis |

## Tugas yang boleh otomatis
1. Harus ada TASK-ID di `docs/TASK_BOARD.md` dengan STATUS=`READY`, LEVEL=`AUTO`, kriteria selesai dan bukti baseline.
2. Source yang disentuh harus teridentifikasi; jangan mengganti whole-file dengan versi ZIP lawas.
3. Apabila evaluasi kode menunjukkan tugas ternyata menyentuh kategori APPROVAL, ubah LEVEL=`APPROVAL`, jelaskan risikonya, jangan implementasi sebelum izin.
4. Gunakan satu task aktif supaya tes dan rollback dapat dilacak.
5. Jangan menaikkan `DONE` hanya karena kode berhasil diketik; tes harus benar-benar menunjukkan lulus atau status lain jujur dicatat.

## Siklus penyimpanan hasil
- Awal: periksa `git status` dan timestamp sesuai waktu komputer; satu task IN_PROGRESS.
- Setelah edit: catat file, ringkasan diff, alasan, langkah tes.
- Setelah tes: catat nama command, hasil PASS/FAIL/NOT_RUN, log error bila perlu. Jangan lampirkan token/data rahasia.
- Setelah selesai: update `docs/modules/<nama-modul>.md` menjelaskan API, diagram alur tekstual, role, contoh uji, keputusan.
- Saat sesi berakhir: tulis 'Next READY Task' di `docs/PROJECT_STATUS.md`.

## Error dan keamanan
- Max dua upaya per satu akar error; jika gagal, status BLOCKED dan log cara reproduksi + dugaan akar masalah + bukti (jangan mengarang).
- Jika working tree berisi perubahan user tidak dikenal, **jangan checkout/reset**; pilih file lain atau minta keputusan.
- Jika test baseline sudah gagal sebelum patch, jangan klaim patch penyebabnya; catat BASELINE_FAIL.
- Tidak perlu memaksa npm audit fix --force, menghapus `node_modules`, menghapus migrations, atau mengubah UI untuk mengatasi warning.
- Jangan membuat log menyimpan email pegawai asli, akses token, `.env`, password, API key, data absensi personal yang tidak perlu.

## Persetujuan satu kali per kelompok perubahan (opsional)
Untuk tugas kategori APPROVAL, pemilik proyek boleh menyetujui scope per TASK-ID atau kelompok perubahan tertulis, mencantumkan batas file/fitur, contoh: `APPROVE KUKI-EMP-001: hanya API login pegawai dan tes lokal, tanpa migrasi produksi` setelah keputusan produk disepakati. Approval tidak mengubah kategori FORBIDDEN menjadi bebas.

## Review sebelum commit/deploy
Agent boleh menyiapkan changeset dan commit **hanya jika diberi izin jelas**; owner meninjau git diff dan log sebelum merge/deploy. Jika VS Code meminta izin menjalankan suatu perintah, konfirmasi itu berada di tangan user/editor; dokumen tidak menonaktifkan dialog keamanan. Hindari penggunaan fitur otomatis yang mengizinkan seluruh command secara tidak terbatas.

## Keterbatasan
Autonomous dalam sesi bukan "selesai semua proyek dalam satu prompt". Karena batas konteks, kredensial, dan approval, agent dapat berhenti. Catatan state memungkinkan sesi berikutnya melanjutkan. Cloud coding agent mengerjakan tugas yang ditugaskan sesuai fitur GitHub jika digunakan, bukan proses bebas tanpa batas.
