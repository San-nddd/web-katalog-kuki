<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dapat_login_dan_mendapatkan_token(): void
    {
        $user = User::factory()->create(['email' => 'admin@kukibakehouse.com']);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@kukibakehouse.com',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'name', 'email']]]);

        $this->assertNotEmpty($response->json('data.token'));
        $this->assertSame($user->id, $response->json('data.user.id'));
    }

    public function test_login_dengan_password_salah_ditolak(): void
    {
        User::factory()->create(['email' => 'admin@kukibakehouse.com']);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@kukibakehouse.com',
            'password' => 'salah',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_endpoint_admin_memerlukan_token(): void
    {
        $this->postJson('/api/produk', ['nama_produk' => 'X'])->assertUnauthorized();
        $this->getJson('/api/auth/user')->assertUnauthorized();
    }

    public function test_token_dapat_digunakan_untuk_mengambil_profil_dan_logout(): void
    {
        $user = User::factory()->create();
        $tokenModel = $user->createToken('admin');
        $token = $tokenModel->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/auth/user')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenModel->accessToken->id]);
    }
}
