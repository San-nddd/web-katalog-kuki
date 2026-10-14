<?php

namespace App\Http\Controllers;

use App\Models\Obrolan;
use App\Models\PesanObrolan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminChatController extends Controller
{
    /**
     * Daftar obrolan dengan filter status dan pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');
        $page = (int) $request->query('page', 1);
        $limit = min((int) $request->query('limit', 20), 100);

        $query = Obrolan::with(['pesan' => fn ($q) => $q->latest()->limit(1), 'produk'])
            ->withCount(['pesan as total_pesan' => fn ($q) => $q->where('tipe_pengirim', 'user')])
            ->orderByDesc('updated_at');

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $total = $query->count();
        $obrolan = $query->skip(($page - 1) * $limit)->take($limit)->get();

        $data = $obrolan->map(function ($o) {
            $lastMessage = $o->pesan->first();

            return [
                'id' => $o->id,
                'session_id' => $o->session_id,
                'status' => $o->status,
                'status_handover' => $o->status_handover,
                'product_id' => $o->product_id,
                'pertanyaan_awal' => $o->pertanyaan_awal,
                'pengunjung' => [
                    'nama' => 'Pengunjung',
                    'email' => null,
                ],
                'product' => $o->produk ? [
                    'id' => $o->produk->id,
                    'nama' => $o->produk->nama_produk,
                ] : null,
                'pesan_terakhir' => $lastMessage ? [
                    'id' => $lastMessage->id,
                    'tipe_pengirim' => $lastMessage->tipe_pengirim,
                    'isi' => $lastMessage->pesan,
                    'created_at' => $lastMessage->created_at,
                ] : null,
                'total_pesan_user' => $o->total_pesan,
                'updated_at' => $o->updated_at,
                'created_at' => $o->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Daftar obrolan berhasil diambil.',
            'data' => $data,
            'meta' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit),
            ],
        ]);
    }

    /**
     * Detail obrolan dengan riwayat pesan lengkap.
     */
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

        $messages = $obrolan->pesan()
            ->orderBy('id')
            ->get()
            ->map(fn (PesanObrolan $p) => [
                'id' => $p->id,
                'obrolan_id' => $p->obrolan_id,
                'pengirim' => $p->tipe_pengirim,
                'isi' => $p->pesan,
                'created_at' => $p->created_at,
            ])->values()->all();

        return response()->json([
            'success' => true,
            'message' => 'Detail obrolan berhasil diambil.',
            'data' => [
                'id' => $obrolan->id,
                'session_id' => $obrolan->session_id,
                'status' => $obrolan->status,
                'status_handover' => $obrolan->status_handover,
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
                'pesan' => $messages,
                'updated_at' => $obrolan->updated_at,
                'created_at' => $obrolan->created_at,
            ],
        ]);
    }

    /**
     * Admin balas ke obrolan.
     */
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

        // Simpan balasan admin
        $pesan = $obrolan->pesan()->create([
            'tipe_pengirim' => 'admin',
            'pesan' => $validated['message'],
        ]);

        // Update status obrolan jika sebelumnya waiting
        if ($obrolan->status === 'menunggu') {
            $obrolan->update(['status' => 'aktif']);
        }

        // Update status handover jika perlu
        if ($obrolan->status_handover === 'membutuhkan_admin') {
            $obrolan->update(['status_handover' => 'ditangani']);
        }

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

    /**
     * Ambil pesan baru untuk polling.
     */
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

        $sinceId = (int) $request->query('since', 0);

        $messages = PesanObrolan::where('obrolan_id', $id)
            ->where('id', '>', $sinceId)
            ->orderBy('id')
            ->get()
            ->map(fn (PesanObrolan $p) => [
                'id' => $p->id,
                'obrolan_id' => $p->obrolan_id,
                'pengirim' => $p->tipe_pengirim,
                'isi' => $p->pesan,
                'created_at' => $p->created_at,
            ])->values()->all();

        return response()->json([
            'success' => true,
            'message' => 'Pesan baru berhasil diambil.',
            'data' => $messages,
        ]);
    }

    /**
     * Tandai obrolan sebagai dibaca oleh admin.
     */
    public function baca(string $id): JsonResponse
    {
        $obrolan = Obrolan::find($id);

        if (! $obrolan) {
            return response()->json([
                'success' => false,
                'message' => 'Obrolan tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($obrolan->status === 'menunggu') {
            $obrolan->update(['status' => 'aktif']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Obrolan ditandai dibaca.',
            'data' => null,
        ]);
    }

    /**
     * Statistik obrolan untuk dashboard.
     */
    public function statistik(): JsonResponse
    {
        $stats = [
            'total_waiting' => Obrolan::where('status', 'menunggu')->count(),
            'total_active' => Obrolan::where('status', 'aktif')->count(),
            'total_escalated' => Obrolan::whereIn('status_handover', ['membutuhkan_admin', 'ditangani'])->count(),
            'total_closed' => Obrolan::where('status', 'selesai')->count(),
            'total_today' => Obrolan::whereDate('created_at', today())->count(),
        ];

        return response()->json([
            'success' => true,
            'message' => 'Statistik obrolan berhasil diambil.',
            'data' => $stats,
        ]);
    }

    /**
     * Daftar pertanyaan yang tidak terjawab (butuh admin).
     */
    public function pertanyaanTidakTerjawab(Request $request): JsonResponse
    {
        $page = (int) $request->query('page', 1);
        $limit = min((int) $request->query('limit', 20), 100);

        $query = Obrolan::with(['pesan' => fn ($q) => $q->where('tipe_pengirim', 'user')->latest()->limit(1), 'produk'])
            ->where('status_handover', 'membutuhkan_admin')
            ->orderByDesc('updated_at');

        $total = $query->count();
        $obrolan = $query->skip(($page - 1) * $limit)->take($limit)->get();

        $data = $obrolan->map(function ($o) {
            $lastUserMessage = $o->pesan->first();

            return [
                'id' => $o->id,
                'session_id' => $o->session_id,
                'status' => $o->status,
                'status_handover' => $o->status_handover,
                'pertanyaan_terakhir' => $lastUserMessage ? [
                    'id' => $lastUserMessage->id,
                    'isi' => $lastUserMessage->pesan,
                    'created_at' => $lastUserMessage->created_at,
                ] : null,
                'product' => $o->produk ? [
                    'id' => $o->produk->id,
                    'nama' => $o->produk->nama_produk,
                ] : null,
                'updated_at' => $o->updated_at,
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
}
