<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produk_varian', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produk_id')
                ->constrained('katalog_produk')
                ->restrictOnDelete();

            // Contoh: Original, Garlic Moza, 10 cm, 16 cm.
            $table->string('nama_varian', 150);

            // SKU dan barcode disimpan sebagai teks; Code 128 adalah cara mencetaknya.
            $table->string('sku', 100)->unique();
            $table->string('barcode', 100)->unique();

            $table->decimal('harga', 10, 2);
            $table->unsignedInteger('stok')->default(0);
            $table->unsignedInteger('stok_minimum')->default(0);
            $table->boolean('aktif')->default(true);
            $table->timestamps();

            $table->index(['produk_id', 'aktif']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produk_varian');
    }
};
