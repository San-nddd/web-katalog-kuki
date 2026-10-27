# AGENTS.md — Kuki Bakehouse Autonomous Developer Contract (DRAFT v0.2)

> Dipakai sebagai aturan kerja lintas bagian proyek. **Boleh mengerjakan proyek secara mandiri DALAM SESI Copilot Agent**, bukan hanya membuat rencana. Dokumen ini tidak mengalahkan izin sistem, aturan keamanan VS Code, atau keputusan pemilik proyek.

## Misi
Ambil tugas berikutnya yang siap dari `docs/TASK_BOARD.md`; pahami kode nyata; implementasikan patch minimal; jalankan tes; perbaiki kesalahan terkait; dokumentasikan dengan bahasa Indonesia; buat log; lanjut ke tugas AUTO berikutnya sampai sesi selesai, ada blocker, atau butuh approval.

## URUTAN WAJIB SETIAP SESI
1. Baca `PRD_KUKI_BAKEHOUSE_v0.2_DRAFT.md`, `docs/PROJECT_STATUS.md`, `docs/TASK_BOARD.md`, `docs/AUTONOMOUS_WORKFLOW.md`, `docs/DESIGN_REFERENCE_REGISTER.md`, dan `docs/DECISIONS_PENDING.md`.
2. Lakukan pemeriksaan `git status`, struktur folder, versi dan test existing secara terukur. **Jangan mengarang** hasil audit atau file yang tidak ada. Jangan menjalankan installer/migration yang tidak dipahami.
3. Pilih **satu** tugas berstatus `READY` dan berlabel `AUTO`, dengan dependensi terpenuhi, kemudian tandai `IN_PROGRESS`. Jika tugas adalah `APPROVAL`/`BLOCKED`, lewati dan pilih AUTO aman berikutnya.
4. Catat baseline dan jalankan test relevan. Implementasi perubahan terkecil yang memenuhi acceptance criteria; pertahankan file user dan seluruh fitur existing.
5. Jalankan lint/build/test unit/integrasi yang relevan. Perbaiki kegagalan yang disebabkan patch sendiri, maksimal 2 percobaan per akar error lalu tulis blocker jika masih gagal.
6. Update dokumentasi modul/api, `docs/logs/WORK_LOG.md`, `docs/logs/ERROR_LOG.md` bila ada, status task di `docs/TASK_BOARD.md`, dan ringkasan `docs/PROJECT_STATUS.md`. Pencatatan wajib dilakukan **di repo**, bukan hanya jawaban chat.
7. Jika lulus semua kriteria, ubah status `DONE` dengan bukti command/test dan daftar file. Bila belum lulus, `BLOCKED`; jangan pura-pura selesai. Ambil task READY AUTO berikutnya jika sesi dan tool masih tersedia.
8. Sebelum berhenti berikan ringkasan yang bisa dibaca siswa: apa yang dibuat, konsep dan alur, file mana, cara tes, hasil, risiko, langkah selanjutnya, dan kebutuhan approval.

## KEWENANGAN
- **AUTO (boleh jalan dalam sesi):** dokumentasi, audit, tes non-destruktif, perbaikan bug kecil terlokalisasi, penambahan tes, validasi/error-state, perubahan service/page internals yang tidak mengubah UI visual disetujui/kontrak API/data historis. Hanya ketika task telah disiapkan di backlog sebagai AUTO.
- **APPROVAL WAJIB:** tampilan/logo/layout/CSS yang sudah disetujui, rute pengguna yang mengubah perilaku, schema/migration/seed, auth & role, login/absensi pegawai yang menyimpan data personal, pembayaran/transaksi, stok final/koreksi historis, plugin/dependency baru, konfigurasi environment/secret, deployment, hardware SDK, fitur yang tidak ada di PRD, biaya layanan, pemindahan folder/rename luas, integrasi pihak ketiga.
- **DILARANG:** `migrate:fresh`, `db:wipe`, `git reset --hard`, `git clean -fd`, `rm -rf` atas project, `npm audit fix --force`, disable security, force-push, menghapus file user, log secret/credential, akses data nyata diluar scope, fake test results, mengubah database produksi tanpa backup dan izin.
- Perintah **read-only/tes biasa** boleh dijalankan selama sesuai lingkungan; approval tool yang diminta VS Code harus dihormati, jangan bypass.

## PROTEKSI ARSITEKTUR
- Web publik hanya katalog + pemesanan manual: **jangan menambah checkout ecommerce**.
- `web-katalog/` React/Vite; `backend-web-katalog/` Laravel Sanctum; `kasir/` Flutter POS yang harus diaudit sebelum pengeditan. Jangan membuat Flutter project baru di atas proyek lama.
- Admin/Management dan inventaris **ada** tetapi status nyata harus diaudit terhadap repo pengguna.
- Absensi & login pegawai kembali dalam PRD; implementasi butuh review kebijakan privasi, role, serta skema.
- JANGAN mengubah UI web disetujui; Flutter menyesuaikan referensi Kuki yang sudah terdaftar. Referensi belum ada berarti `REFERENCE_MISSING`, bukan desain asal.
- Ledger keuangan dan stok adalah catatan append-only / koreksi resmi; bukan edit/overwrite dari Excel.
- Jangan isi `.env` dengan nilai nyata/tebakan, API key OpenRouter tidak boleh muncul di browser atau Git.

## OUTPUT PER TASK
Wajib log berisi `TASK-ID`, tanggal, tujuan, alasan solusi, file terkait, command + exit status, hasil tes nyata, sebelum/sesudah, risiko, rollback, serta status. Tambahkan konsep teknis ringkas ke docs agar owner bisa belajar.

## STOP CONDITIONS
Jika tidak ada READY AUTO, tes utama rusak dan belum diketahui penyebabnya, instruksi bertentangan, referensi desain belum tersedia untuk UI baru, ada potensi kehilangan data, atau dibutuhkan keputusan owner: tulis blocker yang spesifik, jangan memaksakan implementasi.
