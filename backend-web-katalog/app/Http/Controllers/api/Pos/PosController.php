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

    private function response($data, int $status = 200): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $data], $status);
    }

    public function buatPegawai(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kode' => ['required', 'string', 'min:3', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/', 'unique:pos_pegawai,kode'],
            'nama' => ['required', 'string', 'min:2', 'max:120'],
            'pin' => ['required', 'string', 'regex:/^[0-9]{4,8}$/'],
        ]);
        $staff = PosPegawai::create([
            'kode' => Str::upper($data['kode']), 'nama' => $data['nama'],
            'pin_hash' => Hash::make($data['pin']), 'aktif' => true,
        ]);

        return $this->response($staff->only('id', 'kode', 'nama', 'aktif'), 201);
    }

    public function daftarPegawai(): JsonResponse
    {
        return $this->response(PosPegawai::orderBy('nama')->get(['id', 'kode', 'nama', 'aktif']));
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
            'pegawai' => $staff->only('id', 'kode', 'nama'),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->response(['pegawai' => $this->staff($request)->only('id', 'kode', 'nama')]);
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
        $existing = PosTransaksi::with(['items', 'pegawai'])->where('id_client', $input['id_client'])->first();
        if ($existing) {
            if ((int) $existing->pegawai_id !== (int) $staff->id) {
                return response()->json(['message' => 'ID transaksi sudah digunakan.'], 409);
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

                return $this->response($this->txJson($tx->load(['items', 'pegawai'])), 201);
            }, 3);
        } catch (UniqueConstraintViolationException $e) {
            // Perlindungan apabila klien mengirim request id_client sama secara bersamaan.
            $found = PosTransaksi::with(['items', 'pegawai'])->where('id_client', $input['id_client'])->first();
            if ($found && (int) $found->pegawai_id === (int) $staff->id) {
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
        ]);
        $query = PosTransaksi::with(['pegawai', 'items'])->orderByDesc('id');
        if (isset($filter['dari'])) {
            $query->whereDate('dibayar_pada', '>=', $filter['dari']);
        }
        if (isset($filter['sampai'])) {
            $query->whereDate('dibayar_pada', '<=', $filter['sampai']);
        }
        $page = $query->paginate(30);

        return $this->response([
            'items' => collect($page->items())->map(fn ($t) => $this->txJson($t))->values(),
            'page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(),
        ]);
    }

    public function transactionDetail(PosTransaksi $transaksi): JsonResponse
    {
        return $this->response($this->txJson($transaksi->load(['items', 'pegawai'])));
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
            ->where('dibayar_pada', '>=', $from)
            ->where('dibayar_pada', '<', $until);

        return $this->response([
            'periode' => $filter,
            'jumlah_transaksi' => (clone $query)->count(),
            'total_penjualan' => (int) (clone $query)->sum('total'),
            'per_metode' => (clone $query)->selectRaw('metode_bayar, COUNT(*) as jumlah, SUM(total) as total')
                ->groupBy('metode_bayar')->get(),
        ]);
    }
}
