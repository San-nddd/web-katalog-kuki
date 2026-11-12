<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosPegawai extends Model
{
    protected $table = 'pos_pegawai';

    protected $fillable = ['kode', 'nama', 'pin_hash', 'aktif'];

    protected $hidden = ['pin_hash'];

    protected $casts = ['aktif' => 'boolean'];
}
