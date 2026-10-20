<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BlogCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => BlogCategory::withCount(['posts' => fn ($q) => $q->where('status', 'published')->where('published_at', '<=', now())])->orderBy('nama')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['nama' => 'required|string|max:255', 'slug' => 'nullable|string|max:255|regex:/^[a-z0-9-]+$/|unique:blog_categories,slug']);
        $data['slug'] = ($data['slug'] ?? null) ?: Str::slug($data['nama']);
        if ($data['slug'] === '' || BlogCategory::where('slug', $data['slug'])->exists()) {
            return response()->json(['message' => 'Slug kategori tidak valid atau sudah digunakan.'], 422);
        }
        $category = BlogCategory::create($data);
        return response()->json(['success' => true, 'data' => $category], 201);
    }

    public function update(Request $request, BlogCategory $category): JsonResponse
    {
        $data = $request->validate([
            'nama' => 'sometimes|required|string|max:255',
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/', Rule::unique('blog_categories', 'slug')->ignore($category->id)],
        ]);
        if (array_key_exists('slug', $data) && !$data['slug']) {
            $data['slug'] = Str::slug($data['nama'] ?? $category->nama);
        }
        if (isset($data['slug']) && ($data['slug'] === '' || BlogCategory::where('slug', $data['slug'])->where('id', '!=', $category->id)->exists())) {
            return response()->json(['message' => 'Slug kategori tidak valid atau sudah digunakan.'], 422);
        }
        $category->update($data);
        return response()->json(['success' => true, 'data' => $category->fresh()]);
    }

    public function destroy(BlogCategory $category): JsonResponse
    {
        if ($category->posts()->exists()) {
            return response()->json(['success' => false, 'message' => 'Kategori masih digunakan artikel.'], 409);
        }
        $category->delete();
        return response()->json(['success' => true, 'message' => 'Kategori dihapus.']);
    }
}
