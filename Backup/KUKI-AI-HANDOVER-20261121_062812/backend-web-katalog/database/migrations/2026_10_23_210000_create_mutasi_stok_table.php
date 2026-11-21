<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mutasi_stok', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produk_id')->constrained('katalog_produk')->restrictOnDelete();
            $table->foreignId('pengguna_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('jenis', 30); // stok_awal | produksi | koreksi
            $table->bigInteger('perubahan'); // positif = masuk, negatif = keluar
            $table->unsignedBigInteger('stok_sebelum');
            $table->unsignedBigInteger('stok_sesudah');
            $table->string('keterangan', 500);
            $table->string('referensi_tipe', 40)->nullable();
            $table->unsignedBigInteger('referensi_id')->nullable();
            $table->timestamps();

            $table->index(['produk_id', 'created_at']);
            $table->index(['jenis', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mutasi_stok');
    }
};
