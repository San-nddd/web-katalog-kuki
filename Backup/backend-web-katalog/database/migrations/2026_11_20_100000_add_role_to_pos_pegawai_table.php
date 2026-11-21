<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pos_pegawai') || Schema::hasColumn('pos_pegawai', 'role')) {
            return;
        }

        Schema::table('pos_pegawai', function (Blueprint $table): void {
            $table->string('role', 20)->default('kasir')->after('nama');
        });
    }

    public function down(): void
    {
    }
};
