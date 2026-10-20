<?php

namespace App\Http\Controllers;

use App\Models\Obrolan;
use App\Models\PesanObrolan;
use App\Services\KukiAssistantService;
use Illuminate\Http\JsonResponse;
use App\Notifications\HandoverRequestedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\facades\Notifications;

class AssistantController extends Controller
{
    private const HANDOVER_CONNECTING_MESSAGE = 'Sedang menghubungkan Anda ke Admin...';

    private const HANDOVER_TIMEOUT_MESSAGE = 'Admin sedang belum dapat merespons langsung. Pesan Anda sudah masuk dan akan ditanggapi secepatnya.';

    public function __construct(private readonly KukiAssistantService $assistant) {}

    /**
     * Terima pesan pengguna.
     *
     * AI hanya boleh dipanggil saat lifecycle masih AI_ACTIVE.
     * Setelah handover dimulai, endpoint ini tetap dipakai untuk menyimpan
     * pesan user, tetapi OpenRouter tidak dipanggil lagi.
     */
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
                $this->applyHandoverTimeoutIfNeeded($obrolan);
                $obrolan->refresh();

                $lifecycle = $this->lifecycleStatus($obrolan);

                if (in_array($lifecycle, ['HANDOVER_PENDING', 'WAITING_ADMIN', 'ADMIN_ACTIVE'], true)) {
                    $pesan = $obrolan->pesan()->create([
                        'tipe_pengirim' => 'user',
                        'pesan' => $validated['message'],
                    ]);

                    return response()->json([
                        'success' => true,
                        'message' => 'Pesan berhasil dikirim.',
                        'data' => [
                            'reply' => null,
                            'status' => $lifecycle,
                            'ai_locked' => true,
                            'handover_expires_at' => $this->handoverExpiresAt($obrolan),
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

            /*
             * Tidak ada conversation aktif / masih AI_ACTIVE.
             * Biarkan service existing menangani create conversation + OpenRouter.
             */
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
                    $this->applyHandoverTimeoutIfNeeded($latest);
                    $latest->refresh();

                    $result['status'] = $this->lifecycleStatus($latest);
                    $result['handover_expires_at'] = $this->handoverExpiresAt($latest);
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

    /**
     * Ambil riwayat conversation terbaru untuk session.
     * Closed conversation tetap dapat dibaca sampai user memulai conversation baru.
     */
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

        $this->applyHandoverTimeoutIfNeeded($obrolan);
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
                'status' => $this->lifecycleStatus($obrolan),
                'handover_expires_at' => $this->handoverExpiresAt($obrolan),
                'messages' => $messages,
                'pesan' => $messages,
            ],
        ]);
    }

    /**
     * User meminta bantuan Admin.
     *
     * Existing schema dipertahankan:
     * - status_handover = membutuhkan_admin
     * - status = menunggu
     *
     * Lifecycle HANDOVER_PENDING / WAITING_ADMIN dihitung dari timestamp
     * system-message handover sehingga tidak perlu destructive migration.
     */
    public function handover(Request $request): JsonResponse
{
    $validated = $request->validate([
        'session_id' => 'nullable|string|max:64',
        'reason' => 'nullable|string|max:500',
    ]);

    $sessionId = $validated['session_id'] ?? null;

    $reason = $validated['reason']
        ?? 'Pengguna meminta bantuan admin manusia';

    // Session wajib ada
    if (! $sessionId) {
        return response()->json([
            'success' => false,
            'message' => 'Session ID diperlukan.',
            'data' => null,
        ], 400);
    }

    // ✅ Cari obrolan DULU
    $obrolan = Obrolan::where(
        'session_id',
        $sessionId
    )->first();

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

    // Update status
    $obrolan->update([
        'status_handover' => 'membutuhkan_admin',
        'status' => 'menunggu',
    ]);

    // ✅ Baru kirim Web Push
    try {
        $admins = User::whereHas(
            'pushSubscriptions'
        )->get();

        if ($admins->isNotEmpty()) {
            Notification::send(
                $admins,
                new HandoverRequestedNotification(
                    $obrolan->id,
                    'Ada customer yang meminta bantuan Admin.'
                )
            );
        }
    } catch (\Throwable $e) {
        Log::error(
            'Gagal mengirim Web Push handover: '
            .$e->getMessage()
        );
    }

    return response()->json([
        'success' => true,
        'message' => 'Permintaan handover ke admin berhasil dikirim.',
        'data' => [
            'session_id' => $sessionId,
            'status_handover' => 'membutuhkan_admin',
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

    private function applyHandoverTimeoutIfNeeded(Obrolan $obrolan): void
    {
        if ($obrolan->status_handover !== 'membutuhkan_admin') {
            return;
        }

        $handoverMessage = $this->handoverRequestMessage($obrolan);

        if (! $handoverMessage) {
            return;
        }

        $expiresAt = $handoverMessage->created_at->copy()->addSeconds(15);

        if (now()->lt($expiresAt)) {
            return;
        }

        $alreadyNotified = $obrolan->pesan()
            ->where('tipe_pengirim', 'system')
            ->where('pesan', self::HANDOVER_TIMEOUT_MESSAGE)
            ->exists();

        if (! $alreadyNotified) {
            $obrolan->pesan()->create([
                'tipe_pengirim' => 'system',
                'pesan' => self::HANDOVER_TIMEOUT_MESSAGE,
            ]);
        }
    }

    private function lifecycleStatus(Obrolan $obrolan): string
    {
        if ($obrolan->status === 'selesai') {
            return 'CLOSED';
        }

        if ($obrolan->status_handover === 'ditangani') {
            return 'ADMIN_ACTIVE';
        }

        if ($obrolan->status_handover === 'membutuhkan_admin') {
            $handoverMessage = $this->handoverRequestMessage($obrolan);

            if ($handoverMessage) {
                $expiresAt = $handoverMessage->created_at->copy()->addSeconds(15);

                return now()->lt($expiresAt)
                    ? 'HANDOVER_PENDING'
                    : 'WAITING_ADMIN';
            }

            return 'WAITING_ADMIN';
        }

        return 'AI_ACTIVE';
    }

    private function handoverRequestMessage(Obrolan $obrolan): ?PesanObrolan
    {
        return $obrolan->pesan()
            ->where('tipe_pengirim', 'system')
            ->where('pesan', self::HANDOVER_CONNECTING_MESSAGE)
            ->latest('id')
            ->first();
    }

    private function handoverExpiresAt(Obrolan $obrolan): ?string
    {
        if ($obrolan->status_handover !== 'membutuhkan_admin') {
            return null;
        }

        $handoverMessage = $this->handoverRequestMessage($obrolan);

        return $handoverMessage
            ? $handoverMessage->created_at->copy()->addSeconds(15)->toISOString()
            : null;
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
