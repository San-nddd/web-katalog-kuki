<?php

namespace App\Http\Controllers;

use App\Models\Obrolan;
use App\Models\PesanObrolan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminChatController extends Controller
{
    private const HANDOVER_CONNECTING_MESSAGE = 'Sedang menghubungkan Anda ke Admin...';

    private const HANDOVER_TIMEOUT_MESSAGE = 'Admin sedang belum dapat merespons langsung. Pesan Anda sudah masuk dan akan ditanggapi secepatnya.';

    private const ADMIN_JOINED_MESSAGE = 'Admin Kuki telah bergabung dalam percakapan.';

    private const CLOSED_MESSAGE = 'Percakapan ini telah selesai.';

    public function index(Request $request): JsonResponse
    {
        $status = strtoupper((string) $request->query('status', 'ALL'));
        $page = max((int) $request->query('page', 1), 1);
        $limit = min(max((int) $request->query('limit', 20), 1), 100);

        /*
         * Inbox Admin hanya menampilkan conversation yang pernah handover
         * atau sudah selesai. AI-only chat tidak memenuhi inbox Admin.
         */
        $query = Obrolan::with([
            'pesan' => fn ($q) => $q->latest()->limit(1),
            'produk',
        ])
            ->withCount([
                'pesan as total_pesan' => fn ($q) => $q->where('tipe_pengirim', 'user'),
            ])
            ->where(function ($q) {
                $q->whereNotNull('status_handover')
                    ->orWhere('status', 'selesai');
            })
            ->orderByDesc('updated_at');

        $all = $query->get();

        foreach ($all as $obrolan) {
            $this->applyHandoverTimeoutIfNeeded($obrolan);
            $obrolan->refresh();
        }

        if ($status !== 'ALL') {
            $all = $all
                ->filter(fn (Obrolan $obrolan) => $this->lifecycleStatus($obrolan) === $status)
                ->values();
        }

        $total = $all->count();
        $items = $all->slice(($page - 1) * $limit, $limit)->values();

        $data = $items->map(fn (Obrolan $obrolan) => $this->serializeConversation($obrolan));

        return response()->json([
            'success' => true,
            'message' => 'Daftar obrolan berhasil diambil.',
            'data' => $data,
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $obrolan = Obrolan::with(['pesan', 'produk'])->find($id);

        if (! $obrolan) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $this->applyHandoverTimeoutIfNeeded($obrolan);
        $obrolan->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Detail obrolan berhasil diambil.',
            'data' => [
                ...$this->serializeConversation($obrolan),
                'pesan' => $this->serializeMessages($obrolan),
            ],
        ]);
    }

    /**
     * Admin secara eksplisit mengambil alih conversation.
     * Membuka chat / menandai dibaca TIDAK melakukan takeover.
     */
    public function ambil(string $id): JsonResponse
    {
        $result = DB::transaction(function () use ($id) {
            /** @var Obrolan|null $obrolan */
            $obrolan = Obrolan::query()->lockForUpdate()->find($id);

            if (! $obrolan) {
                return [
                    'response' => response()->json([
                        'success' => false,
                        'message' => 'Obrolan tidak ditemukan.',
                        'data' => null,
                    ], 404),
                ];
            }

            $this->applyHandoverTimeoutIfNeeded($obrolan);
            $obrolan->refresh();

            $status = $this->lifecycleStatus($obrolan);

            if ($status === 'ADMIN_ACTIVE') {
                return [
                    'response' => response()->json([
                        'success' => false,
                        'message' => 'Percakapan sudah diambil oleh Admin.',
                        'data' => null,
                    ], 409),
                ];
            }

            if (! in_array($status, ['HANDOVER_PENDING', 'WAITING_ADMIN'], true)) {
                return [
                    'response' => response()->json([
                        'success' => false,
                        'message' => 'Percakapan tidak sedang menunggu Admin.',
                        'data' => null,
                    ], 409),
                ];
            }

            $obrolan->update([
                'status' => 'aktif',
                'status_handover' => 'ditangani',
            ]);

            $obrolan->pesan()->create([
                'tipe_pengirim' => 'system',
                'pesan' => self::ADMIN_JOINED_MESSAGE,
            ]);

            $obrolan->refresh();

            return ['obrolan' => $obrolan];
        });

        if (isset($result['response'])) {
            return $result['response'];
        }

        /** @var Obrolan $obrolan */
        $obrolan = $result['obrolan'];

        return response()->json([
            'success' => true,
            'message' => 'Percakapan berhasil diambil.',
            'data' => [
                'id' => $obrolan->id,
                'status' => 'ADMIN_ACTIVE',
            ],
        ]);
    }

    public function balas(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:2000',
        ]);

        $obrolan = Obrolan::find($id);

        if (! $obrolan) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($this->lifecycleStatus($obrolan) !== 'ADMIN_ACTIVE') {
            return response()->json([
                'success' => false,
                'message' => 'Ambil percakapan terlebih dahulu sebelum membalas.',
                'data' => null,
            ], 409);
        }

        $pesan = $obrolan->pesan()->create([
            'tipe_pengirim' => 'admin',
            'pesan' => $validated['message'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Balasan admin berhasil dikirim.',
            'data' => [
                'id' => $pesan->id,
                'obrolan_id' => $pesan->obrolan_id,
                'pengirim' => 'admin',
                'isi' => $pesan->pesan,
                'created_at' => $pesan->created_at,
            ],
        ]);
    }

    public function selesai(string $id): JsonResponse
    {
        $obrolan = Obrolan::find($id);

        if (! $obrolan) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($this->lifecycleStatus($obrolan) !== 'ADMIN_ACTIVE') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya percakapan yang sedang ditangani yang dapat diselesaikan.',
                'data' => null,
            ], 409);
        }

        $obrolan->update([
            'status' => 'selesai',
        ]);

        $obrolan->pesan()->create([
            'tipe_pengirim' => 'system',
            'pesan' => self::CLOSED_MESSAGE,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Percakapan berhasil diselesaikan.',
            'data' => [
                'id' => $obrolan->id,
                'status' => 'CLOSED',
            ],
        ]);
    }

    public function pesanBaru(Request $request, string $id): JsonResponse
    {
        $obrolan = Obrolan::find($id);

        if (! $obrolan) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $this->applyHandoverTimeoutIfNeeded($obrolan);
        $obrolan->refresh();

        $sinceId = (int) $request->query('since', 0);

        $messages = PesanObrolan::where('obrolan_id', $id)
            ->where('id', '>', $sinceId)
            ->orderBy('id')
            ->get()
            ->map(fn (PesanObrolan $pesan) => $this->serializeMessage($pesan))
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'message' => 'Pesan baru berhasil diambil.',
            'data' => $messages,
            'meta' => [
                'status' => $this->lifecycleStatus($obrolan),
                'handover_expires_at' => $this->handoverExpiresAt($obrolan),
            ],
        ]);
    }

    /**
     * Untuk sekarang hanya ACK.
     * Jangan ubah status lifecycle ketika Admin membuka conversation.
     */
    public function baca(string $id): JsonResponse
    {
        if (! Obrolan::whereKey($id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Obrolan ditandai dibaca.',
            'data' => null,
        ]);
    }

    public function statistik(): JsonResponse
    {
        $obrolan = Obrolan::where(function ($q) {
            $q->whereNotNull('status_handover')
                ->orWhere('status', 'selesai');
        })->get();

        foreach ($obrolan as $item) {
            $this->applyHandoverTimeoutIfNeeded($item);
            $item->refresh();
        }

        $statuses = $obrolan->map(fn (Obrolan $item) => $this->lifecycleStatus($item));

        $stats = [
            'total_handover_pending' => $statuses->filter(fn ($status) => $status === 'HANDOVER_PENDING')->count(),
            'total_waiting' => $statuses->filter(fn ($status) => $status === 'WAITING_ADMIN')->count(),
            'total_active' => $statuses->filter(fn ($status) => $status === 'ADMIN_ACTIVE')->count(),
            'total_closed' => $statuses->filter(fn ($status) => $status === 'CLOSED')->count(),
            'total_today' => $obrolan->filter(fn ($item) => $item->created_at?->isToday())->count(),
        ];

        $stats['total_pending'] = $stats['total_handover_pending'] + $stats['total_waiting'];

        return response()->json([
            'success' => true,
            'message' => 'Statistik obrolan berhasil diambil.',
            'data' => $stats,
        ]);
    }

    public function pertanyaanTidakTerjawab(Request $request): JsonResponse
    {
        $page = max((int) $request->query('page', 1), 1);
        $limit = min(max((int) $request->query('limit', 20), 1), 100);

        $query = Obrolan::with([
            'pesan' => fn ($q) => $q->where('tipe_pengirim', 'user')->latest()->limit(1),
            'produk',
        ])
            ->where('status_handover', 'membutuhkan_admin')
            ->orderByDesc('updated_at');

        $all = $query->get();

        foreach ($all as $obrolan) {
            $this->applyHandoverTimeoutIfNeeded($obrolan);
            $obrolan->refresh();
        }

        $total = $all->count();
        $items = $all->slice(($page - 1) * $limit, $limit)->values();

        $data = $items->map(function (Obrolan $obrolan) {
            $lastUserMessage = $obrolan->pesan->first();

            return [
                'id' => $obrolan->id,
                'session_id' => $obrolan->session_id,
                'status' => $this->lifecycleStatus($obrolan),
                'status_handover' => $obrolan->status_handover,
                'handover_expires_at' => $this->handoverExpiresAt($obrolan),
                'pertanyaan_terakhir' => $lastUserMessage ? [
                    'id' => $lastUserMessage->id,
                    'isi' => $lastUserMessage->pesan,
                    'created_at' => $lastUserMessage->created_at,
                ] : null,
                'product' => $obrolan->produk ? [
                    'id' => $obrolan->produk->id,
                    'nama' => $obrolan->produk->nama_produk,
                ] : null,
                'updated_at' => $obrolan->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Pertanyaan tidak terjawab berhasil diambil.',
            'data' => $data,
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ]);
    }

    private function serializeConversation(Obrolan $obrolan): array
    {
        $lastMessage = $obrolan->pesan->first();

        return [
            'id' => $obrolan->id,
            'session_id' => $obrolan->session_id,
            'status' => $this->lifecycleStatus($obrolan),
            'status_handover' => $obrolan->status_handover,
            'handover_expires_at' => $this->handoverExpiresAt($obrolan),
            'product_id' => $obrolan->product_id,
            'pertanyaan_awal' => $obrolan->pertanyaan_awal,
            'pengunjung' => [
                'nama' => 'Pengunjung',
                'email' => null,
            ],
            'product' => $obrolan->produk ? [
                'id' => $obrolan->produk->id,
                'nama' => $obrolan->produk->nama_produk,
            ] : null,
            'pesan_terakhir' => $lastMessage ? [
                'id' => $lastMessage->id,
                'tipe_pengirim' => $lastMessage->tipe_pengirim,
                'isi' => $lastMessage->pesan,
                'created_at' => $lastMessage->created_at,
            ] : null,
            'total_pesan_user' => $obrolan->total_pesan ?? null,
            'updated_at' => $obrolan->updated_at,
            'created_at' => $obrolan->created_at,
        ];
    }

    private function serializeMessages(Obrolan $obrolan): array
    {
        return $obrolan->pesan()
            ->orderBy('id')
            ->get()
            ->map(fn (PesanObrolan $pesan) => $this->serializeMessage($pesan))
            ->values()
            ->all();
    }

    private function serializeMessage(PesanObrolan $pesan): array
    {
        return [
            'id' => $pesan->id,
            'obrolan_id' => $pesan->obrolan_id,
            'pengirim' => $pesan->tipe_pengirim,
            'isi' => $pesan->pesan,
            'created_at' => $pesan->created_at,
        ];
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
                return now()->lt($handoverMessage->created_at->copy()->addSeconds(15))
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
}
