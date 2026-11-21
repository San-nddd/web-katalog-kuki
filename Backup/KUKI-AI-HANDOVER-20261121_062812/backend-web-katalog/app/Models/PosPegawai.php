<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosPegawai extends Model
{
    protected $table = 'pos_pegawai';

    protected $fillable = ['kode', 'nama', 'role', 'pin_hash', 'aktif'];

    protected $hidden = ['pin_hash'];

    protected $casts = ['aktif' => 'boolean'];

    public function transaksi()
    {
        return $this->hasMany(PosTransaksi::class, 'pegawai_id');
    }

    public function absensi()
    {
        return $this->hasMany(PosAbsensi::class, 'pegawai_id');
    }

    public function sesi()
    {
        return $this->hasMany(PosSesi::class, 'pegawai_id');
    }
}
