<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PosTransaksi extends Model
{
    protected $table = 'pos_transaksi';
    protected $fillable = ['id_client','nomor','pegawai_id','absensi_id','nama_pelanggan','jenis_pesanan','nomor_meja','catatan','metode_bayar','verifikasi_manual','subtotal','total','dibayar','kembalian','dibayar_pada'];
    protected $casts = ['verifikasi_manual' => 'boolean', 'dibayar_pada' => 'datetime'];
    public function items() { return $this->hasMany(PosItemTransaksi::class, 'transaksi_id'); }
    public function pegawai() { return $this->belongsTo(PosPegawai::class, 'pegawai_id'); }
}
