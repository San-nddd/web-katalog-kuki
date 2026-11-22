<?php

namespace Database\Seeders;

use App\Models\kategori;
use App\Models\produk;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class KatalogSeeder extends Seeder
{
    /**
     * Data awal katalog: kategori + produk.
     * Dipakai agar Web Catalog dan Kuki Assistant langsung memiliki konteks.
     */
    public function run(): void
    {
        $kategoriMap = [];

        foreach ($this->kategori() as $nama) {
            $kategoriMap[$nama] = kategori::firstOrCreate(
                ['slug' => Str::slug($nama)],
                ['nama' => $nama]
            )->id;
        }

        foreach ($this->produk() as $item) {
            $slug = Str::slug($item['nama']);

            produk::firstOrCreate(
                ['slug' => $slug],
                [
                    'nama_produk' => $item['nama'],
                    'deskripsi_produk' => $item['deskripsi'],
                    'harga_produk' => $item['harga'],
                    'kategori_id' => $kategoriMap[$item['kategori']] ?? null,
                    'stok' => $item['stok'],
                    'stok_minimum' => $item['stok_minimum'],
                    'metadata_ai' => $item['metadata_ai'] ?? null,
                ]
            );
        }
    }

    private function kategori(): array
    {
        return ['Soft Cookies', 'Breads', 'Pastries', 'Cakes', 'Tiramisu', 'Bar Cookie'];
    }

    private function produk(): array
    {
        return [
            [
                'nama' => 'Lapis Legit',
                'kategori' => 'Cakes',
                'harga' => 150000,
                'deskripsi' => 'Kue lapis legit klasik dengan rempah yang harum, tekstur lembut dan rasa autentik.',
                'stok' => 12,
                'stok_minimum' => 3,
                'metadata_ai' => 'Mengandung telur, mentega, terigu, susu, dan rempah (kayu manis, cengkih, pala).',
            ],
            [
                'nama' => 'Red Velvet Cake',
                'kategori' => 'Cakes',
                'harga' => 250000,
                'deskripsi' => 'Red velvet lembut dengan cream cheese frosting yang creamy dan tidak terlalu manis.',
                'stok' => 8,
                'stok_minimum' => 2,
                'metadata_ai' => 'Mengandung susu, telur, mentega, dan cream cheese.',
            ],
            [
                'nama' => 'Butter Croissant',
                'kategori' => 'Pastries',
                'harga' => 25000,
                'deskripsi' => 'Croissant renyah, berlapis-lapis dan buttery. Cocok untuk sarapan atau camilan.',
                'stok' => 20,
                'stok_minimum' => 5,
                'metadata_ai' => 'Mengandung terigu, mentega, susu, dan telur.',
            ],
            [
                'nama' => 'Sourdough Loaf',
                'kategori' => 'Breads',
                'harga' => 45000,
                'deskripsi' => 'Roti sourdough fermentasi alami 24 jam, crust garing dan crumb lembut.',
                'stok' => 10,
                'stok_minimum' => 3,
                'metadata_ai' => 'Bahan utama: terigu, air, garam, dan starter sourdough alami.',
            ],
            [
                'nama' => 'Almond Croissant',
                'kategori' => 'Pastries',
                'harga' => 32000,
                'deskripsi' => 'Pastry berlapis dengan isian frangipane almond dan taburan almond panggang.',
                'stok' => 15,
                'stok_minimum' => 5,
                'metadata_ai' => 'Mengandung kacang almond, telur, susu, mentega, dan terigu.',
            ],
            [
                'nama' => 'Chocolate Fudge Cake',
                'kategori' => 'Cakes',
                'harga' => 275000,
                'deskripsi' => 'Cake cokelat fudgy lembut dengan lapisan ganache cokelat yang indulgent.',
                'stok' => 6,
                'stok_minimum' => 2,
                'metadata_ai' => 'Mengandung cokelat, susu, telur, mentega, dan terigu.',
            ],
            [
                'nama' => 'Cinnamon Roll',
                'kategori' => 'Pastries',
                'harga' => 28000,
                'deskripsi' => 'Roll kayu manis lembut dengan glaze cream cheese, harum dan hangat.',
                'stok' => 14,
                'stok_minimum' => 4,
                'metadata_ai' => 'Mengandung kayu manis, susu, telur, mentega, dan cream cheese.',
            ],
            [
                'nama' => 'Roti Sisir',
                'kategori' => 'Breads',
                'harga' => 22000,
                'deskripsi' => 'Roti sisir lembut dengan topping meises, favorit keluarga untuk sarapan.',
                'stok' => 18,
                'stok_minimum' => 5,
                'metadata_ai' => 'Mengandung terigu, susu, telur, dan mentega.',
            ],
            [
                'nama' => 'Berry Tart',
                'kategori' => 'Tarts & Pies',
                'harga' => 65000,
                'deskripsi' => 'Tart renyah dengan custard vanilla dan topping buah segar musiman.',
                'stok' => 9,
                'stok_minimum' => 3,
                'metadata_ai' => 'Mengandung susu, telur, mentega, terigu, dan buah segar.',
            ],
            [
                'nama' => 'Nastar',
                'kategori' => 'Cookies',
                'harga' => 65000,
                'deskripsi' => 'Kue kering nastar klasik dengan selai nanas homemade, lumer di mulut.',
                'stok' => 25,
                'stok_minimum' => 5,
                'metadata_ai' => 'Mengandung mentega, telur, terigu, susu, dan selai nanas.',
            ],
            [
                'nama' => 'Kastengel',
                'kategori' => 'Cookies',
                'harga' => 70000,
                'deskripsi' => 'Kue kering keju renyah, gurih dan bikin nagih. Cocok untuk hampers.',
                'stok' => 25,
                'stok_minimum' => 5,
                'metadata_ai' => 'Mengandung keju, mentega, telur, dan terigu.',
            ],
            [
                'nama' => 'Cheesecake Classic',
                'kategori' => 'Cakes',
                'harga' => 225000,
                'deskripsi' => 'New York style cheesecake yang lembut, creamy dengan base biscuit renyah.',
                'stok' => 7,
                'stok_minimum' => 2,
                'metadata_ai' => 'Mengandung susu, keju cream cheese, telur, dan biskuit.',
            ],
        ];
    }
}
