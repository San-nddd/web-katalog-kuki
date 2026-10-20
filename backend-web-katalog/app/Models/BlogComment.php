<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BlogComment extends Model
{
    protected $fillable = [
        'blog_post_id', 'parent_id', 'user_id', 'nama_pengirim',
        'email_pengirim', 'isi', 'status', 'is_admin',
    ];

    protected $hidden = ['email_pengirim'];

    protected function casts(): array
    {
        return ['is_admin' => 'boolean'];
    }

    public function artikel(): BelongsTo
    {
        return $this->belongsTo(BlogPost::class, 'blog_post_id');
    }

    public function induk(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function balasan(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }
}
