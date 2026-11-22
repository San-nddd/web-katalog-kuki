<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\Obrolan;
use App\Models\produk;
use App\Models\User;
use App\Notifications\HandoverRequestedNotification;
use App\Services\KukiAssistantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class KukiAssistantSafetyHandoverTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.openrouter.key' => 'test-key',
            'services.openrouter.models' => ['test-model'],
        ]);

        Cache::flush();
    }

    private function fakeAssistantReply(string $reply): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response([
                'choices' => [[
                    'message' => ['content' => $reply],
                ]],
            ]),
        ]);
    }

    private function adminWithPush(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $admin->updatePushSubscription('https://push.test/'.Str::uuid());

        return $admin;
    }

    public function test_laporan_rambut_memicu_handover_prioritas_tinggi_tanpa_memanggil_ai(): void
    {
        Notification::fake();
        Http::fake();
        $admin = $this->adminWithPush();

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'safety-rambut',
            'message' => 'Kenapa ada rambut di kue saya?',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.needs_admin', true)
            ->assertJsonPath('data.prioritas', 'tinggi')
            ->assertJsonPath('data.safety_handover', true)
            ->assertJsonPath('data.status', 'HANDOVER_PENDING');

        $reply = (string) $response->json('data.reply');

        $this->assertStringContainsString('Mohon maaf', $reply);
        $this->assertStringNotContainsString('Admin sudah menerima', $reply);
        $this->assertStringNotContainsString('kompensasi', $reply);

        $this->assertDatabaseHas('obrolan', [
            'session_id' => 'safety-rambut',
            'status_handover' => 'membutuhkan_admin',
            'prioritas' => 'tinggi',
        ]);

        Http::assertNothingSent();

        Notification::assertSentTo($admin, HandoverRequestedNotification::class, function ($notification) use ($admin) {
            $data = $notification->toArray($admin);

            return $data['prioritas'] === 'tinggi'
                && count($data['konteks']['riwayat']) >= 2
                && $data['konteks']['riwayat'][0]['isi'] === 'Kenapa ada rambut di kue saya?';
        });
    }

    public function test_laporan_kecoa_serangga_jamur_dan_zat_berbahaya_ditandai_prioritas_tinggi(): void
    {
        Http::fake();

        $pesan = [
            'Ada kecoa di dalam kue!',
            'knp ada kecoak di dalem kue?',
            'Di kue ada serangga',
            'Kuenya berjamur',
            'Ada oli di dalam kue',
            'Ada zat kimia di produknya',
        ];

        foreach ($pesan as $index => $isi) {
            $this->postJson('/api/assistant/chat', [
                'session_id' => 'safety-'.$index,
                'message' => $isi,
            ])
                ->assertOk()
                ->assertJsonPath('data.prioritas', 'tinggi')
                ->assertJsonPath('data.safety_handover', true);

            $this->assertDatabaseHas('obrolan', [
                'session_id' => 'safety-'.$index,
                'prioritas' => 'tinggi',
            ]);
        }

        Http::assertNothingSent();
    }

    public function test_laporan_alergi_menyarankan_bantuan_medis_darurat(): void
    {
        Http::fake();

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'safety-alergi',
            'message' => 'Saya alergi setelah makan kue Kuki dan sekarang sesak napas',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.prioritas', 'tinggi')
            ->assertJsonPath('data.butuh_medis', true);

        $this->assertStringContainsString('bantuan medis darurat', (string) $response->json('data.reply'));
        Http::assertNothingSent();
    }

    public function test_handover_otomatis_tidak_mengirim_notifikasi_ganda(): void
    {
        Notification::fake();
        Http::fake();
        $admin = $this->adminWithPush();

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'safety-ganda',
            'message' => 'Ada rambut di kue saya',
        ])->assertOk();

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'safety-ganda',
            'message' => 'Masih ada rambut lagi di kue saya',
        ])->assertOk()->assertJsonPath('data.reply', null);

        Notification::assertSentToTimes($admin, HandoverRequestedNotification::class, 1);
        Http::assertNothingSent();
    }

    public function test_handover_explisit_diulang_tidak_membuat_handover_ganda(): void
    {
        Notification::fake();
        $this->fakeAssistantReply('Halo, ada yang bisa saya bantu?');
        $admin = $this->adminWithPush();

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'handover-explisit',
            'message' => 'Halo Kuki',
        ])->assertOk();

        $this->postJson('/api/assistant/handover', [
            'session_id' => 'handover-explisit',
            'reason' => 'Butuh admin',
        ])->assertOk()->assertJsonPath('data.status', 'HANDOVER_PENDING');

        $this->postJson('/api/assistant/handover', [
            'session_id' => 'handover-explisit',
            'reason' => 'Butuh admin',
        ])->assertOk();

        $obrolan = Obrolan::where('session_id', 'handover-explisit')->firstOrFail();

        $this->assertSame(1, $obrolan->pesan()
            ->where('tipe_pengirim', 'system')
            ->where('pesan', KukiAssistantService::CONNECTING_MESSAGE)
            ->count());

        Notification::assertSentToTimes($admin, HandoverRequestedNotification::class, 1);
    }

    public function test_ai_berhenti_setelah_admin_mengambil_alih(): void
    {
        Notification::fake();
        $this->fakeAssistantReply('Halo, ada yang bisa saya bantu?');

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'admin-ambil',
            'message' => 'Halo Kuki',
        ])->assertOk();

        Http::assertSentCount(1);

        $this->postJson('/api/assistant/handover', [
            'session_id' => 'admin-ambil',
            'reason' => 'Pelanggan ingin konfirmasi',
        ])->assertOk();

        $obrolan = Obrolan::where('session_id', 'admin-ambil')->firstOrFail();

        $this->actingAs(User::factory()->create())
            ->postJson('/api/admin/obrolan/'.$obrolan->id.'/ambil')
            ->assertOk();

        $jumlahBotSebelum = $obrolan->pesan()->where('tipe_pengirim', 'bot')->count();

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'admin-ambil',
            'message' => 'Apakah produk aman?',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.reply', null)
            ->assertJsonPath('data.status', 'ADMIN_ACTIVE')
            ->assertJsonPath('data.ai_locked', true);

        $this->assertSame($jumlahBotSebelum, $obrolan->pesan()->where('tipe_pengirim', 'bot')->count());
        Http::assertSentCount(1);
    }

    public function test_laporan_masuk_antrean_prioritas_tinggi_saat_admin_belum_tersedia(): void
    {
        Http::fake();

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'antrean-prioritas',
            'message' => 'Ada rambut di kue saya',
        ])->assertOk();

        $obrolan = Obrolan::where('session_id', 'antrean-prioritas')->firstOrFail();

        $this->travel(20)->seconds();

        $this->getJson('/api/assistant/obrolan/antrean-prioritas')
            ->assertOk()
            ->assertJsonPath('data.status', 'WAITING_ADMIN')
            ->assertJsonPath('data.prioritas', 'tinggi');

        $this->assertDatabaseHas('pesan_obrolan', [
            'obrolan_id' => $obrolan->id,
            'tipe_pengirim' => 'system',
            'pesan' => KukiAssistantService::TIMEOUT_MESSAGE,
        ]);

        $admin = User::factory()->create();

        $this->actingAs($admin)
            ->getJson('/api/admin/obrolan?status=all')
            ->assertOk()
            ->assertJsonPath('data.0.prioritas', 'tinggi');

        $this->actingAs($admin)
            ->getJson('/api/admin/obrolan/statistik')
            ->assertOk()
            ->assertJsonPath('data.total_prioritas_tinggi', 1);
    }

    public function test_varian_aktif_dari_database_masuk_konteks_openrouter(): void
    {
        $kategori = kategori::create(['nama' => 'Pastries', 'slug' => 'pastries']);
        $produk = produk::create([
            'nama_produk' => 'Chocolate Croissant',
            'deskripsi_produk' => 'Croissant isi cokelat.',
            'harga_produk' => 30000,
            'kategori_id' => $kategori->id,
            'stok' => 5,
            'stok_minimum' => 2,
            'metadata_ai' => 'Mengandung susu dan cokelat.',
        ]);

        $produk->varian()->create([
            'nama_varian' => 'Jumbo',
            'sku' => 'JUMBO-1',
            'barcode' => 'JUMBO-1',
            'harga' => 35000,
            'stok' => 2,
            'aktif' => true,
        ]);

        $produk->varian()->create([
            'nama_varian' => 'Mini',
            'sku' => 'MINI-1',
            'barcode' => 'MINI-1',
            'harga' => 20000,
            'stok' => 1,
            'aktif' => false,
        ]);

        $this->fakeAssistantReply('Varian Jumbo tersedia seharga Rp 35.000.');

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'varian-aktif',
            'message' => 'Ada varian apa saja?',
            'product_id' => $produk->id,
        ])->assertOk()
            ->assertJsonPath('data.product_context.nama', 'Chocolate Croissant');

        Http::assertSent(function ($request) {
            $body = $request->body();

            return str_contains($body, 'Varian: Jumbo')
                && str_contains($body, '35.000')
                && ! str_contains($body, 'Varian: Mini');
        });
    }

    public function test_katalog_cache_dibersihkan_setelah_produk_diubah(): void
    {
        $kategori = kategori::create(['nama' => 'Cakes', 'slug' => 'cakes']);
        $produk = produk::create([
            'nama_produk' => 'Kue Uji',
            'deskripsi_produk' => 'Kue untuk pengujian.',
            'harga_produk' => 25000,
            'kategori_id' => $kategori->id,
            'stok' => 3,
            'stok_minimum' => 1,
        ]);

        $this->fakeAssistantReply('Halo!');

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'cache-1',
            'message' => 'Apa saja produk yang tersedia?',
        ])->assertOk();

        Http::assertSent(fn ($request) => str_contains($request->body(), 'Kue Uji'));

        $produk->update(['nama_produk' => 'Kue Uji Edit']);
        KukiAssistantService::forgetCatalogContext();

        Http::assertSentCount(1);

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'cache-2',
            'message' => 'Apa saja produk yang tersedia?',
        ])->assertOk();

        Http::assertSent(fn ($request) => str_contains($request->body(), 'Kue Uji Edit'));
    }
}
