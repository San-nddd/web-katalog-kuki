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
