<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BlogController extends Controller
{
    // Publik: hanya artikel terbit yang dapat dilihat.
    public function index(Request $request): JsonResponse
    {
        $posts = BlogPost::query()
            ->with(['kategori:id,nama,slug', 'penulis:id,name', 'media'])
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->when($request->filled('search'), fn ($q) => $q->where('judul', 'like', '%'.$request->query('search').'%'))
            ->when($request->filled('kategori'), fn ($q) => $q->whereHas('kategori', fn ($sub) => $sub->where('slug', $request->query('kategori'))))
            ->latest('published_at')
            ->paginate(12);

        return response()->json(['success' => true, 'data' => $posts]);
    }

    public function show(string $slug): JsonResponse
    {
        $post = BlogPost::with(['kategori:id,nama,slug', 'penulis:id,name', 'media'])
            ->where('slug', $slug)
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->firstOrFail();

        return response()->json(['success' => true, 'data' => $post]);
    }

    // Admin dapat melihat draft dan artikel terbit beserta foto/video.
    public function adminIndex(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => BlogPost::with(['kategori:id,nama,slug', 'penulis:id,name', 'media'])
                ->latest()->paginate(20),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        // Route HARUS tetap memakai auth:sanctum; ini hanya lapisan pengaman tambahan.
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false, 'message' => 'Login Admin diperlukan.'], 401);
        }

        $validated = $request->validate($this->rules());
        $validated['slug'] = $this->uniqueSlug($validated['slug'] ?? null, $validated['judul']);
        $validated['user_id'] = $user->id;
        $validated['status'] = $validated['status'] ?? 'draft';
        $validated['published_at'] = $validated['status'] === 'published' ? now() : null;

        // Jika hanya ingin posting foto/video, buat draft dahulu, upload media, lalu publish.
        if ($validated['status'] === 'published' && trim((string) ($validated['konten'] ?? '')) === '') {
            throw ValidationException::withMessages([
                'konten' => 'Isi teks terlebih dahulu, atau buat draft lalu unggah foto/video sebelum publish.',
            ]);
        }

        $post = BlogPost::create($validated);
        return response()->json(['success' => true, 'message' => 'Artikel berhasil dibuat.', 'data' => $post->load('media')], 201);
    }

    public function update(Request $request, BlogPost $post): JsonResponse
    {
        $validated = $request->validate($this->rules($post));
        if (array_key_exists('slug', $validated) || array_key_exists('judul', $validated)) {
            $validated['slug'] = $this->uniqueSlug(
                $validated['slug'] ?? $post->slug,
                $validated['judul'] ?? $post->judul,
                $post->id
            );
        }

        $newStatus = $validated['status'] ?? $post->status;
        if ($newStatus === 'published') {
            $content = $validated['konten'] ?? $post->konten;
            $cover = $post->gambar_sampul;
            if (trim((string) $content) === '' && ! $cover && ! $post->media()->exists()) {
                throw ValidationException::withMessages([
                    'konten' => 'Tambahkan teks, foto, atau video sebelum artikel diterbitkan.',
                ]);
            }
        }

        if ($newStatus === 'published' && $post->status !== 'published') {
            $validated['published_at'] = now();
        } elseif ($newStatus === 'draft') {
            $validated['published_at'] = null;
        }

        $post->update($validated);
        return response()->json(['success' => true, 'message' => 'Artikel diperbarui.', 'data' => $post->fresh()->load('media')]);
    }

    public function destroy(BlogPost $post): JsonResponse
    {
        // Hapus file terkait sebelum record dihapus; best effort untuk storage public.
        $post->load('media');
        foreach ($post->media as $media) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($media->path);
        }
        if ($post->gambar_sampul && ! preg_match('~^(https?://|/storage/)~i', $post->gambar_sampul)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($post->gambar_sampul);
        }
        $post->delete();
        return response()->json(['success' => true, 'message' => 'Artikel dihapus.']);
    }

    private function rules(?BlogPost $post = null): array
    {
        $updating = $post !== null;
        $unique = Rule::unique('blog_posts', 'slug');
        if ($updating) $unique->ignore($post->id);

        return [
            'judul' => [$updating ? 'sometimes' : 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', 'regex:/^[a-z0-9-]+$/', $unique],
            'blog_category_id' => ['sometimes', 'nullable', 'integer', 'exists:blog_categories,id'],
            'ringkasan' => ['sometimes', 'nullable', 'string', 'max:500'],
            'konten' => ['sometimes', 'nullable', 'string'],
            // Sampul hanya boleh diubah melalui upload file tervalidasi (/sampul).
            'status' => ['sometimes', Rule::in(['draft', 'published'])],
        ];
    }

    private function uniqueSlug(?string $explicit, string $title, ?int $ignoreId = null): string
    {
        $base = $explicit ?: Str::slug($title);
        if ($base === '') $base = 'artikel';
        $slug = $base;
        $i = 2;
        while (BlogPost::where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }
        return $slug;
    }
}
