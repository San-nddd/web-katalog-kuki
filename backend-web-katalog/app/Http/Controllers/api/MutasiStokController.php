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
            'jenis' => ['nullable', 'in:stok_awal,produksi,koreksi,opname,rusak,kedaluwarsa'],
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
