<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('pos_pegawai', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 32)->unique();
            $table->string('nama', 120);
            $table->string('pin_hash');
            $table->boolean('aktif')->default(true);
            $table->timestamps();
        });
        Schema::create('pos_sesi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pegawai_id')->constrained('pos_pegawai')->restrictOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('kedaluwarsa_pada');
            $table->timestamps();
            $table->index(['pegawai_id', 'kedaluwarsa_pada']);
        });
        Schema::create('pos_absensi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pegawai_id')->constrained('pos_pegawai')->restrictOnDelete();
            $table->timestamp('masuk_pada');
            $table->timestamp('pulang_pada')->nullable();
            $table->timestamps();
            $table->index(['pegawai_id', 'masuk_pada']);
        });
        Schema::create('pos_transaksi', function (Blueprint $table) {
            $table->id();
            $table->uuid('id_client')->unique();
            $table->string('nomor', 36)->unique();
            $table->foreignId('pegawai_id')->constrained('pos_pegawai')->restrictOnDelete();
            $table->foreignId('absensi_id')->constrained('pos_absensi')->restrictOnDelete();
            $table->string('nama_pelanggan', 120)->nullable();
            $table->string('jenis_pesanan', 20)->default('takeaway');
            $table->string('nomor_meja', 30)->nullable();
            $table->text('catatan')->nullable();
            $table->string('metode_bayar', 15);
            $table->boolean('verifikasi_manual')->default(false);
            $table->unsignedBigInteger('subtotal');
            $table->unsignedBigInteger('total');
            $table->unsignedBigInteger('dibayar');
            $table->unsignedBigInteger('kembalian');
            $table->timestamp('dibayar_pada');
            $table->timestamps();
            $table->index(['dibayar_pada', 'metode_bayar']);
        });
        Schema::create('pos_item_transaksi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaksi_id')->constrained('pos_transaksi')->restrictOnDelete();
            $table->foreignId('produk_id')->constrained('katalog_produk')->restrictOnDelete();
            $table->string('nama_snapshot', 255);
            $table->string('barcode_snapshot', 100)->nullable();
            $table->unsignedInteger('jumlah');
            $table->unsignedBigInteger('harga_satuan');
            $table->unsignedBigInteger('total');
            $table->timestamps();
            $table->unique(['transaksi_id', 'produk_id']);
        });
    }

    public function down(): void
    {
        // Dilarang menjalankan rollback ini pada data toko nyata tanpa backup/persetujuan.
        Schema::dropIfExists('pos_item_transaksi');
        Schema::dropIfExists('pos_transaksi');
        Schema::dropIfExists('pos_absensi');
        Schema::dropIfExists('pos_sesi');
        Schema::dropIfExists('pos_pegawai');
    }
};
