<?php

namespace Tests\Feature;

use App\Models\Baker;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BakerCmsTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return User::factory()->create(['role' => 'admin'])
            ->createToken('admin')
            ->plainTextToken;
    }

    private function baker(array $overrides = []): Baker
    {
        return Baker::factory()->create(array_merge([
            'nama' => 'Baker Default',
            'spesialisasi' => 'Pastry Assistant',
            'foto' => null,
            'urutan' => 0,
            'aktif' => true,
        ], $overrides));
    }

    public function test_public_endpoint_returns_only_active_bakers_in_display_order(): void
    {
        $this->baker(['nama' => 'Tersembunyi', 'aktif' => false, 'urutan' => 0]);
        $this->baker([
            'nama' => 'Kedua',
            'spesialisasi' => 'Sourdough',
            'foto' => 'bakers/kedua.jpg',
            'urutan' => 2,
        ]);
        $this->baker(['nama' => 'Pertama', 'urutan' => 1]);

        $this->getJson('/api/bakers')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Pertama')
            ->assertJsonPath('data.1.name', 'Kedua')
            ->assertJsonPath('data.1.role', 'Sourdough')
            ->assertJsonPath('data.1.photo', 'bakers/kedua.jpg');
    }

    public function test_admin_endpoints_require_admin_role(): void
    {
        $this->getJson('/api/admin/bakers')->assertUnauthorized();

        $customerToken = User::factory()->create(['role' => 'customer'])
            ->createToken('customer')
            ->plainTextToken;
        $ownerToken = User::factory()->create(['role' => 'owner'])
            ->createToken('owner')
            ->plainTextToken;

        $this->withToken($customerToken)->getJson('/api/admin/bakers')->assertForbidden();
        $this->withToken($ownerToken)->getJson('/api/admin/bakers')->assertForbidden();
        $this->withToken($customerToken)
            ->postJson('/api/admin/bakers', ['nama' => 'Raka', 'spesialisasi' => 'Head Pastry Chef'])
            ->assertForbidden();
    }

    public function test_create_validates_required_fields(): void
    {
        $token = $this->adminToken();

        $this->withToken($token)
            ->postJson('/api/admin/bakers', ['nama' => '', 'spesialisasi' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['nama', 'spesialisasi']);
    }

    public function test_admin_can_create_update_publish_reorder_and_delete_baker(): void
    {
        $token = $this->adminToken();

        $created = $this->withToken($token)
            ->postJson('/api/admin/bakers', [
                'nama' => 'Raka',
                'spesialisasi' => 'Head Pastry Chef',
                'urutan' => 1,
                'aktif' => true,
            ])
            ->assertCreated()
            ->assertJsonPath('data.nama', 'Raka')
            ->json('data');

        $this->assertDatabaseHas('bakers', ['id' => $created['id'], 'nama' => 'Raka']);

        $this->withToken($token)
            ->putJson("/api/admin/bakers/{$created['id']}", [
                'nama' => 'Raka Wijaya',
                'spesialisasi' => 'Pastry & Sourdough',
                'urutan' => 1,
                'aktif' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.nama', 'Raka Wijaya')
            ->assertJsonPath('data.spesialisasi', 'Pastry & Sourdough');

        $second = $this->withToken($token)
            ->postJson('/api/admin/bakers', [
                'nama' => 'Nadia',
                'spesialisasi' => 'Cake Artist',
            ])
            ->assertCreated()
            ->json('data');

        $this->withToken($token)
            ->patchJson("/api/admin/bakers/{$second['id']}/publikasi", ['aktif' => false])
            ->assertOk()
            ->assertJsonPath('data.aktif', false);

        $this->getJson('/api/bakers')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Raka Wijaya');

        $this->withToken($token)
            ->postJson('/api/admin/bakers/reorder', ['ids' => [$second['id'], $created['id']]])
            ->assertOk()
            ->assertJsonPath('data.0.id', $second['id'])
            ->assertJsonPath('data.1.id', $created['id']);

        $this->withToken($token)
            ->patchJson("/api/admin/bakers/{$second['id']}/publikasi", ['aktif' => true])
            ->assertOk();

        $this->getJson('/api/bakers')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.name', 'Nadia');

        $this->withToken($token)
            ->deleteJson("/api/admin/bakers/{$created['id']}")
            ->assertOk();

        $this->assertDatabaseMissing('bakers', ['id' => $created['id']]);
    }

    public function test_admin_can_upload_replace_and_remove_baker_photo(): void
    {
        Storage::fake('public');
        $token = $this->adminToken();
        $baker = $this->baker();

        $firstPath = $this->withToken($token)
            ->post("/api/admin/bakers/{$baker->id}/foto", [
                'foto' => UploadedFile::fake()->image('lama.jpg', 300, 400),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('data.foto');

        $this->assertStringStartsWith('bakers/', $firstPath);
        Storage::disk('public')->assertExists($firstPath);

        $secondPath = $this->withToken($token)
            ->post("/api/admin/bakers/{$baker->id}/foto", [
                'foto' => UploadedFile::fake()->image('baru.png', 320, 420),
            ], ['Accept' => 'application/json'])
            ->assertOk()
            ->json('data.foto');

        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);

        $this->withToken($token)
            ->deleteJson("/api/admin/bakers/{$baker->id}/foto")
            ->assertOk()
            ->assertJsonPath('data.foto', null);

        Storage::disk('public')->assertMissing($secondPath);
        $this->assertDatabaseHas('bakers', ['id' => $baker->id, 'foto' => null]);
    }

    public function test_deleting_baker_also_deletes_photo(): void
    {
        Storage::fake('public');
        $token = $this->adminToken();
        $baker = $this->baker(['foto' => 'bakers/hapus.jpg']);
        Storage::disk('public')->put('bakers/hapus.jpg', 'foto-lama');

        $this->withToken($token)
            ->deleteJson("/api/admin/bakers/{$baker->id}")
            ->assertOk();

        Storage::disk('public')->assertMissing('bakers/hapus.jpg');
        $this->assertDatabaseMissing('bakers', ['id' => $baker->id]);
    }
}
