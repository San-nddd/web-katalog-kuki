<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProdukVarian extends Model
{
    protected $table = 'produk_varian';

    protected $fillable = [
        'produk_id',
        'nama_varian',
        'sku',
        'barcode',
        'harga',
        'stok',
        'stok_minimum',
        'aktif',
    ];

    protected $casts = [
        'harga' => 'decimal:2',
        'stok' => 'integer',
        'stok_minimum' => 'integer',
        'aktif' => 'boolean',
    ];

    public function produk(): BelongsTo
    {
        return $this->belongsTo(produk::class, 'produk_id');
    }
}
