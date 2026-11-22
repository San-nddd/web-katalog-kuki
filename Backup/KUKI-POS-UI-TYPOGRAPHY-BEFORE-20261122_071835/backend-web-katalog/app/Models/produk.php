<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class produk extends Model
{
    protected $table = 'katalog_produk';

    protected $fillable = [
        'nama_produk',
        'deskripsi_produk',
        'harga_produk',
        'gambar_produk',
        'kategori_id',
        'barcode',
        'slug',
        'stok',
        'stok_minimum',
        'metadata_ai',
        'aktif',
    ];

    protected $casts = [
        'harga_produk' => 'decimal:2',
        'stok' => 'integer',
        'stok_minimum' => 'integer',
        'aktif' => 'boolean',
    ];

    public function kategori()
    {
        return $this->belongsTo(kategori::class, 'kategori_id');
    }

    public function varian(): HasMany
    {
        return $this->hasMany(ProdukVarian::class, 'produk_id');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('aktif', true);
    }

    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('aktif', false);
    }
}
