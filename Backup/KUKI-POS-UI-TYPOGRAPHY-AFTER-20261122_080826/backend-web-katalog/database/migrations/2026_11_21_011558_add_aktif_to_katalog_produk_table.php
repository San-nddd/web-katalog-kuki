<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('katalog_produk', 'aktif')) {
            Schema::table('katalog_produk', function (Blueprint $table) {
                $table->boolean('aktif')->default(true)->after('metadata_ai');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('katalog_produk', 'aktif')) {
            Schema::table('katalog_produk', function (Blueprint $table) {
                $table->dropColumn('aktif');
            });
        }
    }
};
