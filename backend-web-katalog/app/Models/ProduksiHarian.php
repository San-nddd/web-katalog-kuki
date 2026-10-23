<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProduksiHarian extends Model
{
    protected $table = 'produksi_harian';

    protected $fillable = [
        'produk_id',
        'tanggal_produksi',
        'jumlah_produksi',
        'jumlah_label_tercetak',
    ];

    protected $casts = [
        'tanggal_produksi' => 'date',
        'jumlah_produksi' => 'integer',
        'jumlah_label_tercetak' => 'integer',
    ];

    public function produk()
    {
        return $this->belongsTo(produk::class, 'produk_id');
    }
}
