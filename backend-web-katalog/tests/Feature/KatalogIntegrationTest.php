<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\produk;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class KatalogIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.openrouter.key' => 'test-key']);
    }

    /**
     * Alur lengkap: Admin ubah produk -> Database berubah ->
     * Detail Produk mendapat data baru -> Kuki Assistant memakai konteks terbaru.
     */
    public function test_perubahan_admin_mengalir_sampai_konteks_kuki_assistant(): void
    {
        $token = User::factory()->create()->createToken('admin')->plainTextToken;
        $kategori = kategori::create(['nama' => 'Cakes', 'slug' => 'cakes']);
        $produk = produk::create([
            'nama_produk' => 'Burnt Cheese Cake',
            'deskripsi_produk' => 'Kueh Keju diduruk',
            'harga_produk' => 35000,
            'kategori_id' => $kategori->id,
            'stok' => 4,
        ]);

        // 1. Admin mengubah produk
        $this->withToken($token)
            ->putJson("/api/produk/{$produk->id}", [
                'nama_produk' => 'Burnt Cheese Cake Premium',
                'deskripsi_produk' => 'Burnt cheese cake dengan topping karamel gula aren.',
                'harga_produk' => 65000,
                'stok' => 12,
                'stok_minimum' => 2,
                'kategori_id' => $kategori->id,
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        // 2. Database berubah
        $this->assertDatabaseHas('katalog_produk', [
            'id' => $produk->id,
            'harga_produk' => 65000,
            'stok' => 12,
        ]);

        // 3. Detail Produk mendapat data baru lewat API
        $this->getJson("/api/produk/{$produk->id}")
            ->assertOk()
            ->assertJsonPath('nama_produk', 'Burnt Cheese Cake Premium')
            ->assertJsonPath('harga_produk', '65000.00')
            ->assertJsonPath('stok', 12);

        // 4. Kuki Assistant menerima konteks terbaru
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [[
                    'message' => ['content' => 'Burnt Cheese Cake Premium harganya Rp65.000 dan masih tersedia.'],
                ]],
            ]),
        ]);

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'session-integration-1',
            'message' => 'Berapa harga produk ini dan masih tersedia?',
            'product_id' => $produk->id,
        ]);

        $response->assertOk()->assertJsonPath('success', true);

        Http::assertSent(function ($request) {
            $body = $request->body();

            return str_contains($body, 'Burnt Cheese Cake Premium')
                && str_contains($body, 'topping karamel gula aren')
                && str_contains($body, 'Rp 65.000')
                && str_contains($body, 'Stok: 12');
        });
    }
}
