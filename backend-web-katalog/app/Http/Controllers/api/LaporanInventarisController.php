<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MutasiStok;
use App\Models\OpnameStok;
use App\Models\ProduksiHarian;
use App\Models\produk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Read-only. Semua nilai stok memakai tabel yang SUDAH ada. */
class LaporanInventarisController extends Controller
{
    private const MAX_DAYS = 366;

    private function periode(Request $request): array
    {
        $filter = $request->validate([
            'tanggal_mulai' => ['nullable', 'date_format:Y-m-d'],
            'tanggal_selesai' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $hariIni = now('Asia/Jakarta');
        $mulai = $filter['tanggal_mulai'] ?? $hariIni->copy()->subDays(29)->toDateString();
        $selesai = $filter['tanggal_selesai'] ?? $hariIni->toDateString();

        $tanggalAwal = Carbon::createFromFormat('Y-m-d', $mulai, 'Asia/Jakarta')->startOfDay();
        $tanggalAkhir = Carbon::createFromFormat('Y-m-d', $selesai, 'Asia/Jakarta')->startOfDay();
        if ($tanggalAwal->gt($tanggalAkhir)) {
            throw ValidationException::withMessages(['tanggal_selesai' => ['Tanggal akhir harus sama dengan atau setelah tanggal awal.']]);
        }
        if ($tanggalAwal->diffInDays($tanggalAkhir) > self::MAX_DAYS) {
            throw ValidationException::withMessages(['tanggal_selesai' => ['Rentang laporan maksimal 366 hari.']]);
        }
        return [$mulai, $selesai];
    }

    private function queryMutasi(string $mulai, string $selesai)
    {
        // Selaras dengan filter tanggal MutasiStokController yang sudah terpasang.
        return MutasiStok::query()
            ->whereDate('created_at', '>=', $mulai)
            ->whereDate('created_at', '<=', $selesai);
    }

    private function ringkasan(string $mulai, string $selesai): array
    {
        $perJenis = $this->queryMutasi($mulai, $selesai)
            ->selectRaw('jenis, COUNT(*) AS kejadian')
            ->selectRaw('COALESCE(SUM(CASE WHEN perubahan > 0 THEN perubahan ELSE 0 END), 0) AS masuk')
            ->selectRaw('COALESCE(SUM(CASE WHEN perubahan < 0 THEN -perubahan ELSE 0 END), 0) AS keluar')
            ->groupBy('jenis')->get();

        $jenis = $perJenis->map(fn ($row) => [
            'jenis' => $row->jenis,
            'kejadian' => (int) $row->kejadian,
            'masuk' => (int) $row->masuk,
            'keluar' => (int) $row->keluar,
        ])->values();

        // Mutasi adalah satu-satunya sumber total unit keluar/masuk. Produksi
        // hanya informasi pembanding, bukan dijumlahkan lagi ke total mutasi.
        $stokMasuk = $jenis->sum('masuk');
        $stokKeluar = $jenis->sum('keluar');

        $produksi = ProduksiHarian::query()
            ->whereDate('tanggal_produksi', '>=', $mulai)
            ->whereDate('tanggal_produksi', '<=', $selesai)
            ->selectRaw('COALESCE(SUM(jumlah_produksi), 0) AS jumlah_produksi')
            ->selectRaw('COALESCE(SUM(jumlah_label_tercetak), 0) AS jumlah_label_tercetak')
            ->first();

        $opnameSelesai = OpnameStok::query()
            ->where('status', 'selesai')
            ->whereDate('diselesaikan_pada', '>=', $mulai)
            ->whereDate('diselesaikan_pada', '<=', $selesai)
            ->count();

        $stok = produk::query()
            ->selectRaw('COUNT(*) AS jumlah_produk')
            ->selectRaw('COALESCE(SUM(COALESCE(stok, 0)), 0) AS unit_saat_ini')
            ->selectRaw('COALESCE(SUM(CASE WHEN stok <= 0 THEN 1 ELSE 0 END), 0) AS produk_habis')
            ->selectRaw('COALESCE(SUM(CASE WHEN stok > 0 AND stok_minimum > 0 AND stok <= stok_minimum THEN 1 ELSE 0 END), 0) AS produk_kritis')
            ->first();

        return [
            'periode' => ['mulai' => $mulai, 'selesai' => $selesai],
            'stok_saat_ini' => [
                'jumlah_produk' => (int) ($stok->jumlah_produk ?? 0),
                'unit' => (int) ($stok->unit_saat_ini ?? 0),
                'kritis' => (int) ($stok->produk_kritis ?? 0),
                'habis' => (int) ($stok->produk_habis ?? 0),
            ],
            'mutasi' => [
                'masuk' => (int) $stokMasuk,
                'keluar' => (int) $stokKeluar,
                'selisih_bersih' => (int) $stokMasuk - (int) $stokKeluar,
                'berdasarkan_jenis' => $jenis,
            ],
            'produksi' => [
                'jumlah' => (int) ($produksi->jumlah_produksi ?? 0),
                'label_tercetak' => (int) ($produksi->jumlah_label_tercetak ?? 0),
                'label_belum_tercetak' => max(0, (int) ($produksi->jumlah_produksi ?? 0) - (int) ($produksi->jumlah_label_tercetak ?? 0)),
            ],
            'opname_selesai' => $opnameSelesai,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        [$mulai, $selesai] = $this->periode($request);
        $ringkasan = $this->ringkasan($mulai, $selesai);

        $harian = ProduksiHarian::query()
            ->whereDate('tanggal_produksi', '>=', $mulai)
            ->whereDate('tanggal_produksi', '<=', $selesai)
            ->selectRaw('tanggal_produksi, SUM(jumlah_produksi) AS jumlah')
            ->groupBy('tanggal_produksi')->orderBy('tanggal_produksi')
            ->get()->map(fn ($baris) => [
                'tanggal' => substr((string) $baris->tanggal_produksi, 0, 10),
                'jumlah' => (int) $baris->jumlah,
            ])->values();

        $terakhir = $this->queryMutasi($mulai, $selesai)
            ->with(['produk:id,nama_produk,barcode', 'pengguna:id,name'])
            ->orderByDesc('id')->limit(100)->get()
            ->map(fn (MutasiStok $m) => [
                'id' => $m->id,
                'waktu' => $m->created_at?->toIso8601String(),
                'produk' => $m->produk?->nama_produk ?? 'Produk tidak ditemukan',
                'sku' => $m->produk?->barcode,
                'jenis' => $m->jenis,
                'perubahan' => (int) $m->perubahan,
                'stok_sebelum' => (int) $m->stok_sebelum,
                'stok_sesudah' => (int) $m->stok_sesudah,
                'keterangan' => $m->keterangan,
                'petugas' => $m->pengguna?->name ?? 'Sistem',
            ])->values();

        return response()->json(['success' => true, 'data' => [
            ...$ringkasan,
            'harian_produksi' => $harian,
            'mutasi_terakhir' => $terakhir,
            'batas_tampilan_mutasi' => 100,
            'dibuat_pada' => now('Asia/Jakarta')->toIso8601String(),
        ]]);
    }

    private function csvAman($nilai): string
    {
        $teks = (string) ($nilai ?? '');
        // Mencegah formula injection saat CSV dibuka di Excel / spreadsheet lain.
        return preg_match('/^[\s]*[=+\-@]/u', $teks) ? "'".$teks : $teks;
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        [$mulai, $selesai] = $this->periode($request);
        $ringkasan = $this->ringkasan($mulai, $selesai);
        $filename = "laporan-inventaris-kuki-{$mulai}-{$selesai}.csv";

        return response()->streamDownload(function () use ($mulai, $selesai, $ringkasan) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // UTF-8 BOM untuk Excel Windows.
            $tulis = static function (array $nilai) use ($handle): void {
                fputcsv($handle, $nilai, ';', '"', '');
            };

            $tulis(['LAPORAN INVENTARIS KUKI BAKEHOUSE']);
            $tulis(['Periode', $mulai, $selesai]);
            $tulis(['Stok saat ini (unit)', $ringkasan['stok_saat_ini']['unit']]);
            $tulis(['Mutasi masuk (unit)', $ringkasan['mutasi']['masuk']]);
            $tulis(['Mutasi keluar (unit)', $ringkasan['mutasi']['keluar']]);
            $tulis(['Produksi tercatat (unit)', $ringkasan['produksi']['jumlah']]);
            $tulis(['Opname selesai (sesi)', $ringkasan['opname_selesai']]);
            $tulis([]);
            $tulis(['Waktu', 'Produk', 'SKU', 'Jenis', 'Perubahan', 'Stok sebelum', 'Stok sesudah', 'Alasan', 'Petugas']);

            $this->queryMutasi($mulai, $selesai)
                ->with(['produk:id,nama_produk,barcode', 'pengguna:id,name'])
                ->chunkById(500, function ($batch) use ($tulis) {
                    foreach ($batch as $m) {
                        $tulis([
                            $m->created_at?->format('Y-m-d H:i:s'),
                            $this->csvAman($m->produk?->nama_produk ?? 'Produk tidak ditemukan'),
                            $this->csvAman($m->produk?->barcode ?? ''),
                            $m->jenis,
                            (int) $m->perubahan,
                            (int) $m->stok_sebelum,
                            (int) $m->stok_sesudah,
                            $this->csvAman($m->keterangan),
                            $this->csvAman($m->pengguna?->name ?? 'Sistem'),
                        ]);
                    }
                });
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
