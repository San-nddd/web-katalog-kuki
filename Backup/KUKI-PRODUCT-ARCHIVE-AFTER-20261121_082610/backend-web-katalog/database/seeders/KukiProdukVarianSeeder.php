<?php

namespace Database\Seeders;

use App\Models\produk;
use App\Models\ProdukVarian;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class KukiProdukVarianSeeder extends Seeder
{
    public function run(): void
    {
        if (! Schema::hasTable('katalog_produk') || ! Schema::hasTable('produk_varian')) {
            throw new \RuntimeException('Tabel katalog_produk / produk_varian belum tersedia. Jalankan migration lebih dahulu.');
        }

        if (! Schema::hasColumn('katalog_produk', 'barcode')) {
            throw new \RuntimeException('Kolom katalog_produk.barcode belum tersedia. Pastikan migration produk sudah lengkap.');
        }

        // [SKU, nama varian, harga]. NULL berarti harga belum diketahui.
        // Tidak menciptakan produk induk baru dan tidak mengubah data lama.
        $kelompok = [
            [
                'induk' => ['Saltbread', 'Salt Bread', 'Saltbread Series', 'Salt Bread Series'],
                'varian' => [
                    ['KKB-SB-001', 'Original Saltbread', null],
                    ['KKB-SB-002', 'Garlic Moza Saltbread', null],
                    ['KKB-SB-003', 'Red Cheddar Cheese Saltbread', null],
                    ['KKB-SB-004', 'Korean Garlic Cheese', null],
                    ['KKB-SB-005', 'Spicy Floss', null],
                    ['KKB-SB-006', 'Egg Mayo', null],
                    ['KKB-SB-007', 'Dubai Choco', null],
                    ['KKB-SB-008', 'Spicy Buldak', null],
                ],
            ],
            [
                'induk' => ['Tiramisu', 'Tiramisu Series'],
                'varian' => [
                    ['KKB-TR-001', 'Classic', 15000],
                    ['KKB-TR-002', 'Strawberry', 15000],
                    ['KKB-TR-003', 'Blueberry', 15000],
                    ['KKB-TR-004', 'Matcha', 15000],
                    ['KKB-TR-005', 'Cookies & Cream', 15000],
                    ['KKB-TR-006', 'Chocolate', 15000],
                    ['KKB-TR-007', 'Mango', 15000],
                    ['KKB-TR-008', 'Lotus Biscoff', 15000],
                ],
            ],
            [
                'induk' => ['Banana Pudding', 'Banana Pudding Series'],
                'varian' => [
                    ['KKB-BP-001', 'The OG', 18000],
                    ['KKB-BP-002', 'Matcha Berry', 19000],
                    ['KKB-BP-003', 'Strawberry Yoghurt', 19000],
                    ['KKB-BP-004', 'Cookies & Cream', 19000],
                    ['KKB-BP-005', 'Chocolate', 19000],
                ],
            ],
            [
                'induk' => ['Gooey Brownies', 'Gooey Brownie'],
                'varian' => [
                    ['KKB-GB-001', 'Choco Overload', 22000],
                    ['KKB-GB-002', 'Berry Baby', 22000],
                    ['KKB-GB-003', 'Matcha Mood', 22000],
                    ['KKB-GB-004', 'Lotus Crush', 22000],
                    ['KKB-GB-005', 'Nutty Buddy', 22000],
                    ['KKB-GB-006', 'Caramel Drip', 22000],
                    ['KKB-GB-007', 'Oreo Vibes', 22000],
                    ['KKB-GB-008', 'Cheezy Bliss', 22000],
                ],
            ],
            [
                'induk' => ['Soft Cookies', 'Soft Cookie', 'Soft Cookies Series'],
                'varian' => [
                    ['KKB-SC-001', 'Classic Butter Bliss', 13000],
                    ['KKB-SC-002', 'Lotus Soft Bites', 15000],
                    ['KKB-SC-003', 'Choco Meltdown', 15000],
                    ['KKB-SC-004', 'Chia Berry Bloom', 15000],
                    ['KKB-SC-005', 'Oreo Milky Chunk', 15000],
                    ['KKB-SC-006', 'Matcha Sweet Craving', 15000],
                ],
            ],
        ];

        $semuaProduk = produk::query()->get(['id', 'nama_produk', 'barcode']);
        $ditambah = 0;
        $dilewati = 0;

        foreach ($kelompok as $grup) {
            $namaInduk = $grup['induk'][0];
            $alias = array_map(fn (string $nama) => Str::slug($nama), $grup['induk']);
            $cocok = $semuaProduk->filter(
                fn ($item) => in_array(Str::slug((string) $item->nama_produk), $alias, true)
            );

            if ($cocok->count() !== 1) {
                $alasan = $cocok->isEmpty() ? 'tidak ditemukan' : 'lebih dari satu produk cocok';
                $this->command?->warn("Induk {$namaInduk}: {$alasan}. Seluruh varian grup ini dilewati.");
                $dilewati += count($grup['varian']);
                continue;
            }

            $induk = $cocok->first();

            foreach ($grup['varian'] as [$kode, $nama, $harga]) {
                // Jangan mengganti produk/varian yang sudah ada atau menyentuh harga dan stok editan Admin.
                $sudahAda = ProdukVarian::query()->where('sku', $kode)
                    ->orWhere('barcode', $kode)->first();

                if ($sudahAda) {
                    $sesuai = (int) $sudahAda->produk_id === (int) $induk->id
                        && $sudahAda->sku === $kode && $sudahAda->barcode === $kode
                        && $sudahAda->nama_varian === $nama;
                    if (! $sesuai) {
                        $this->command?->warn("Kode {$kode} digunakan varian lain. Dilewati (tidak ditimpa).");
                    }
                    $dilewati++;
                    continue;
                }

                if ($semuaProduk->contains(fn ($item) => (string) $item->barcode === $kode)) {
                    $this->command?->warn("Kode {$kode} masih dipakai barcode produk induk. Dilewati.");
                    $dilewati++;
                    continue;
                }

                if (ProdukVarian::query()->where('produk_id', $induk->id)
                    ->where('nama_varian', $nama)->exists()) {
                    $this->command?->warn("{$nama}: nama varian sudah ada dengan kode lain. Dilewati.");
                    $dilewati++;
                    continue;
                }

                ProdukVarian::query()->create([
                    'produk_id' => $induk->id,
                    'nama_varian' => $nama,
                    'sku' => $kode,
                    'barcode' => $kode,
                    // Harga Saltbread belum tersedia: 0 adalah placeholder,
                    // dan varian nonaktif sampai Admin mengisi harga dan stok asli.
                    'harga' => $harga ?? 0,
                    'stok' => 0,
                    'stok_minimum' => 0,
                    'aktif' => false,
                ]);
                $ditambah++;
            }
        }

        $this->command?->info("Seeder selesai. Ditambahkan: {$ditambah}; dilewati: {$dilewati}.");
        $this->command?->line('Semua varian baru nonaktif & stok 0. Isi harga/stok dan aktifkan melalui Admin sebelum ditampilkan di katalog.');
    }
}
