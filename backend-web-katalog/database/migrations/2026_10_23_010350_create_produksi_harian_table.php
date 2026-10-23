<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produksi_harian', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produk_id')->constrained('katalog_produk')->restrictOnDelete();
            $table->date('tanggal_produksi');
            $table->unsignedInteger('jumlah_produksi')->default(0);
            $table->unsignedInteger('jumlah_label_tercetak')->default(0);
            $table->timestamps();

            // Satu ringkasan per produk/tanggal; penambahan batch diakumulasi.
            $table->unique(['produk_id', 'tanggal_produksi'], 'produksi_produk_tanggal_unique');
            $table->index('tanggal_produksi');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produksi_harian');
    }
};
