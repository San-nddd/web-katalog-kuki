<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\PosPegawai;
use App\Models\PosSesi;
use App\Models\produk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosCatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_catalog_returns_product_fields_from_database_for_flutter_pos(): void
    {
        $category = kategori::create(['nama' => 'Roti', 'slug' => 'roti']);
        $product = produk::create([
            'nama_produk' => 'Roti Kuki',
            'deskripsi_produk' => 'Roti uji katalog POS.',
            'harga_produk' => 18500,
            'kategori_id' => $category->id,
            'barcode' => 'KKB-PRD-42',
            'stok' => 7,
            'stok_minimum' => 2,
        ]);
        $staff = PosPegawai::create([
            'kode' => 'UJI01',
            'nama' => 'Kasir Uji',
            'pin_hash' => 'hash-uji',
            'aktif' => true,
        ]);
        $token = str_repeat('a', 64);
        PosSesi::create([
            'pegawai_id' => $staff->id,
            'token_hash' => hash('sha256', $token),
            'kedaluwarsa_pada' => now()->addHour(),
        ]);

        $this->withToken($token)
            ->getJson('/api/pos/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.id', $product->id)
            ->assertJsonPath('data.0.nama', $product->nama_produk)
            ->assertJsonPath('data.0.harga', 18500)
            ->assertJsonPath('data.0.stok', $product->stok)
            ->assertJsonPath('data.0.barcode', $product->barcode)
            ->assertJsonPath('data.0.kategori', $category->nama);
    }
}
