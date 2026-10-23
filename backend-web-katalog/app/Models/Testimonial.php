<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Testimonial extends Model
{
    protected $fillable = [
        'name',
        'role',
        'quote',
        'photo_path',
        'source',
        'status',
        'verified_at',
        'verified_by',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
        ];
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TestimonialComment::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function isVerifiedCustomerSubmission(): bool
    {
        return $this->source === 'customer' && $this->verified_at !== null;
    }
}
