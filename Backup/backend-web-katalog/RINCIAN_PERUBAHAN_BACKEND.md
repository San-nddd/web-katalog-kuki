# RINCIAN_PERUBAHAN_BACKEND.md

Dokumen ini hanya mencatat perubahan backend Laravel. Semua kode di bawah disalin dari source code terbaru di project. Tidak ada password, API key, token, atau secret yang disertakan.

Tidak ada file backend Laravel yang dihapus.

## 1. Daftar file backend yang berubah

| Path lengkap | Status | Tujuan singkat |
|---|---|---|
| `E:\Ekosistem-kuki\backend-web-katalog\app\Http\Controllers\api\LaporanPenjualanController.php` | Diubah | Laporan penjualan hanya menghitung transaksi `completed`. |
| `E:\Ekosistem-kuki\backend-web-katalog\app\Http\Controllers\api\MutasiStokController.php` | Diubah | Filter `jenis` menerima `penjualan`, `void`, `retur`. |
| `E:\Ekosistem-kuki\backend-web-katalog\app\Http\Controllers\api\Pos\PosController.php` | Diubah | Role pegawai, void/retur + audit, replay idempotensi, rekap kasir/produk, CRUD pegawai. |
| `E:\Ekosistem-kuki\backend-web-katalog\app\Models\PosPegawai.php` | Diubah | `role` masuk fillable dan relasi transaksi/absensi/sesi. |
| `E:\Ekosistem-kuki\backend-web-katalog\app\Models\PosTransaksi.php` | Diubah | Kolom audit masuk fillable/casts dan relasi `pembatali`. |
| `E:\Ekosistem-kuki\backend-web-katalog\database\migrations\2026_11_12_120000_prepare_hard_delete_produk_with_history.php` | Diubah | Migration hard-delete produk aman dilewati pada SQLite saat test. |
| `E:\Ekosistem-kuki\backend-web-katalog\routes\api.php` | Diubah | Grup POS lama dihapus; semua endpoint POS berasal dari `routes/pos.php`. |
| `E:\Ekosistem-kuki\backend-web-katalog\routes\pos.php` | Diubah | Route PATCH/DELETE pegawai, ubah role, dan pembatalan transaksi. |
| `E:\Ekosistem-kuki\backend-web-katalog\tests\Feature\LaporanPenjualanAccessTest.php` | Diubah | Menambah `forgetGuards()` agar test Sandbox/owner tidak tertukar guard. |
| `E:\Ekosistem-kuki\backend-web-katalog\database\migrations\2026_11_20_090000_add_metadata_ai_to_katalog_produk_table.php` | File baru | Menambah kolom `metadata_ai` pada `katalog_produk` bila belum ada. |
| `E:\Ekosistem-kuki\backend-web-katalog\database\migrations\2026_11_20_100000_add_role_to_pos_pegawai_table.php` | File baru | Menambah kolom `role` pada `pos_pegawai`. |
| `E:\Ekosistem-kuki\backend-web-katalog\database\migrations\2026_11_20_100100_add_audit_to_pos_transaksi_table.php` | File baru | Menambah kolom audit void/retur pada `pos_transaksi`. |
| `E:\Ekosistem-kuki\backend-web-katalog\tests\Feature\PosOperationalFlowTest.php` | File baru | Test alur POS, idempotensi, stok, void/retur, audit, laporan. |
| `E:\Ekosistem-kuki\backend-web-katalog\tests\Feature\PosPegawaiManagementTest.php` | File baru | Test CRUD pegawai, nonaktif + revoke sesi, ganti PIN. |

Tidak ada perubahan pada middleware, service tambahan, atau konfigurasi Laravel. `PosAuthenticate` sudah ada dan tetap dipakai tanpa diubah.

---

## 2. Kode lengkap per file

### 2.1 `E:\Ekosistem-kuki\backend-web-katalog\app\Http\Controllers\api\LaporanPenjualanController.php`

Status: **Diubah**

Perubahan: `transaksiPadaPeriode()` kini memfilter `status_transaksi = 'completed'`, sehingga transaksi `void`/`retur` tidak masuk laporan atau ekspor CSV.

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosTransaksi;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LaporanPenjualanController extends Controller
{
    private function periode(Request $request): array
    {
        $filter = $request->validate([
            'dari' => ['required', 'date_format:Y-m-d'],
            'sampai' => ['required', 'date_format:Y-m-d', 'after_or_equal:dari'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);
        $awal = CarbonImmutable::createFromFormat('Y-m-d', $filter['dari'], 'Asia/Jakarta');
        $akhir = CarbonImmutable::createFromFormat('Y-m-d', $filter['sampai'], 'Asia/Jakarta');

        if ($awal->diffInDays($akhir) > 92) {
            throw ValidationException::withMessages([
                'sampai' => ['Rentang laporan maksimal 93 hari.'],
            ]);
        }

        return [$filter['dari'], $filter['sampai']];
    }

    private function transaksiPadaPeriode(string $dari, string $sampai)
    {
        $awal = CarbonImmutable::createFromFormat('Y-m-d', $dari, 'Asia/Jakarta')
            ->startOfDay()
            ->utc();
        $akhir = CarbonImmutable::createFromFormat('Y-m-d', $sampai, 'Asia/Jakarta')
            ->addDay()
            ->startOfDay()
            ->utc();

        return PosTransaksi::query()
            ->where('status_transaksi', 'completed')
            ->where('dibayar_pada', '>=', $awal)
            ->where('dibayar_pada', '<', $akhir);
    }

    public function index(Request $request): JsonResponse
    {
        [$dari, $sampai] = $this->periode($request);
        $query = $this->transaksiPadaPeriode($dari, $sampai);
        $ringkasan = (clone $query)
            ->selectRaw('COUNT(*) AS jumlah_transaksi')
            ->selectRaw('COALESCE(SUM(total), 0) AS total_penjualan')
            ->selectRaw('COALESCE(AVG(total), 0) AS rata_rata_transaksi')
            ->first();
        $perMetode = (clone $query)
            ->selectRaw('metode_bayar, COUNT(*) AS jumlah_transaksi, COALESCE(SUM(total), 0) AS total_penjualan')
            ->groupBy('metode_bayar')
            ->orderBy('metode_bayar')
            ->get()
            ->map(fn ($item) => [
                'metode_bayar' => $item->metode_bayar,
                'jumlah_transaksi' => (int) $item->jumlah_transaksi,
                'total_penjualan' => (int) $item->total_penjualan,
            ])
            ->values();
        $transaksi = $this->transaksiPadaPeriode($dari, $sampai)
            ->select(['id', 'nomor', 'pegawai_id', 'metode_bayar', 'total', 'dibayar_pada'])
            ->with('pegawai:id,nama')
            ->orderByDesc('dibayar_pada')
            ->orderByDesc('id')
            ->paginate(30);

        return response()->json([
            'success' => true,
            'data' => [
                'periode' => ['dari' => $dari, 'sampai' => $sampai],
                'ringkasan' => [
                    'jumlah_transaksi' => (int) $ringkasan->jumlah_transaksi,
                    'total_penjualan' => (int) $ringkasan->total_penjualan,
                    'rata_rata_transaksi' => (int) round((float) $ringkasan->rata_rata_transaksi),
                ],
                'per_metode' => $perMetode,
                'transaksi' => [
                    'items' => $transaksi->getCollection()->map(fn (PosTransaksi $item) => [
                        'nomor' => $item->nomor,
                        'kasir' => $item->pegawai?->nama,
                        'metode_bayar' => $item->metode_bayar,
                        'total' => (int) $item->total,
                        'dibayar_pada' => $item->dibayar_pada,
                    ])->values(),
                    'page' => $transaksi->currentPage(),
                    'last_page' => $transaksi->lastPage(),
                    'total' => $transaksi->total(),
                ],
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        [$dari, $sampai] = $this->periode($request);
        $filename = "laporan-penjualan-kuki-{$dari}-{$sampai}.csv";

        return response()->streamDownload(function () use ($dari, $sampai): void {
            $handle = fopen('php://output', 'w');
            if ($handle === false) {
                throw new \RuntimeException('Tidak dapat menyiapkan file CSV laporan penjualan.');
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['Nomor transaksi', 'Waktu bayar (WIB)', 'Kasir', 'Metode bayar', 'Total'], ';', '"', '');

            $this->transaksiPadaPeriode($dari, $sampai)
                ->select(['nomor', 'pegawai_id', 'metode_bayar', 'total', 'dibayar_pada'])
                ->with('pegawai:id,nama')
                ->orderBy('dibayar_pada')
                ->orderBy('id')
                ->chunk(500, function ($items) use ($handle): void {
                    foreach ($items as $item) {
                        $values = [
                            $item->nomor,
                            CarbonImmutable::parse($item->dibayar_pada)->timezone('Asia/Jakarta')->format('Y-m-d H:i:s'),
                            $item->pegawai?->nama ?? '',
                            $item->metode_bayar,
                            (string) $item->total,
                        ];
                        foreach ($values as &$value) {
                            if (preg_match('/^[\t\r ]*[=+\-@]/u', $value)) {
                                $value = "'{$value}";
                            }
                        }
                        unset($value);
                        fputcsv($handle, $values, ';', '"', '');
                    }
                });

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
```

### 2.2 `E:\Ekosistem-kuki\backend-web-katalog\app\Http\Controllers\api\MutasiStokController.php`

Status: **Diubah**

Perubahan: validasi filter `jenis` ditambah `penjualan`, `void`, `retur` agar mutasi POS bisa dibaca di riwayat stok.

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MutasiStok;
use App\Models\produk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MutasiStokController extends Controller
{
    // Read-only: role Admin / Owner dengan permission view-management-dashboard.
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'produk_id' => ['nullable', 'integer', 'exists:katalog_produk,id'],
            'jenis' => ['nullable', 'in:stok_awal,produksi,koreksi,opname,rusak,kedaluwarsa,penjualan,void,retur'],
            'tanggal_mulai' => ['nullable', 'date_format:Y-m-d'],
            'tanggal_selesai' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:tanggal_mulai'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = MutasiStok::query()->with([
            'produk:id,nama_produk,barcode',
            'pengguna:id,name',
        ]);
        if (isset($filters['produk_id'])) {
            $query->where('produk_id', $filters['produk_id']);
        }
        if (isset($filters['jenis'])) {
            $query->where('jenis', $filters['jenis']);
        }
        if (isset($filters['tanggal_mulai'])) {
            $query->whereDate('created_at', '>=', $filters['tanggal_mulai']);
        }
        if (isset($filters['tanggal_selesai'])) {
            $query->whereDate('created_at', '<=', $filters['tanggal_selesai']);
        }

        $page = $query->orderByDesc('id')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $page->getCollection()->map(fn (MutasiStok $row) => [
                    'id' => $row->id,
                    'produk_id' => $row->produk_id,
                    'nama_produk' => $row->produk?->nama_produk ?? 'Produk tidak ditemukan',
                    'barcode' => $row->produk?->barcode,
                    'jenis' => $row->jenis,
                    'perubahan' => $row->perubahan,
                    'stok_sebelum' => $row->stok_sebelum,
                    'stok_sesudah' => $row->stok_sesudah,
                    'keterangan' => $row->keterangan,
                    'petugas' => $row->pengguna?->name ?? 'Sistem',
                    'waktu' => $row->created_at?->toIso8601String(),
                ])->values(),
                'page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    // Admin only. Koreksi memakai nilai target stok, bukan delta agar mudah diaudit.
    public function koreksi(Request $request): JsonResponse
    {
        $input = $request->validate([
            'produk_id' => ['required', 'integer', 'exists:katalog_produk,id'],
            'stok_sebelum' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'stok_baru' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'keterangan' => ['required', 'string', 'min:8', 'max:500'],
        ]);

        $row = DB::transaction(function () use ($request, $input) {
            $item = produk::query()->lockForUpdate()->findOrFail($input['produk_id']);
            $sebelum = (int) ($item->stok ?? 0);
            $sesudah = (int) $input['stok_baru'];

            if ($sebelum !== (int) $input['stok_sebelum']) {
                throw ValidationException::withMessages([
                    'stok_baru' => ['Stok sudah berubah. Muat ulang sebelum melakukan koreksi.'],
                ]);
            }
            if ($sebelum === $sesudah) {
                throw ValidationException::withMessages([
                    'stok_baru' => ['Stok baru harus berbeda dari stok saat ini.'],
                ]);
            }

            $item->stok = $sesudah;
            $item->save();

            return MutasiStok::create([
                'produk_id' => $item->id,
                'pengguna_id' => $request->user()?->getAuthIdentifier(),
                'jenis' => 'koreksi',
                'perubahan' => $sesudah - $sebelum,
                'stok_sebelum' => $sebelum,
                'stok_sesudah' => $sesudah,
                'keterangan' => trim($input['keterangan']),
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Koreksi stok berhasil disimpan.',
            'data' => $row,
        ], 201);
    }
}
```

### 2.3 `E:\Ekosistem-kuki\backend-web-katalog\app\Http\Controllers\api\Pos\PosController.php`

Status: **Diubah**

Perubahan utama:

- `isManager()` dan `pegawaiJson()`.
- Role pada `buatPegawai`, `login`, `me`, `ubahRole`.
- CRUD pegawai: `perbaruiPegawai()`, `hapusPegawai()` soft-deactivate + hapus `PosSesi`.
- `ubahPin()` menyimpan hash dan mencabut sesi lama.
- `catalog()` mengembalikan `stok_minimum`.
- `txJson()` mengembalikan status transaksi dan audit pembatalan.
- `replayMatches()` menolak replay `id_client` dengan detail berbeda.
- `checkout()` menolak replay transaksi yang sudah dibatalkan dan menandai transaksi baru `completed`.
- `transactions()` filter `metode_bayar`, `status_transaksi`, `pegawai_id`.
- `report()` hanya `completed` serta menambah `per_kasir` dan `per_produk`.
- `batalkan()` untuk `void`/`retur`: Admin/Owner only, alasan wajib, kembalikan stok, tulis `MutasiStok`, audit pembatal.

```php
<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Models\MutasiStok;
use App\Models\PosAbsensi;
use App\Models\PosItemTransaksi;
use App\Models\PosPegawai;
use App\Models\PosSesi;
use App\Models\PosTransaksi;
use App\Models\produk;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * POS Kuki: backend sumber kebenaran. Transaksi dan mutasi stok dalam satu DB transaction.
 * Hanya untuk produk utama katalog_produk; varian belum dipakai sebelum kebijakan stok varian disahkan.
 */
class PosController extends Controller
{
    private function staff(Request $request): PosPegawai
    {
        return $request->attributes->get('pos_pegawai');
    }

    private function isManager(Request $request): bool
    {
        return in_array(strtolower((string) $this->staff($request)->role), ['admin', 'owner'], true);
    }

    private function response($data, int $status = 200): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $data], $status);
    }

    private function pegawaiJson(PosPegawai $pegawai): array
    {
        if (! array_key_exists('jumlah_transaksi', $pegawai->getAttributes())) {
            $pegawai->loadCount(['transaksi as jumlah_transaksi', 'absensi as jumlah_shift']);
        }

        return [
            'id' => $pegawai->id,
            'kode' => $pegawai->kode,
            'nama' => $pegawai->nama,
            'role' => $pegawai->role,
            'aktif' => (bool) $pegawai->aktif,
            'jumlah_transaksi' => (int) $pegawai->jumlah_transaksi,
            'jumlah_shift' => (int) $pegawai->jumlah_shift,
        ];
    }

    public function buatPegawai(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kode' => ['required', 'string', 'min:3', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/'],
            'nama' => ['required', 'string', 'min:2', 'max:120'],
            'role' => ['sometimes', 'in:kasir,admin,owner'],
            'pin' => ['required', 'string', 'regex:/^[0-9]{4,8}$/'],
        ]);
        $data['kode'] = Str::upper($data['kode']);
        $request->merge(['kode' => $data['kode']]);
        if (PosPegawai::where('kode', $data['kode'])->exists()) {
            throw ValidationException::withMessages(['kode' => 'Kode kasir sudah digunakan.']);
        }
        $staff = PosPegawai::create([
            'kode' => $data['kode'], 'nama' => $data['nama'],
            'role' => $data['role'] ?? 'kasir',
            'pin_hash' => Hash::make($data['pin']), 'aktif' => true,
        ]);

        return $this->response($this->pegawaiJson($staff), 201);
    }

    public function daftarPegawai(): JsonResponse
    {
        $pegawai = PosPegawai::withCount([
            'transaksi as jumlah_transaksi',
            'absensi as jumlah_shift',
        ])->orderBy('nama')->get();

        return $this->response($pegawai->map(fn ($item) => $this->pegawaiJson($item))->values());
    }

    public function ubahRole(Request $request, PosPegawai $pegawai): JsonResponse
    {
        $data = $request->validate(['role' => ['required', 'in:kasir,admin,owner']]);
        $pegawai->update(['role' => $data['role']]);

        return $this->response($this->pegawaiJson($pegawai));
    }

    public function perbaruiPegawai(Request $request, PosPegawai $pegawai): JsonResponse
    {
        $data = $request->validate([
            'kode' => ['sometimes', 'required', 'string', 'min:3', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/'],
            'nama' => ['sometimes', 'required', 'string', 'min:2', 'max:120'],
            'role' => ['sometimes', 'in:kasir,admin,owner'],
            'aktif' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('kode', $data)) {
            $data['kode'] = Str::upper($data['kode']);
            $request->merge(['kode' => $data['kode']]);
            $duplikat = PosPegawai::where('kode', $data['kode'])
                ->whereKeyNot($pegawai->id)->exists();
            if ($duplikat) {
                throw ValidationException::withMessages(['kode' => 'Kode kasir sudah digunakan.']);
            }
        }
        $pegawai->fill($data)->save();
        if (array_key_exists('aktif', $data) && ! $data['aktif']) {
            PosSesi::where('pegawai_id', $pegawai->id)->delete();
        }

        return $this->response($this->pegawaiJson($pegawai->fresh()));
    }

    public function hapusPegawai(PosPegawai $pegawai): JsonResponse
    {
        if (! $pegawai->aktif) {
            return response()->json(['message' => 'Pegawai sudah nonaktif.'], 409);
        }
        $info = $this->pegawaiJson($pegawai);
        DB::transaction(function () use ($pegawai) {
            $pegawai->update(['aktif' => false]);
            PosSesi::where('pegawai_id', $pegawai->id)->delete();
        });
        $fresh = $pegawai->fresh();
        $fresh->setAttribute('jumlah_transaksi', $info['jumlah_transaksi']);
        $fresh->setAttribute('jumlah_shift', $info['jumlah_shift']);

        return $this->response([
            'message' => 'Pegawai dinonaktifkan. Riwayat transaksi dan shift tetap disimpan.',
            'pegawai' => $this->pegawaiJson($fresh),
        ]);
    }

    public function ubahPin(Request $request, PosPegawai $pegawai): JsonResponse
    {
        $data = $request->validate(['pin' => ['required', 'string', 'regex:/^[0-9]{4,8}$/']]);
        DB::transaction(function () use ($pegawai, $data) {
            $pegawai->update(['pin_hash' => Hash::make($data['pin'])]);
            PosSesi::where('pegawai_id', $pegawai->id)->delete();
        });

        return $this->response(['message' => 'PIN diubah. Semua sesi lama telah dicabut.']);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kode' => ['required', 'string', 'max:32'],
            'pin' => ['required', 'string', 'regex:/^[0-9]{4,8}$/'],
        ]);
        $kode = Str::upper(trim($data['kode']));
        $key = 'pos-login:'.hash('sha256', $kode.'|'.$request->ip());
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(['message' => 'Terlalu banyak percobaan. Coba lagi nanti.'], 429);
        }
        $staff = PosPegawai::where('kode', $kode)->first();
        if (! $staff || ! $staff->aktif || ! Hash::check($data['pin'], $staff->pin_hash)) {
            RateLimiter::hit($key, 300);

            return response()->json(['message' => 'Kode kasir atau PIN salah.'], 401);
        }
        RateLimiter::clear($key);
        $plain = bin2hex(random_bytes(32));
        PosSesi::create([
            'pegawai_id' => $staff->id, 'token_hash' => hash('sha256', $plain),
            'kedaluwarsa_pada' => now()->addHours(12),
        ]);

        return $this->response([
            'token' => $plain,
            'expires_in_seconds' => 43200,
            'pegawai' => $staff->only('id', 'kode', 'nama', 'role'),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->response(['pegawai' => $this->staff($request)->only('id', 'kode', 'nama', 'role')]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->attributes->get('pos_sesi')->delete();

        return $this->response(['message' => 'Sesi telah berakhir.']);
    }

    public function catalog(): JsonResponse
    {
        return $this->response(produk::query()->with('kategori')->orderBy('nama_produk')->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'nama' => $p->nama_produk,
                'harga' => (int) round((float) $p->harga_produk),
                'stok' => (int) ($p->stok ?? 0),
                'stok_minimum' => (int) ($p->stok_minimum ?? 0),
                'barcode' => $p->barcode,
                'kategori' => $p->kategori?->nama_kategori ?? $p->kategori?->nama ?? 'Lainnya',
                'gambar' => $p->gambar_produk ? asset('storage/'.ltrim($p->gambar_produk, '/')) : null,
            ])->values());
    }

    private function activeShift(PosPegawai $pegawai): ?PosAbsensi
    {
        return PosAbsensi::where('pegawai_id', $pegawai->id)
            ->whereNull('pulang_pada')->orderByDesc('id')->first();
    }

    public function shift(Request $request): JsonResponse
    {
        $pegawai = $this->staff($request);

        return $this->response([
            'active' => $this->activeShift($pegawai),
            'history' => PosAbsensi::where('pegawai_id', $pegawai->id)->latest('id')->limit(10)->get(),
        ]);
    }

    public function startShift(Request $request): JsonResponse
    {
        $pegawai = $this->staff($request);

        return DB::transaction(function () use ($pegawai) {
            // Lock pegawai agar tap dua kali tidak menciptakan absensi ganda.
            PosPegawai::whereKey($pegawai->id)->lockForUpdate()->firstOrFail();
            if ($this->activeShift($pegawai)) {
                throw ValidationException::withMessages(['shift' => 'Shift masih aktif.']);
            }
            $shift = PosAbsensi::create(['pegawai_id' => $pegawai->id, 'masuk_pada' => now()]);

            return $this->response($shift, 201);
        });
    }

    public function endShift(Request $request): JsonResponse
    {
        $pegawai = $this->staff($request);

        return DB::transaction(function () use ($pegawai) {
            PosPegawai::whereKey($pegawai->id)->lockForUpdate()->firstOrFail();
            $shift = PosAbsensi::where('pegawai_id', $pegawai->id)
                ->whereNull('pulang_pada')->lockForUpdate()->first();
            if (! $shift) {
                throw ValidationException::withMessages(['shift' => 'Tidak ada shift aktif.']);
            }
            $shift->update(['pulang_pada' => now()]);

            return $this->response($shift);
        });
    }

    private function txJson(PosTransaksi $tx): array
    {
        return [
            'id' => $tx->id,
            'id_client' => $tx->id_client,
            'nomor' => $tx->nomor,
            'kasir' => $tx->pegawai?->nama,
            'nama_pelanggan' => $tx->nama_pelanggan,
            'jenis_pesanan' => $tx->jenis_pesanan,
            'nomor_meja' => $tx->nomor_meja,
            'catatan' => $tx->catatan,
            'metode_bayar' => $tx->metode_bayar,
            'status_transaksi' => $tx->status_transaksi ?? 'completed',
            'jenis_pembatalan' => $tx->jenis_pembatalan,
            'alasan_pembatalan' => $tx->alasan_pembatalan,
            'dibatalkan_oleh' => $tx->pembatali?->nama,
            'dibatalkan_pada' => $tx->dibatalkan_pada?->toIso8601String(),
            'subtotal' => $tx->subtotal,
            'total' => $tx->total,
            'dibayar' => $tx->dibayar,
            'kembalian' => $tx->kembalian,
            'dibayar_pada' => $tx->dibayar_pada?->toIso8601String(),
            'items' => $tx->items->map(fn ($i) => [
                'produk_id' => $i->produk_id, 'nama' => $i->nama_snapshot,
                'jumlah' => $i->jumlah, 'harga' => $i->harga_satuan, 'total' => $i->total,
            ])->values(),
        ];
    }

    private function replayMatches(array $input, PosTransaksi $tx): bool
    {
        $requestedItems = collect($input['items'])
            ->map(fn ($item) => [
                'produk_id' => (int) $item['produk_id'],
                'jumlah' => (int) $item['jumlah'],
            ])
            ->sortBy('produk_id')->values()->all();
        $storedItems = $tx->items
            ->map(fn ($item) => [
                'produk_id' => (int) $item->produk_id,
                'jumlah' => (int) $item->jumlah,
            ])
            ->sortBy('produk_id')->values()->all();
        $clean = fn ($value) => trim((string) ($value ?? ''));

        return $requestedItems === $storedItems
            && $tx->metode_bayar === $input['metode_bayar']
            && (int) $tx->dibayar === (int) $input['dibayar']
            && (bool) $tx->verifikasi_manual === (bool) ($input['verifikasi_manual'] ?? false)
            && $tx->jenis_pesanan === $input['jenis_pesanan']
            && $clean($tx->nomor_meja) === $clean($input['nomor_meja'] ?? null)
            && $clean($tx->nama_pelanggan) === $clean($input['nama_pelanggan'] ?? null)
            && $clean($tx->catatan) === $clean($input['catatan'] ?? null);
    }

    public function checkout(Request $request): JsonResponse
    {
        $input = $request->validate([
            'id_client' => ['required', 'uuid'],
            'items' => ['required', 'array', 'min:1', 'max:60'],
            'items.*.produk_id' => ['required', 'integer', 'distinct', 'exists:katalog_produk,id'],
            'items.*.jumlah' => ['required', 'integer', 'min:1', 'max:1000'],
            'metode_bayar' => ['required', 'in:tunai,qris,transfer'],
            'dibayar' => ['required', 'integer', 'min:0', 'max:999999999999'],
            'verifikasi_manual' => ['nullable', 'boolean'],
            'jenis_pesanan' => ['required', 'in:takeaway,dine_in'],
            'nomor_meja' => ['nullable', 'string', 'max:30'],
            'nama_pelanggan' => ['nullable', 'string', 'max:120'],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ]);
        $staff = $this->staff($request);
        // Idempotensi: request dengan UUID sama tidak membuat transaksi/mutasi ganda.
        $existing = PosTransaksi::with(['items', 'pegawai', 'pembatali'])->where('id_client', $input['id_client'])->first();
        if ($existing) {
            if ((int) $existing->pegawai_id !== (int) $staff->id) {
                return response()->json(['message' => 'ID transaksi sudah digunakan.'], 409);
            }
            if (($existing->status_transaksi ?? 'completed') !== 'completed') {
                return response()->json(['message' => 'Transaksi ini sudah dibatalkan.'], 409);
            }
            if (! $this->replayMatches($input, $existing)) {
                return response()->json(['message' => 'ID transaksi sudah digunakan dengan detail yang berbeda.'], 409);
            }

            return $this->response($this->txJson($existing));
        }

        try {
            return DB::transaction(function () use ($input, $staff) {
                // Lock pegawai → absensi → produk (berdasarkan id) untuk transaksi paralel konsisten.
                PosPegawai::whereKey($staff->id)->lockForUpdate()->firstOrFail();
                $shift = PosAbsensi::where('pegawai_id', $staff->id)
                    ->whereNull('pulang_pada')->lockForUpdate()->first();
                if (! $shift) {
                    throw ValidationException::withMessages(['shift' => 'Mulai shift terlebih dahulu.']);
                }

                $quantities = collect($input['items'])->keyBy('produk_id');
                $products = produk::whereIn('id', $quantities->keys())
                    ->orderBy('id')->lockForUpdate()->get();
                if ($products->count() !== $quantities->count()) {
                    throw ValidationException::withMessages(['items' => 'Ada produk yang tidak tersedia.']);
                }
                $total = 0;
                foreach ($products as $p) {
                    $qty = (int) $quantities[$p->id]['jumlah'];
                    if ((int) $p->stok < $qty) {
                        throw ValidationException::withMessages(['items' => "Stok {$p->nama_produk} tersisa {$p->stok}."]);
                    }
                    $price = (float) $p->harga_produk;
                    if ($price < 0 || round($price) != $price) {
                        throw ValidationException::withMessages(['items' => 'Harga produk belum valid untuk pembayaran Rupiah.']);
                    }
                    $total += (int) $price * $qty;
                    if ($total > 999999999999) {
                        throw ValidationException::withMessages(['items' => 'Nilai transaksi terlalu besar.']);
                    }
                }
                $paid = (int) $input['dibayar'];
                if ($paid < $total) {
                    throw ValidationException::withMessages(['dibayar' => 'Jumlah pembayaran kurang.']);
                }
                if ($input['metode_bayar'] !== 'tunai') {
                    if (! ($input['verifikasi_manual'] ?? false)) {
                        throw ValidationException::withMessages(['verifikasi_manual' => 'Pembayaran harus diverifikasi manual sebelum transaksi disimpan.']);
                    }
                    if ($paid !== $total) {
                        throw ValidationException::withMessages(['dibayar' => 'Pembayaran QRIS/transfer harus sesuai total.']);
                    }
                }
                $tx = PosTransaksi::create([
                    'id_client' => $input['id_client'],
                    'nomor' => 'KP-'.now('Asia/Jakarta')->format('ymd').'-'.strtoupper(Str::random(8)),
                    'pegawai_id' => $staff->id,
                    'absensi_id' => $shift->id,
                    'nama_pelanggan' => $input['nama_pelanggan'] ?? null,
                    'jenis_pesanan' => $input['jenis_pesanan'],
                    'nomor_meja' => $input['jenis_pesanan'] === 'dine_in' ? ($input['nomor_meja'] ?? null) : null,
                    'catatan' => $input['catatan'] ?? null,
                    'metode_bayar' => $input['metode_bayar'],
                    'status_transaksi' => 'completed',
                    'verifikasi_manual' => (bool) ($input['verifikasi_manual'] ?? false),
                    'subtotal' => $total, 'total' => $total,
                    'dibayar' => $paid, 'kembalian' => $paid - $total, 'dibayar_pada' => now(),
                ]);
                foreach ($products as $p) {
                    $qty = (int) $quantities[$p->id]['jumlah'];
                    $price = (int) $p->harga_produk;
                    $before = (int) $p->stok;
                    $p->stok = $before - $qty;
                    $p->save();
                    $item = PosItemTransaksi::create([
                        'transaksi_id' => $tx->id, 'produk_id' => $p->id,
                        'nama_snapshot' => $p->nama_produk,
                        'barcode_snapshot' => $p->barcode,
                        'jumlah' => $qty, 'harga_satuan' => $price, 'total' => $qty * $price,
                    ]);
                    MutasiStok::create([
                        'produk_id' => $p->id, 'pengguna_id' => null,
                        'jenis' => 'penjualan', 'perubahan' => -$qty,
                        'stok_sebelum' => $before, 'stok_sesudah' => $before - $qty,
                        'keterangan' => 'POS '.$tx->nomor.' | Kasir '.$staff->kode,
                        'referensi_tipe' => 'pos_item_transaksi', 'referensi_id' => $item->id,
                    ]);
                }

                return $this->response($this->txJson($tx->load(['items', 'pegawai', 'pembatali'])), 201);
            }, 3);
        } catch (UniqueConstraintViolationException $e) {
            // Perlindungan apabila klien mengirim request id_client sama secara bersamaan.
            $found = PosTransaksi::with(['items', 'pegawai', 'pembatali'])->where('id_client', $input['id_client'])->first();
            if ($found && (int) $found->pegawai_id === (int) $staff->id) {
                if (($found->status_transaksi ?? 'completed') !== 'completed') {
                    return response()->json(['message' => 'Transaksi ini sudah dibatalkan.'], 409);
                }
                if (! $this->replayMatches($input, $found)) {
                    return response()->json(['message' => 'ID transaksi sudah digunakan dengan detail yang berbeda.'], 409);
                }
                return $this->response($this->txJson($found));
            }
            throw $e;
        }
    }

    public function transactions(Request $request): JsonResponse
    {
        $filter = $request->validate([
            'dari' => ['nullable', 'date_format:Y-m-d'],
            'sampai' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:dari'],
            'metode_bayar' => ['nullable', 'in:tunai,qris,transfer'],
            'status_transaksi' => ['nullable', 'in:completed,void,retur'],
            'pegawai_id' => ['nullable', 'integer', 'exists:pos_pegawai,id'],
        ]);
        $query = PosTransaksi::with(['pegawai', 'items', 'pembatali'])->orderByDesc('id');
        if (isset($filter['dari'])) {
            $query->whereDate('dibayar_pada', '>=', $filter['dari']);
        }
        if (isset($filter['sampai'])) {
            $query->whereDate('dibayar_pada', '<=', $filter['sampai']);
        }
        if (isset($filter['metode_bayar'])) {
            $query->where('metode_bayar', $filter['metode_bayar']);
        }
        if (isset($filter['status_transaksi'])) {
            $query->where('status_transaksi', $filter['status_transaksi']);
        }
        if (isset($filter['pegawai_id'])) {
            $query->where('pegawai_id', $filter['pegawai_id']);
        }
        $page = $query->paginate(30);

        return $this->response([
            'items' => collect($page->items())->map(fn ($t) => $this->txJson($t))->values(),
            'page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(),
        ]);
    }

    public function transactionDetail(PosTransaksi $transaksi): JsonResponse
    {
        return $this->response($this->txJson($transaksi->load(['items', 'pegawai', 'pembatali'])));
    }

    public function report(Request $request): JsonResponse
    {
        $filter = $request->validate([
            'dari' => ['required', 'date_format:Y-m-d'],
            'sampai' => ['required', 'date_format:Y-m-d', 'after_or_equal:dari'],
        ]);
        $from = CarbonImmutable::createFromFormat('Y-m-d', $filter['dari'], 'Asia/Jakarta')->startOfDay();
        $lastDay = CarbonImmutable::createFromFormat('Y-m-d', $filter['sampai'], 'Asia/Jakarta')->startOfDay();
        if ($from->diffInDays($lastDay) > 92) {
            throw ValidationException::withMessages(['sampai' => 'Laporan maksimal 93 hari per permintaan.']);
        }
        $from = $from->utc();
        $until = $lastDay->addDay()->utc();
        $query = PosTransaksi::query()
            ->where('status_transaksi', 'completed')
            ->where('dibayar_pada', '>=', $from)
            ->where('dibayar_pada', '<', $until);

        return $this->response([
            'periode' => $filter,
            'jumlah_transaksi' => (clone $query)->count(),
            'total_penjualan' => (int) (clone $query)->sum('total'),
            'per_metode' => (clone $query)->selectRaw('metode_bayar, COUNT(*) as jumlah, SUM(total) as total')
                ->groupBy('metode_bayar')->get(),
            'per_kasir' => DB::table('pos_transaksi')
                ->join('pos_pegawai', 'pos_pegawai.id', '=', 'pos_transaksi.pegawai_id')
                ->where('pos_transaksi.status_transaksi', 'completed')
                ->whereBetween('pos_transaksi.dibayar_pada', [$from, $until])
                ->select(
                    'pos_pegawai.id as kasir_id',
                    'pos_pegawai.nama as kasir',
                    DB::raw('COUNT(*) as jumlah'),
                    DB::raw('SUM(pos_transaksi.total) as total')
                )
                ->groupBy('pos_pegawai.id', 'pos_pegawai.nama')
                ->orderByDesc('total')->get(),
            'per_produk' => DB::table('pos_item_transaksi')
                ->join('pos_transaksi', 'pos_transaksi.id', '=', 'pos_item_transaksi.transaksi_id')
                ->where('pos_transaksi.status_transaksi', 'completed')
                ->whereBetween('pos_transaksi.dibayar_pada', [$from, $until])
                ->select(
                    'pos_item_transaksi.produk_id',
                    'pos_item_transaksi.nama_snapshot as nama',
                    DB::raw('SUM(pos_item_transaksi.jumlah) as jumlah'),
                    DB::raw('SUM(pos_item_transaksi.total) as total')
                )
                ->groupBy('pos_item_transaksi.produk_id', 'pos_item_transaksi.nama_snapshot')
                ->orderByDesc('jumlah')->limit(20)->get(),
        ]);
    }

    public function batalkan(Request $request, string $transaksi): JsonResponse
    {
        $found = ctype_digit($transaksi)
            ? PosTransaksi::findOrFail($transaksi)
            : PosTransaksi::where('id_client', $transaksi)->firstOrFail();
        if (! $this->isManager($request)) {
            return response()->json(['message' => 'Hanya pegawai Admin/Owner yang dapat membatalkan transaksi.'], 403);
        }
        $input = $request->validate([
            'jenis' => ['required', 'in:void,retur'],
            'alasan' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        if (($found->status_transaksi ?? 'completed') !== 'completed') {
            return response()->json(['message' => 'Transaksi ini sudah dibatalkan.'], 409);
        }
        $actor = $this->staff($request);

        return DB::transaction(function () use ($found, $input, $actor) {
            $locked = PosTransaksi::whereKey($found->id)->lockForUpdate()->firstOrFail();
            if (($locked->status_transaksi ?? 'completed') !== 'completed') {
                return response()->json(['message' => 'Transaksi ini sudah dibatalkan.'], 409);
            }
            $updated = PosTransaksi::where('id', $locked->id)
                ->where('status_transaksi', 'completed')
                ->update([
                    'status_transaksi' => $input['jenis'] === 'retur' ? 'retur' : 'void',
                    'jenis_pembatalan' => $input['jenis'],
                    'alasan_pembatalan' => $input['alasan'],
                    'dibatalkan_oleh' => $actor->id,
                    'dibatalkan_pada' => now(),
                ]);
            if (! $updated) {
                return response()->json(['message' => 'Transaksi ini sudah dibatalkan.'], 409);
            }
            $items = PosItemTransaksi::where('transaksi_id', $locked->id)
                ->lockForUpdate()->orderBy('produk_id')->get();
            $products = produk::whereIn('id', $items->pluck('produk_id'))
                ->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            foreach ($items as $item) {
                $product = $products->get($item->produk_id);
                if (! $product) {
                    continue;
                }
                $before = (int) $product->stok;
                $after = $before + (int) $item->jumlah;
                $product->stok = $after;
                $product->save();
                MutasiStok::create([
                    'produk_id' => $product->id,
                    'pengguna_id' => null,
                    'jenis' => $input['jenis'],
                    'perubahan' => (int) $item->jumlah,
                    'stok_sebelum' => $before,
                    'stok_sesudah' => $after,
                    'keterangan' => 'POS '.$locked->nomor.' | '.$input['jenis'].' | '.$actor->kode,
                    'referensi_tipe' => 'pos_item_transaksi',
                    'referensi_id' => $item->id,
                ]);
            }

            return $this->response($this->txJson($locked->fresh()->load(['items', 'pegawai', 'pembatali'])));
        }, 3);
    }
}
```

### 2.4 `E:\Ekosistem-kuki\backend-web-katalog\app\Models\PosPegawai.php`

Status: **Diubah**

Perubahan: `role` ditambahkan ke `$fillable`; relasi `transaksi`, `absensi`, `sesi` dipakai untuk menghitung jumlah transaksi/shift dan mencabut sesi.

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosPegawai extends Model
{
    protected $table = 'pos_pegawai';

    protected $fillable = ['kode', 'nama', 'role', 'pin_hash', 'aktif'];

    protected $hidden = ['pin_hash'];

    protected $casts = ['aktif' => 'boolean'];

    public function transaksi()
    {
        return $this->hasMany(PosTransaksi::class, 'pegawai_id');
    }

    public function absensi()
    {
        return $this->hasMany(PosAbsensi::class, 'pegawai_id');
    }

    public function sesi()
    {
        return $this->hasMany(PosSesi::class, 'pegawai_id');
    }
}
```

### 2.5 `E:\Ekosistem-kuki\backend-web-katalog\app\Models\PosTransaksi.php`

Status: **Diubah**

Perubahan: kolom audit ditambahkan ke `$fillable`, `dibatalkan_pada` di-cast sebagai datetime, relasi `pembatali()` ditambahkan.

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosTransaksi extends Model
{
    protected $table = 'pos_transaksi';

    protected $fillable = ['id_client', 'nomor', 'pegawai_id', 'absensi_id', 'nama_pelanggan', 'jenis_pesanan', 'nomor_meja', 'catatan', 'metode_bayar', 'status_transaksi', 'jenis_pembatalan', 'alasan_pembatalan', 'dibatalkan_oleh', 'dibatalkan_pada', 'verifikasi_manual', 'subtotal', 'total', 'dibayar', 'kembalian', 'dibayar_pada'];

    protected $casts = ['verifikasi_manual' => 'boolean', 'dibayar_pada' => 'datetime', 'dibatalkan_pada' => 'datetime'];

    public function items()
    {
        return $this->hasMany(PosItemTransaksi::class, 'transaksi_id');
    }

    public function pegawai()
    {
        return $this->belongsTo(PosPegawai::class, 'pegawai_id');
    }

    public function pembatali()
    {
        return $this->belongsTo(PosPegawai::class, 'dibatalkan_oleh');
    }
}
```

### 2.6 `E:\Ekosistem-kuki\backend-web-katalog\database\migrations\2026_11_12_120000_prepare_hard_delete_produk_with_history.php`

Status: **Diubah**

Perubahan: pada driver selain MySQL, migration langsung `return`, sehingga test SQLite tidak gagal. Untuk MySQL, perilaku tetap sama.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Hard delete bersyarat: detail opname dan mutasi tetap utuh sebagai histori.
 * Hanya MySQL; perlu backup DB sebelum migrate. Tidak mengubah FK tabel POS
 * atau tabel lain yang belum diaudit.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            // DDL khusus MySQL (information_schema + ALTER FK) tidak berlaku
            // pada SQLite in-memory yang dipakai test suite. Lewati dengan aman.
            return;
        }
        if (! Schema::hasTable('katalog_produk') || ! Schema::hasTable('opname_stok') || ! Schema::hasTable('opname_stok_detail')) {
            throw new RuntimeException('Tabel katalog_produk/opname_stok_detail tidak ada.');
        }

        // Preflight kedua tabel sebelum DDL apa pun (MySQL DDL bisa auto-commit).
        $tables = ['opname_stok_detail'];
        if (Schema::hasTable('mutasi_stok')) $tables[] = 'mutasi_stok';
        foreach ($tables as $table) $this->assertKnownForeignKey($table);
        foreach ($tables as $table) $this->prepareHistoryTable($table, true);
    }

    private function assertKnownForeignKey(string $table): void
    {
        if (! Schema::hasColumn($table, 'produk_id')) {
            throw new RuntimeException("Kolom {$table}.produk_id tidak ditemukan.");
        }
        $rows = DB::select(
            "SELECT r.DELETE_RULE AS delete_rule
             FROM information_schema.KEY_COLUMN_USAGE k
             JOIN information_schema.REFERENTIAL_CONSTRAINTS r
               ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
              AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
              AND r.TABLE_NAME = k.TABLE_NAME
             WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ?
               AND k.COLUMN_NAME = 'produk_id'
               AND k.REFERENCED_TABLE_SCHEMA = DATABASE()
               AND k.REFERENCED_TABLE_NAME = 'katalog_produk'
               AND k.REFERENCED_COLUMN_NAME = 'id'",
            [$table]
        );
        if (count($rows) !== 1) {
            throw new RuntimeException("FK produk_id {$table} harus tepat 1; ditemukan ".count($rows).'.');
        }
        if (strtoupper($rows[0]->delete_rule) === 'CASCADE') {
            throw new RuntimeException("FK {$table} sebelumnya CASCADE. Audit manual sebelum migrasi.");
        }
    }

    private function prepareHistoryTable(string $table, bool $requiredForeignKey): void
    {
        if (! Schema::hasColumn($table, 'produk_id')) {
            throw new RuntimeException("Kolom {$table}.produk_id tidak ditemukan.");
        }

        // Nama, barcode, dan ID asli disimpan agar detail histori tetap terbaca
        // bahkan saat FK produk_id berubah menjadi NULL setelah hard delete.
        Schema::table($table, function (Blueprint $blueprint) use ($table) {
            if (! Schema::hasColumn($table, 'produk_id_snapshot')) {
                $blueprint->unsignedBigInteger('produk_id_snapshot')->nullable();
            }
            if (! Schema::hasColumn($table, 'nama_produk_snapshot')) {
                $blueprint->string('nama_produk_snapshot', 255)->nullable();
            }
            if (! Schema::hasColumn($table, 'barcode_snapshot')) {
                $blueprint->string('barcode_snapshot', 100)->nullable();
            }
        });

        // Backfill histori yang sudah ada; tidak mengubah stok / status opname.
        DB::statement("UPDATE `{$table}` AS h INNER JOIN `katalog_produk` AS p ON p.id = h.produk_id
            SET h.produk_id_snapshot = COALESCE(h.produk_id_snapshot, h.produk_id),
                h.nama_produk_snapshot = COALESCE(h.nama_produk_snapshot, p.nama_produk),
                h.barcode_snapshot = COALESCE(h.barcode_snapshot, p.barcode)
            WHERE h.produk_id IS NOT NULL");

        // Tidak aman melonggarkan FK jika nama historis tidak bisa disalin.
        $missing = DB::table($table)
            ->whereNotNull('produk_id')->whereNull('nama_produk_snapshot')->exists();
        if ($missing) {
            throw new RuntimeException("Snapshot nama produk di {$table} belum lengkap; migration dihentikan.");
        }

        $constraints = DB::select(
            "SELECT k.CONSTRAINT_NAME AS name, r.DELETE_RULE AS delete_rule
             FROM information_schema.KEY_COLUMN_USAGE AS k
             INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r
               ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
              AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
              AND r.TABLE_NAME = k.TABLE_NAME
             WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ?
               AND k.COLUMN_NAME = 'produk_id'
               AND k.REFERENCED_TABLE_SCHEMA = DATABASE()
               AND k.REFERENCED_TABLE_NAME = 'katalog_produk'
               AND k.REFERENCED_COLUMN_NAME = 'id'",
            [$table]
        );
        if (count($constraints) !== 1) {
            if ($requiredForeignKey) {
                throw new RuntimeException("Diharapkan tepat 1 FK {$table}.produk_id menuju katalog_produk.id; ditemukan ".count($constraints).'.');
            }
            return;
        }

        $name = $constraints[0]->name;
        $rule = strtoupper($constraints[0]->delete_rule);
        $nullable = DB::selectOne(
            "SELECT IS_NULLABLE AS nullable FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'produk_id'",
            [$table]
        );

        if ($rule === 'SET NULL' && $nullable?->nullable === 'YES') {
            return; // Aman bila migration pernah diterapkan sebagian.
        }
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropForeign($name));
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->unsignedBigInteger('produk_id')->nullable()->change());
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->foreign('produk_id', $name)
            ->references('id')->on('katalog_produk')->nullOnDelete());
    }

    public function down(): void
    {
        // Tidak reversible secara aman setelah ada FK yang menjadi NULL
        // akibat hard delete. Rollback otomatis dapat merusak histori.
        throw new RuntimeException('Rollback otomatis tidak aman; pulihkan backup database bila diperlukan.');
    }
};
```

### 2.7 `E:\Ekosistem-kuki\backend-web-katalog\routes\api.php`

Status: **Diubah**

Perubahan: import `PosController` dihapus; grup POS lama dengan middleware `can:manage-pos` dihapus; endpoint POS cukup satu kali dari `require __DIR__ . '/pos.php';`.

```php
<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Aapi\MutasiStokController;
use App\Http\Controllers\AdminChatController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\kategoriController;
use App\Http\Controllers\ManagementDashboardController;
use App\Http\Controllers\produkController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\TestimonialCommentController;
use App\Http\Controllers\Api\ProdukVarianController;
use App\Http\Controllers\Api\ProduksiHarianController;
use App\Http\Controllers\Api\LaporanInventarisController;
use App\Http\Controllers\Api\LaporanPenjualanController;
use App\Http\Controllers\Api\KukiLocationController;

/*
|--------------------------------------------------------------------------
| PUBLIC API
|--------------------------------------------------------------------------
*/

// Kuki Assistant
Route::post('/assistant/chat', [AssistantController::class, 'chat'])->middleware('throttle:10,1');
Route::get('/assistant/obrolan/{sessionId}', [AssistantController::class, 'obrolan']);
Route::post('/assistant/handover', [AssistantController::class, 'handover'])->middleware('throttle:5,1');

// Produk
Route::get('/produk', [produkController::class, 'index']);
Route::get('/produk/{id}', [produkController::class, 'show']);
Route::get('/produk/{produk}/varian', [ProdukVarianController::class, 'index']);

// Kategori
Route::get('/kategori', [kategoriController::class, 'index']);
Route::get('/kategori/{id}', [kategoriController::class, 'show']);

// Testimonial
Route::get('/testimonial', [TestimonialController::class, 'index']);
Route::get('/testimonial/{testimonial}', [TestimonialController::class, 'show']);
Route::post('/testimonial', [TestimonialController::class, 'submit'])->middleware('throttle:3,1');

// Komentar Testimonial
Route::get('/testimonial/{testimonial}/komentar', [TestimonialCommentController::class, 'index']);
Route::post('/testimonial/{testimonial}/komentar', [TestimonialCommentController::class, 'store'])->middleware('throttle:5,1');

// Authentication
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Lokasi Kuki (Leaflet): publik, key HeiGIT diproses hanya oleh Laravel.
Route::get('/public/kuki-map/geocode', [KukiLocationController::class, 'geocode'])->middleware('throttle:10,1');
Route::post('/public/kuki-map/route', [KukiLocationController::class, 'route'])->middleware('throttle:10,1');


/*
|--------------------------------------------------------------------------
| AUTHENTICATED API
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    /*
    |--------------------------------------------------------------------------
    | ADMIN ONLY
    |--------------------------------------------------------------------------
    */

    Route::middleware('can:manage-admin')->group(function () {

        // Manajemen Produk
        Route::post('/produk', [produkController::class, 'store']);
        Route::put('/produk/{id}', [produkController::class, 'update']);
        Route::delete('/produk/{id}', [produkController::class, 'destroy']);
        Route::post('/produk/{id}/gambar', [produkController::class, 'uploadGambar']);

        // Manajemen Kategori
        Route::post('/kategori', [kategoriController::class, 'store']);
        Route::put('/kategori/{id}', [kategoriController::class, 'update']);
        Route::delete('/kategori/{id}', [kategoriController::class, 'destroy']);
        Route::post('/kategori/{id}/gambar', [kategoriController::class, 'uploadGambar']);

        // Produksi Harian
        Route::get('/admin/produksi-harian', [ProduksiHarianController::class, 'index']);
        Route::post('/admin/produksi-harian', [ProduksiHarianController::class, 'store']);
        Route::post('/admin/produksi-harian/{produksiHarian}/konfirmasi-cetak', [ProduksiHarianController::class, 'konfirmasiCetak']);

        // Admin Chat & Push Notifications
        Route::prefix('admin')->group(function () {

            Route::get('/obrolan', [AdminChatController::class, 'index']);
            Route::get('/obrolan/statistik', [AdminChatController::class, 'statistik']);
            Route::get('/obrolan/pertanyaan-tidak-terjawab', [AdminChatController::class, 'pertanyaanTidakTerjawab']);
            Route::get('/obrolan/{id}', [AdminChatController::class, 'show']);
            Route::post('/obrolan/{id}/ambil', [AdminChatController::class, 'ambil']);
            Route::post('/obrolan/{id}/selesai', [AdminChatController::class, 'selesai']);
            Route::post('/obrolan/{id}/balas', [AdminChatController::class, 'balas']);
            Route::get('/obrolan/{id}/pesan', [AdminChatController::class, 'pesanBaru']);
            Route::post('/obrolan/{id}/baca', [AdminChatController::class, 'baca']);

            // Push Notifications
            Route::get('/push/vapid-key', [PushSubscriptionController::class, 'vapidKey']);
            Route::post('/push/subscribe', [PushSubscriptionController::class, 'store']);
            Route::delete('/push/subscribe', [PushSubscriptionController::class, 'destroy']);

        });

        // Varian Produk 
        Route::get('/admin/produk/{produk}/varian', [ProdukVarianController::class, 'adminIndex']);
        Route::post('/admin/produk/{produk}/varian', [ProdukVarianController::class, 'store']);
        Route::put('/admin/produk/{produk}/varian/{varian}', [ProdukVarianController::class, 'update']);
        Route::delete('/admin/produk/{produk}/varian/{varian}', [ProdukVarianController::class, 'destroy']);

    });
});


/*
|--------------------------------------------------------------------------
| MANAGEMENT DASHBOARD
|--------------------------------------------------------------------------
*/

Route::prefix('management')
    ->middleware(['auth:sanctum', 'can:view-management-dashboard'])
    ->group(function () {
        Route::get('/dashboard', [ManagementDashboardController::class, 'show']);
        Route::get('/laporan-inventaris', [LaporanInventarisController::class, 'index']);
        Route::get('/laporan-inventaris/export', [LaporanInventarisController::class, 'exportCsv']);
        Route::get('/laporan-penjualan', [LaporanPenjualanController::class, 'index']);
        Route::get('/laporan-penjualan/export', [LaporanPenjualanController::class, 'export']);
    });


/*
|--------------------------------------------------------------------------
| ADMIN TESTIMONIAL
|--------------------------------------------------------------------------
*/

Route::prefix('admin/testimonial')
    ->middleware(['auth:sanctum', 'can:manage-testimonials'])
    ->group(function () {

        // CRUD Testimonial
        Route::get('/', [TestimonialController::class, 'adminIndex']);
        Route::post('/', [TestimonialController::class, 'store']);

        // Moderasi Komentar
        Route::get('/komentar', [TestimonialCommentController::class, 'adminIndex']);
        Route::patch('/komentar/{comment}/moderasi', [TestimonialCommentController::class, 'moderate']);
        Route::delete('/komentar/{comment}', [TestimonialCommentController::class, 'destroy']);

        // Manajemen Testimonial
        Route::put('/{testimonial}', [TestimonialController::class, 'update']);
        Route::delete('/{testimonial}', [TestimonialController::class, 'destroy']);
        Route::patch('/{testimonial}/moderasi', [TestimonialController::class, 'moderate']);
        Route::post('/{testimonial}/foto', [TestimonialController::class, 'uploadPhoto']);
        Route::delete('/{testimonial}/foto', [TestimonialController::class, 'deletePhoto']);

    });

// Riwayat Mutasi Stok
Route::get('/admin/mutasi-stok', [MutasiStokController::class, 'index'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::post('/admin/mutasi-stok/koreksi', [MutasiStokController::class, 'koreksi'])->middleware(['auth:sanctum', 'can:manage-admin']);

// STOCK OPNAME 
Route::get('/admin/opname-stok', [\App\Http\Controllers\Api\StockOpnameController::class, 'index'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::get('/admin/opname-stok/ringkasan-pengeluaran', [\App\Http\Controllers\Api\StockOpnameController::class, 'ringkasanPengeluaran'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::get('/admin/opname-stok/{opnameStok}', [\App\Http\Controllers\Api\StockOpnameController::class, 'show'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::post('/admin/opname-stok', [\App\Http\Controllers\Api\StockOpnameController::class, 'store'])->middleware(['auth:sanctum', 'can:manage-admin']);
Route::put('/admin/opname-stok/{opnameStok}', [\App\Http\Controllers\Api\StockOpnameController::class, 'update'])->middleware(['auth:sanctum', 'can:manage-admin']);
Route::post('/admin/opname-stok/{opnameStok}/selesai', [\App\Http\Controllers\Api\StockOpnameController::class, 'selesai'])->middleware(['auth:sanctum', 'can:manage-admin']);
Route::post('/admin/opname-stok/{opnameStok}/batalkan', [\App\Http\Controllers\Api\StockOpnameController::class, 'batalkan'])->middleware(['auth:sanctum', 'can:manage-admin']);
Route::post('/admin/opname-stok/pengeluaran', [\App\Http\Controllers\Api\StockOpnameController::class, 'pengeluaran'])->middleware(['auth:sanctum', 'can:manage-admin']);


/*
|--------------------------------------------------------------------------
| POS KASIR
|--------------------------------------------------------------------------
| Endpoint POS aktif seluruhnya berada di routes/pos.php dan memakai
| middleware PosAuthenticate. Grup lama di bawah ini dihapus karena gate
| manage-pos tidak pernah didefinisikan dan method controller tidak ada.
 */
require __DIR__ . '/pos.php';
```

### 2.8 `E:\Ekosistem-kuki\backend-web-katalog\routes\pos.php`

Status: **Diubah**

Perubahan: route baru:

- `PATCH /api/pos/admin/pegawai/{pegawai}`
- `DELETE /api/pos/admin/pegawai/{pegawai}`
- `PATCH /api/pos/admin/pegawai/{pegawai}/role`
- `POST /api/pos/transactions/{transaksi}/pembatalan`

```php
<?php
// Tambahkan require __DIR__.'/pos.php'; SATU KALI di akhir routes/api.php.
// File ini otomatis menerima prefix /api dari bootstrap Laravel.

use App\Http\Controllers\Api\Pos\PosController;
use Illuminate\Support\Facades\Route;

Route::prefix('pos')->group(function () {
    Route::post('/login', [PosController::class, 'login'])->middleware('throttle:5,1');
    Route::prefix('admin')->middleware(['auth:sanctum', 'can:manage-admin'])->group(function () {
        Route::post('/pegawai', [PosController::class, 'buatPegawai']);
        Route::get('/pegawai', [PosController::class, 'daftarPegawai']);
        Route::patch('/pegawai/{pegawai}', [PosController::class, 'perbaruiPegawai']);
        Route::delete('/pegawai/{pegawai}', [PosController::class, 'hapusPegawai']);
        Route::patch('/pegawai/{pegawai}/pin', [PosController::class, 'ubahPin']);
        Route::patch('/pegawai/{pegawai}/role', [PosController::class, 'ubahRole']);
    });

    // Gunakan middleware class agar kompatibel dengan Router Laravel dan bisa diuji.
    Route::middleware(\App\Http\Middleware\PosAuthenticate::class)->group(function () {
        Route::get('/me', [PosController::class, 'me']);
        Route::post('/logout', [PosController::class, 'logout']);
        Route::get('/catalog', [PosController::class, 'catalog']);
        Route::get('/shift', [PosController::class, 'shift']);
        Route::post('/shift/start', [PosController::class, 'startShift']);
        Route::post('/shift/end', [PosController::class, 'endShift']);
        Route::get('/transactions', [PosController::class, 'transactions']);
        Route::get('/transactions/{transaksi}', [PosController::class, 'transactionDetail']);
        Route::post('/transactions', [PosController::class, 'checkout'])->middleware('throttle:60,1');
        Route::post('/transactions/{transaksi}/pembatalan', [PosController::class, 'batalkan']);
        Route::get('/report', [PosController::class, 'report']);
    });
});
```

### 2.9 `E:\Ekosistem-kuki\backend-web-katalog\tests\Feature\LaporanPenjualanAccessTest.php`

Status: **Diubah**

Perubahan: `$this->app['auth']->forgetGuards();` ditambahkan sebelum request memakai token `owner`, agar guard yang ter-cache dari test sebelumnya tidak digunakan.

```php
<?php

namespace Tests\Feature;

use App\Models\PosAbsensi;
use App\Models\PosPegawai;
use App\Models\PosTransaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LaporanPenjualanAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dan_owner_melihat_ringkasan_transaksi_dari_periode_terpilih(): void
    {
        $pegawai = PosPegawai::create([
            'kode' => 'KASIR01',
            'nama' => 'Kasir Satu',
            'pin_hash' => 'hash',
        ]);
        $absensi = PosAbsensi::create([
            'pegawai_id' => $pegawai->id,
            'masuk_pada' => '2026-11-10 08:00:00',
        ]);

        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-000', 'tunai', 10000, '2026-11-09 17:00:00');
        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-001', 'tunai', 25000, '2026-11-10 10:00:00');
        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-002', 'qris', 35000, '2026-11-11 12:00:00');
        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-003', 'tunai', 50000, '2026-11-12 12:00:00');
        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-004', 'transfer', 90000, '2026-11-11 17:00:00');

        foreach (['admin', 'owner'] as $role) {
            $token = User::factory()->create(['role' => $role])
                ->createToken("laporan-penjualan-{$role}")
                ->plainTextToken;

            $this->withToken($token)
                ->getJson('/api/management/laporan-penjualan?dari=2026-11-10&sampai=2026-11-11')
                ->assertOk()
                ->assertJsonPath('data.periode.dari', '2026-11-10')
                ->assertJsonPath('data.ringkasan.jumlah_transaksi', 3)
                ->assertJsonPath('data.ringkasan.total_penjualan', 70000)
                ->assertJsonPath('data.per_metode.0.metode_bayar', 'qris')
                ->assertJsonPath('data.transaksi.total', 3);
        }
    }

    public function test_laporan_penjualan_menolak_guest_role_lain_dan_periode_tidak_valid(): void
    {
        $this->getJson('/api/management/laporan-penjualan?dari=2026-11-01&sampai=2026-11-02')
            ->assertUnauthorized();

        $token = User::factory()->create(['role' => 'customer'])
            ->createToken('customer-laporan-penjualan')
            ->plainTextToken;
        $this->withToken($token)
            ->getJson('/api/management/laporan-penjualan?dari=2026-11-01&sampai=2026-11-02')
            ->assertForbidden();

        $ownerToken = User::factory()->create(['role' => 'owner'])
            ->createToken('owner-laporan-penjualan')
            ->plainTextToken;
        $this->app['auth']->forgetGuards();
        $this->withToken($ownerToken)
            ->getJson('/api/management/laporan-penjualan?dari=2026-11-01&sampai=2026-11-02')
            ->assertJsonPath('data.ringkasan.total_penjualan', 0);
        $this->withToken($ownerToken)
            ->getJson('/api/management/laporan-penjualan?dari=2026-11-03&sampai=2026-11-02')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sampai']);
        $this->withToken($ownerToken)
            ->getJson('/api/management/laporan-penjualan?dari=2026-01-01&sampai=2026-04-04')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sampai']);
    }

    public function test_ekspor_csv_menggunakan_periode_yang_sama_dan_dibatasi_role(): void
    {
        $token = User::factory()->create(['role' => 'admin'])
            ->createToken('admin-laporan-penjualan-csv')
            ->plainTextToken;
        $this->withToken($token)
            ->get('/api/management/laporan-penjualan/export?dari=2026-11-01&sampai=2026-11-30')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    private function buatTransaksi(
        int $pegawaiId,
        int $absensiId,
        string $nomor,
        string $metode,
        int $total,
        string $dibayarPada,
    ): void {
        PosTransaksi::create([
            'id_client' => (string) Str::uuid(),
            'nomor' => $nomor,
            'pegawai_id' => $pegawaiId,
            'absensi_id' => $absensiId,
            'metode_bayar' => $metode,
            'subtotal' => $total,
            'total' => $total,
            'dibayar' => $total,
            'kembalian' => 0,
            'dibayar_pada' => $dibayarPada,
        ]);
    }
}
```

### 2.10 `E:\Ekosistem-kuki\backend-web-katalog\database\migrations\2026_11_20_090000_add_metadata_ai_to_katalog_produk_table.php`

Status: **File baru**

Perubahan: menambah `metadata_ai TEXT NULL` pada `katalog_produk` bila tabel ada dan kolom belum ada. File ini ada di source backend saat dokumentasi dibuat; tidak dipakai oleh alur POS/struk.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('katalog_produk') || Schema::hasColumn('katalog_produk', 'metadata_ai')) {
            return;
        }

        Schema::table('katalog_produk', function (Blueprint $table): void {
            $table->text('metadata_ai')->nullable();
        });
    }

    public function down(): void
    {
    }
};
```

### 2.11 `E:\Ekosistem-kuki\backend-web-katalog\database\migrations\2026_11_20_100000_add_role_to_pos_pegawai_table.php`

Status: **File baru**

Perubahan: menambah kolom `role VARCHAR(20) NOT NULL DEFAULT 'kasir'` setelah `nama` pada `pos_pegawai`.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pos_pegawai') || Schema::hasColumn('pos_pegawai', 'role')) {
            return;
        }

        Schema::table('pos_pegawai', function (Blueprint $table): void {
            $table->string('role', 20)->default('kasir')->after('nama');
        });
    }

    public function down(): void
    {
    }
};
```

### 2.12 `E:\Ekosistem-kuki\backend-web-katalog\database\migrations\2026_11_20_100100_add_audit_to_pos_transaksi_table.php`

Status: **File baru**

Perubahan: menambah kolom audit `status_transaksi`, `jenis_pembatalan`, `alasan_pembatalan`, `dibatalkan_oleh`, `dibatalkan_pada` pada `pos_transaksi`, serta index `dibatalkan_oleh`.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pos_transaksi')) {
            return;
        }

        if (! Schema::hasColumn('pos_transaksi', 'status_transaksi')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->string('status_transaksi', 20)->default('completed')->after('metode_bayar');
            });
        }
        if (! Schema::hasColumn('pos_transaksi', 'jenis_pembatalan')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->string('jenis_pembatalan', 10)->nullable()->after('status_transaksi');
            });
        }
        if (! Schema::hasColumn('pos_transaksi', 'alasan_pembatalan')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->text('alasan_pembatalan')->nullable()->after('jenis_pembatalan');
            });
        }
        if (! Schema::hasColumn('pos_transaksi', 'dibatalkan_oleh')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->unsignedBigInteger('dibatalkan_oleh')->nullable()->after('alasan_pembatalan');
                $table->index('dibatalkan_oleh');
            });
        }
        if (! Schema::hasColumn('pos_transaksi', 'dibatalkan_pada')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->timestamp('dibatalkan_pada')->nullable()->after('dibatalkan_oleh');
            });
        }
    }

    public function down(): void
    {
    }
};
```

### 2.13 `E:\Ekosistem-kuki\backend-web-katalog\tests\Feature\PosOperationalFlowTest.php`

Status: **File baru**

Perubahan: test alur POS, checkout, idempotensi, shift, verifikasi non-tunai, logout, laporan rekap, `stok_minimum`, role, void/retur, audit, dan replay transaksi dibatalkan.

```php
<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\MutasiStok;
use App\Models\PosAbsensi;
use App\Models\PosPegawai;
use App\Models\PosSesi;
use App\Models\PosTransaksi;
use App\Models\produk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PosOperationalFlowTest extends TestCase
{
    use RefreshDatabase;

    private function staffWithToken(
        string $role = 'kasir',
        string $kode = 'KASIR01',
        string $tokenChar = 'b',
    ): array {
        $staff = PosPegawai::create([
            'kode' => $kode,
            'nama' => 'Kasir Uji',
            'role' => $role,
            'pin_hash' => 'hash-uji',
            'aktif' => true,
        ]);
        $token = str_repeat($tokenChar, 64);
        PosSesi::create([
            'pegawai_id' => $staff->id,
            'token_hash' => hash('sha256', $token),
            'kedaluwarsa_pada' => now()->addHour(),
        ]);

        return [$staff, $token];
    }

    private function product(int $stock = 10, int $price = 10000): produk
    {
        $category = kategori::create([
            'nama' => 'Roti',
            'slug' => 'roti-'.Str::lower(Str::random(6)),
        ]);

        return produk::create([
            'nama_produk' => 'Roti Uji',
            'deskripsi_produk' => 'Produk untuk uji alur POS.',
            'harga_produk' => $price,
            'kategori_id' => $category->id,
            'barcode' => 'POS-'.Str::upper(Str::random(8)),
            'stok' => $stock,
            'stok_minimum' => 3,
        ]);
    }

    private function payload(produk $product, string $method = 'tunai', bool $verified = true): array
    {
        return [
            'id_client' => (string) Str::uuid(),
            'items' => [['produk_id' => $product->id, 'jumlah' => 2]],
            'metode_bayar' => $method,
            'dibayar' => 20000,
            'verifikasi_manual' => $verified,
            'jenis_pesanan' => 'takeaway',
        ];
    }

    public function test_checkout_tunai_menurunkan_stok_dan_mencatat_mutasi(): void
    {
        [$staff, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();

        $this->withToken($token)->postJson('/api/pos/transactions', $this->payload($product))
            ->assertCreated()
            ->assertJsonPath('data.total', 20000);

        $this->assertSame(8, $product->fresh()->stok);
        $this->assertSame(1, PosTransaksi::count());
        $this->assertSame(1, MutasiStok::where('jenis', 'penjualan')->count());
        $this->assertSame(1, PosAbsensi::where('pegawai_id', $staff->id)->whereNull('pulang_pada')->count());
    }

    public function test_checkout_tanpa_shift_ditolak(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();

        $this->withToken($token)->postJson('/api/pos/transactions', $this->payload($product))
            ->assertUnprocessable();
        $this->assertSame(0, PosTransaksi::count());
        $this->assertSame(10, $product->fresh()->stok);
    }

    public function test_replay_id_client_sama_mengembalikan_transaksi_awal_tanpa_stok_terpotong_ganda(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $payload = $this->payload($product);

        $first = $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertCreated();
        $replay = $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertOk();

        $this->assertSame($first->json('data.id'), $replay->json('data.id'));
        $this->assertSame(1, PosTransaksi::count());
        $this->assertSame(8, $product->fresh()->stok);
    }

    public function test_replay_id_client_dengan_detail_berbeda_ditolak(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $payload = $this->payload($product);
        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertCreated();

        $payload['items'][0]['jumlah'] = 1;
        $payload['dibayar'] = 10000;
        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertConflict();

        $this->assertSame(1, PosTransaksi::count());
        $this->assertSame(8, $product->fresh()->stok);
    }

    public function test_pembayaran_non_tunai_wajib_diverifikasi_dan_pas(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $payload = $this->payload($product, 'transfer', false);

        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertUnprocessable();
        $this->assertSame(0, PosTransaksi::count());

        $payload['verifikasi_manual'] = true;
        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertCreated();

        $payload['dibayar'] = 25000;
        $payload['id_client'] = (string) Str::uuid();
        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertUnprocessable();
        $this->assertSame(8, $product->fresh()->stok);
    }

    public function test_logout_mencabut_sesi_server(): void
    {
        [, $token] = $this->staffWithToken();

        $this->withToken($token)->getJson('/api/pos/me')->assertOk();
        $this->withToken($token)->postJson('/api/pos/logout')->assertOk();
        $this->withToken($token)->getJson('/api/pos/me')->assertUnauthorized();
    }

    public function test_laporan_memiliki_rekap_kasir_dan_produk(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $this->withToken($token)->postJson('/api/pos/transactions', $this->payload($product))->assertCreated();

        $today = now()->format('Y-m-d');
        $this->withToken($token)->getJson('/api/pos/report?dari='.$today.'&sampai='.$today)
            ->assertOk()
            ->assertJsonPath('data.jumlah_transaksi', 1)
            ->assertJsonPath('data.per_kasir.0.kasir', 'Kasir Uji')
            ->assertJsonPath('data.per_produk.0.nama', 'Roti Uji')
            ->assertJsonPath('data.per_metode.0.metode_bayar', 'tunai');
    }

    public function test_katalog_mengembalikan_stok_minimum(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();

        $this->withToken($token)->getJson('/api/pos/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.stok_minimum', 3);
    }

    public function test_me_mengembalikan_peran_pegawai(): void
    {
        [, $token] = $this->staffWithToken('owner');

        $this->withToken($token)->getJson('/api/pos/me')
            ->assertOk()
            ->assertJsonPath('data.pegawai.role', 'owner');
    }

    public function test_void_oleh_owner_mengembalikan_stok_dan_menulis_audit(): void
    {
        [$kasir, $kasirToken] = $this->staffWithToken();
        [, $ownerToken] = $this->staffWithToken('owner', 'OWNER01', 'c');
        $product = $this->product();
        $this->withToken($kasirToken)->postJson('/api/pos/shift/start')->assertCreated();
        $response = $this->withToken($kasirToken)
            ->postJson('/api/pos/transactions', $this->payload($product))
            ->assertCreated();
        $id = $response->json('data.id');
        $this->assertSame(8, $product->fresh()->stok);

        $this->withToken($kasirToken)->postJson(
            '/api/pos/transactions/'.$id.'/pembatalan',
            ['jenis' => 'void', 'alasan' => 'Salah input pelanggan'],
        )->assertForbidden();

        $this->withToken($ownerToken)->postJson(
            '/api/pos/transactions/'.$id.'/pembatalan',
            ['jenis' => 'void', 'alasan' => 'Salah input pelanggan'],
        )->assertOk()
            ->assertJsonPath('data.status_transaksi', 'void')
            ->assertJsonPath('data.dibatalkan_oleh', 'Kasir Uji')
            ->assertJsonPath('data.jenis_pembatalan', 'void');

        $this->assertSame(10, $product->fresh()->stok);
        $this->assertSame(1, MutasiStok::where('jenis', 'void')->where('perubahan', 2)->count());
        $tx = PosTransaksi::findOrFail($id);
        $this->assertSame($kasir->id, $tx->pegawai_id);
        $this->assertNotNull($tx->dibatalkan_pada);
    }

    public function test_retur_tidak_dihitung_dalam_laporan(): void
    {
        [, $token] = $this->staffWithToken('admin');
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $response = $this->withToken($token)
            ->postJson('/api/pos/transactions', $this->payload($product))
            ->assertCreated();
        $id = $response->json('data.id');
        $today = now()->format('Y-m-d');

        $this->withToken($token)->postJson(
            '/api/pos/transactions/'.$id.'/pembatalan',
            ['jenis' => 'retur', 'alasan' => 'Pelanggan mengembalikan barang'],
        )->assertOk()->assertJsonPath('data.status_transaksi', 'retur');

        $this->withToken($token)->getJson('/api/pos/report?dari='.$today.'&sampai='.$today)
            ->assertOk()
            ->assertJsonPath('data.jumlah_transaksi', 0)
            ->assertJsonPath('data.total_penjualan', 0);
        $this->assertSame(10, $product->fresh()->stok);
    }

    public function test_replay_transaksi_yang_sudah_dibatalkan_ditolak(): void
    {
        [, $token] = $this->staffWithToken('owner');
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $payload = $this->payload($product);
        $response = $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertCreated();
        $id = $response->json('data.id');

        $this->withToken($token)->postJson(
            '/api/pos/transactions/'.$id.'/pembatalan',
            ['jenis' => 'void', 'alasan' => 'Transaksi dibatalkan'],
        )->assertOk();

        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertConflict();
        $this->assertSame(1, PosTransaksi::count());
    }
}
```

### 2.14 `E:\Ekosistem-kuki\backend-web-katalog\tests\Feature\PosPegawaiManagementTest.php`

Status: **File baru**

Perubahan: test manajemen pegawai, count transaksi/shift, edit kode/nama/role, duplikat kode, nonaktif tanpa hapus riwayat + revoke sesi, login ditolak, ganti PIN hash + sesi lama dicabut + PIN baru login.

```php
<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\PosAbsensi;
use App\Models\PosPegawai;
use App\Models\PosSesi;
use App\Models\PosTransaksi;
use App\Models\produk;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PosPegawaiManagementTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return User::factory()->create(['role' => 'admin'])
            ->createToken('pegawai-management')
            ->plainTextToken;
    }

    private function buatPegawaiViaApi(string $token, string $kode, string $pin = '123456'): array
    {
        $response = $this->withToken($token)->postJson('/api/pos/admin/pegawai', [
            'kode' => $kode,
            'nama' => 'Kasir '.$kode,
            'pin' => $pin,
        ])->assertCreated();

        return $response->json('data');
    }

    private function sesiPos(PosPegawai $pegawai): string
    {
        $token = str_repeat('d', 64);
        PosSesi::create([
            'pegawai_id' => $pegawai->id,
            'token_hash' => hash('sha256', $token),
            'kedaluwarsa_pada' => now()->addHour(),
        ]);

        return $token;
    }

    public function test_admin_dapat_melihat_mengubah_dan_menonaktifkan_pegawai_tanpa_menghapus_riwayat(): void
    {
        $admin = $this->adminToken();
        $pegawai = $this->buatPegawaiViaApi($admin, 'KASIR01');
        $model = PosPegawai::findOrFail($pegawai['id']);
        $posToken = $this->sesiPos($model);

        $kategori = kategori::create([
            'nama' => 'Roti',
            'slug' => 'roti-'.Str::lower(Str::random(6)),
        ]);
        produk::create([
            'nama_produk' => 'Roti Uji',
            'deskripsi_produk' => 'Produk untuk uji manajemen pegawai.',
            'harga_produk' => 10000,
            'kategori_id' => $kategori->id,
            'barcode' => 'PEG-'.Str::upper(Str::random(8)),
            'stok' => 5,
        ]);
        $shift = PosAbsensi::create([
            'pegawai_id' => $model->id,
            'masuk_pada' => now()->subHour(),
        ]);
        PosTransaksi::create([
            'id_client' => (string) Str::uuid(),
            'nomor' => 'KP-UJI-0001',
            'pegawai_id' => $model->id,
            'absensi_id' => $shift->id,
            'metode_bayar' => 'tunai',
            'subtotal' => 10000,
            'total' => 10000,
            'dibayar' => 10000,
            'kembalian' => 0,
            'dibayar_pada' => now(),
        ]);

        $this->withToken($admin)->getJson('/api/pos/admin/pegawai')
            ->assertOk()
            ->assertJsonPath('data.0.jumlah_transaksi', 1)
            ->assertJsonPath('data.0.jumlah_shift', 1);

        $this->withToken($admin)->patchJson('/api/pos/admin/pegawai/'.$model->id, [
            'kode' => 'kasir-01',
            'nama' => 'Kasir Utama',
            'role' => 'owner',
        ])->assertOk()
            ->assertJsonPath('data.kode', 'KASIR-01')
            ->assertJsonPath('data.nama', 'Kasir Utama')
            ->assertJsonPath('data.role', 'owner');

        $this->withToken($admin)->postJson('/api/pos/admin/pegawai', [
            'kode' => 'KASIR02',
            'nama' => 'Kasir Dua',
            'pin' => '123456',
        ])->assertCreated();
        $this->withToken($admin)->patchJson('/api/pos/admin/pegawai/'.$model->id, [
            'kode' => 'KASIR02',
        ])->assertUnprocessable()->assertJsonValidationErrors(['kode']);

        $this->withToken($posToken)->getJson('/api/pos/me')->assertOk();
        $this->withToken($admin)->deleteJson('/api/pos/admin/pegawai/'.$model->id)
            ->assertOk()
            ->assertJsonPath('data.pegawai.aktif', false)
            ->assertJsonPath('data.pegawai.jumlah_transaksi', 1);

        $this->assertDatabaseHas('pos_pegawai', [
            'id' => $model->id,
            'aktif' => false,
            'kode' => 'KASIR-01',
        ]);
        $this->assertSame(1, PosTransaksi::where('pegawai_id', $model->id)->count());
        $this->assertSame(1, PosAbsensi::where('pegawai_id', $model->id)->count());
        $this->assertSame(0, PosSesi::where('pegawai_id', $model->id)->count());
        $this->withToken($posToken)->getJson('/api/pos/me')->assertUnauthorized();
        $this->postJson('/api/pos/login', [
            'kode' => 'KASIR-01',
            'pin' => '123456',
        ])->assertUnauthorized();
    }

    public function test_ganti_pin_menggunakan_hash_mencabut_sesi_dan_pin_baru_dapat_login(): void
    {
        $admin = $this->adminToken();
        $pegawai = $this->buatPegawaiViaApi($admin, 'KASIRPIN', '123456');
        $model = PosPegawai::findOrFail($pegawai['id']);
        $posToken = $this->sesiPos($model);

        $this->withToken($admin)->patchJson('/api/pos/admin/pegawai/'.$model->id.'/pin', [
            'pin' => 'abc123',
        ])->assertUnprocessable()->assertJsonValidationErrors(['pin']);

        $this->withToken($admin)->patchJson('/api/pos/admin/pegawai/'.$model->id.'/pin', [
            'pin' => '654321',
        ])->assertOk()
            ->assertJsonPath('data.message', 'PIN diubah. Semua sesi lama telah dicabut.');

        $this->assertSame(0, PosSesi::where('pegawai_id', $model->id)->count());
        $this->assertTrue(password_verify('654321', $model->fresh()->pin_hash));
        $this->withToken($posToken)->getJson('/api/pos/me')->assertUnauthorized();
        $this->postJson('/api/pos/login', [
            'kode' => 'KASIRPIN',
            'pin' => '123456',
        ])->assertUnauthorized();
        $this->postJson('/api/pos/login', [
            'kode' => 'KASIRPIN',
            'pin' => '654321',
        ])->assertOk()->assertJsonPath('data.pegawai.kode', 'KASIRPIN');
    }
}
```

---

## 3. Migration, perubahan database, dan SQL phpMyAdmin

### 3.1 `2026_11_20_100000_add_role_to_pos_pegawai_table.php`

Tabel: `pos_pegawai`

Kolom baru:

- `role VARCHAR(20) NOT NULL DEFAULT 'kasir'` setelah `nama`.

Tujuan: membedakan `kasir`, `admin`, `owner`. Void/retur hanya untuk `admin`/`owner`.

SQL phpMyAdmin:

```sql
ALTER TABLE `pos_pegawai`
  ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'kasir' AFTER `nama`;
```

Jika kolom sudah ada, jalankan pemeriksaan ini dan lewati `ALTER`:

```sql
SHOW COLUMNS FROM `pos_pegawai` LIKE 'role';
```

Verifikasi:

```sql
SELECT `id`, `kode`, `nama`, `role`, `aktif` FROM `pos_pegawai` ORDER BY `nama`;
```

Tidak ada `UPDATE` data lama yang wajib; semua pegawai lama otomatis menjadi `kasir`.

### 3.2 `2026_11_20_100100_add_audit_to_pos_transaksi_table.php`

Tabel: `pos_transaksi`

Kolom baru:

- `status_transaksi VARCHAR(20) NOT NULL DEFAULT 'completed'` setelah `metode_bayar`
- `jenis_pembatalan VARCHAR(10) NULL` setelah `status_transaksi`
- `alasan_pembatalan TEXT NULL` setelah `jenis_pembatalan`
- `dibatalkan_oleh BIGINT UNSIGNED NULL` setelah `alasan_pembatalan`
- index `dibatalkan_oleh`
- `dibatalkan_pada TIMESTAMP NULL DEFAULT NULL` setelah `dibatalkan_oleh`

Tujuan: menyimpan status transaksi `completed`/`void`/`retur`, alasan, actor, dan waktu pembatalan. Tidak ada Foreign Key baru yang dibuat oleh migration ini.

SQL phpMyAdmin:

```sql
ALTER TABLE `pos_transaksi`
  ADD COLUMN `status_transaksi` VARCHAR(20) NOT NULL DEFAULT 'completed' AFTER `metode_bayar`,
  ADD COLUMN `jenis_pembatalan` VARCHAR(10) NULL DEFAULT NULL AFTER `status_transaksi`,
  ADD COLUMN `alasan_pembatalan` TEXT NULL AFTER `jenis_pembatalan`,
  ADD COLUMN `dibatalkan_oleh` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `alasan_pembatalan`,
  ADD INDEX `pos_transaksi_dibatalkan_oleh_index` (`dibatalkan_oleh`),
  ADD COLUMN `dibatalkan_pada` TIMESTAMP NULL DEFAULT NULL AFTER `dibatalkan_oleh`;
```

Verifikasi:

```sql
SHOW COLUMNS FROM `pos_transaksi` WHERE `Field` IN (
  'status_transaksi', 'jenis_pembatalan', 'alasan_pembatalan', 'dibatalkan_oleh', 'dibatalkan_pada'
);
```

Pastikan transaksi lama terbaca selesai:

```sql
SELECT COUNT(*) AS belum_completed
FROM `pos_transaksi`
WHERE `status_transaksi` IS NULL OR `status_transaksi` = '';
```

Hasil harus `0`.

### 3.3 `2026_11_20_090000_add_metadata_ai_to_katalog_produk_table.php`

Tabel: `katalog_produk`

Kolom baru:

- `metadata_ai TEXT NULL`

Tujuan: menyimpan metadata AI katalog bila fitur tersebut dipakai. Tidak dipakai alur POS/struk.

SQL phpMyAdmin:

```sql
ALTER TABLE `katalog_produk`
  ADD COLUMN `metadata_ai` TEXT NULL AFTER `gambar_produk`;
```

Jika struktur tabel hosting berbeda dan kolom `gambar_produk` tidak ada, gunakan:

```sql
ALTER TABLE `katalog_produk`
  ADD COLUMN `metadata_ai` TEXT NULL;
```

Cek dulu:

```sql
SHOW COLUMNS FROM `katalog_produk` LIKE 'metadata_ai';
```

### 3.4 `2026_11_12_120000_prepare_hard_delete_produk_with_history.php`

Tabel yang disentuh:

- `opname_stok_detail`
- `mutasi_stok` (jika tabel ada)

Tujuan: histori tetap menyimpan snapshot nama/barcode/ID produk sebelum FK `produk_id` diubah menjadi `SET NULL`, sehingga hard delete produk tidak merusak riwayat.

Perubahan file dibanding commit lama: pada database non-MySQL (SQLite test), migration langsung `return`; tidak ada DDL yang dijalankan.

SQL phpMyAdmin aman untuk MySQL:

**Langkah 1 — cadangan dulu, lalu cek FK. Jalankan ini untuk kedua tabel:**

```sql
SELECT
  k.TABLE_NAME,
  k.CONSTRAINT_NAME,
  r.DELETE_RULE,
  k.COLUMN_NAME,
  k.REFERENCED_TABLE_NAME,
  k.REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.REFERENTIAL_CONSTRAINTS r
  ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
 AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
 AND r.TABLE_NAME = k.TABLE_NAME
WHERE k.TABLE_SCHEMA = DATABASE()
  AND k.TABLE_NAME IN ('opname_stok_detail', 'mutasi_stok')
  AND k.COLUMN_NAME = 'produk_id'
  AND k.REFERENCED_TABLE_NAME = 'katalog_produk';
```

Pastikan untuk setiap tabel:

- tepat 1 FK `produk_id → katalog_produk.id`
- `DELETE_RULE` bukan `CASCADE`

Jika `CASCADE`, jangan lanjut sebelum audit manual.

**Langkah 2 — tambah kolom snapshot:**

```sql
ALTER TABLE `opname_stok_detail`
  ADD COLUMN `produk_id_snapshot` BIGINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN `nama_produk_snapshot` VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN `barcode_snapshot` VARCHAR(100) NULL DEFAULT NULL;

ALTER TABLE `mutasi_stok`
  ADD COLUMN `produk_id_snapshot` BIGINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN `nama_produk_snapshot` VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN `barcode_snapshot` VARCHAR(100) NULL DEFAULT NULL;
```

Jika kolom sudah ada, jalankan `SHOW COLUMNS FROM <tabel> LIKE '...'` dan lewati `ADD COLUMN` yang sudah ada.

**Langkah 3 — backfill data lama:**

```sql
UPDATE `opname_stok_detail` AS h
INNER JOIN `katalog_produk` AS p ON p.id = h.produk_id
SET
  h.produk_id_snapshot = COALESCE(h.produk_id_snapshot, h.produk_id),
  h.nama_produk_snapshot = COALESCE(h.nama_produk_snapshot, p.nama_produk),
  h.barcode_snapshot = COALESCE(h.barcode_snapshot, p.barcode)
WHERE h.produk_id IS NOT NULL;

UPDATE `mutasi_stok` AS h
INNER JOIN `katalog_produk` AS p ON p.id = h.produk_id
SET
  h.produk_id_snapshot = COALESCE(h.produk_id_snapshot, h.produk_id),
  h.nama_produk_snapshot = COALESCE(h.nama_produk_snapshot, p.nama_produk),
  h.barcode_snapshot = COALESCE(h.barcode_snapshot, p.barcode)
WHERE h.produk_id IS NOT NULL;
```

**Langkah 4 — verifikasi snapshot nama lengkap. Hasil harus `0` untuk kedua query:**

```sql
SELECT COUNT(*) AS missing_snapshot
FROM `opname_stok_detail`
WHERE `produk_id` IS NOT NULL AND `nama_produk_snapshot` IS NULL;

SELECT COUNT(*) AS missing_snapshot
FROM `mutasi_stok`
WHERE `produk_id` IS NOT NULL AND `nama_produk_snapshot` IS NULL;
```

**Langkah 5 — ubah FK menjadi `ON DELETE SET NULL`.**

Ambil nama constraint asli dari Langkah 1, lalu ganti placeholder di bawah. Pertahankan nama constraint yang sudah ada agar tidak menimbulkan constraint duplicate.

```sql
-- Ganti `fk_opname_stok_detail_produk` dengan CONSTRAINT_NAME asli untuk opname_stok_detail.
ALTER TABLE `opname_stok_detail`
  DROP FOREIGN KEY `fk_opname_stok_detail_produk`;

ALTER TABLE `opname_stok_detail`
  MODIFY COLUMN `produk_id` BIGINT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE `opname_stok_detail`
  ADD CONSTRAINT `fk_opname_stok_detail_produk`
  FOREIGN KEY (`produk_id`) REFERENCES `katalog_produk` (`id`)
  ON DELETE SET NULL;

-- Ganti `fk_mutasi_stok_produk` dengan CONSTRAINT_NAME asli untuk mutasi_stok.
ALTER TABLE `mutasi_stok`
  DROP FOREIGN KEY `fk_mutasi_stok_produk`;

ALTER TABLE `mutasi_stok`
  MODIFY COLUMN `produk_id` BIGINT UNSIGNED NULL DEFAULT NULL;

ALTER TABLE `mutasi_stok`
  ADD CONSTRAINT `fk_mutasi_stok_produk`
  FOREIGN KEY (`produk_id`) REFERENCES `katalog_produk` (`id`)
  ON DELETE SET NULL;
```

Verifikasi akhir:

```sql
SELECT
  k.TABLE_NAME,
  k.CONSTRAINT_NAME,
  r.DELETE_RULE,
  c.IS_NULLABLE
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.REFERENTIAL_CONSTRAINTS r
  ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
 AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
 AND r.TABLE_NAME = k.TABLE_NAME
JOIN information_schema.COLUMNS c
  ON c.TABLE_SCHEMA = k.TABLE_SCHEMA
 AND c.TABLE_NAME = k.TABLE_NAME
 AND c.COLUMN_NAME = k.COLUMN_NAME
WHERE k.TABLE_SCHEMA = DATABASE()
  AND k.TABLE_NAME IN ('opname_stok_detail', 'mutasi_stok')
  AND k.COLUMN_NAME = 'produk_id'
  AND k.REFERENCED_TABLE_NAME = 'katalog_produk';
```

`DELETE_RULE` harus `SET NULL`, `IS_NULLABLE` harus `YES`.

Tidak ada SQL rollback otomatis untuk migration ini. `down()` sengaja melempar error karena FK yang sudah `NULL` akibat hard delete tidak bisa dipulihkan tanpa backup.

---

## 4. Urutan penerapan aman ke database hosting

1. Backup database hosting.
2. Pastikan `routes/api.php` hanya memiliki satu `require __DIR__ . '/pos.php';` di akhir file.
3. Terapkan perubahan kode Laravel pada path yang tercantum di bagian 2.
4. Terapkan SQL/migration database dengan urutan ini:

| Urutan | Migration / SQL | Wajib? | Catatan |
|---:|---|---|---|
| 1 | `2026_11_12_120000_prepare_hard_delete_produk_with_history.php` | Jika belum pernah diterapkan | Hanya MySQL. Ikuti Langkah 1–5 di §3.4. Jangan lanjut bila FK `CASCADE`. |
| 2 | `2026_11_20_090000_add_metadata_ai_to_katalog_produk_table.php` | Hanya jika fitur metadata AI dipakai | Tidak dipakai POS. Boleh dilewati bila kolom sudah ada. |
| 3 | `2026_11_20_100000_add_role_to_pos_pegawai_table.php` | Wajib untuk role | Data lama otomatis `kasir`. |
| 4 | `2026_11_20_100100_add_audit_to_pos_transaksi_table.php` | Wajib untuk void/retur | Data lama otomatis `completed`. |

5. Setelah kode dan database sesuai, verify manual:
   - `GET /api/pos/me` mengembalikan `role`.
   - `GET /api/pos/catalog` mengembalikan `stok_minimum`.
   - `POST /api/pos/transactions/{transaksi}/pembatalan` menolak `kasir` dan mengembalikan stok untuk `admin`/`owner`.
   - `GET /api/management/laporan-penjualan` tidak menghitung transaksi `void`/`retur`.

Tidak ada klaim bahwa perubahan ini sudah diterapkan di hosting. Penerapan dilakukan manual oleh Anda.
