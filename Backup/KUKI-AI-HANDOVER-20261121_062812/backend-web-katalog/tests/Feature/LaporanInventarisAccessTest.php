<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LaporanInventarisAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dan_owner_dapat_membaca_laporan_inventaris(): void
    {
        foreach (['admin', 'owner'] as $role) {
            $token = User::factory()->create(['role' => $role])
                ->createToken("laporan-{$role}")
                ->plainTextToken;

            $this->withToken($token)
                ->getJson('/api/management/laporan-inventaris?tanggal_mulai=2026-10-01&tanggal_selesai=2026-10-26')
                ->assertOk()
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.periode.mulai', '2026-10-01')
                ->assertJsonPath('data.periode.selesai', '2026-10-26')
                ->assertJsonPath('data.stok_saat_ini.unit', 0)
                ->assertJsonPath('data.mutasi.masuk', 0)
                ->assertJsonPath('data.produksi.jumlah', 0);

            $this->withToken($token)
                ->get('/api/management/laporan-inventaris/export?tanggal_mulai=2026-10-01&tanggal_selesai=2026-10-26')
                ->assertOk()
                ->assertHeader('content-type', 'text/csv; charset=UTF-8');
        }
    }

    public function test_laporan_inventaris_menolak_guest_dan_role_tidak_berhak(): void
    {
        $this->getJson('/api/management/laporan-inventaris')->assertUnauthorized();
        $this->withHeaders(['Accept' => 'application/json, text/csv'])
            ->get('/api/management/laporan-inventaris/export')
            ->assertUnauthorized();

        $token = User::factory()->create(['role' => 'customer'])
            ->createToken('laporan-customer')
            ->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/management/laporan-inventaris')
            ->assertForbidden();
        $this->withToken($token)
            ->get('/api/management/laporan-inventaris/export')
            ->assertForbidden();
    }

    public function test_laporan_inventaris_memvalidasi_periode_dan_route_tidak_ditemukan(): void
    {
        $token = User::factory()->create(['role' => 'owner'])
            ->createToken('laporan-owner')
            ->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/management/laporan-inventaris?tanggal_mulai=26-10-2026')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['tanggal_mulai']);

        $this->withToken($token)
            ->getJson('/api/management/laporan-inventaris/tidak-ada')
            ->assertNotFound();
    }
}
