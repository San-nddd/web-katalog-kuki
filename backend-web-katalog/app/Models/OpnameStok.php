<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OpnameStok extends Model
{
    protected $table = 'opname_stok';

    protected $fillable = ['status', 'catatan', 'dibuat_oleh_id', 'diselesaikan_oleh_id', 'diselesaikan_pada'];

    protected $casts = ['diselesaikan_pada' => 'datetime'];

    public function detail()
    {
        return $this->hasMany(OpnameStokDetail::class, 'opname_id');
    }

    public function pembuat()
    {
        return $this->belongsTo(User::class, 'dibuat_oleh_id');
    }

    public function penyelesai()
    {
        return $this->belongsTo(User::class, 'diselesaikan_oleh_id');
    }
}
