<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BlogComment;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BlogCommentController extends Controller
{
    public function index(string $slug): JsonResponse
    {
        $post = $this->publishedPost($slug);
        $comments = $post->komentar()
            ->whereNull('parent_id')
            ->where('status', 'approved')
            ->with(['balasan' => fn ($q) => $q->where('status', 'approved')->orderBy('id')])
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json(['success' => true, 'data' => $comments]);
    }

    public function store(Request $request, string $slug): JsonResponse
    {
        $post = $this->publishedPost($slug);
        $data = $request->validate([
            'nama_pengirim' => 'required|string|min:2|max:100',
            'email_pengirim' => 'nullable|email|max:255',
            'isi' => 'required|string|min:3|max:1500',
            'parent_id' => 'nullable|integer|exists:blog_comments,id',
        ]);
        if (!empty($data['parent_id'])) {
            $parent = BlogComment::whereKey($data['parent_id'])->where('blog_post_id', $post->id)->where('status', 'approved')->first();
            if (!$parent) return response()->json(['success' => false, 'message' => 'Komentar induk tidak ditemukan.'], 422);
            // Hanya satu tingkat balasan agar mudah dimoderasi.
            if ($parent->parent_id !== null) return response()->json(['success' => false, 'message' => 'Balasan hanya satu tingkat.'], 422);
        }

        $post->komentar()->create([...$data, 'status' => 'pending', 'is_admin' => false]);
        return response()->json(['success' => true, 'message' => 'Komentar terkirim dan menunggu persetujuan Admin.'], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $request->validate(['status' => ['sometimes', Rule::in(['pending', 'approved', 'rejected'])]]);
        $comments = BlogComment::query()
            ->with('artikel:id,judul,slug')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->query('status')))
            ->latest()->paginate(20);

        return response()->json(['success' => true, 'data' => $comments]);
    }

    public function moderate(Request $request, BlogComment $comment): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['pending', 'approved', 'rejected'])]]);
        $comment->update($data);
        return response()->json(['success' => true, 'message' => 'Status komentar diperbarui.', 'data' => $comment->fresh()]);
    }

    public function adminReply(Request $request, BlogPost $post): JsonResponse
    {
        $data = $request->validate([
            'parent_id' => 'required|integer|exists:blog_comments,id',
            'isi' => 'required|string|min:2|max:1500',
        ]);
        $parent = BlogComment::whereKey($data['parent_id'])->where('blog_post_id', $post->id)->first();
        if (!$parent || $parent->parent_id !== null) {
            return response()->json(['success' => false, 'message' => 'Komentar induk tidak valid.'], 422);
        }

        $reply = $post->komentar()->create([
            'parent_id' => $parent->id,
            'user_id' => $request->user()->id,
            'nama_pengirim' => $request->user()->name,
            'isi' => $data['isi'],
            'status' => 'approved',
            'is_admin' => true,
        ]);

        return response()->json(['success' => true, 'message' => 'Balasan Admin ditambahkan.', 'data' => $reply], 201);
    }

    public function destroy(BlogComment $comment): JsonResponse
    {
        $comment->delete();
        return response()->json(['success' => true, 'message' => 'Komentar dihapus.']);
    }

    private function publishedPost(string $slug): BlogPost
    {
        return BlogPost::where('slug', $slug)
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->firstOrFail();
    }
}
