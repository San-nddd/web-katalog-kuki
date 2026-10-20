<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogMedia;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class BlogMediaController extends Controller
{
    private const MAX_MEDIA_PER_POST = 20;

    /** Upload satu gambar atau video ke dalam artikel yang telah dibuat. */
    public function store(Request $request, BlogPost $post): JsonResponse
    {
        $validated = $request->validate([
            'file' => [
                'required', 'file', 'max:51200',
                'mimetypes:image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime',
            ],
            'caption' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('file');
        $mime = $file->getMimeType();
        $isImage = str_starts_with($mime, 'image/');

        if ($isImage && $file->getSize() > 5 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'file' => 'Foto maksimal 5 MB.',
            ]);
        }

        if ($post->media()->count() >= self::MAX_MEDIA_PER_POST) {
            throw ValidationException::withMessages([
                'file' => 'Maksimal 20 file media per artikel.',
            ]);
        }

        $path = $file->store('blog/media', 'public');
        try {
            $media = $post->media()->create([
                'jenis' => $isImage ? 'foto' : 'video',
                'path' => $path,
                'mime_type' => $mime,
                'caption' => $validated['caption'] ?? null,
                'urutan' => ((int) $post->media()->max('urutan')) + 1,
            ]);
        } catch (\Throwable $error) {
            Storage::disk('public')->delete($path);
            throw $error;
        }

        return response()->json([
            'success' => true,
            'message' => 'Media berhasil diunggah.',
            'data' => $media,
        ], 201);
    }

    /** Hapus media hanya jika milik artikel yang dimaksud. */
    public function destroy(BlogPost $post, BlogMedia $media): JsonResponse
    {
        abort_unless($media->blog_post_id === $post->id, 404);

        $path = $media->path;
        $media->delete();
        Storage::disk('public')->delete($path);

        return response()->json([
            'success' => true,
            'message' => 'Media berhasil dihapus.',
        ]);
    }

    /** Sampul artikel disimpan terpisah dari galeri, agar bisa jadi thumbnail. */
    public function uploadSampul(Request $request, BlogPost $post): JsonResponse
    {
        $request->validate([
            'gambar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $path = $request->file('gambar')->store('blog/sampul', 'public');
        $oldPath = $post->gambar_sampul;

        try {
            $post->update(['gambar_sampul' => $path]);
        } catch (\Throwable $error) {
            Storage::disk('public')->delete($path);
            throw $error;
        }

        if ($oldPath && ! preg_match('~^(https?://|/storage/)~i', $oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sampul artikel berhasil diperbarui.',
            'data' => $post->fresh(),
        ]);
    }
}
