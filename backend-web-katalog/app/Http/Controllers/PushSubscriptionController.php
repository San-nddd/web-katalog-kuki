<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PushSubscriptionController extends Controller
{
    /**
     * Ambil VAPID public key untuk browser Admin.
     */
    public function vapidKey(): JsonResponse
    {
        $publicKey = config('webpush.vapid.public_key');

        if (! $publicKey) {
            return response()->json([
                'success' => false,
                'message' => 'VAPID public key belum dikonfigurasi.',
                'data' => null,
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'VAPID public key berhasil diambil.',
            'data' => [
                'public_key' => $publicKey,
            ],
        ]);
    }

    /**
     * Simpan / perbarui subscription browser Admin.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|max:1024',

            'keys' => 'required|array',

            'keys.p256dh' => 'required|string',

            'keys.auth' => 'required|string',

            'content_encoding' => [
                'nullable',
                'string',
                Rule::in([
                    'aes128gcm',
                    'aesgcm',
                ]),
            ],
        ]);

        $subscription =
            $request->user()
                ->updatePushSubscription(
                    $validated['endpoint'],
                    $validated['keys']['p256dh'],
                    $validated['keys']['auth'],
                    $validated['content_encoding']
                        ?? 'aes128gcm',
                );

        return response()->json([
            'success' => true,
            'message' =>
                'Notifikasi browser berhasil diaktifkan.',
            'data' => [
                'id' => $subscription->id,
                'endpoint' =>
                    $subscription->endpoint,
            ],
        ], 201);
    }

    /**
     * Hapus subscription browser Admin.
     */
    public function destroy(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'endpoint' =>
                'required|string|max:1024',
        ]);

        $request->user()
            ->deletePushSubscription(
                $validated['endpoint']
            );

        return response()->json([
            'success' => true,
            'message' =>
                'Notifikasi browser berhasil dinonaktifkan.',
            'data' => null,
        ]);
    }
}