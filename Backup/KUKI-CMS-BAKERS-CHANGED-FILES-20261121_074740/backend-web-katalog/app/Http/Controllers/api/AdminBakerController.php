<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Baker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AdminBakerController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => Baker::query()
                ->orderBy('urutan')
                ->orderBy('id')
                ->get()
                ->map(fn (Baker $baker): array => $this->serialize($baker)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $baker = Baker::create([
            'nama' => $validated['nama'],
            'spesialisasi' => $validated['spesialisasi'],
            'urutan' => $validated['urutan'] ?? 0,
            'aktif' => $validated['aktif'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Baker berhasil ditambahkan.',
            'data' => $this->serialize($baker),
        ], 201);
    }

    public function update(Request $request, Baker $baker): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $payload = [
            'nama' => $validated['nama'],
            'spesialisasi' => $validated['spesialisasi'],
        ];

        if (array_key_exists('urutan', $validated)) {
            $payload['urutan'] = $validated['urutan'];
        }

        if (array_key_exists('aktif', $validated)) {
            $payload['aktif'] = $validated['aktif'];
        }

        $baker->update($payload);

        return response()->json([
            'success' => true,
            'message' => 'Baker berhasil diperbarui.',
            'data' => $this->serialize($baker->fresh()),
        ]);
    }

    public function destroy(Baker $baker): JsonResponse
    {
        $photoPath = $baker->foto;
        $baker->delete();

        if ($photoPath) {
            Storage::disk('public')->delete($photoPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Baker berhasil dihapus.',
            'data' => null,
        ]);
    }

    public function publication(Request $request, Baker $baker): JsonResponse
    {
        $validated = $request->validate([
            'aktif' => 'required|boolean',
        ]);

        $baker->update(['aktif' => $validated['aktif']]);

        return response()->json([
            'success' => true,
            'message' => 'Status publikasi baker berhasil diperbarui.',
            'data' => $this->serialize($baker->fresh()),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:bakers,id',
        ]);

        foreach ($validated['ids'] as $index => $id) {
            Baker::query()->whereKey($id)->update(['urutan' => $index]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Urutan bakers berhasil diperbarui.',
            'data' => Baker::query()
                ->orderBy('urutan')
                ->orderBy('id')
                ->get()
                ->map(fn (Baker $baker): array => $this->serialize($baker)),
        ]);
    }

    public function uploadFoto(Request $request, Baker $baker): JsonResponse
    {
        $request->validate([
            'foto' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $previousPath = $baker->foto;
        $photoPath = $request->file('foto')->store('bakers', 'public');
        $baker->update(['foto' => $photoPath]);

        if ($previousPath) {
            Storage::disk('public')->delete($previousPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Foto baker berhasil diunggah.',
            'data' => $this->serialize($baker->fresh()),
        ]);
    }

    public function deleteFoto(Baker $baker): JsonResponse
    {
        $photoPath = $baker->foto;
        $baker->update(['foto' => null]);

        if ($photoPath) {
            Storage::disk('public')->delete($photoPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Foto baker berhasil dihapus.',
            'data' => $this->serialize($baker->fresh()),
        ]);
    }

    private function rules(): array
    {
        return [
            'nama' => 'required|string|max:255',
            'spesialisasi' => 'required|string|max:255',
            'urutan' => 'sometimes|required|integer|min:0|max:65535',
            'aktif' => 'sometimes|required|boolean',
        ];
    }

    private function serialize(Baker $baker): array
    {
        return [
            'id' => $baker->id,
            'nama' => $baker->nama,
            'spesialisasi' => $baker->spesialisasi,
            'foto' => $baker->foto,
            'urutan' => $baker->urutan,
            'aktif' => $baker->aktif,
        ];
    }
}
