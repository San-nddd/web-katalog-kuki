<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenRouterService
{
    private const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

    /**
     * Kirim percakapan ke OpenRouter dan kembalikan teks jawaban.
     * Mengembalikan null apabila API gagal atau jawaban kosong.
     *
     * @param  string  $systemPrompt  Instruksi sistem (scope Kuki Assistant).
     * @param  array<int, array{role: string, text: string}>  $history  Riwayat percakapan sebelumnya.
     * @param  string  $message  Pertanyaan terbaru dari pengguna.
     */
    public function generate(string $systemPrompt, array $history, string $message): ?string
    {
        $key = config('services.openrouter.key');

        if (! $key) {
            Log::warning('OPENROUTER_API_KEY belum dikonfigurasi.');

            return null;
        }

        $messages = [['role' => 'system', 'content' => $systemPrompt]];

        foreach ($history as $turn) {
            $messages[] = [
                'role' => $turn['role'] === 'bot' ? 'assistant' : 'user',
                'content' => $turn['text'],
            ];
        }

        $messages[] = ['role' => 'user', 'content' => $message];

        $payload = [
            'model' => config('services.openrouter.model'),
            'messages' => $messages,
            'temperature' => 0.6,
            'max_tokens' => 1024,
        ];

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer '.$key,
                'HTTP-Referer' => config('app.url'),
                'X-Title' => config('app.name'),
                'Content-Type' => 'application/json',
            ])->timeout(config('services.openrouter.timeout', 30))
                ->post(self::ENDPOINT, $payload);
        } catch (ConnectionException $e) {
            Log::warning('Gagal terhubung ke OpenRouter: '.$e->getMessage());

            return null;
        }

        if (! $response->successful()) {
            Log::warning('OpenRouter error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        $text = trim((string) ($response->json('choices.0.message.content') ?? ''));

        return $text === '' ? null : $text;
    }
}
