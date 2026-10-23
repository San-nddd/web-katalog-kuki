<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProduksiHarian;
use App\Models\produk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProduksiHarianController extends Controller
{
    private const TIMEZONE = 'Asia/Jakarta';
    private const MAX_JUMLAH_BATCH = 10000;
    private const MAX_CETAK_SESI = 500;
    private const MAX_STOK = 4294967295; // stok INT UNSIGNED (jika skema berbeda, sesuaikan)

    /** Ringkasan produksi harian; default hari ini zona WIB. */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tanggal' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $tanggal = $validated['tanggal'] ?? now(self::TIMEZONE)->toDateString();

        $records = ProduksiHarian::query()
            ->with(['produk:id,nama_produk,barcode,stok,kategori_id', 'produk.kategori:id,nama'])
            ->whereDate('tanggal_produksi', $tanggal)
            ->orderBy('produk_id')
            ->get();

        $data = $records->map(function (ProduksiHarian $batch) {
            $belum = max(0, $batch->jumlah_produksi - $batch->jumlah_label_tercetak);
            $stok = (int) ($batch->produk?->stok ?? 0);
            return [
                'id' => $batch->id,
                'produk_id' => $batch->produk_id,
                'nama_produk' => $batch->produk?->nama_produk,
                'barcode' => $batch->produk?->barcode,
                'nama_kategori' => $batch->produk?->kategori?->nama,
                'stok_saat_ini' => $stok,
                'tanggal_produksi' => $batch->tanggal_produksi->format('Y-m-d'),
                'jumlah_produksi' => $batch->jumlah_produksi,
                'jumlah_label_tercetak' => $batch->jumlah_label_tercetak,
                'jumlah_belum_dicetak' => $belum,
                'jumlah_siap_cetak' => min($belum, max(0, $stok)),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'tanggal' => $tanggal,
                'tanggal_hari_ini' => now(self::TIMEZONE)->toDateString(),
                'items' => $data,
                'total_produksi' => $data->sum('jumlah_produksi'),
                'total_belum_dicetak' => $data->sum('jumlah_belum_dicetak'),
            ],
        ]);
    }

    /** Catat produksi BARU dan tambah stok produk sekali dalam transaksi DB. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'produk_id' => ['required', 'integer', 'exists:katalog_produk,id'],
            'jumlah' => ['required', 'integer', 'min:1', 'max:'.self::MAX_JUMLAH_BATCH],
        ]);

        $tanggal = now(self::TIMEZONE)->toDateString();
        $produkId = (int) $data['produk_id'];
        $jumlah = (int) $data['jumlah'];

        $batch = DB::transaction(function () use ($tanggal, $produkId, $jumlah) {
            // Kunci produk lebih dahulu agar penambahan untuk SKU yang sama terserialisasi.
            $item = produk::query()->lockForUpdate()->findOrFail($produkId);
            $stokSaatIni = (int) ($item->stok ?? 0);
            if ($stokSaatIni < 0 || $stokSaatIni > self::MAX_STOK - $jumlah) {
                throw ValidationException::withMessages([
                    'jumlah' => ['Jumlah produksi akan membuat stok melebihi kapasitas kolom.'],
                ]);
            }

            $batch = ProduksiHarian::query()
                ->where('produk_id', $produkId)
                ->where('tanggal_produksi', $tanggal)
                ->lockForUpdate()
                ->first();

            if (! $batch) {
                $batch = ProduksiHarian::create([
                    'produk_id' => $produkId,
                    'tanggal_produksi' => $tanggal,
                    'jumlah_produksi' => 0,
                    'jumlah_label_tercetak' => 0,
                ]);
            }

            if ($batch->jumlah_produksi > self::MAX_STOK - $jumlah) {
                throw ValidationException::withMessages([
                    'jumlah' => ['Total produksi hari ini terlalu besar.'],
                ]);
            }

            $batch->increment('jumlah_produksi', $jumlah);
            $item->increment('stok', $jumlah);

            return $batch->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => "Produksi {$jumlah} pcs berhasil dicatat; stok produk bertambah.",
            'data' => $batch,
        ], 201);
    }

    /**
     * Dicatat HANYA setelah Admin memastikan label sungguh tercetak.
     * Browser tidak dapat memverifikasi hasil fisik printer, maka endpoint ini
     * tidak dipanggil otomatis ketika window.print() muncul.
     */
    public function konfirmasiCetak(Request $request, ProduksiHarian $produksiHarian): JsonResponse
    {
        $data = $request->validate([
            'jumlah' => ['required', 'integer', 'min:1', 'max:'.self::MAX_CETAK_SESI],
        ]);
        $jumlah = (int) $data['jumlah'];
        $tanggalHariIni = now(self::TIMEZONE)->toDateString();

        $batch = DB::transaction(function () use ($produksiHarian, $jumlah, $tanggalHariIni) {
            // Urutan lock sama dengan store(): produk lalu baris produksi.
            $produk = produk::query()->lockForUpdate()->findOrFail($produksiHarian->produk_id);
            $row = ProduksiHarian::query()->lockForUpdate()->findOrFail($produksiHarian->id);

            if ($row->tanggal_produksi->format('Y-m-d') !== $tanggalHariIni) {
                throw ValidationException::withMessages([
                    'jumlah' => ['Konfirmasi cetak hanya berlaku untuk produksi hari ini.'],
                ]);
            }

            $sisa = $row->jumlah_produksi - $row->jumlah_label_tercetak;
            $stok = max(0, (int) ($produk->stok ?? 0));
            if ($jumlah > $sisa || $jumlah > $stok) {
                throw ValidationException::withMessages([
                    'jumlah' => ['Jumlah konfirmasi melebihi label tersisa atau stok saat ini. Muat ulang data.'],
                ]);
            }

            $row->increment('jumlah_label_tercetak', $jumlah);
            return $row->fresh();
        });

        return response()->json([
            'success' => true,
            'message' => "Sebanyak {$jumlah} label ditandai sudah tercetak.",
            'data' => $batch,
        ]);
    }
}
