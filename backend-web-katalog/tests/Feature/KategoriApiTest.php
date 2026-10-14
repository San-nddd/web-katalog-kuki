<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KategoriApiTest extends TestCase
{
    use RefreshDatabase;

    private function token(): string
    {
        return User::factory()->create()->createToken('admin')->plainTextToken;
    }

    public function test_kategori_dapat_dilihat_publik(): void
    {
        $this->postJson('/api/kategori', ['nama' => 'Cookies'], ['Authorization' => 'Bearer '.$this->token()])
            ->assertCreated();

        $response = $this->getJson('/api/kategori');

        $response->assertOk()->assertJsonPath('success', true);
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Cookies', $response->json('data.0.nama'));
        $this->assertSame('cookies', $response->json('data.0.slug'));
    }

    public function test_kategori_dapat_ditambahkan_diubah_dan_dihapus(): void
    {
        $token = $this->token();

        $create = $this->withToken($token)->postJson('/api/kategori', ['nama' => 'Pastries']);
        $create->assertCreated()->assertJsonPath('data.nama', 'Pastries');
        $id = $create->json('data.id');

        $this->withToken($token)
            ->putJson("/api/kategori/{$id}", ['nama' => 'Pastry'])
            ->assertOk()
            ->assertJsonPath('data.nama', 'Pastry')
            ->assertJsonPath('data.slug', 'pastry');

        $this->withToken($token)->deleteJson("/api/kategori/{$id}")->assertOk();

        $this->assertDatabaseMissing('kategoris', ['id' => $id]);
    }

    public function test_kategori_tanpa_token_ditolak(): void
    {
        $this->postJson('/api/kategori', ['nama' => 'Cookies'])->assertUnauthorized();
        $this->putJson('/api/kategori/1', ['nama' => 'Cookies'])->assertUnauthorized();
        $this->deleteJson('/api/kategori/1')->assertUnauthorized();
    }

    public function test_validasi_kategori_wajib_memiliki_nama(): void
    {
        $this->withToken($this->token())
            ->postJson('/api/kategori', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nama']);
    }

    public function test_kategori_tidak_ditemukan(): void
    {
        $this->withToken($this->token())
            ->getJson('/api/kategori/999')
            ->assertStatus(404)
            ->assertJsonPath('success', false);
    }
}
