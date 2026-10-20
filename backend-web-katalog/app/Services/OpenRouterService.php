<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenRouterService
{
    private const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

    /**
     * Status yang layak dicoba ulang menggunakan model/provider lain.
     */
    private const RETRYABLE_STATUS = [
        408,
        409,
        425,
        429,
        500,
        502,
        503,
        504,
    ];

    /**
     * Kirim percakapan ke OpenRouter.
     *
     * Strategi:
     * - Ambil model pool dari config/services.php.
     * - Acak urutan model setiap request.
     * - Jika model pertama kena rate-limit / timeout / provider error,
     *   otomatis mencoba model berikutnya.
     * - Tidak infinite retry.
     * - Error akun/API key (401/402/403) langsung dihentikan karena
     *   mengganti model tidak akan menyelesaikan masalah tersebut.
     *
     * @param  string  $systemPrompt
     * @param  array<int, array{role: string, text: string}>  $history
     * @param  string  $message
     */
    public function generate(string $systemPrompt, array $history, string $message): ?string
    {
        $key = config('services.openrouter.key');

        if (! $key) {
            Log::warning('OPENROUTER_API_KEY belum dikonfigurasi.');

            return null;
        }

        $models = $this->modelPool();

        if ($models === []) {
            Log::warning('Model OpenRouter belum dikonfigurasi.');

            return null;
        }

        $messages = $this->buildMessages($systemPrompt, $history, $message);

        // User meminta model dipilih secara acak agar tidak selalu menumpuk pada
        // provider/model yang sama. Urutan berikut juga menjadi urutan fallback.
        shuffle($models);

        $maxAttempts = max(
            1,
            min(
                (int) config('services.openrouter.max_attempts', 3),
                count($models)
            )
        );

        $attemptedModels = [];

        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            $model = $models[$attempt];
            $attemptedModels[] = $model;

            try {
                $response = $this->request($key, $model, $messages);
            } catch (ConnectionException $e) {
                Log::warning('OpenRouter connection/timeout error; mencoba model berikutnya.', [
                    'model' => $model,
                    'attempt' => $attempt + 1,
                    'error' => $e->getMessage(),
                ]);

                continue;
            }

            if ($response->successful()) {
                $text = trim((string) ($response->json('choices.0.message.content') ?? ''));

                if ($text !== '') {
                    Log::info('OpenRouter response berhasil.', [
                        'model' => $model,
                        'attempt' => $attempt + 1,
                    ]);

                    return $text;
                }

                Log::warning('OpenRouter mengembalikan jawaban kosong; mencoba model berikutnya.', [
                    'model' => $model,
                    'attempt' => $attempt + 1,
                ]);

                continue;
            }

            $status = $response->status();

            Log::warning('OpenRouter model gagal.', [
                'model' => $model,
                'attempt' => $attempt + 1,
                'status' => $status,
                // Jangan log API key / header. Body dibatasi agar log tidak membengkak.
                'body' => mb_substr($response->body(), 0, 1000),
            ]);

            // Masalah auth / billing / permission berlaku untuk akun secara umum.
            // Pindah model biasanya tidak membantu.
            if (in_array($status, [401, 402, 403], true)) {
                break;
            }

            // 404 dapat berarti model/provider yang dipilih tidak tersedia.
            // Dalam kasus itu model berikutnya masih layak dicoba.
            if ($status === 404) {
                continue;
            }

            if (! in_array($status, self::RETRYABLE_STATUS, true)) {
                break;
            }
        }

        Log::error('Semua percobaan OpenRouter gagal.', [
            'attempted_models' => $attemptedModels,
        ]);

        return null;
    }

    /**
     * @param  array<int, array{role: string, text: string}>  $history
     * @return array<int, array{role: string, content: string}>
     */
    private function buildMessages(string $systemPrompt, array $history, string $message): array
    {
        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        foreach ($history as $turn) {
            $messages[] = [
                'role' => $turn['role'] === 'bot' ? 'assistant' : 'user',
                'content' => (string) ($turn['text'] ?? ''),
            ];
        }

        $messages[] = [
            'role' => 'user',
            'content' => $message,
        ];

        return $messages;
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $messages
     */
    private function request(string $key, string $model, array $messages): Response
    {
        $payload = [
            'model' => $model,
            'messages' => $messages,
            'temperature' => (float) config('services.openrouter.temperature', 0.5),
            'max_tokens' => (int) config('services.openrouter.max_tokens', 700),
        ];

        return Http::withHeaders([
            'Authorization' => 'Bearer '.$key,
            'HTTP-Referer' => config('app.url'),
            'X-Title' => config('app.name'),
            'Content-Type' => 'application/json',
        ])
            ->connectTimeout((int) config('services.openrouter.connect_timeout', 10))
            ->timeout((int) config('services.openrouter.timeout', 45))
            ->post(self::ENDPOINT, $payload);
    }

    /**
     * Ambil semua kandidat model tanpa menduplikasi nama.
     *
     * config('services.openrouter.models') boleh berupa:
     * - array
     * - string dipisah koma
     *
     * Untuk kompatibilitas dengan config lama, model dan fallback_model juga
     * otomatis dimasukkan ke pool.
     *
     * @return array<int, string>
     */
    private function modelPool(): array
    {
        $configured = config('services.openrouter.models', []);

        if (is_string($configured)) {
            $configured = explode(',', $configured);
        }

        if (! is_array($configured)) {
            $configured = [];
        }

        $models = array_merge(
            $configured,
            [
                config('services.openrouter.model'),
                config('services.openrouter.fallback_model'),
            ]
        );

        $models = array_map(
            static fn ($model) => trim((string) $model),
            $models
        );

        $models = array_filter(
            $models,
            static fn (string $model) => $model !== ''
        );

        return array_values(array_unique($models));
    }
}
