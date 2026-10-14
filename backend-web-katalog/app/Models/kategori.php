<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class kategori extends Model
{
    protected $table = 'kategoris';

    protected $fillable = [
        'nama',
        'slug',
        'gambar',
    ];

    public function produk()
    {
        return $this->hasMany(produk::class, 'kategori_id');
    }
}
