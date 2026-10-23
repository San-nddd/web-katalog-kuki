<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Testimonial;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TestimonialController extends Controller
{
    public function index(): JsonResponse
    {
        $testimonials = Testimonial::query()
            ->where('status', 'published')
            ->whereNotNull('name')
            ->whereNotNull('quote')
            ->withCount(['comments' => fn ($query) => $query->where('status', 'approved')])
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $testimonials]);
    }

    public function show(Testimonial $testimonial): JsonResponse
    {
        abort_unless(
            $testimonial->status === 'published'
                && filled($testimonial->name)
                && filled($testimonial->quote),
            404,
        );

        return response()->json([
            'success' => true,
            'data' => $testimonial->loadCount([
                'comments' => fn ($query) => $query->where('status', 'approved'),
            ]),
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            ...$this->contentRules(),
            'photo' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);
        $photoPath = $request->file('photo')?->store('testimonials', 'public');

        $testimonial = Testimonial::create([
            ...$validated,
            'photo_path' => $photoPath,
            'source' => 'customer',
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Testimonial dikirim dan menunggu verifikasi Admin.',
            'data' => $testimonial,
        ], 201);
    }

    public function adminIndex(): JsonResponse
    {
        $testimonials = Testimonial::query()
            ->withCount('comments')
            ->latest()
            ->get();

        return response()->json(['success' => true, 'data' => $testimonials]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            ...$this->contentRules(),
            'status' => 'required|in:pending,published',
        ]);

        $testimonial = Testimonial::create([
            ...$validated,
            'source' => 'manual',
            'verified_at' => null,
            'verified_by' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Testimonial berhasil ditambahkan.',
            'data' => $testimonial,
        ], 201);
    }

    public function update(Request $request, Testimonial $testimonial): JsonResponse
    {
        $validated = $request->validate($this->contentRules());

        $testimonial->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Testimonial berhasil diperbarui.',
            'data' => $testimonial->fresh(),
        ]);
    }

    public function moderate(Request $request, Testimonial $testimonial): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,published,rejected',
        ]);

        $isVerifiedCustomer = $testimonial->source === 'customer'
            && $validated['status'] === 'published';

        $testimonial->update([
            'status' => $validated['status'],
            'verified_at' => $isVerifiedCustomer ? now() : null,
            'verified_by' => $isVerifiedCustomer ? $request->user()->id : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Status testimonial berhasil diperbarui.',
            'data' => $testimonial->fresh(),
        ]);
    }

    public function uploadPhoto(Request $request, Testimonial $testimonial): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
        ]);

        $previousPath = $testimonial->photo_path;
        $photoPath = $request->file('photo')->store('testimonials', 'public');
        $testimonial->update(['photo_path' => $photoPath]);

        if ($previousPath) {
            Storage::disk('public')->delete($previousPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Foto testimonial berhasil diunggah.',
            'data' => $testimonial->fresh(),
        ]);
    }

    public function deletePhoto(Testimonial $testimonial): JsonResponse
    {
        if ($testimonial->photo_path) {
            Storage::disk('public')->delete($testimonial->photo_path);
            $testimonial->update(['photo_path' => null]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Foto testimonial berhasil dihapus.',
            'data' => $testimonial->fresh(),
        ]);
    }

    public function destroy(Testimonial $testimonial): JsonResponse
    {
        $photoPath = $testimonial->photo_path;
        $testimonial->delete();

        if ($photoPath) {
            Storage::disk('public')->delete($photoPath);
        }

        return response()->json([
            'success' => true,
            'message' => 'Testimonial berhasil dihapus.',
            'data' => null,
        ]);
    }

    private function contentRules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'role' => 'nullable|string|max:255',
            'quote' => 'required|string|max:5000',
        ];
    }
}
