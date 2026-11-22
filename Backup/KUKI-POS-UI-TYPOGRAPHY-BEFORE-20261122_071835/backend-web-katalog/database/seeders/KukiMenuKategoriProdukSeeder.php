<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Kuki Bakehouse: 1 item menu = 1 produk di katalog_produk.
 * Kelompok produk berasal dari kategoris/kategori_id, tanpa produk induk/varian.
 *
 * Aman dijalankan berulang:
 * - Produk yang sudah ada dikenali dengan nama/alias persis setelah normalisasi.
 * - Tidak menimpa nama, harga, gambar, stok, barcode, ataupun kategori pilihan Admin.
 * - Bila kategori_id masih null, diisi berdasarkan menu.
 * - Produk baru dibuat dengan stok 0 dan deskripsi placeholder; isi foto/stok di Admin.
 * - Harga Saltbread yang belum tercantum dilewati, kecuali opt-in eksplisit.
 *
 * Untuk turut menambahkan menu tanpa harga, set environment:
 * KUKI_SEED_TAMBAH_TANPA_HARGA=1 (harga 0; HARUS diperbaiki di Admin sebelum dipublikasikan).
 * Jangan jalankan migrate:fresh / migrate:refresh.
 */
class KukiMenuKategoriProdukSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['kategoris', 'katalog_produk'] as $tabel) {
            if (! Schema::hasTable($tabel)) {
                throw new RuntimeException("Tabel {$tabel} tidak tersedia. Pastikan migration lama sudah dijalankan.");
            }
        }
        foreach (['nama', 'slug'] as $kolom) {
            if (! Schema::hasColumn('kategoris', $kolom)) {
                throw new RuntimeException("Kolom kategoris.{$kolom} tidak tersedia.");
            }
        }
        foreach (['nama_produk', 'deskripsi_produk', 'harga_produk', 'kategori_id', 'slug', 'barcode', 'stok', 'stok_minimum'] as $kolom) {
            if (! Schema::hasColumn('katalog_produk', $kolom)) {
                throw new RuntimeException("Kolom katalog_produk.{$kolom} tidak tersedia.");
            }
        }

        // CSV adalah sumber daftar saat seeder dibuat; daftar dibundel di bawah
        // agar deploy Laravel tidak harus menyertakan CSV.
        $menu = [
            [
                'kategori' => 'Burnt Cheesecake',
                'alias_kategori' => ['Burnt Cheesecake', 'Burnt Cheesecakes'],
                'produk' => [
                    ['The OG Burnt Cheesecake D-10CM', 27000, ['The OG Burnt Cheesecake 10cm', 'OG Burnt Cheesecake D-10cm']],
                    ['The OG Burnt Cheesecake D-16CM', 135000, ['The OG Burnt Cheesecake 16cm', 'OG Burnt Cheesecake D-16cm']],
                    ['The OG Burnt Cheesecake D-22CM', 210000, ['The OG Burnt Cheesecake 22cm', 'OG Burnt Cheesecake D-22cm']],
                    ['Burnt Cheesecake Chocolate D-16CM', 145000, []],
                    ['Burnt Cheesecake Chocolate D-22CM', 225000, []],
                    ['Burnt Cheesecake Matcha D-16CM', 145000, []],
                    ['Burnt Cheesecake Matcha D-22CM', 225000, []],
                    ['Burnt Cheesecake Strawberry D-16CM', 149000, []],
                    ['Burnt Cheesecake Strawberry D-22CM', 229000, []],
                    ['Burnt Cheesecake Blueberry D-16CM', 149000, []],
                    ['Burnt Cheesecake Blueberry D-22CM', 229000, []],
                    ['Burnt Cheesecake Cookies & Cream D-16CM', 149000, []],
                    ['Burnt Cheesecake Cookies & Cream D-22CM', 229000, []],
                    ['Iceberg Lava Cheesecake Dark Choco D-16CM', 187000, []],
                    ['Iceberg Lava Cheesecake Dark Choco D-22CM', 265000, []],
                    ['Iceberg Lava Cheesecake Matcha D-16CM', 187000, []],
                    ['Iceberg Lava Cheesecake Matcha D-22CM', 265000, []],
                    ['Garden Cheesecake Half Cream D-10CM', 45000, []],
                    ['Garden Cheesecake Half Cream D-12CM', 119000, []],
                    ['Garden Cheesecake Half Cream D-16CM', 175000, []],
                    ['Garden Cheesecake Full Cream D-10CM', 48000, []],
                    ['Garden Cheesecake Full Cream D-12CM', 135000, []],
                    ['Garden Cheesecake Full Cream D-16CM', 195000, []],
                    ['Garden Cheesecake Full Cream D-22CM', 267000, []],
                    ['Garden Cheesecake Twin Pack D-10CM', 95000, []],
                    ['Haru Garden Cheesecake D-12CM', 55000, []],
                    ['Haru Garden Cheesecake D-16CM', 199000, []],
                    ['Burnt Cheesecake Box of 2 D-10CM', 56000, []],
                    ['Burnt Cheesecake Box of 4 D-10CM', 137000, []],
                    ['Chocolate Cheesecake Slice', 16000, []],
                    ['Matcha Cheesecake Slice', 16000, []],
                    ['Strawberry Cheesecake Slice', 17000, []],
                    ['Blueberry Cheesecake Slice', 17000, []],
                    ['Cookies & Cream Cheesecake Slice', 17000, []],
                    ['Blueberry Crumble Cheesecake Slice', 17000, []],
                    ['Lemon Meringue Cheesecake Slice', 19000, []],
                    ['Iceberg Lava Cheesecake Dark Choco Slice', 19000, []],
                    ['Iceberg Lava Cheesecake Matcha Slice', 19000, []],
                    ['Iceberg Lava Cheesecake Taro Slice', 19000, []],
                    ['Iceberg Lava Cheesecake Mix Berry Slice', 19000, []],
                ],
            ],
            [
                'kategori' => 'Tiramisu',
                'alias_kategori' => ['Tiramisu', 'Tiramisu Series'],
                'produk' => [
                    ['Classic Tiramisu', 15000, []],
                    ['Strawberry Tiramisu', 15000, []],
                    ['Blueberry Tiramisu', 15000, []],
                    ['Matcha Tiramisu', 15000, []],
                    ['Cookies & Cream Tiramisu', 15000, []],
                    ['Chocolate Tiramisu', 15000, []],
                    ['Mango Tiramisu', 15000, []],
                    ['Lotus Biscoff Tiramisu', 15000, []],
                ],
            ],
            [
                'kategori' => 'Bread Series',
                'alias_kategori' => ['Bread Series', 'Breads', 'Bread', 'Saltbread', 'Saltbread Series'],
                'produk' => [
                    ['Goguma-ppang', 8000, []],
                    ['Cinnamon Roll', 9000, []],
                    ['Cranberry Cheese Sourdough', 18000, []],
                    ['Double Chocolate Sourdough', 18000, []],
                    ['Ham & Cheese Sourdough', 20000, []],
                    ['OG Saltbread', null, ['Original Saltbread']],
                    ['Egg Mayo Saltbread', null, []],
                    ['Korean Garlic Cheese Saltbread', null, ['Korean Garlic Cheese']],
                    ['Garlic Moza Saltbread', null, []],
                    ['Red Cheddar Cheese Saltbread', null, []],
                    ['Spicy Floss Saltbread', null, []],
                    ['Dubai Choco Saltbread', null, []],
                    ['Spicy Buldak Saltbread', null, []],
                ],
            ],
            [
                'kategori' => 'Banana Pudding',
                'alias_kategori' => ['Banana Pudding', 'Banana Puddings'],
                'produk' => [
                    ['The OG Banana Pudding', 18000, []],
                    ['Matcha Berry Banana Pudding', 19000, ['Matcha Berry']],
                    ['Strawberry Yoghurt Banana Pudding', 19000, ['Strawberry Yoghurt']],
                    ['Cookies & Cream Banana Pudding', 19000, []],
                    ['Chocolate Banana Pudding', 19000, []],
                ],
            ],
            [
                'kategori' => 'Gooey Brownie',
                'alias_kategori' => ['Gooey Brownie', 'Gooey Brownies', 'Brownies'],
                'produk' => [
                    ['Choco Overload Gooey Brownie', 22000, ['Choco Overload', 'Choco Overload Brownies']],
                    ['Berry Baby Gooey Brownie', 22000, ['Berry Baby', 'Berry Baby Brownies']],
                    ['Matcha Mood Gooey Brownie', 22000, ['Matcha Mood', 'Matcha Mood Brownies']],
                    ['Lotus Crush Gooey Brownie', 22000, ['Lotus Crush', 'Lotus Crush Brownies']],
                    ['Nutty Buddy Gooey Brownie', 22000, ['Nutty Buddy', 'Nutty Buddy Brownies']],
                    ['Caramel Drip Gooey Brownie', 22000, ['Caramel Drip', 'Caramel Drip Brownies']],
                    ['Oreo Vibes Gooey Brownie', 22000, ['Oreo Vibes', 'Oreo Vibes Brownies']],
                    ['Cheezy Bliss Gooey Brownie', 22000, ['Cheezy Bliss', 'Cheezy Bliss Brownies']],
                    ['Assorted Gooey Brownie 20x20CM', 130000, []],
                ],
            ],
            [
                'kategori' => 'Soft Cookies',
                'alias_kategori' => ['Soft Cookies', 'Soft Cookie', 'Cookies'],
                'produk' => [
                    ['Classic Butter Bliss', 13000, []],
                    ['Lotus Soft Bites', 15000, []],
                    ['Choco Meltdown', 15000, []],
                    ['Chia Berry Bloom', 15000, []],
                    ['Oreo Milky Chunk', 15000, []],
                    ['Matcha Sweet Craving', 15000, []],
                ],
            ],
            [
                'kategori' => 'Signature Cake',
                'alias_kategori' => ['Signature Cake', 'Signature Cakes'],
                'produk' => [
                    ['Mini Cake Strawberry Shortcake D-10CM', 39000, []],
                    ['Mini Cake Choco-Berry D-10CM', 39000, []],
                    ['Mini Cake Matcha-Berry D-10CM', 39000, []],
                    ['Mini Cake Redvelvet D-10CM', 39000, []],
                    ['Whole Cake Strawberry Shortcake D-14CM', 129000, []],
                    ['Whole Cake Strawberry Shortcake D-16CM', 157000, []],
                    ['Whole Cake Strawberry Shortcake D-22CM', 196000, []],
                    ['Whole Cake Blueberry Cake D-14CM', 129000, []],
                    ['Whole Cake Blueberry Cake D-16CM', 157000, []],
                    ['Whole Cake Blueberry Cake D-22CM', 196000, []],
                    ['Jeju Matcha-Berry D-16CM', 161000, []],
                    ['Jeju Matcha-Berry D-22CM', 199000, []],
                    ['Chocolate Matilda Whole Cake D-16CM', 182000, []],
                    ['Chocolate Matilda Whole Cake D-22CM', 221000, []],
                    ['Redvelvet Whole Cake D-16CM', 182000, []],
                    ['Redvelvet Whole Cake D-22CM', 221000, []],
                    ['Lapis Legit Slice', 19000, []],
                    ['Lapis Legit Whole 20x20CM', 399000, []],
                ],
            ],
        ];

        $sertakanTanpaHarga = filter_var(
            env('KUKI_SEED_TAMBAH_TANPA_HARGA', false),
            FILTER_VALIDATE_BOOLEAN
        );

        $ringkasan = [
            'kategori_baru' => 0,
            'produk_baru' => 0,
            'kategori_dilengkapi' => 0,
            'produk_sudah_ada' => 0,
            'produk_tanpa_harga_dilewati' => 0,
            'bentrok_dilewati' => 0,
        ];

        DB::transaction(function () use ($menu, $sertakanTanpaHarga, &$ringkasan): void {
            $semuaKategori = DB::table('kategoris')->get(['id', 'nama', 'slug']);
            $semuaProduk = DB::table('katalog_produk')->get([
                'id', 'nama_produk', 'slug', 'kategori_id', 'barcode',
            ]);
            $kodeVarianLama = collect();
            if (Schema::hasTable('produk_varian')) {
                $kolom = array_values(array_filter(
                    ['sku', 'barcode'],
                    fn ($kolom) => Schema::hasColumn('produk_varian', $kolom)
                ));
                if ($kolom !== []) {
                    $kodeVarianLama = DB::table('produk_varian')->get($kolom);
                }
            }

            foreach ($menu as $grup) {
                $kunciKategori = array_map(
                    static fn ($nama) => Str::slug($nama),
                    $grup['alias_kategori']
                );

                $kategoriCocok = $semuaKategori->filter(
                    static fn ($row) => in_array(Str::slug($row->nama), $kunciKategori, true)
                        || in_array(Str::slug($row->slug), $kunciKategori, true)
                );

                if ($kategoriCocok->count() > 1) {
                    throw new RuntimeException(
                        "Ada beberapa kategori untuk {$grup['kategori']}. "
                        .'Periksa dahulu di Admin; database tidak diubah.'
                    );
                }

                if ($kategoriCocok->count() === 1) {
                    $kategoriId = $kategoriCocok->first()->id;
                } else {
                    $slugKategori = Str::slug($grup['kategori']);
                    if ($semuaKategori->contains('slug', $slugKategori)) {
                        throw new RuntimeException(
                            "Slug kategori {$slugKategori} sudah dipakai kategori lain."
                        );
                    }
                    $kategoriId = DB::table('kategoris')->insertGetId([
                        'nama' => $grup['kategori'],
                        'slug' => $slugKategori,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $semuaKategori->push((object) [
                        'id' => $kategoriId, 'nama' => $grup['kategori'], 'slug' => $slugKategori,
                    ]);
                    $ringkasan['kategori_baru']++;
                }

                foreach ($grup['produk'] as [$nama, $harga, $aliasProduk]) {
                    $namaAlias = array_merge([$nama], $aliasProduk);
                    $kunciNama = array_map(static fn ($n) => Str::slug($n), $namaAlias);
                    $cocok = $semuaProduk->filter(
                        static fn ($row) => in_array(Str::slug($row->nama_produk), $kunciNama, true)
                    );

                    if ($cocok->count() > 1) {
                        $this->command?->warn("Nama produk ambigu: {$nama}; dilewati.");
                        $ringkasan['bentrok_dilewati']++;
                        continue;
                    }
                    if ($cocok->count() === 1) {
                        $existing = $cocok->first();
                        if ($existing->kategori_id === null) {
                            DB::table('katalog_produk')->where('id', $existing->id)->update([
                                'kategori_id' => $kategoriId,
                                'updated_at' => now(),
                            ]);
                            $existing->kategori_id = $kategoriId;
                            $ringkasan['kategori_dilengkapi']++;
                        } elseif ((int) $existing->kategori_id !== (int) $kategoriId) {
                            $this->command?->warn(
                                "{$nama} sudah punya kategori lain; kategori pilihan Admin dipertahankan."
                            );
                        }
                        $ringkasan['produk_sudah_ada']++;
                        continue; // Tidak menimpa harga, stok, gambar, dan barcode produk lama.
                    }

                    if ($harga === null && ! $sertakanTanpaHarga) {
                        $this->command?->warn("{$nama}: harga belum tercantum, belum dibuat.");
                        $ringkasan['produk_tanpa_harga_dilewati']++;
                        continue;
                    }

                    $slug = Str::slug($nama);
                    $slugDigunakan = $semuaProduk->contains(
                        static fn ($row) => $row->slug === $slug
                    );
                    if ($slugDigunakan) {
                        $this->command?->warn("{$nama}: slug {$slug} telah digunakan produk lain; dilewati.");
                        $ringkasan['bentrok_dilewati']++;
                        continue;
                    }

                    // Kode internal Code 128-B, bukan kode GS1/EAN resmi.
                    $barcode = 'KKB-MN-'.strtoupper(substr(hash('sha256', $grup['kategori'].'|'.$nama), 0, 12));
                    $kodeLama = $semuaProduk->contains(
                        static fn ($row) => $row->barcode === $barcode
                    );
                    $kodeVarianDipakai = $kodeVarianLama->contains(
                        static fn ($row) => ($row->barcode ?? null) === $barcode
                            || ($row->sku ?? null) === $barcode
                    );
                    if ($kodeLama || $kodeVarianDipakai) {
                        $this->command?->warn("{$nama}: barcode {$barcode} telah digunakan; dilewati.");
                        $ringkasan['bentrok_dilewati']++;
                        continue;
                    }

                    $idProduk = DB::table('katalog_produk')->insertGetId([
                        'nama_produk' => $nama,
                        'deskripsi_produk' => "Menu Kuki Bakehouse: {$nama}. Lengkapi deskripsi melalui Admin.",
                        'harga_produk' => $harga ?? 0,
                        'kategori_id' => $kategoriId,
                        'slug' => $slug,
                        'barcode' => $barcode,
                        'stok' => 0,
                        'stok_minimum' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $semuaProduk->push((object) [
                        'id' => $idProduk,
                        'nama_produk' => $nama,
                        'slug' => $slug,
                        'kategori_id' => $kategoriId,
                        'barcode' => $barcode,
                    ]);
                    $ringkasan['produk_baru']++;
                }
            }
        });

        $this->command?->info('Seeder menu selesai: '.json_encode($ringkasan, JSON_UNESCAPED_UNICODE));
        $this->command?->warn(
            'Produk baru memiliki stok 0 dan belum memiliki gambar. '
            .'Lengkapi di Dashboard Admin sebelum ditawarkan.'
        );
        if (! $sertakanTanpaHarga) {
            $this->command?->line(
                'Menu tanpa harga pasti tidak ditambahkan jika belum ada. '
                .'Opsional: KUKI_SEED_TAMBAH_TANPA_HARGA=1 untuk placeholder Rp0.'
            );
        }
    }
}
