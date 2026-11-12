<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosSesi extends Model
{
    protected $table = 'pos_sesi';

    protected $fillable = ['pegawai_id', 'token_hash', 'kedaluwarsa_pada'];

    protected $hidden = ['token_hash'];

    protected $casts = ['kedaluwarsa_pada' => 'datetime'];

    public function pegawai()
    {
        return $this->belongsTo(PosPegawai::class, 'pegawai_id');
    }
}
