<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('katalog_produk', function (Blueprint $table) {
            $table->foreignId('kategori_id')->nullable()->constrained('kategoris')->nullOnDelete();
            $table->string('barcode')->nullable();
            $table->string('slug')->nullable();
            $table->integer('stok')->default(0);
            $table->integer('stok_minimum')->default(0);
            $table->string('metadata_ai')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('katalog_produk', function (Blueprint $table) {
            $table->dropForeign(['kategori_id']);
            $table->dropColumn(['kategori_id', 'barcode', 'slug', 'stok', 'stok_minimum', 'metadata_ai']);
        });
    }
};
