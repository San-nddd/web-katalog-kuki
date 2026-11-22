<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pos_transaksi')) {
            return;
        }

        if (! Schema::hasColumn('pos_transaksi', 'status_transaksi')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->string('status_transaksi', 20)->default('completed')->after('metode_bayar');
            });
        }
        if (! Schema::hasColumn('pos_transaksi', 'jenis_pembatalan')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->string('jenis_pembatalan', 10)->nullable()->after('status_transaksi');
            });
        }
        if (! Schema::hasColumn('pos_transaksi', 'alasan_pembatalan')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->text('alasan_pembatalan')->nullable()->after('jenis_pembatalan');
            });
        }
        if (! Schema::hasColumn('pos_transaksi', 'dibatalkan_oleh')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->unsignedBigInteger('dibatalkan_oleh')->nullable()->after('alasan_pembatalan');
                $table->index('dibatalkan_oleh');
            });
        }
        if (! Schema::hasColumn('pos_transaksi', 'dibatalkan_pada')) {
            Schema::table('pos_transaksi', function (Blueprint $table): void {
                $table->timestamp('dibatalkan_pada')->nullable()->after('dibatalkan_oleh');
            });
        }
    }

    public function down(): void
    {
    }
};
