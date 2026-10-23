<?php

namespace App\Http\Controllers;

use App\Models\produk;
use App\Models\ProduksiHarian;
use Illuminate\Http\JsonResponse;

class ManagementDashboardController extends Controller
{
    /**
     * Ringkasan read-only untuk Admin / Owner.
     * Tidak mengubah stok, produksi, ataupun jumlah label tercetak.
     */
    public function show(): JsonResponse
    {
        $inventory = produk::query()
            ->selectRaw('COUNT(*) as total_products')
            ->selectRaw('COALESCE(SUM(CASE WHEN stok > 0 THEN 1 ELSE 0 END), 0) as available_products')
            ->selectRaw('COALESCE(SUM(COALESCE(stok, 0)), 0) as total_stock_units')
            ->selectRaw('COALESCE(SUM(CASE WHEN stok > 0 AND stok_minimum > 0 AND stok <= stok_minimum THEN 1 ELSE 0 END), 0) as critical_stock')
            ->selectRaw('COALESCE(SUM(CASE WHEN stok <= 0 THEN 1 ELSE 0 END), 0) as out_of_stock')
            ->first();

        $inventoryItems = produk::query()
            ->select(['id', 'nama_produk', 'stok', 'stok_minimum'])
            ->where(function ($query): void {
                $query->where('stok', '<=', 0)
                    ->orWhere(function ($query): void {
                        $query->where('stok_minimum', '>', 0)
                            ->whereColumn('stok', '<=', 'stok_minimum');
                    });
            })
            ->orderBy('stok')
            ->orderBy('nama_produk')
            ->limit(51)
            ->get();

        $itemsLimited = $inventoryItems->count() > 50;
        $inventoryItems = $inventoryItems
            ->take(50)
            ->map(fn (produk $item): array => [
                'id' => $item->id,
                'name' => $item->nama_produk,
                'stock' => (int) $item->stok,
                'minimum_stock' => (int) $item->stok_minimum,
                'status' => $item->stok <= 0 ? 'out_of_stock' : 'critical',
            ]);

        // Semua tanggal produksi menggunakan waktu operasional WIB (Asia/Jakarta).
        $today = now('Asia/Jakarta')->startOfDay();
        $startDate = $today->copy()->subDays(6);
        $todayText = $today->toDateString();
        $startText = $startDate->toDateString();

        // Query agregat, tidak memuat semua baris produksi ke memori PHP.
        $daily = ProduksiHarian::query()
            ->selectRaw('tanggal_produksi, SUM(jumlah_produksi) AS produced, SUM(jumlah_label_tercetak) AS printed')
            ->whereBetween('tanggal_produksi', [$startText, $todayText])
            ->groupBy('tanggal_produksi')
            ->orderBy('tanggal_produksi')
            ->get()
            ->keyBy(fn ($row) => substr((string) $row->tanggal_produksi, 0, 10));

        $trend = [];
        $totalWeek = 0;
        for ($index = 0; $index < 7; $index++) {
            $date = $startDate->copy()->addDays($index)->toDateString();
            $entry = $daily->get($date);
            $produced = (int) ($entry->produced ?? 0);
            $printed = (int) ($entry->printed ?? 0);
            $totalWeek += $produced;
            $trend[] = [
                'date' => $date,
                'produced' => $produced,
                'printed' => $printed,
                'unprinted' => max(0, $produced - $printed),
            ];
        }

        $todayTrend = $trend[6];

        $productionItems = ProduksiHarian::query()
            ->with('produk:id,nama_produk,barcode,stok')
            ->whereDate('tanggal_produksi', $todayText)
            ->orderByDesc('jumlah_produksi')
            ->orderBy('produk_id')
            ->limit(21)
            ->get();
        $productionItemsLimited = $productionItems->count() > 20;
        $productionItems = $productionItems->take(20)
            ->map(fn (ProduksiHarian $row): array => [
                'id' => $row->id,
                'product_id' => $row->produk_id,
                'name' => $row->produk?->nama_produk ?? 'Produk tidak ditemukan',
                'barcode' => $row->produk?->barcode,
                'current_stock' => (int) ($row->produk?->stok ?? 0),
                'produced' => (int) $row->jumlah_produksi,
                'printed' => (int) $row->jumlah_label_tercetak,
                'unprinted' => max(0, (int) $row->jumlah_produksi - (int) $row->jumlah_label_tercetak),
            ])->values();

        return response()->json([
            'success' => true,
            'data' => [
                'generated_at' => now('Asia/Jakarta')->toIso8601String(),
                'sales' => [
                    'available' => false,
                    'message' => 'Data transaksi belum tersedia karena integrasi POS/penjualan belum ada.',
                    'today_revenue' => null,
                    'today_transactions' => null,
                    'top_selling_products' => null,
                ],
                'inventory' => [
                    'total_products' => (int) ($inventory->total_products ?? 0),
                    'available_products' => (int) ($inventory->available_products ?? 0),
                    'total_stock_units' => (int) ($inventory->total_stock_units ?? 0),
                    'critical_stock' => (int) ($inventory->critical_stock ?? 0),
                    'out_of_stock' => (int) ($inventory->out_of_stock ?? 0),
                    'items' => $inventoryItems,
                    'items_limited' => $itemsLimited,
                ],
                'production' => [
                    'date' => $todayText,
                    'today_produced' => $todayTrend['produced'],
                    'today_printed' => $todayTrend['printed'],
                    'today_unprinted' => $todayTrend['unprinted'],
                    'last_7_days_produced' => $totalWeek,
                    'trend' => $trend,
                    'items' => $productionItems,
                    'items_limited' => $productionItemsLimited,
                ],
                'reports' => [
                    'sales_available' => false,
                    'message' => 'Laporan penjualan harian, mingguan, dan bulanan belum tersedia tanpa data transaksi.',
                ],
            ],
        ]);
    }
}
