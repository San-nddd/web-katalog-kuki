<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'role')) {
            DB::table('users')
                ->where('role', 'manager')
                ->update(['role' => 'admin']);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Role consolidation is data-preserving but not safely reversible.
    }
};
