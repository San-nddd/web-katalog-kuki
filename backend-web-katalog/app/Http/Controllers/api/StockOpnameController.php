<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MutasiStok;
use App\Models\OpnameStok;
use App\Models\OpnameStokDetail;
use App\Models\produk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Stock opname per sesi; GET dapat dibaca Owner, semua mutasi hanya Admin. */
class StockOpnameController extends Controller
{
    private const MAX_STOK = 4294967295;

    public function index(Request $request): JsonResponse
    {
        $filter = $request->validate([
            'status' => ['nullable', 'in:draft,selesai,dibatalkan'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = OpnameStok::query()->with(['pembuat:id,name', 'penyelesai:id,name'])->withCount('detail');
        if (isset($filter['status'])) $query->where('status', $filter['status']);
        $page = $query->orderByDesc('id')->paginate(15);
        return response()->json(['success' => true, 'data' => [
            'items' => $page->getCollection()->map(fn (OpnameStok $opname) => $this->ringkasan($opname))->values(),
            'page' => $page->currentPage(),
            'last_page' => $page->lastPage(),
            'total' => $page->total(),
        ]]);
    }

    public function show(OpnameStok $opnameStok): JsonResponse
    {
        $opnameStok->load(['pembuat:id,name', 'penyelesai:id,name', 'detail.produk:id,nama_produk,barcode,stok']);
        return response()->json(['success' => true, 'data' => [
            ...$this->ringkasan($opnameStok),
            'catatan' => $opnameStok->catatan,
            'items' => $opnameStok->detail->sortBy('produk_id')->values()->map(fn (OpnameStokDetail $item) => [
                'id' => $item->id,
                'produk_id' => $item->produk_id,
                'nama_produk' => $item->produk?->nama_produk ?? 'Produk tidak ditemukan',
                'barcode' => $item->produk?->barcode,
                'stok_sistem' => $item->stok_sistem,
                'stok_saat_ini' => $item->produk?->stok,
                'stok_fisik' => $item->stok_fisik,
                'selisih' => $item->stok_fisik === null ? null : $item->stok_fisik - $item->stok_sistem,
                'catatan' => $item->catatan,
            ]),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'produk_ids' => ['required', 'array', 'min:1', 'max:100'],
            'produk_ids.*' => ['required', 'integer', 'distinct', 'exists:katalog_produk,id'],
            'catatan' => ['nullable', 'string', 'max:1000'],
        ]);
        $ids = collect($data['produk_ids'])->map(fn ($id) => (int) $id)->sort()->values()->all();
        $opname = DB::transaction(function () use ($request, $ids, $data) {
            $items = produk::query()->whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get(['id', 'stok']);
            if ($items->count() !== count($ids)) throw ValidationException::withMessages(['produk_ids' => ['Ada produk yang tidak ditemukan.']]);
            $opname = OpnameStok::create([
                'status' => 'draft',
                'catatan' => trim((string) ($data['catatan'] ?? '')) ?: null,
                'dibuat_oleh_id' => $request->user()?->getAuthIdentifier(),
            ]);
            foreach ($items as $item) {
                OpnameStokDetail::create([
                    'opname_id' => $opname->id,
                    'produk_id' => $item->id,
                    'stok_sistem' => (int) ($item->stok ?? 0),
                ]);
            }
            return $opname;
        });
        return response()->json(['success' => true, 'message' => 'Sesi stock opname dibuat.', 'data' => ['id' => $opname->id]], 201);
    }

    /** Simpan penghitungan fisik; belum mengubah stok sistem. */
    public function update(Request $request, OpnameStok $opnameStok): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.id' => ['required', 'integer', 'distinct'],
            'items.*.stok_fisik' => ['required', 'integer', 'min:0', 'max:'.self::MAX_STOK],
            'items.*.catatan' => ['nullable', 'string', 'max:400'],
        ]);
        DB::transaction(function () use ($opnameStok, $data) {
            $opname = OpnameStok::query()->lockForUpdate()->findOrFail($opnameStok->id);
            if ($opname->status !== 'draft') throw ValidationException::withMessages(['items' => ['Sesi opname sudah selesai atau dibatalkan.']]);
            $rows = OpnameStokDetail::query()->where('opname_id', $opname->id)->lockForUpdate()->get()->keyBy('id');
            if ($rows->count() !== count($data['items'])) {
                throw ValidationException::withMessages(['items' => ['Semua produk dalam sesi harus dihitung dan disimpan bersama.']]);
            }
            foreach ($data['items'] as $input) {
                $row = $rows->get((int) $input['id']);
                if (! $row) throw ValidationException::withMessages(['items' => ['Ada detail opname yang tidak valid.']]);
                $row->update([
                    'stok_fisik' => (int) $input['stok_fisik'],
                    'catatan' => trim((string) ($input['catatan'] ?? '')) ?: null,
                ]);
            }
        });
        return response()->json(['success' => true, 'message' => 'Hasil hitung fisik disimpan; stok sistem belum berubah.']);
    }

    /** Posting atomik; tolak jika stok berubah sejak sesi dibuat. */
    public function selesai(Request $request, OpnameStok $opnameStok): JsonResponse
    {
        $changed = DB::transaction(function () use ($request, $opnameStok) {
            $opname = OpnameStok::query()->lockForUpdate()->findOrFail($opnameStok->id);
            if ($opname->status !== 'draft') throw ValidationException::withMessages(['status' => ['Sesi sudah diproses.']]);
            $details = OpnameStokDetail::query()->where('opname_id', $opname->id)->orderBy('produk_id')->lockForUpdate()->get();
            if ($details->isEmpty() || $details->contains(fn ($row) => $row->stok_fisik === null)) {
                throw ValidationException::withMessages(['stok_fisik' => ['Semua stok fisik harus diisi dan disimpan sebelum finalisasi.']]);
            }
            $items = produk::query()->whereIn('id', $details->pluck('produk_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $total = 0;
            foreach ($details as $row) {
                $item = $items->get($row->produk_id);
                if (! $item || (int) ($item->stok ?? 0) !== (int) $row->stok_sistem) {
                    throw ValidationException::withMessages(['stok' => [
                        'Stok berubah setelah draft dibuat (produk ID '.$row->produk_id.'). Batalkan sesi dan buat opname baru agar data aman.',
                    ]]);
                }
            }
            foreach ($details as $row) {
                $item = $items->get($row->produk_id);
                $sebelum = (int) $item->stok;
                $sesudah = (int) $row->stok_fisik;
                $selisih = $sesudah - $sebelum;
                if ($selisih === 0) continue; // Tanpa perubahan stok, tak perlu menulis mutasi.
                $item->stok = $sesudah;
                $item->save();
                MutasiStok::create([
                    'produk_id' => $item->id,
                    'pengguna_id' => $request->user()?->getAuthIdentifier(),
                    'jenis' => 'opname',
                    'perubahan' => $selisih,
                    'stok_sebelum' => $sebelum,
                    'stok_sesudah' => $sesudah,
                    'keterangan' => 'Selisih stock opname #'.$opname->id.($row->catatan ? ': '.$row->catatan : ''),
                    'referensi_tipe' => 'opname_stok',
                    'referensi_id' => $opname->id,
                ]);
                $total++;
            }
            $opname->update([
                'status' => 'selesai',
                'diselesaikan_oleh_id' => $request->user()?->getAuthIdentifier(),
                'diselesaikan_pada' => now('Asia/Jakarta'),
            ]);
            return $total;
        });
        return response()->json(['success' => true, 'message' => "Stock opname diselesaikan. {$changed} produk mengalami perubahan stok."]);
    }

    public function batalkan(OpnameStok $opnameStok): JsonResponse
    {
        DB::transaction(function () use ($opnameStok) {
            $opname = OpnameStok::query()->lockForUpdate()->findOrFail($opnameStok->id);
            if ($opname->status !== 'draft') throw ValidationException::withMessages(['status' => ['Hanya sesi draft yang bisa dibatalkan.']]);
            $opname->update(['status' => 'dibatalkan']);
        });
        return response()->json(['success' => true, 'message' => 'Sesi opname dibatalkan. Stok tidak berubah.']);
    }

    /** Pengeluaran dari stok aktif untuk produk rusak/kedaluwarsa, melalui satu transaksi. */
    public function pengeluaran(Request $request): JsonResponse
    {
        $data = $request->validate([
            'produk_id' => ['required', 'integer', 'exists:katalog_produk,id'],
            'jenis' => ['required', 'in:rusak,kedaluwarsa'],
            'stok_sebelum' => ['required', 'integer', 'min:0', 'max:'.self::MAX_STOK],
            'jumlah' => ['required', 'integer', 'min:1', 'max:'.self::MAX_STOK],
            'keterangan' => ['required', 'string', 'min:8', 'max:450'],
            'tanggal_kedaluwarsa' => ['nullable', 'date_format:Y-m-d', 'required_if:jenis,kedaluwarsa'],
        ]);
        $row = DB::transaction(function () use ($request, $data) {
            $item = produk::query()->lockForUpdate()->findOrFail($data['produk_id']);
            $sebelum = (int) ($item->stok ?? 0);
            if ($sebelum !== (int) $data['stok_sebelum']) throw ValidationException::withMessages(['stok_sebelum' => ['Stok berubah, muat ulang sebelum menyimpan.']]);
            $jumlah = (int) $data['jumlah'];
            if ($jumlah > $sebelum) throw ValidationException::withMessages(['jumlah' => ['Jumlah tidak boleh melebihi stok tersedia.']]);
            $sesudah = $sebelum - $jumlah;
            $item->stok = $sesudah;
            $item->save();
            $keterangan = trim($data['keterangan']);
            if ($data['jenis'] === 'kedaluwarsa') $keterangan .= ' | Kedaluwarsa: '.$data['tanggal_kedaluwarsa'];
            return MutasiStok::create([
                'produk_id' => $item->id,
                'pengguna_id' => $request->user()?->getAuthIdentifier(),
                'jenis' => $data['jenis'],
                'perubahan' => -$jumlah,
                'stok_sebelum' => $sebelum,
                'stok_sesudah' => $sesudah,
                'keterangan' => $keterangan,
            ]);
        });
        return response()->json(['success' => true, 'message' => 'Pengeluaran barang tersimpan dan tercatat pada Mutasi Stok.', 'data' => ['id' => $row->id]], 201);
    }

    /** Ringkasan pengeluaran selama bulan berjalan (tanggal WIB). */
    public function ringkasanPengeluaran(): JsonResponse
    {
        $mulai = now('Asia/Jakarta')->startOfMonth()->toDateString();
        $selesai = now('Asia/Jakarta')->toDateString();
        $rows = MutasiStok::query()
            ->selectRaw('jenis, COUNT(*) AS jumlah_kejadian, COALESCE(SUM(-perubahan), 0) AS jumlah_unit')
            ->whereIn('jenis', ['rusak', 'kedaluwarsa'])
            ->whereDate('created_at', '>=', $mulai)
            ->whereDate('created_at', '<=', $selesai)
            ->groupBy('jenis')->get()->keyBy('jenis');
        return response()->json(['success' => true, 'data' => [
            'mulai' => $mulai,
            'selesai' => $selesai,
            'rusak' => ['unit' => (int) ($rows->get('rusak')?->jumlah_unit ?? 0), 'kejadian' => (int) ($rows->get('rusak')?->jumlah_kejadian ?? 0)],
            'kedaluwarsa' => ['unit' => (int) ($rows->get('kedaluwarsa')?->jumlah_unit ?? 0), 'kejadian' => (int) ($rows->get('kedaluwarsa')?->jumlah_kejadian ?? 0)],
        ]]);
    }

    private function ringkasan(OpnameStok $opname): array
    {
        return [
            'id' => $opname->id,
            'status' => $opname->status,
            'jumlah_produk' => $opname->detail_count ?? $opname->detail?->count() ?? 0,
            'dibuat_oleh' => $opname->pembuat?->name ?? 'Sistem',
            'diselesaikan_oleh' => $opname->penyelesai?->name,
            'dibuat_pada' => $opname->created_at?->toIso8601String(),
            'diselesaikan_pada' => $opname->diselesaikan_pada?->toIso8601String(),
        ];
    }
}
