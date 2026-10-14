<?php

namespace App\Http\Controllers;

use App\Models\produk;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class produkController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(produk::with('kategori')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate($this->rules());

        $produk = produk::create($this->prepare($validated));

        return response()->json($produk, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $produk = produk::with('kategori')->find($id);

        if (! $produk) {
            return response()->json(['message' => 'Produk tidak ditemukan'], 404);
        }

        return response()->json($produk);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $produk = produk::find($id);

        if (! $produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $validated = $request->validate($this->rules($produk->id));
        $produk->update($this->prepare($validated));

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil diperbarui.',
            'data' => $produk->fresh('kategori'),
        ]);
    }

    /**
     * Remove the specified resource in storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $produk = produk::find($id);

        if (! $produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        if ($produk->gambar_produk) {
            Storage::disk('public')->delete($produk->gambar_produk);
        }

        $produk->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dihapus.',
            'data' => null,
        ]);
    }

    /**
     * Upload gambar produk.
     */
    public function uploadGambar(Request $request, string $id): JsonResponse
    {
        $produk = produk::find($id);

        if (! $produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan.',
                'data' => null,
            ], 404);
        }

        $validated = $request->validate([
            'gambar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($produk->gambar_produk) {
            Storage::disk('public')->delete($produk->gambar_produk);
        }

        $path = $request->file('gambar')->store('produk', 'public');
        $produk->update(['gambar_produk' => $path]);

        return response()->json([
            'success' => true,
            'message' => 'Gambar produk berhasil diunggah.',
            'data' => [
                'gambar' => $path,
                'url' => asset('storage/'.$path),
            ],
        ]);
    }

    /**
     * Aturan validasi untuk create / update.
     */
    private function rules(?int $exceptId = null): array
    {
        return [
            'nama_produk' => 'required|string|max:255',
            'deskripsi_produk' => 'required|string',
            'harga_produk' => 'required|numeric|min:0',
            'gambar_produk' => 'nullable|string|max:1000',
            'kategori_id' => 'nullable|integer|exists:kategoris,id',
            'barcode' => 'nullable|string|max:100',
            'slug' => ['nullable', 'string', 'max:255', 'regex:/^[a-z0-9\-]*$/', Rule::unique('katalog_produk', 'slug')->ignore($exceptId)],
            'stok' => 'nullable|integer|min:0',
            'stok_minimum' => 'nullable|integer|min:0',
            'metadata_ai' => 'nullable|string|max:65000',
        ];
    }

    /**
     * Bersihkan dan lengkapi nilai sebelum disimpan.
     */
    private function prepare(array $validated): array
    {
        if (! isset($validated['slug']) || $validated['slug'] === '' || $validated['slug'] === null) {
            $validated['slug'] = Str::slug($validated['nama_produk']);
        }

        $validated['stok'] = (int) ($validated['stok'] ?? 0);
        $validated['stok_minimum'] = (int) ($validated['stok_minimum'] ?? 0);

        return $validated;
    }
}
