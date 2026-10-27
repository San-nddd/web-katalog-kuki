<?php

namespace App\Http\Middleware;

use App\Models\PosSesi;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PosAuthenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return response()->json(['message' => 'Sesi kasir tidak valid.'], 401);
        }
        $session = PosSesi::with('pegawai')
            ->where('token_hash', hash('sha256', $token))
            ->where('kedaluwarsa_pada', '>', now())->first();
        if (!$session || !$session->pegawai?->aktif) {
            return response()->json(['message' => 'Sesi kasir sudah habis. Login ulang.'], 401);
        }
        $request->attributes->set('pos_pegawai', $session->pegawai);
        $request->attributes->set('pos_sesi', $session);
        return $next($request);
    }
}
