<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosItemTransaksi extends Model
{
    protected $table = 'pos_item_transaksi';

    protected $fillable = ['transaksi_id', 'produk_id', 'nama_snapshot', 'barcode_snapshot', 'jumlah', 'harga_satuan', 'total'];
}
