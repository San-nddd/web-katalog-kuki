<?php

namespace App\Http\Controllers;

use App\Models\kategori;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class kategoriController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Data kategori berhasil diambil.',
            'data' => kategori::withCount('produk')->orderBy('nama')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9\-]*$/', 'unique:kategoris,slug'],
        ]);

        $validated['slug'] = ($validated['slug'] ?? null) ?: Str::slug($validated['nama']);
        $kategori = kategori::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil ditambahkan.',
            'data' => $kategori,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $kategori = kategori::withCount('produk')->find($id);

        if (! $kategori) {
            return $this->notFound();
        }

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil diambil.',
            'data' => $kategori,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $kategori = kategori::find($id);

        if (! $kategori) {
            return $this->notFound();
        }

        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9\-]*$/', Rule::unique('kategoris', 'slug')->ignore($kategori->id)],
        ]);

        $validated['slug'] = ($validated['slug'] ?? null) ?: Str::slug($validated['nama']);
        $kategori->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil diperbarui.',
            'data' => $kategori,
        ]);
    }

    /**
     * Remove the specified resource in storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $kategori = kategori::find($id);

        if (! $kategori) {
            return $this->notFound();
        }

        if ($kategori->gambar) {
            Storage::disk('public')->delete($kategori->gambar);
        }

        $kategori->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kategori berhasil dihapus.',
            'data' => null,
        ]);
    }

    /**
     * Upload gambar kategori.
     */
    public function uploadGambar(Request $request, string $id): JsonResponse
    {
        $kategori = kategori::find($id);

        if (! $kategori) {
            return $this->notFound();
        }

        $request->validate([
            'gambar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($kategori->gambar) {
            Storage::disk('public')->delete($kategori->gambar);
        }

        $path = $request->file('gambar')->store('kategori', 'public');
        $kategori->update(['gambar' => $path]);

        return response()->json([
            'success' => true,
            'message' => 'Gambar kategori berhasil diunggah.',
            'data' => [
                'gambar' => $path,
                'url' => asset('storage/'.$path),
            ],
        ]);
    }

    private function notFound(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Kategori tidak ditemukan.',
            'data' => null,
        ], 404);
    }
}
