<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\produk;
use App\Models\ProdukVarian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProdukVarianController extends Controller
{
    /** Varian aktif untuk katalog publik; tidak mengubah response /api/produk. */
    public function index(produk $produk): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $produk->varian()
                ->where('aktif', true)
                ->orderBy('id')
                ->get(),
        ]);
    }

    /** Semua varian, termasuk nonaktif, khusus Admin. */
    public function adminIndex(produk $produk): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $produk->varian()->orderBy('id')->get(),
        ]);
    }

    public function store(Request $request, produk $produk): JsonResponse
    {
        $this->normalizeCodes($request);
        $data = $request->validate($this->rules());

        $sku = $data['sku'] ?? null;
        if (! $sku) {
            $sku = $this->generateSku();
        }
        $barcode = $data['barcode'] ?? $sku;

        $this->assertCodeAvailable($sku, 'sku');
        if ($barcode !== $sku) {
            $this->assertCodeAvailable($barcode, 'barcode');
        }

        $varian = $produk->varian()->create([
            'nama_varian' => $data['nama_varian'],
            'sku' => $sku,
            'barcode' => $barcode,
            'harga' => $data['harga'],
            'stok' => $data['stok'] ?? 0,
            'stok_minimum' => $data['stok_minimum'] ?? 0,
            'aktif' => $data['aktif'] ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Varian berhasil ditambahkan.',
            'data' => $varian->fresh(),
        ], 201);
    }

    public function update(Request $request, produk $produk, ProdukVarian $varian): JsonResponse
    {
        $this->ensureBelongsToProduct($produk, $varian);
        $this->normalizeCodes($request);
        $data = $request->validate($this->rules(true));

        // Field kosong pada edit tidak menghapus kode yang sudah dicetak.
        $sku = $data['sku'] ?? $varian->sku;
        $barcode = $data['barcode'] ?? $varian->barcode;

        // Mengecek dua kode terhadap kedua tabel; ID varian ini dikecualikan.
        $this->assertCodeAvailable($sku, 'sku', $varian->id);
        if ($barcode !== $sku) {
            $this->assertCodeAvailable($barcode, 'barcode', $varian->id);
        }

        $data['sku'] = $sku;
        $data['barcode'] = $barcode;
        $varian->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Varian berhasil diperbarui.',
            'data' => $varian->fresh(),
        ]);
    }

    public function destroy(produk $produk, ProdukVarian $varian): JsonResponse
    {
        $this->ensureBelongsToProduct($produk, $varian);
        $varian->delete();

        return response()->json([
            'success' => true,
            'message' => 'Varian berhasil dihapus.',
            'data' => null,
        ]);
    }

    private function rules(bool $updating = false): array
    {
        $required = $updating ? 'sometimes' : 'required';

        return [
            'nama_varian' => [$required, 'string', 'max:150'],
            // Hanya huruf besar/angka/tanda hubung, aman untuk Code 128 B.
            'sku' => ['nullable', 'string', 'max:100', 'regex:/^[A-Z0-9-]+$/'],
            'barcode' => ['nullable', 'string', 'max:100', 'regex:/^[A-Z0-9-]+$/'],
            'harga' => [$required, 'numeric', 'min:0', 'max:99999999.99'],
            'stok' => ['sometimes', 'integer', 'min:0', 'max:4294967295'],
            'stok_minimum' => ['sometimes', 'integer', 'min:0', 'max:4294967295'],
            'aktif' => ['sometimes', 'boolean'],
        ];
    }

    private function normalizeCodes(Request $request): void
    {
        foreach (['sku', 'barcode'] as $field) {
            if (! $request->exists($field) || ! is_string($request->input($field))) {
                continue;
            }

            $code = Str::upper(trim($request->input($field)));
            $request->merge([$field => $code === '' ? null : $code]);
        }
    }

    private function assertCodeAvailable(string $code, string $field, ?int $exceptVarian = null): void
    {
        if ($this->codeExists($code, $exceptVarian)) {
            throw ValidationException::withMessages([
                $field => 'Kode sudah digunakan oleh produk atau varian lain.',
            ]);
        }
    }

    private function codeExists(string $code, ?int $exceptVarian = null): bool
    {
        // Dua tabel memiliki indeks unik masing-masing; cek silang agar scanner
        // tidak menemukan dua produk dengan nilai barcode/SKU yang sama.
        if (produk::query()->where('barcode', $code)->exists()) {
            return true;
        }

        return ProdukVarian::query()
            ->where(function ($query) use ($code) {
                $query->where('sku', $code)->orWhere('barcode', $code);
            })
            ->when($exceptVarian !== null, fn ($query) => $query->where('id', '!=', $exceptVarian))
            ->exists();
    }

    private function generateSku(): string
    {
        do {
            $sku = 'KKB-VR-'.Str::upper(Str::random(10));
        } while ($this->codeExists($sku));

        return $sku;
    }

    private function ensureBelongsToProduct(produk $produk, ProdukVarian $varian): void
    {
        abort_unless((int) $varian->produk_id === (int) $produk->getKey(), 404);
    }
}
