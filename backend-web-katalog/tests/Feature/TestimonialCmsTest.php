<?php

namespace Tests\Feature;

use App\Models\Testimonial;
use App\Models\TestimonialComment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TestimonialCmsTest extends TestCase
{
    use RefreshDatabase;

    private function adminToken(): string
    {
        return User::factory()->create(['role' => 'admin'])
            ->createToken('admin')
            ->plainTextToken;
    }

    private function testimonial(array $overrides = []): Testimonial
    {
        return Testimonial::create(array_merge([
            'name' => 'Rani',
            'role' => 'Pelanggan',
            'quote' => 'Kue sangat lezat.',
            'source' => 'customer',
            'status' => 'pending',
        ], $overrides));
    }

    public function test_public_submission_waits_for_admin_verification(): void
    {
        $this->postJson('/api/testimonial', [
            'name' => 'Rani',
            'role' => 'Pelanggan',
            'quote' => 'Kue sangat lezat.',
        ])->assertCreated()
            ->assertJsonPath('data.source', 'customer')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.verified_at', null);

        $this->getJson('/api/testimonial')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_published_testimonials_are_public_and_pending_testimonials_are_hidden(): void
    {
        $this->testimonial(['status' => 'published', 'name' => 'Published']);
        $this->testimonial(['status' => 'pending', 'name' => 'Pending']);

        $this->getJson('/api/testimonial')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Published');
    }

    public function test_admin_can_create_edit_moderate_and_delete_manual_testimonial(): void
    {
        $token = $this->adminToken();
        $testimonial = $this->withToken($token)
            ->postJson('/api/admin/testimonial', [
                'name' => 'Rani',
                'role' => 'Pelanggan',
                'quote' => 'Kue sangat lezat.',
                'status' => 'pending',
            ])
            ->assertCreated()
            ->assertJsonPath('data.source', 'manual')
            ->assertJsonPath('data.verified_at', null)
            ->json('data.id');

        $this->withToken($token)
            ->putJson("/api/admin/testimonial/{$testimonial}", [
                'name' => 'Rani Utami',
                'role' => null,
                'quote' => 'Rasanya tetap lezat.',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Rani Utami');

        $this->withToken($token)
            ->patchJson("/api/admin/testimonial/{$testimonial}/moderasi", ['status' => 'published'])
            ->assertOk();

        $this->assertDatabaseHas('testimonials', [
            'id' => $testimonial,
            'source' => 'manual',
            'status' => 'published',
            'verified_at' => null,
        ]);

        $this->withToken($token)->deleteJson("/api/admin/testimonial/{$testimonial}")->assertOk();
        $this->assertDatabaseMissing('testimonials', ['id' => $testimonial]);
    }

    public function test_only_admin_role_can_access_testimonial_cms(): void
    {
        $this->getJson('/api/admin/testimonial')->assertUnauthorized();

        $customerToken = User::factory()->create(['role' => 'customer'])
            ->createToken('customer')
            ->plainTextToken;

        $this->withToken($customerToken)->getJson('/api/admin/testimonial')->assertForbidden();
    }

    public function test_customer_testimonial_is_verified_when_admin_publishes_it(): void
    {
        $token = $this->adminToken();
        $testimonial = $this->testimonial();

        $this->withToken($token)
            ->patchJson("/api/admin/testimonial/{$testimonial->id}/moderasi", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('data.source', 'customer')
            ->assertJsonPath('data.status', 'published');

        $this->assertDatabaseHas('testimonials', [
            'id' => $testimonial->id,
            'status' => 'published',
            'verified_by' => User::query()->where('role', 'admin')->value('id'),
        ]);
    }

    public function test_comments_are_separate_pending_and_moderated_per_testimonial(): void
    {
        $token = $this->adminToken();
        $first = $this->testimonial(['status' => 'published']);
        $second = $this->testimonial(['status' => 'published', 'name' => 'Dina']);

        $commentId = $this->postJson("/api/testimonial/{$first->id}/komentar", [
            'name' => 'Budi',
            'comment' => 'Setuju, sangat enak.',
        ])->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->json('data.id');

        $this->getJson("/api/testimonial/{$first->id}/komentar")->assertOk()->assertJsonCount(0, 'data');

        $this->withToken($token)
            ->patchJson("/api/admin/testimonial/komentar/{$commentId}/moderasi", ['status' => 'approved'])
            ->assertOk();

        $this->getJson("/api/testimonial/{$first->id}/komentar")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Budi');
        $this->getJson("/api/testimonial/{$second->id}/komentar")->assertOk()->assertJsonCount(0, 'data');

        $comment = TestimonialComment::findOrFail($commentId);
        $this->assertSame($first->id, $comment->testimonial_id);
    }

    public function test_admin_can_upload_and_remove_testimonial_photo(): void
    {
        Storage::fake('public');
        $token = $this->adminToken();
        $testimonial = $this->testimonial(['source' => 'manual']);

        $response = $this->withToken($token)
            ->post("/api/admin/testimonial/{$testimonial->id}/foto", [
                'photo' => UploadedFile::fake()->image('customer.png', 300, 300),
            ], ['Accept' => 'application/json'])
            ->assertOk();

        $photoPath = $response->json('data.photo_path');
        $this->assertStringStartsWith('testimonials/', $photoPath);
        Storage::disk('public')->assertExists($photoPath);

        $this->withToken($token)->deleteJson("/api/admin/testimonial/{$testimonial->id}/foto")->assertOk();
        Storage::disk('public')->assertMissing($photoPath);
    }
}
