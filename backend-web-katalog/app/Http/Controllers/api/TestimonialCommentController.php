<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Testimonial;
use App\Models\TestimonialComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TestimonialCommentController extends Controller
{
    public function index(Testimonial $testimonial): JsonResponse
    {
        $this->ensurePublished($testimonial);

        return response()->json([
            'success' => true,
            'data' => $testimonial->comments()
                ->where('status', 'approved')
                ->latest()
                ->get(),
        ]);
    }

    public function store(Request $request, Testimonial $testimonial): JsonResponse
    {
        $this->ensurePublished($testimonial);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'comment' => 'required|string|max:2000',
        ]);

        // Simpan langsung sebagai approved, tanpa bergantung pada default kolom DB.
        $comment = new TestimonialComment($validated);
        $comment->status = 'approved';
        $testimonial->comments()->save($comment);

        return response()->json([
            'success' => true,
            'message' => 'Komentar berhasil dipublikasikan.',
            'data' => $comment->refresh(),
        ], 201);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
        ]);

        $comments = TestimonialComment::query()
            ->with('testimonial:id,name,quote')
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status),
            )
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $comments]);
    }

    public function moderate(Request $request, TestimonialComment $comment): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
        ]);

        $comment->update([
            'status' => $validated['status'],
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status komentar berhasil diperbarui.',
            'data' => $comment->fresh('testimonial'),
        ]);
    }

    public function destroy(TestimonialComment $comment): JsonResponse
    {
        $comment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Komentar berhasil dihapus.',
            'data' => null,
        ]);
    }

    private function ensurePublished(Testimonial $testimonial): void
    {
        abort_unless(
            $testimonial->status === 'published'
                && filled($testimonial->name)
                && filled($testimonial->quote),
            404,
        );
    }
}
