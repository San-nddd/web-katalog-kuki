<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MutasiStok extends Model
{
    protected $table = 'mutasi_stok';

    protected $fillable = [
        'produk_id', 'pengguna_id', 'jenis', 'perubahan',
        'stok_sebelum', 'stok_sesudah', 'keterangan',
        'referensi_tipe', 'referensi_id',
    ];

    protected $casts = [
        'perubahan' => 'integer',
        'stok_sebelum' => 'integer',
        'stok_sesudah' => 'integer',
    ];

    public function produk()
    {
        return $this->belongsTo(produk::class, 'produk_id');
    }

    public function pengguna()
    {
        return $this->belongsTo(User::class, 'pengguna_id');
    }
}
