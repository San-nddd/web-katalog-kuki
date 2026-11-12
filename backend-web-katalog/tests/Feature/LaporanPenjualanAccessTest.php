<?php

namespace Tests\Feature;

use App\Models\PosAbsensi;
use App\Models\PosPegawai;
use App\Models\PosTransaksi;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class LaporanPenjualanAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_dan_owner_melihat_ringkasan_transaksi_dari_periode_terpilih(): void
    {
        $pegawai = PosPegawai::create([
            'kode' => 'KASIR01',
            'nama' => 'Kasir Satu',
            'pin_hash' => 'hash',
        ]);
        $absensi = PosAbsensi::create([
            'pegawai_id' => $pegawai->id,
            'masuk_pada' => '2026-11-10 08:00:00',
        ]);

        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-000', 'tunai', 10000, '2026-11-09 17:00:00');
        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-001', 'tunai', 25000, '2026-11-10 10:00:00');
        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-002', 'qris', 35000, '2026-11-11 12:00:00');
        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-003', 'tunai', 50000, '2026-11-12 12:00:00');
        $this->buatTransaksi($pegawai->id, $absensi->id, 'KUKI-004', 'transfer', 90000, '2026-11-11 17:00:00');

        foreach (['admin', 'owner'] as $role) {
            $token = User::factory()->create(['role' => $role])
                ->createToken("laporan-penjualan-{$role}")
                ->plainTextToken;

            $this->withToken($token)
                ->getJson('/api/management/laporan-penjualan?dari=2026-11-10&sampai=2026-11-11')
                ->assertOk()
                ->assertJsonPath('data.periode.dari', '2026-11-10')
                ->assertJsonPath('data.ringkasan.jumlah_transaksi', 3)
                ->assertJsonPath('data.ringkasan.total_penjualan', 70000)
                ->assertJsonPath('data.per_metode.0.metode_bayar', 'qris')
                ->assertJsonPath('data.transaksi.total', 3);
        }
    }

    public function test_laporan_penjualan_menolak_guest_role_lain_dan_periode_tidak_valid(): void
    {
        $this->getJson('/api/management/laporan-penjualan?dari=2026-11-01&sampai=2026-11-02')
            ->assertUnauthorized();

        $token = User::factory()->create(['role' => 'customer'])
            ->createToken('customer-laporan-penjualan')
            ->plainTextToken;
        $this->withToken($token)
            ->getJson('/api/management/laporan-penjualan?dari=2026-11-01&sampai=2026-11-02')
            ->assertForbidden();

        $ownerToken = User::factory()->create(['role' => 'owner'])
            ->createToken('owner-laporan-penjualan')
            ->plainTextToken;
        $this->withToken($ownerToken)
            ->getJson('/api/management/laporan-penjualan?dari=2026-11-01&sampai=2026-11-02')
            ->assertJsonPath('data.ringkasan.total_penjualan', 0);
        $this->withToken($ownerToken)
            ->getJson('/api/management/laporan-penjualan?dari=2026-11-03&sampai=2026-11-02')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sampai']);
        $this->withToken($ownerToken)
            ->getJson('/api/management/laporan-penjualan?dari=2026-01-01&sampai=2026-04-04')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sampai']);
    }

    public function test_ekspor_csv_menggunakan_periode_yang_sama_dan_dibatasi_role(): void
    {
        $token = User::factory()->create(['role' => 'admin'])
            ->createToken('admin-laporan-penjualan-csv')
            ->plainTextToken;
        $this->withToken($token)
            ->get('/api/management/laporan-penjualan/export?dari=2026-11-01&sampai=2026-11-30')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    private function buatTransaksi(
        int $pegawaiId,
        int $absensiId,
        string $nomor,
        string $metode,
        int $total,
        string $dibayarPada,
    ): void {
        PosTransaksi::create([
            'id_client' => (string) Str::uuid(),
            'nomor' => $nomor,
            'pegawai_id' => $pegawaiId,
            'absensi_id' => $absensiId,
            'metode_bayar' => $metode,
            'subtotal' => $total,
            'total' => $total,
            'dibayar' => $total,
            'kembalian' => 0,
            'dibayar_pada' => $dibayarPada,
        ]);
    }
}
