<?php

namespace App\Providers;

use App\Models\Testimonial;
use App\Models\TestimonialComment;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Testimonial::creating(function (Testimonial $testimonial): void {
            $testimonial->status = 'published';
        });

        TestimonialComment::creating(function (TestimonialComment $comment): void {
            $comment->status = 'approved';
        });

        Gate::define('manage-admin', fn (User $user): bool => $user->isAdmin());
        Gate::define('manage-testimonials', fn (User $user): bool => $user->isAdmin());
        Gate::define(
            'view-management-dashboard',
            fn (User $user): bool => in_array(
                $user->roleForAuthorization(),
                ['admin', 'owner'],
                true,
            ),
        );
    }
}
