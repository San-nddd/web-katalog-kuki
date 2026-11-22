<?php

namespace Tests\Feature;

use App\Models\MutasiStok;
use App\Models\OpnameStokDetail;
use App\Models\produk;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class InventoryLedgerConsistencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse('2026-10-26 09:00:00', 'Asia/Jakarta'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function adminToken(): string
    {
        return User::factory()->create(['role' => 'admin'])
            ->createToken('inventory-test')
            ->plainTextToken;
    }

    private function makeProduct(int $stock): produk
    {
        return produk::create([
            'nama_produk' => 'Produk Inventaris Uji',
            'deskripsi_produk' => 'Data dummy untuk test ledger.',
            'harga_produk' => 10000,
            'stok' => $stock,
            'stok_minimum' => 2,
        ]);
    }

    public function test_produksi_mencatat_stok_dan_mutasi_satu_kali_tanpa_menggandakan_ringkasan(): void
    {
        $token = $this->adminToken();
        $produk = $this->makeProduct(3);

        $this->withToken($token)
            ->postJson('/api/admin/produksi-harian', [
                'produk_id' => $produk->id,
                'jumlah' => 5,
            ])
            ->assertCreated();

        $this->assertDatabaseHas('katalog_produk', [
            'id' => $produk->id,
            'stok' => 8,
        ]);
        $this->assertDatabaseHas('produksi_harian', [
            'produk_id' => $produk->id,
            'jumlah_produksi' => 5,
        ]);
        $this->assertDatabaseHas('mutasi_stok', [
            'produk_id' => $produk->id,
            'jenis' => 'produksi',
            'perubahan' => 5,
            'stok_sebelum' => 3,
            'stok_sesudah' => 8,
        ]);
        $this->assertSame(
            1,
            MutasiStok::query()->where('produk_id', $produk->id)->where('jenis', 'produksi')->count(),
        );

        $tanggal = MutasiStok::query()
            ->where('produk_id', $produk->id)
            ->where('jenis', 'produksi')
            ->firstOrFail()
            ->created_at
            ->toDateString();
        $this->withToken($token)
            ->getJson("/api/management/laporan-inventaris?tanggal_mulai={$tanggal}&tanggal_selesai={$tanggal}")
            ->assertOk()
            ->assertJsonPath('data.stok_saat_ini.unit', 8)
            ->assertJsonPath('data.mutasi.masuk', 5)
            ->assertJsonPath('data.produksi.jumlah', 5)
            ->assertJsonPath('data.harian_produksi.0.jumlah', 5);

        $csv = $this->withToken($token)
            ->get("/api/management/laporan-inventaris/export?tanggal_mulai={$tanggal}&tanggal_selesai={$tanggal}")
            ->assertOk()
            ->streamedContent();

        $this->assertStringContainsString('"Produksi tercatat (unit)";5', $csv);
    }

    public function test_finalisasi_opname_mencatat_selisih_stok_satu_kali(): void
    {
        $token = $this->adminToken();
        $produk = $this->makeProduct(8);

        $opname = $this->withToken($token)
            ->postJson('/api/admin/opname-stok', ['produk_ids' => [$produk->id]])
            ->assertCreated()
            ->json('data.id');

        $detailId = OpnameStokDetail::query()
            ->where('opname_id', $opname)
            ->value('id');

        $this->withToken($token)
            ->putJson("/api/admin/opname-stok/{$opname}", [
                'items' => [['id' => $detailId, 'stok_fisik' => 6]],
            ])
            ->assertOk();

        $this->assertDatabaseHas('katalog_produk', ['id' => $produk->id, 'stok' => 8]);

        $this->withToken($token)
            ->postJson("/api/admin/opname-stok/{$opname}/selesai")
            ->assertOk();

        $this->assertDatabaseHas('katalog_produk', ['id' => $produk->id, 'stok' => 6]);
        $this->assertDatabaseHas('mutasi_stok', [
            'produk_id' => $produk->id,
            'jenis' => 'opname',
            'perubahan' => -2,
            'stok_sebelum' => 8,
            'stok_sesudah' => 6,
            'referensi_tipe' => 'opname_stok',
            'referensi_id' => $opname,
        ]);
        $this->assertSame(
            1,
            MutasiStok::query()->where('produk_id', $produk->id)->where('jenis', 'opname')->count(),
        );
    }

    public function test_finalisasi_opname_menolak_snapshot_stok_yang_sudah_berubah(): void
    {
        $token = $this->adminToken();
        $produk = $this->makeProduct(8);

        $opname = $this->withToken($token)
            ->postJson('/api/admin/opname-stok', ['produk_ids' => [$produk->id]])
            ->assertCreated()
            ->json('data.id');

        $detailId = OpnameStokDetail::query()
            ->where('opname_id', $opname)
            ->value('id');

        $this->withToken($token)
            ->putJson("/api/admin/opname-stok/{$opname}", [
                'items' => [['id' => $detailId, 'stok_fisik' => 6]],
            ])
            ->assertOk();

        $produk->update(['stok' => 9]);

        $this->withToken($token)
            ->postJson("/api/admin/opname-stok/{$opname}/selesai")
            ->assertUnprocessable();

        $this->assertDatabaseHas('katalog_produk', ['id' => $produk->id, 'stok' => 9]);
        $this->assertSame(
            0,
            MutasiStok::query()->where('produk_id', $produk->id)->where('jenis', 'opname')->count(),
        );
    }
}
