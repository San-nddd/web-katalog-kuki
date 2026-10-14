<?php

namespace Tests\Feature;

use App\Models\kategori;
use App\Models\Obrolan;
use App\Models\produk;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AssistantApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.openrouter.key' => 'test-key']);
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

    public function test_chat_dari_homepage_menyimpan_obrolan_dan_pesan(): void
    {
        $this->fakeAssistantReply('Halo! Ada yang bisa saya bantu tentang Kuki Bakehouse?');

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'session-home-1',
            'message' => 'Apa saja produk yang tersedia?',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.session_id', 'session-home-1')
            ->assertJsonPath('data.needs_admin', false);

        $this->assertStringContainsString('Kuki Bakehouse', $response->json('data.reply'));

        $obrolan = Obrolan::where('session_id', 'session-home-1')->first();
        $this->assertNotNull($obrolan);
        $this->assertSame('Apa saja produk yang tersedia?', $obrolan->pertanyaan_awal);
        $this->assertSame('tidak_perlu', $obrolan->status_handover);

        $this->assertDatabaseHas('pesan_obrolan', ['obrolan_id' => $obrolan->id, 'tipe_pengirim' => 'user']);
        $this->assertDatabaseHas('pesan_obrolan', ['obrolan_id' => $obrolan->id, 'tipe_pengirim' => 'bot']);
    }

    public function test_chat_dengan_product_id_mengirim_konteks_produk_ke_openrouter(): void
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

        $this->fakeAssistantReply('Chocolate Croissant mengandung susu dan cokelat.');

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'session-detail-1',
            'message' => 'Ada kandungan susu?',
            'product_id' => $produk->id,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.product_context.nama', 'Chocolate Croissant')
            ->assertJsonPath('data.product_context.tersedia', true);

        Http::assertSent(function ($request) {
            $body = $request->body();

            return str_contains($body, 'Chocolate Croissant')
                && str_contains($body, 'Mengandung susu dan cokelat.')
                && str_contains($body, 'Ada kandungan susu?')
                && str_contains($body, 'Kuki Assistant');
        });
    }

    public function test_pertanyaan_di_luar_scope_dijawab_dengan_batasan_konteks(): void
    {
        $jawaban = 'Kuki Assistant hanya dapat membantu mengenai Kuki Bakehouse dan produknya.';
        $this->fakeAssistantReply($jawaban);

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'session-scope-1',
            'message' => 'Siapa presiden Indonesia sekarang?',
        ]);

        $response->assertOk()->assertJsonPath('data.reply', $jawaban);

        Http::assertSent(function ($request) {
            return str_contains($request->body(), 'tidak berhubungan dengan Kuki Bakehouse');
        });
    }

    public function test_session_id_dibuat_otomatis_bila_tidak_dikirim(): void
    {
        $this->fakeAssistantReply('Halo!');

        $response = $this->postJson('/api/assistant/chat', ['message' => 'Halo']);

        $response->assertOk();
        $this->assertNotEmpty($response->json('data.session_id'));
        $this->assertDatabaseCount('obrolan', 1);
    }

    public function test_handover_ke_admin_ditandai_pada_obrolan(): void
    {
        $this->fakeAssistantReply('Baik, saya teruskan ke admin ya.');

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'session-handover-1',
            'message' => 'Saya mau bicara dengan admin.',
        ]);

        $response->assertOk()->assertJsonPath('data.needs_admin', true);

        $this->assertDatabaseHas('obrolan', [
            'session_id' => 'session-handover-1',
            'status_handover' => 'membutuhkan_admin',
        ]);
    }

    public function test_handover_dari_marker_ai(): void
    {
        $this->fakeAssistantReply('Mohon tunggu sebentar, saya hubungi admin. [[HANDOVER]]');

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'session-handover-2',
            'message' => 'Bisa pesan 100 kotak untuk besok?',
        ]);

        $response->assertOk()->assertJsonPath('data.needs_admin', true);
        $this->assertStringNotContainsString('[[HANDOVER]]', $response->json('data.reply'));
    }

    public function test_galat_backend_memberikan_pesan_ramah_tanpa_detail_teknis(): void
    {
        Http::fake([
            'openrouter.ai/*' => Http::response('{"error":{"message":"boom"}}', 500),
        ]);

        $response = $this->postJson('/api/assistant/chat', [
            'session_id' => 'session-error-1',
            'message' => 'Halo',
        ]);

        $response->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Maaf, Kuki Assistant sedang mengalami kendala. Silakan coba lagi.');

        $this->assertStringNotContainsString('boom', $response->getContent());
        $this->assertDatabaseCount('pesan_obrolan', 1);
    }

    public function test_api_key_tidak_dikirim_ke_frontend(): void
    {
        $this->fakeAssistantReply('Halo!');

        $response = $this->postJson('/api/assistant/chat', ['message' => 'Halo']);

        $response->assertOk();
        $this->assertStringNotContainsString('test-key', $response->getContent());
    }

    public function test_validasi_input_chat(): void
    {
        $this->postJson('/api/assistant/chat', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['message']);

        $this->postJson('/api/assistant/chat', [
            'message' => 'Halo',
            'product_id' => 999,
        ])->assertStatus(422)->assertJsonValidationErrors(['product_id']);
    }

    public function test_riwayat_obrolan_dapat_diambil(): void
    {
        $this->fakeAssistantReply('Halo! Ada yang bisa saya bantu?');

        $this->postJson('/api/assistant/chat', [
            'session_id' => 'session-history-1',
            'message' => 'Halo Kuki',
        ])->assertOk();

        $response = $this->getJson('/api/assistant/obrolan/session-history-1');

        $response->assertOk()->assertJsonPath('data.session_id', 'session-history-1');
        $this->assertCount(2, $response->json('data.messages'));
        $this->assertSame('user', $response->json('data.messages.0.sender'));
        $this->assertSame('bot', $response->json('data.messages.1.sender'));

        $this->getJson('/api/assistant/obrolan/session-tidak-ada')->assertNotFound();
    }
}
