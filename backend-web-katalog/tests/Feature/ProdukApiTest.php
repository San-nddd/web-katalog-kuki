<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\produk;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProdukApiTest extends TestCase
{
    use RefreshDatabase;

    private function token(): string
    {
        return User::factory()->create()->createToken('admin')->plainTextToken;
    }

    private function payload(array $override = []): array
    {
        return array_merge([
            'nama_produk' => 'Butter Croissant',
            'deskripsi_produk' => 'Croissant renyah dan buttery.',
            'harga_produk' => 25000,
            'stok' => 10,
            'stok_minimum' => 3,
        ], $override);
    }

    public function test_produk_dapat_dilihat_publik(): void
    {
        $kategori = kategori::create(['nama' => 'Pastries', 'slug' => 'pastries']);
        produk::create($this->payload(['kategori_id' => $kategori->id]));

        $response = $this->getJson('/api/produk');

        $response->assertOk();
        $this->assertSame('Butter Croissant', $response->json('0.nama_produk'));
        $this->assertSame('Pastries', $response->json('0.kategori.nama'));
    }

    public function test_produk_dapat_ditambahkan_dengan_token(): void
    {
        $kategori = kategori::create(['nama' => 'Pastries', 'slug' => 'pastries']);

        $response = $this->withToken($this->token())
            ->postJson('/api/produk', $this->payload([
                'kategori_id' => $kategori->id,
                'barcode' => '12345',
                'metadata_ai' => 'Mengandung susu dan mentega.',
            ]));

        $response->assertCreated();
        $this->assertDatabaseHas('katalog_produk', [
            'nama_produk' => 'Butter Croissant',
            'barcode' => '12345',
            'slug' => 'butter-croissant',
        ]);
    }

    public function test_produk_tanpa_token_ditolak(): void
    {
        $this->postJson('/api/produk', $this->payload())->assertUnauthorized();
    }

    public function test_produk_dapat_diubah_dihapus_dan_dilihat(): void
    {
        $token = $this->token();
        $produk = produk::create($this->payload());

        $this->withToken($token)
            ->putJson("/api/produk/{$produk->id}", $this->payload([
                'nama_produk' => 'Almond Croissant',
                'harga_produk' => 32000,
                'stok' => 0,
            ]))
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nama_produk', 'Almond Croissant');

        $this->getJson("/api/produk/{$produk->id}")
            ->assertOk()
            ->assertJsonPath('nama_produk', 'Almond Croissant');

        $this->withToken($token)->deleteJson("/api/produk/{$produk->id}")->assertOk();
        $this->assertDatabaseMissing('katalog_produk', ['id' => $produk->id]);

        $this->getJson("/api/produk/{$produk->id}")->assertNotFound();
    }

    public function test_validasi_produk(): void
    {
        $this->withToken($this->token())
            ->postJson('/api/produk', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nama_produk', 'deskripsi_produk', 'harga_produk']);
    }

    public function test_upload_gambar_produk(): void
    {
        Storage::fake('public');
        $token = $this->token();
        $produk = produk::create($this->payload());

        $response = $this->withToken($token)
            ->post("/api/produk/{$produk->id}/gambar", [
                'gambar' => UploadedFile::fake()->image('croissant.jpg', 400, 300),
            ], ['Accept' => 'application/json']);

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertStringStartsWith('produk/', $response->json('data.gambar'));

        $this->assertDatabaseHas('katalog_produk', [
            'id' => $produk->id,
            'gambar_produk' => $response->json('data.gambar'),
        ]);

        Storage::disk('public')->assertExists($response->json('data.gambar'));
    }

    public function test_upload_gambar_dengan_file_tidak_valid_ditolak(): void
    {
        Storage::fake('public');
        $produk = produk::create($this->payload());

        $this->withToken($this->token())
            ->post("/api/produk/{$produk->id}/gambar", [
                'gambar' => UploadedFile::fake()->create('dokumen.txt', 100, 'text/plain'),
            ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['gambar']);
    }
}
