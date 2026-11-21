<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Obrolan extends Model
{
    protected $table = 'obrolan';

    protected $fillable = [
        'session_id',
        'pertanyaan_awal',
        'product_id',
        'status_handover',
        'status',
    ];

    public function pesan(): HasMany
    {
        return $this->hasMany(PesanObrolan::class, 'obrolan_id');
    }

    public function produk()
    {
        return $this->belongsTo(produk::class, 'product_id');
    }
}
