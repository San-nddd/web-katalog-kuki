<?php

namespace App\Http\Controllers;

use App\Models\Obrolan;
use App\Services\KukiAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AssistantController extends Controller
{
    public function __construct(private readonly KukiAssistantService $assistant) {}

    /**
     * Terima pertanyaan pengguna, kirim context + pertanyaan ke OpenRouter,
     * simpan percakapan, lalu kembalikan jawaban Kuki Assistant.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'nullable|string|max:64',
            'message' => 'required|string|max:2000',
            'product_id' => 'nullable|integer|exists:katalog_produk,id',
        ]);

        try {
            $result = $this->assistant->chat(
                $validated['session_id'] ?? null,
                $validated['message'],
                isset($validated['product_id']) ? (int) $validated['product_id'] : null
            );
        } catch (\Throwable $e) {
            Log::error('Kuki Assistant gagal memproses pesan: '.$e->getMessage());

            return $this->error();
        }

        if (! empty($result['error'])) {
            return $this->error();
        }

        return response()->json([
            'success' => true,
            'message' => 'Pesan berhasil diproses.',
            'data' => $result,
        ]);
    }

    /**
     * Ambil riwayat percakapan berdasarkan session_id.
     */
    public function obrolan(string $sessionId): JsonResponse
    {
        $history = $this->assistant->history($sessionId);

        if (! $history) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Riwayat obrolan berhasil diambil.',
            'data' => $history,
        ]);
    }

    /**
     * Request handover ke admin (dipanggil ketika user klik "Minta Bantuan Admin").
     */
    public function handover(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'nullable|string|max:64',
            'reason' => 'nullable|string|max:500',
        ]);

        $sessionId = $validated['session_id'] ?? null;
        $reason = $validated['reason'] ?? 'Pengguna meminta bantuan admin manusia';

        if (! $sessionId) {
            return response()->json([
                'success' => false,
                'message' => 'Session ID diperlukan.',
                'data' => null,
            ], 400);
        }

        $obrolan = Obrolan::where('session_id', $sessionId)->first();

        if (! $obrolan) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        // Simpan pesan sistem handover
        $obrolan->pesan()->create([
            'tipe_pengirim' => 'system',
            'pesan' => 'Permintaan handover ke admin: '.$reason,
        ]);

        // Update status handover
        $obrolan->update([
            'status_handover' => 'membutuhkan_admin',
            'status' => 'menunggu',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Permintaan handover ke admin berhasil dikirim.',
            'data' => [
                'session_id' => $sessionId,
                'status_handover' => 'membutuhkan_admin',
            ],
        ]);
    }

    private function error(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => KukiAssistantService::ERROR_REPLY,
            'data' => null,
        ], 503);
    }
}
