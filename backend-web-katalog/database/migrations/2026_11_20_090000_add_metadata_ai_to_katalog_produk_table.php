<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('katalog_produk') || Schema::hasColumn('katalog_produk', 'metadata_ai')) {
            return;
        }

        Schema::table('katalog_produk', function (Blueprint $table): void {
            $table->text('metadata_ai')->nullable();
        });
    }

    public function down(): void
    {
    }
};
