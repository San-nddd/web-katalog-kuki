<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('obrolan')) {
            return;
        }

        if (! Schema::hasColumn('obrolan', 'prioritas')) {
            Schema::table('obrolan', function (Blueprint $table) {
                $table->string('prioritas')->nullable()->after('status_handover');
            });
        }

        if (! Schema::hasColumn('obrolan', 'handover_started_at')) {
            Schema::table('obrolan', function (Blueprint $table) {
                $table->timestamp('handover_started_at')->nullable()->after('prioritas');
            });
        }

        if (! Schema::hasColumn('obrolan', 'handover_notified_at')) {
            Schema::table('obrolan', function (Blueprint $table) {
                $table->timestamp('handover_notified_at')->nullable()->after('handover_started_at');
            });
        }

        if (! Schema::hasIndex('obrolan', 'obrolan_prioritas_index')) {
            Schema::table('obrolan', function (Blueprint $table) {
                $table->index('prioritas', 'obrolan_prioritas_index');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('obrolan')) {
            return;
        }

        if (Schema::hasIndex('obrolan', 'obrolan_prioritas_index')) {
            Schema::table('obrolan', function (Blueprint $table) {
                $table->dropIndex('obrolan_prioritas_index');
            });
        }

        Schema::table('obrolan', function (Blueprint $table) {
            $table->dropColumn([
                'prioritas',
                'handover_started_at',
                'handover_notified_at',
            ]);
        });
    }
};
