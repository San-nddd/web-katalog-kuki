<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PesanObrolan extends Model
{
    protected $table = 'pesan_obrolan';

    protected $fillable = [
        'obrolan_id',
        'tipe_pengirim',
        'pesan',
    ];

    public function obrolan(): BelongsTo
    {
        return $this->belongsTo(Obrolan::class, 'obrolan_id');
    }
}
