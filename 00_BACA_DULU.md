# KUKI BAKEHOUSE — Bacalah Sebelum Copilot Mulai

**Versi:** Draft 0.2 (26 Oktober 2026). **Tujuan:** Copilot benar-benar **mengerjakan proyek dalam sesi agent**, bukan cuma memberi rencana, tetapi tetap mengikuti batas keamanan agar UI, API, stok dan data lama tidak dirusak.

## Cara pakai
1. Ekstrak ZIP ke lokasi sementara. **Review dulu**; jangan menimpa AGENTS.md atau `.github` lama jika sudah ada instruksi penting.
2. Salin **isi paket** ke root workspace `E:\Ekosistem-kuki\` setelah dibandingkan, bukan menaruh satu folder pembungkus di dalam root.
3. Buka `E:\Ekosistem-kuki\` di VS Code. Aktifkan Copilot Chat dan pilih **Agent** / custom agent **Kuki Builder**. Jika agent belum muncul, cek workspace yang dibuka, `.github/agents/kuki-builder.agent.md` dan pengaturan extension VS Code.
4. Tempel prompt dari `PROMPT_MASTER_COPILOT.md` atau jalankan `.github/prompts/00-start-autonomous.prompt.md`.
5. Copilot otomatis mengambil tugas label `READY + AUTO`, mengedit kode, menjalankan tes, membuat dokumentasi dan log, lalu melanjutkan tugas aman lainnya selama sesinya tersedia.
6. Owner review `docs/PROJECT_STATUS.md`, `docs/TASK_BOARD.md`, `docs/logs/WORK_LOG.md`, dan `git diff` setelah setiap sesi.

## Keamanan
- Tugas `APPROVAL`: login/absensi pegawai, migrasi skema, UI terkunci, fitur POS bertransaksi, pembayaran, dep besar, deploy; **agent boleh menyiapkan proposal tetapi tidak boleh mengeksekusi sebelum keputusan owner**.
- Tidak ada instruksi untuk bypass approval VS Code. Hindari mode yang memberi izin tak terbatas ke shell dengan token/DB nyata.
- Ini **bukan** script yang berjalan sendiri tanpa batas waktu; Copilot membutuhkan sesi Agent/Coding Agent yang dimulai pengguna. Setelah berhenti, lanjut dari log.

## File penting
- `PRD_KUKI_BAKEHOUSE_v0.2_DRAFT.md` — cakupan dan acceptance criteria.
- `README_PROJECT_DRAFT.md` — orientasi proyek dan sistem.
- `AGENTS.md` + `.github/copilot-instructions.md` — aturan umum.
- `.github/agents/kuki-builder.agent.md` — agent custom yang siap dipilih.
- `PROMPT_MASTER_COPILOT.md` — teks awal untuk memulai coding otomatis.
- `docs/AUTONOMOUS_WORKFLOW.md` — alur mengambil task, tes dan lanjut otomatis.
- `docs/TASK_BOARD.md` — backlog dan status.
- `docs/PROJECT_STATUS.md` — resume antar-sesi.
- `docs/logs/*` — work/error/decision/release logs.
- `docs/modules/README.md` — pola dokumentasi per fitur.
- `docs/DECISIONS_PENDING.md` — daftar approval yang masih dibutuhkan.

**Status saat ini:** dokumen disusun dari informasi proyek yang diberikan sebelumnya. Paket ini bukan audit Git repo utuh dan **belum memasang kode aplikasi**.
