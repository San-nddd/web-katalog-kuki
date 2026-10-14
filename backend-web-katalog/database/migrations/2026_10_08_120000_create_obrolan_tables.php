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
        Schema::create('obrolan', function (Blueprint $table) {
            $table->id();
            $table->string('session_id')->unique();
            $table->text('pertanyaan_awal')->nullable();
            $table->foreignId('product_id')->nullable()->constrained('katalog_produk')->nullOnDelete();
            $table->string('status_handover')->default('tidak_perlu');
            $table->string('status')->default('aktif');
            $table->timestamps();
        });

        Schema::create('pesan_obrolan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('obrolan_id')->constrained('obrolan')->cascadeOnDelete();
            $table->string('tipe_pengirim');
            $table->text('pesan');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pesan_obrolan');
        Schema::dropIfExists('obrolan');
    }
};
