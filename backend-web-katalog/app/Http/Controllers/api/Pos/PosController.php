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
use Illuminate\Validation\Rule;
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
        return $this->response(produk::active()->with('kategori')->orderBy('nama_produk')->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'nama' => $p->nama_produk,
                'harga' => (int) round((float) $p->harga_produk),
                'stok' => (int) ($p->stok ?? 0),
                'stok_minimum' => (int) ($p->stok_minimum ?? 0),
                'barcode' => $p->barcode,
                'kategori' => $p->kategori?->nama_kategori ?? $p->kategori?->nama ?? 'Lainnya',
                'gambar' => $p->gambar_produk ? asset('storage/'.ltrim($p->gambar_produk, '/')) : null,
                'aktif' => true,
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
            'items.*.produk_id' => ['required', 'integer', 'distinct', Rule::exists('katalog_produk', 'id')->where(fn ($query) => $query->where('aktif', true))],
            'items.*.jumlah' => ['required', 'integer', 'min:1', 'max:1000'],
            'metode_bayar' => ['required', 'in:tunai,qris,transfer'],
            'dibayar' => ['required', 'integer', 'min:0', 'max:999999999999'],
            'verifikasi_manual' => ['nullable', 'boolean'],
            'jenis_pesanan' => ['required', 'in:takeaway,dine_in'],
            'nomor_meja' => ['nullable', 'string', 'max:30'],
            'nama_pelanggan' => ['nullable', 'string', 'max:120'],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ], [
            'items.*.produk_id.exists' => 'Produk yang dipilih tidak tersedia atau sudah diarsipkan.',
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
                $products = produk::active()->whereIn('id', $quantities->keys())
                    ->orderBy('id')->lockForUpdate()->get();
                if ($products->count() !== $quantities->count()) {
                    throw ValidationException::withMessages(['items' => 'Ada produk yang tidak tersedia atau sudah diarsipkan.']);
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
