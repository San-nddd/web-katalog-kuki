<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TestimonialComment extends Model
{
    protected $fillable = [
        'testimonial_id',
        'name',
        'comment',
        'status',
        'moderated_by',
        'moderated_at',
    ];

    protected function casts(): array
    {
        return [
            'moderated_at' => 'datetime',
        ];
    }

    public function testimonial(): BelongsTo
    {
        return $this->belongsTo(Testimonial::class);
    }

    public function moderatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }
}
