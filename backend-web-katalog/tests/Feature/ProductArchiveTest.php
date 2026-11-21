<?php

namespace Tests\Feature;

use App\Models\MutasiStok;
use App\Models\OpnameStok;
use App\Models\PosPegawai;
use App\Models\PosSesi;
use App\Models\produk;
use App\Models\ProduksiHarian;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductArchiveTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(string $role = 'admin'): string
    {
        return User::factory()->create(['role' => $role])
            ->createToken('product-archive-test')
            ->plainTextToken;
    }

    private function makeProduct(int $stock = 0): produk
    {
        return produk::create([
            'nama_produk' => 'Roti Arsip Uji',
            'deskripsi_produk' => 'Produk untuk uji arsip.',
            'harga_produk' => 15000,
            'barcode' => 'ARSIP-'.Str::upper(Str::random(8)),
            'stok' => $stock,
            'stok_minimum' => 2,
        ]);
    }

    private function staffWithToken(string $role = 'kasir', string $kode = 'KASIR01', string $char = 'a'): array
    {
        $staff = PosPegawai::create([
            'kode' => $kode,
            'nama' => 'Kasir Uji',
            'pin_hash' => 'hash-uji',
            'role' => $role,
            'aktif' => true,
        ]);
        $token = str_repeat($char, 64);
        PosSesi::create([
            'pegawai_id' => $staff->id,
            'token_hash' => hash('sha256', $token),
            'kedaluwarsa_pada' => now()->addHour(),
        ]);

        return [$staff, $token];
    }

    private function checkoutPayload(produk $product): array
    {
        return [
            'id_client' => (string) Str::uuid(),
            'items' => [['produk_id' => $product->id, 'jumlah' => 2]],
            'metode_bayar' => 'tunai',
            'dibayar' => 30000,
            'verifikasi_manual' => true,
            'jenis_pesanan' => 'takeaway',
        ];
    }

    public function test_arsip_produk_tanpa_riwayat_tidak_menghapus_baris_produk(): void
    {
        $token = $this->adminToken();
        $product = $this->makeProduct(0);

        $this->withToken($token)
            ->deleteJson("/api/produk/{$product->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Produk berhasil diarsipkan.');

        $this->assertDatabaseCount('katalog_produk', 1);
        $this->assertDatabaseHas('katalog_produk', ['id' => $product->id, 'aktif' => false]);
    }

    public function test_arsip_produk_dengan_riwayat_produksi_dan_opname_tidak_menghapus_riwayat(): void
    {
        $token = $this->adminToken();
        $product = $this->makeProduct(10);

        $this->withToken($token)
            ->postJson('/api/admin/produksi-harian', ['produk_id' => $product->id, 'jumlah' => 5])
            ->assertCreated();
        $this->withToken($token)
            ->postJson('/api/admin/opname-stok', ['produk_ids' => [$product->id]])
            ->assertCreated();

        $stokSebelum = (int) $product->fresh()->stok;
        $produksiSebelum = ProduksiHarian::count();
        $opnameSebelum = OpnameStok::count();
        $mutasiSebelum = MutasiStok::count();

        $this->withToken($token)->deleteJson("/api/produk/{$product->id}")->assertOk();

        $this->assertSame($stokSebelum, (int) $product->fresh()->stok);
        $this->assertSame($produksiSebelum, ProduksiHarian::count());
        $this->assertSame($opnameSebelum, OpnameStok::count());
        $this->assertSame($mutasiSebelum, MutasiStok::count());
        $this->assertDatabaseHas('katalog_produk', ['id' => $product->id, 'aktif' => false]);
    }

    public function test_arsip_produk_dengan_riwayat_transaksi_menjaga_snapshot_dan_laporan(): void
    {
        [, $kasirToken] = $this->staffWithToken();
        [, $ownerToken] = $this->staffWithToken('owner', 'OWNER01', 'b');
        $adminToken = $this->adminToken();
        $product = $this->makeProduct(10);

        $this->withToken($kasirToken)->postJson('/api/pos/shift/start')->assertCreated();
        $transaksi = $this->withToken($kasirToken)
            ->postJson('/api/pos/transactions', $this->checkoutPayload($product))
            ->assertCreated()
            ->json('data.id');
        $stokSebelum = (int) $product->fresh()->stok;

        $this->withToken($adminToken)->deleteJson("/api/produk/{$product->id}")->assertOk();

        $this->assertSame($stokSebelum, (int) $product->fresh()->stok);
        $this->assertDatabaseCount('pos_item_transaksi', 1);
        $this->withToken($kasirToken)
            ->getJson("/api/pos/transactions/{$transaksi}")
            ->assertOk()
            ->assertJsonPath('data.items.0.nama', 'Roti Arsip Uji')
            ->assertJsonPath('data.items.0.harga', 15000);
        $this->withToken($ownerToken)
            ->getJson('/api/management/laporan-penjualan?dari='.now()->toDateString().'&sampai='.now()->toDateString())
            ->assertOk();
        $this->withToken($ownerToken)
            ->getJson('/api/management/laporan-inventaris?tanggal_mulai='.now()->toDateString().'&tanggal_selesai='.now()->toDateString())
            ->assertOk();
    }

    public function test_produk_arsip_hilang_dari_katalog_dan_pos_serta_ditolak_checkout_manual(): void
    {
        [, $kasirToken] = $this->staffWithToken();
        $adminToken = $this->adminToken();
        $product = $this->makeProduct(10);

        $this->withToken($adminToken)->deleteJson("/api/produk/{$product->id}")->assertOk();

        $this->getJson('/api/produk')->assertOk()->assertJsonCount(0);
        $this->getJson("/api/produk/{$product->id}")->assertNotFound();
        $this->withToken($kasirToken)->getJson('/api/pos/catalog')->assertOk()->assertJsonCount(0, 'data');

        $this->withToken($kasirToken)->postJson('/api/pos/shift/start')->assertCreated();
        $this->withToken($kasirToken)
            ->postJson('/api/pos/transactions', $this->checkoutPayload($product))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['items.0.produk_id']);
    }

    public function test_pemulihan_produk_mengembalikan_ke_katalog_dan_pos_tanpa_mengubah_stok(): void
    {
        [, $kasirToken] = $this->staffWithToken();
        $adminToken = $this->adminToken();
        $product = $this->makeProduct(10);
        $stokSebelum = (int) $product->fresh()->stok;

        $this->withToken($adminToken)->deleteJson("/api/produk/{$product->id}")->assertOk();
        $this->withToken($adminToken)
            ->patchJson("/api/produk/{$product->id}/pulihkan")
            ->assertOk()
            ->assertJsonPath('message', 'Produk berhasil dipulihkan.');

        $this->assertDatabaseHas('katalog_produk', ['id' => $product->id, 'aktif' => true]);
        $this->assertSame($stokSebelum, (int) $product->fresh()->stok);
        $this->getJson('/api/produk')->assertOk()->assertJsonPath('0.id', $product->id);
        $this->withToken($kasirToken)->getJson('/api/pos/catalog')->assertOk()->assertJsonPath('data.0.id', $product->id);
    }

    public function test_pengguna_tidak_berwenang_tidak_dapat_mengarsipkan_atau_memulihkan(): void
    {
        $product = $this->makeProduct(10);
        $customerToken = $this->adminToken('customer');

        $this->deleteJson("/api/produk/{$product->id}")->assertUnauthorized();
        $this->patchJson("/api/produk/{$product->id}/pulihkan")->assertUnauthorized();
        $this->withToken($customerToken)->deleteJson("/api/produk/{$product->id}")->assertForbidden();
        $this->withToken($customerToken)->patchJson("/api/produk/{$product->id}/pulihkan")->assertForbidden();
        $this->withToken($customerToken)->getJson('/api/admin/produk')->assertForbidden();
        $this->assertDatabaseHas('katalog_produk', ['id' => $product->id, 'aktif' => true]);
    }

    public function test_endpoint_produksi_opname_dan_koreksi_menolak_produk_arsip(): void
    {
        $token = $this->adminToken();
        $product = $this->makeProduct(0);

        $this->withToken($token)->deleteJson("/api/produk/{$product->id}")->assertOk();

        $this->withToken($token)
            ->postJson('/api/admin/produksi-harian', ['produk_id' => $product->id, 'jumlah' => 1])
            ->assertStatus(422);
        $this->withToken($token)
            ->postJson('/api/admin/opname-stok', ['produk_ids' => [$product->id]])
            ->assertStatus(422);
        $this->withToken($token)
            ->postJson('/api/admin/mutasi-stok/koreksi', [
                'produk_id' => $product->id,
                'stok_sebelum' => 0,
                'stok_baru' => 5,
                'keterangan' => 'Koreksi stok uji arsip.',
            ])
            ->assertStatus(422);

        $this->assertSame(0, ProduksiHarian::count());
        $this->assertSame(0, OpnameStok::count());
        $this->assertSame(0, MutasiStok::where('jenis', 'koreksi')->count());
    }

    public function test_void_transaksi_lama_tetap_mengembalikan_stok_produk_arsip(): void
    {
        [, $kasirToken] = $this->staffWithToken();
        [, $ownerToken] = $this->staffWithToken('owner', 'OWNER01', 'c');
        $adminToken = $this->adminToken();
        $product = $this->makeProduct(10);

        $this->withToken($kasirToken)->postJson('/api/pos/shift/start')->assertCreated();
        $transaksi = $this->withToken($kasirToken)
            ->postJson('/api/pos/transactions', $this->checkoutPayload($product))
            ->assertCreated()
            ->json('data.id');
        $this->assertSame(8, (int) $product->fresh()->stok);

        $this->withToken($adminToken)->deleteJson("/api/produk/{$product->id}")->assertOk();

        $this->withToken($ownerToken)
            ->postJson('/api/pos/transactions/'.$transaksi.'/pembatalan', [
                'jenis' => 'void',
                'alasan' => 'Salah input pelanggan',
            ])
            ->assertOk()
            ->assertJsonPath('data.status_transaksi', 'void');

        $this->assertSame(10, (int) $product->fresh()->stok);
        $this->assertSame(1, MutasiStok::where('jenis', 'void')->where('perubahan', 2)->count());
        $this->assertDatabaseHas('katalog_produk', ['id' => $product->id, 'aktif' => false]);
    }
}
