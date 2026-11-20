<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\PosAbsensi;
use App\Models\PosPegawai;
use App\Models\PosSesi;
use App\Models\PosTransaksi;
use App\Models\produk;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PosPegawaiManagementTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return User::factory()->create(['role' => 'admin'])
            ->createToken('pegawai-management')
            ->plainTextToken;
    }

    private function buatPegawaiViaApi(string $token, string $kode, string $pin = '123456'): array
    {
        $response = $this->withToken($token)->postJson('/api/pos/admin/pegawai', [
            'kode' => $kode,
            'nama' => 'Kasir '.$kode,
            'pin' => $pin,
        ])->assertCreated();

        return $response->json('data');
    }

    private function sesiPos(PosPegawai $pegawai): string
    {
        $token = str_repeat('d', 64);
        PosSesi::create([
            'pegawai_id' => $pegawai->id,
            'token_hash' => hash('sha256', $token),
            'kedaluwarsa_pada' => now()->addHour(),
        ]);

        return $token;
    }

    public function test_admin_dapat_melihat_mengubah_dan_menonaktifkan_pegawai_tanpa_menghapus_riwayat(): void
    {
        $admin = $this->adminToken();
        $pegawai = $this->buatPegawaiViaApi($admin, 'KASIR01');
        $model = PosPegawai::findOrFail($pegawai['id']);
        $posToken = $this->sesiPos($model);

        $kategori = kategori::create([
            'nama' => 'Roti',
            'slug' => 'roti-'.Str::lower(Str::random(6)),
        ]);
        produk::create([
            'nama_produk' => 'Roti Uji',
            'deskripsi_produk' => 'Produk untuk uji manajemen pegawai.',
            'harga_produk' => 10000,
            'kategori_id' => $kategori->id,
            'barcode' => 'PEG-'.Str::upper(Str::random(8)),
            'stok' => 5,
        ]);
        $shift = PosAbsensi::create([
            'pegawai_id' => $model->id,
            'masuk_pada' => now()->subHour(),
        ]);
        PosTransaksi::create([
            'id_client' => (string) Str::uuid(),
            'nomor' => 'KP-UJI-0001',
            'pegawai_id' => $model->id,
            'absensi_id' => $shift->id,
            'metode_bayar' => 'tunai',
            'subtotal' => 10000,
            'total' => 10000,
            'dibayar' => 10000,
            'kembalian' => 0,
            'dibayar_pada' => now(),
        ]);

        $this->withToken($admin)->getJson('/api/pos/admin/pegawai')
            ->assertOk()
            ->assertJsonPath('data.0.jumlah_transaksi', 1)
            ->assertJsonPath('data.0.jumlah_shift', 1);

        $this->withToken($admin)->patchJson('/api/pos/admin/pegawai/'.$model->id, [
            'kode' => 'kasir-01',
            'nama' => 'Kasir Utama',
            'role' => 'owner',
        ])->assertOk()
            ->assertJsonPath('data.kode', 'KASIR-01')
            ->assertJsonPath('data.nama', 'Kasir Utama')
            ->assertJsonPath('data.role', 'owner');

        $this->withToken($admin)->postJson('/api/pos/admin/pegawai', [
            'kode' => 'KASIR02',
            'nama' => 'Kasir Dua',
            'pin' => '123456',
        ])->assertCreated();
        $this->withToken($admin)->patchJson('/api/pos/admin/pegawai/'.$model->id, [
            'kode' => 'KASIR02',
        ])->assertUnprocessable()->assertJsonValidationErrors(['kode']);

        $this->withToken($posToken)->getJson('/api/pos/me')->assertOk();
        $this->withToken($admin)->deleteJson('/api/pos/admin/pegawai/'.$model->id)
            ->assertOk()
            ->assertJsonPath('data.pegawai.aktif', false)
            ->assertJsonPath('data.pegawai.jumlah_transaksi', 1);

        $this->assertDatabaseHas('pos_pegawai', [
            'id' => $model->id,
            'aktif' => false,
            'kode' => 'KASIR-01',
        ]);
        $this->assertSame(1, PosTransaksi::where('pegawai_id', $model->id)->count());
        $this->assertSame(1, PosAbsensi::where('pegawai_id', $model->id)->count());
        $this->assertSame(0, PosSesi::where('pegawai_id', $model->id)->count());
        $this->withToken($posToken)->getJson('/api/pos/me')->assertUnauthorized();
        $this->postJson('/api/pos/login', [
            'kode' => 'KASIR-01',
            'pin' => '123456',
        ])->assertUnauthorized();
    }

    public function test_ganti_pin_menggunakan_hash_mencabut_sesi_dan_pin_baru_dapat_login(): void
    {
        $admin = $this->adminToken();
        $pegawai = $this->buatPegawaiViaApi($admin, 'KASIRPIN', '123456');
        $model = PosPegawai::findOrFail($pegawai['id']);
        $posToken = $this->sesiPos($model);

        $this->withToken($admin)->patchJson('/api/pos/admin/pegawai/'.$model->id.'/pin', [
            'pin' => 'abc123',
        ])->assertUnprocessable()->assertJsonValidationErrors(['pin']);

        $this->withToken($admin)->patchJson('/api/pos/admin/pegawai/'.$model->id.'/pin', [
            'pin' => '654321',
        ])->assertOk()
            ->assertJsonPath('data.message', 'PIN diubah. Semua sesi lama telah dicabut.');

        $this->assertSame(0, PosSesi::where('pegawai_id', $model->id)->count());
        $this->assertTrue(password_verify('654321', $model->fresh()->pin_hash));
        $this->withToken($posToken)->getJson('/api/pos/me')->assertUnauthorized();
        $this->postJson('/api/pos/login', [
            'kode' => 'KASIRPIN',
            'pin' => '123456',
        ])->assertUnauthorized();
        $this->postJson('/api/pos/login', [
            'kode' => 'KASIRPIN',
            'pin' => '654321',
        ])->assertOk()->assertJsonPath('data.pegawai.kode', 'KASIRPIN');
    }
}
