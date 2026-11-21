<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OpnameStokDetail extends Model
{
    protected $table = 'opname_stok_detail';

    protected $fillable = ['opname_id', 'produk_id', 'stok_sistem', 'stok_fisik', 'catatan'];

    protected $casts = ['stok_sistem' => 'integer', 'stok_fisik' => 'integer'];

    public function opname()
    {
        return $this->belongsTo(OpnameStok::class, 'opname_id');
    }

    public function produk()
    {
        return $this->belongsTo(produk::class, 'produk_id');
    }
}
