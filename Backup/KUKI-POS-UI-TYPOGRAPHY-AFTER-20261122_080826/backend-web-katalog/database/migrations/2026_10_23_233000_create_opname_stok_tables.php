<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('opname_stok', function (Blueprint $table) {
            $table->id();
            $table->string('status', 20)->default('draft'); // draft | selesai | dibatalkan
            $table->text('catatan')->nullable();
            $table->foreignId('dibuat_oleh_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('diselesaikan_oleh_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('diselesaikan_pada')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });

        Schema::create('opname_stok_detail', function (Blueprint $table) {
            $table->id();
            $table->foreignId('opname_id')->constrained('opname_stok')->cascadeOnDelete();
            $table->foreignId('produk_id')->constrained('katalog_produk')->restrictOnDelete();
            $table->unsignedBigInteger('stok_sistem'); // Snapshot saat draft dibuat
            $table->unsignedBigInteger('stok_fisik')->nullable();
            $table->string('catatan', 500)->nullable();
            $table->timestamps();
            $table->unique(['opname_id', 'produk_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opname_stok_detail');
        Schema::dropIfExists('opname_stok');
    }
};
