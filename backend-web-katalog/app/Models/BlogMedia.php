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

    protected $appends = ['gambar_sampul_url'];

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

    public function media(): HasMany
    {
        return $this->hasMany(BlogMedia::class, 'blog_post_id')
            ->orderBy('urutan')->orderBy('id');
    }

    public function getGambarSampulUrlAttribute(): ?string
    {
        $path = $this->gambar_sampul;
        if (! $path) {
            return null;
        }

        // Kompatibilitas untuk data lama yang sudah menyimpan URL langsung.
        if (preg_match('~^(https?://|/storage/)~i', $path)) {
            return $path;
        }

        return '/storage/'.ltrim($path, '/');
    }
}
