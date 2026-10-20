<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BlogPost extends Model
{
    protected $fillable = [
        'blog_category_id', 'user_id', 'judul', 'slug', 'ringkasan',
        'konten', 'gambar_sampul', 'status', 'published_at',
    ];

    protected function casts(): array
    {
        return ['published_at' => 'datetime'];
    }

    public function kategori(): BelongsTo
    {
        return $this->belongsTo(BlogCategory::class, 'blog_category_id');
    }

    public function penulis(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function komentar(): HasMany
    {
        return $this->hasMany(BlogComment::class, 'blog_post_id');
    }
}
