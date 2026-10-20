<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlogCategory extends Model
{
    protected $fillable = [
        'nama',
        'slug',
    ];

    public function posts()
    {
        return $this->hasMany(BlogPost::class, 'blog_category_id');
    }
}
