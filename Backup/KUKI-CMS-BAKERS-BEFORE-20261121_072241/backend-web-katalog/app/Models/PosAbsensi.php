<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosAbsensi extends Model
{
    protected $table = 'pos_absensi';

    protected $fillable = ['pegawai_id', 'masuk_pada', 'pulang_pada'];

    protected $casts = ['masuk_pada' => 'datetime', 'pulang_pada' => 'datetime'];
}
