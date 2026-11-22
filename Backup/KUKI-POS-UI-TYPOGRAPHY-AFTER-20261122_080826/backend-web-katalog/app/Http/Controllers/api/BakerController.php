<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Baker;
use Illuminate\Http\JsonResponse;

class BakerController extends Controller
{
    public function index(): JsonResponse
    {
        $bakers = Baker::query()
            ->where('aktif', true)
            ->orderBy('urutan')
            ->orderBy('id')
            ->get()
            ->map(fn (Baker $baker): array => [
                'id' => $baker->id,
                'name' => $baker->nama,
                'role' => $baker->spesialisasi,
                'photo' => $baker->foto,
            ]);

        return response()->json(['success' => true, 'data' => $bakers]);
    }
}
