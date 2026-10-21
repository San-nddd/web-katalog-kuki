<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlogMedia extends Model
{
    protected $table = 'blog_media';

    protected $fillable = [
        'jenis',
        'path',
        'mime_type',
        'caption',
        'urutan',
    ];

    protected $appends = ['url'];

    public function post(): BelongsTo
    {
        return $this->belongsTo(BlogPost::class, 'blog_post_id');
    }

    public function getUrlAttribute(): string
    {
        return '/storage/' . ltrim($this->path, '/');
    }
}