<?php

namespace App\Http\Controllers;

use App\Models\Obrolan;
use App\Models\PesanObrolan;
use App\Services\HandoverService;
use App\Services\KukiAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AssistantController extends Controller
{
    public function __construct(
        private readonly KukiAssistantService $assistant,
        private readonly HandoverService $handover
    ) {}

    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'nullable|string|max:64',
            'message' => 'required|string|max:2000',
            'product_id' => 'nullable|integer|exists:katalog_produk,id',
        ]);

        $sessionId = $validated['session_id'] ?? null;

        try {
            $obrolan = $sessionId ? $this->latestOpenConversation($sessionId) : null;

            if ($obrolan) {
                $this->handover->applyHandoverTimeoutIfNeeded($obrolan);
                $obrolan->refresh();

                $lifecycle = $this->handover->lifecycleStatus($obrolan);

                if (in_array($lifecycle, [
                    'HANDOVER_PENDING',
                    'WAITING_ADMIN',
                    'ADMIN_ACTIVE',
                ], true)) {
                    $pesan = $obrolan->pesan()->create([
                        'tipe_pengirim' => 'user',
                        'pesan' => $validated['message'],
                    ]);

                    $this->handover->notifyCustomerMessage($obrolan, $pesan);

                    return response()->json([
                        'success' => true,
                        'message' => 'Pesan berhasil dikirim.',
                        'data' => [
                            'reply' => null,
                            'status' => $lifecycle,
                            'prioritas' => $obrolan->prioritas,
                            'ai_locked' => true,
                            'handover_expires_at' => $this->handover->handoverExpiresAt($obrolan),
                            'message' => [
                                'id' => $pesan->id,
                                'sender' => 'user',
                                'text' => $pesan->pesan,
                                'created_at' => $pesan->created_at,
                            ],
                        ],
                    ]);
                }
            }

            $result = $this->assistant->chat(
                $sessionId,
                $validated['message'],
                isset($validated['product_id']) ? (int) $validated['product_id'] : null
            );

            if (! empty($result['error'])) {
                return $this->error();
            }

            if ($sessionId) {
                $latest = $this->latestOpenConversation($sessionId);

                if ($latest) {
                    $this->handover->applyHandoverTimeoutIfNeeded($latest);
                    $latest->refresh();

                    $result['status'] = $this->handover->lifecycleStatus($latest);
                    $result['handover_expires_at'] = $this->handover->handoverExpiresAt($latest);
                    $result['prioritas'] = $latest->prioritas;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Pesan berhasil diproses.',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            Log::error('Kuki Assistant gagal memproses pesan: '.$e->getMessage());

            return $this->error();
        }
    }

    public function obrolan(string $sessionId): JsonResponse
    {
        $obrolan = Obrolan::where('session_id', $sessionId)
            ->latest('id')
            ->first();

        if (! $obrolan) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $this->handover->applyHandoverTimeoutIfNeeded($obrolan);
        $obrolan->refresh();

        $messages = $obrolan->pesan()
            ->orderBy('id')
            ->get()
            ->map(fn (PesanObrolan $pesan) => [
                'id' => $pesan->id,
                'sender' => $this->normalizeSender($pesan->tipe_pengirim),
                'pengirim' => $pesan->tipe_pengirim,
                'text' => $pesan->pesan,
                'isi' => $pesan->pesan,
                'created_at' => $pesan->created_at,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat obrolan berhasil diambil.',
            'data' => [
                'id' => $obrolan->id,
                'session_id' => $obrolan->session_id,
                'status' => $this->handover->lifecycleStatus($obrolan),
                'prioritas' => $obrolan->prioritas,
                'handover_expires_at' => $this->handover->handoverExpiresAt($obrolan),
                'messages' => $messages,
                'pesan' => $messages,
            ],
        ]);
    }

    public function handover(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'nullable|string|max:64',
            'reason' => 'nullable|string|max:500',
        ]);

        $sessionId = $validated['session_id'] ?? null;

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

        $this->handover->start(
            $obrolan,
            $validated['reason'] ?? 'Pengguna meminta bantuan admin manusia'
        );

        $obrolan->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Permintaan handover ke admin berhasil dicatat.',
            'data' => [
                'session_id' => $sessionId,
                'status' => $this->handover->lifecycleStatus($obrolan),
                'status_handover' => $obrolan->status_handover,
                'prioritas' => $obrolan->prioritas,
                'handover_expires_at' => $this->handover->handoverExpiresAt($obrolan),
            ],
        ]);
    }

    private function latestOpenConversation(string $sessionId): ?Obrolan
    {
        return Obrolan::where('session_id', $sessionId)
            ->where('status', '!=', 'selesai')
            ->latest('id')
            ->first();
    }

    private function normalizeSender(?string $sender): string
    {
        return match ($sender) {
            'bot', 'ai', 'assistant' => 'bot',
            'admin' => 'admin',
            'system' => 'system',
            default => 'user',
        };
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
