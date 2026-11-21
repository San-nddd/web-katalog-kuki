<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('obrolan', function (Blueprint $table) {
            $table->string('prioritas')->nullable()->after('status_handover');
            $table->timestamp('handover_started_at')->nullable()->after('prioritas');
            $table->timestamp('handover_notified_at')->nullable()->after('handover_started_at');
            $table->index('prioritas', 'obrolan_prioritas_index');
        });
    }

    public function down(): void
    {
        Schema::table('obrolan', function (Blueprint $table) {
            $table->dropIndex('obrolan_prioritas_index');
            $table->dropColumn([
                'prioritas',
                'handover_started_at',
                'handover_notified_at',
            ]);
        });
    }
};
