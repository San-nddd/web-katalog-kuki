<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\MutasiStok;
use App\Models\PosAbsensi;
use App\Models\PosPegawai;
use App\Models\PosSesi;
use App\Models\PosTransaksi;
use App\Models\produk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PosOperationalFlowTest extends TestCase
{
    use RefreshDatabase;

    private function staffWithToken(
        string $role = 'kasir',
        string $kode = 'KASIR01',
        string $tokenChar = 'b',
    ): array {
        $staff = PosPegawai::create([
            'kode' => $kode,
            'nama' => 'Kasir Uji',
            'role' => $role,
            'pin_hash' => 'hash-uji',
            'aktif' => true,
        ]);
        $token = str_repeat($tokenChar, 64);
        PosSesi::create([
            'pegawai_id' => $staff->id,
            'token_hash' => hash('sha256', $token),
            'kedaluwarsa_pada' => now()->addHour(),
        ]);

        return [$staff, $token];
    }

    private function product(int $stock = 10, int $price = 10000): produk
    {
        $category = kategori::create([
            'nama' => 'Roti',
            'slug' => 'roti-'.Str::lower(Str::random(6)),
        ]);

        return produk::create([
            'nama_produk' => 'Roti Uji',
            'deskripsi_produk' => 'Produk untuk uji alur POS.',
            'harga_produk' => $price,
            'kategori_id' => $category->id,
            'barcode' => 'POS-'.Str::upper(Str::random(8)),
            'stok' => $stock,
            'stok_minimum' => 3,
        ]);
    }

    private function payload(produk $product, string $method = 'tunai', bool $verified = true): array
    {
        return [
            'id_client' => (string) Str::uuid(),
            'items' => [['produk_id' => $product->id, 'jumlah' => 2]],
            'metode_bayar' => $method,
            'dibayar' => 20000,
            'verifikasi_manual' => $verified,
            'jenis_pesanan' => 'takeaway',
        ];
    }

    public function test_checkout_tunai_menurunkan_stok_dan_mencatat_mutasi(): void
    {
        [$staff, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();

        $this->withToken($token)->postJson('/api/pos/transactions', $this->payload($product))
            ->assertCreated()
            ->assertJsonPath('data.total', 20000);

        $this->assertSame(8, $product->fresh()->stok);
        $this->assertSame(1, PosTransaksi::count());
        $this->assertSame(1, MutasiStok::where('jenis', 'penjualan')->count());
        $this->assertSame(1, PosAbsensi::where('pegawai_id', $staff->id)->whereNull('pulang_pada')->count());
    }

    public function test_checkout_tanpa_shift_ditolak(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();

        $this->withToken($token)->postJson('/api/pos/transactions', $this->payload($product))
            ->assertUnprocessable();
        $this->assertSame(0, PosTransaksi::count());
        $this->assertSame(10, $product->fresh()->stok);
    }

    public function test_replay_id_client_sama_mengembalikan_transaksi_awal_tanpa_stok_terpotong_ganda(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $payload = $this->payload($product);

        $first = $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertCreated();
        $replay = $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertOk();

        $this->assertSame($first->json('data.id'), $replay->json('data.id'));
        $this->assertSame(1, PosTransaksi::count());
        $this->assertSame(8, $product->fresh()->stok);
    }

    public function test_replay_id_client_dengan_detail_berbeda_ditolak(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $payload = $this->payload($product);
        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertCreated();

        $payload['items'][0]['jumlah'] = 1;
        $payload['dibayar'] = 10000;
        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertConflict();

        $this->assertSame(1, PosTransaksi::count());
        $this->assertSame(8, $product->fresh()->stok);
    }

    public function test_pembayaran_non_tunai_wajib_diverifikasi_dan_pas(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $payload = $this->payload($product, 'transfer', false);

        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertUnprocessable();
        $this->assertSame(0, PosTransaksi::count());

        $payload['verifikasi_manual'] = true;
        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertCreated();

        $payload['dibayar'] = 25000;
        $payload['id_client'] = (string) Str::uuid();
        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertUnprocessable();
        $this->assertSame(8, $product->fresh()->stok);
    }

    public function test_logout_mencabut_sesi_server(): void
    {
        [, $token] = $this->staffWithToken();

        $this->withToken($token)->getJson('/api/pos/me')->assertOk();
        $this->withToken($token)->postJson('/api/pos/logout')->assertOk();
        $this->withToken($token)->getJson('/api/pos/me')->assertUnauthorized();
    }

    public function test_laporan_memiliki_rekap_kasir_dan_produk(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $this->withToken($token)->postJson('/api/pos/transactions', $this->payload($product))->assertCreated();

        $today = now()->format('Y-m-d');
        $this->withToken($token)->getJson('/api/pos/report?dari='.$today.'&sampai='.$today)
            ->assertOk()
            ->assertJsonPath('data.jumlah_transaksi', 1)
            ->assertJsonPath('data.per_kasir.0.kasir', 'Kasir Uji')
            ->assertJsonPath('data.per_produk.0.nama', 'Roti Uji')
            ->assertJsonPath('data.per_metode.0.metode_bayar', 'tunai');
    }

    public function test_katalog_mengembalikan_stok_minimum(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();

        $this->withToken($token)->getJson('/api/pos/catalog')
            ->assertOk()
            ->assertJsonPath('data.0.stok_minimum', 3);
    }

    public function test_me_mengembalikan_peran_pegawai(): void
    {
        [, $token] = $this->staffWithToken('owner');

        $this->withToken($token)->getJson('/api/pos/me')
            ->assertOk()
            ->assertJsonPath('data.pegawai.role', 'owner');
    }

    public function test_void_oleh_owner_mengembalikan_stok_dan_menulis_audit(): void
    {
        [$kasir, $kasirToken] = $this->staffWithToken();
        [, $ownerToken] = $this->staffWithToken('owner', 'OWNER01', 'c');
        $product = $this->product();
        $this->withToken($kasirToken)->postJson('/api/pos/shift/start')->assertCreated();
        $response = $this->withToken($kasirToken)
            ->postJson('/api/pos/transactions', $this->payload($product))
            ->assertCreated();
        $id = $response->json('data.id');
        $this->assertSame(8, $product->fresh()->stok);

        $this->withToken($kasirToken)->postJson(
            '/api/pos/transactions/'.$id.'/pembatalan',
            ['jenis' => 'void', 'alasan' => 'Salah input pelanggan'],
        )->assertForbidden();

        $this->withToken($ownerToken)->postJson(
            '/api/pos/transactions/'.$id.'/pembatalan',
            ['jenis' => 'void', 'alasan' => 'Salah input pelanggan'],
        )->assertOk()
            ->assertJsonPath('data.status_transaksi', 'void')
            ->assertJsonPath('data.dibatalkan_oleh', 'Kasir Uji')
            ->assertJsonPath('data.jenis_pembatalan', 'void');

        $this->assertSame(10, $product->fresh()->stok);
        $this->assertSame(1, MutasiStok::where('jenis', 'void')->where('perubahan', 2)->count());
        $tx = PosTransaksi::findOrFail($id);
        $this->assertSame($kasir->id, $tx->pegawai_id);
        $this->assertNotNull($tx->dibatalkan_pada);
    }

    public function test_retur_tidak_dihitung_dalam_laporan(): void
    {
        [, $token] = $this->staffWithToken('admin');
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $response = $this->withToken($token)
            ->postJson('/api/pos/transactions', $this->payload($product))
            ->assertCreated();
        $id = $response->json('data.id');
        $today = now()->format('Y-m-d');

        $this->withToken($token)->postJson(
            '/api/pos/transactions/'.$id.'/pembatalan',
            ['jenis' => 'retur', 'alasan' => 'Pelanggan mengembalikan barang'],
        )->assertOk()->assertJsonPath('data.status_transaksi', 'retur');

        $this->withToken($token)->getJson('/api/pos/report?dari='.$today.'&sampai='.$today)
            ->assertOk()
            ->assertJsonPath('data.jumlah_transaksi', 0)
            ->assertJsonPath('data.total_penjualan', 0);
        $this->assertSame(10, $product->fresh()->stok);
    }

    public function test_replay_transaksi_yang_sudah_dibatalkan_ditolak(): void
    {
        [, $token] = $this->staffWithToken('owner');
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $payload = $this->payload($product);
        $response = $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertCreated();
        $id = $response->json('data.id');

        $this->withToken($token)->postJson(
            '/api/pos/transactions/'.$id.'/pembatalan',
            ['jenis' => 'void', 'alasan' => 'Transaksi dibatalkan'],
        )->assertOk();

        $this->withToken($token)->postJson('/api/pos/transactions', $payload)->assertConflict();
        $this->assertSame(1, PosTransaksi::count());
    }

    public function test_end_shift_tanpa_body_menutup_shift_dan_idempoten(): void
    {
        [$staff, $token] = $this->staffWithToken();
        $start = $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $id = $start->json('data.id');

        $first = $this->withToken($token)->postJson('/api/pos/shift/end')
            ->assertOk()
            ->assertJsonPath('data.id', $id);
        $this->assertNotNull($first->json('data.pulang_pada'));

        $second = $this->withToken($token)->postJson('/api/pos/shift/end')
            ->assertOk()
            ->assertJsonPath('data.id', $id);
        $this->assertSame($first->json('data.pulang_pada'), $second->json('data.pulang_pada'));
        $this->assertSame(1, PosAbsensi::where('pegawai_id', $staff->id)->count());
        $this->assertSame(0, PosAbsensi::where('pegawai_id', $staff->id)->whereNull('pulang_pada')->count());
    }

    public function test_checkout_setelah_shift_ditutup_ditolak(): void
    {
        [, $token] = $this->staffWithToken();
        $product = $this->product();
        $this->withToken($token)->postJson('/api/pos/shift/start')->assertCreated();
        $this->withToken($token)->postJson('/api/pos/shift/end')->assertOk();

        $this->withToken($token)->postJson('/api/pos/transactions', $this->payload($product))
            ->assertUnprocessable();
        $this->assertSame(0, PosTransaksi::count());
        $this->assertSame(10, $product->fresh()->stok);
    }
}
