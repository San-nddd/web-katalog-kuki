<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Hard delete bersyarat: detail opname dan mutasi tetap utuh sebagai histori.
 * Hanya MySQL; perlu backup DB sebelum migrate. Tidak mengubah FK tabel POS
 * atau tabel lain yang belum diaudit.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            throw new RuntimeException('Migration ini hanya untuk MySQL.');
        }
        if (! Schema::hasTable('katalog_produk') || ! Schema::hasTable('opname_stok') || ! Schema::hasTable('opname_stok_detail')) {
            throw new RuntimeException('Tabel katalog_produk/opname_stok_detail tidak ada.');
        }

        // Preflight kedua tabel sebelum DDL apa pun (MySQL DDL bisa auto-commit).
        $tables = ['opname_stok_detail'];
        if (Schema::hasTable('mutasi_stok')) $tables[] = 'mutasi_stok';
        foreach ($tables as $table) $this->assertKnownForeignKey($table);
        foreach ($tables as $table) $this->prepareHistoryTable($table, true);
    }

    private function assertKnownForeignKey(string $table): void
    {
        if (! Schema::hasColumn($table, 'produk_id')) {
            throw new RuntimeException("Kolom {$table}.produk_id tidak ditemukan.");
        }
        $rows = DB::select(
            "SELECT r.DELETE_RULE AS delete_rule
             FROM information_schema.KEY_COLUMN_USAGE k
             JOIN information_schema.REFERENTIAL_CONSTRAINTS r
               ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
              AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
              AND r.TABLE_NAME = k.TABLE_NAME
             WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ?
               AND k.COLUMN_NAME = 'produk_id'
               AND k.REFERENCED_TABLE_SCHEMA = DATABASE()
               AND k.REFERENCED_TABLE_NAME = 'katalog_produk'
               AND k.REFERENCED_COLUMN_NAME = 'id'",
            [$table]
        );
        if (count($rows) !== 1) {
            throw new RuntimeException("FK produk_id {$table} harus tepat 1; ditemukan ".count($rows).'.');
        }
        if (strtoupper($rows[0]->delete_rule) === 'CASCADE') {
            throw new RuntimeException("FK {$table} sebelumnya CASCADE. Audit manual sebelum migrasi.");
        }
    }

    private function prepareHistoryTable(string $table, bool $requiredForeignKey): void
    {
        if (! Schema::hasColumn($table, 'produk_id')) {
            throw new RuntimeException("Kolom {$table}.produk_id tidak ditemukan.");
        }

        // Nama, barcode, dan ID asli disimpan agar detail histori tetap terbaca
        // bahkan saat FK produk_id berubah menjadi NULL setelah hard delete.
        Schema::table($table, function (Blueprint $blueprint) use ($table) {
            if (! Schema::hasColumn($table, 'produk_id_snapshot')) {
                $blueprint->unsignedBigInteger('produk_id_snapshot')->nullable();
            }
            if (! Schema::hasColumn($table, 'nama_produk_snapshot')) {
                $blueprint->string('nama_produk_snapshot', 255)->nullable();
            }
            if (! Schema::hasColumn($table, 'barcode_snapshot')) {
                $blueprint->string('barcode_snapshot', 100)->nullable();
            }
        });

        // Backfill histori yang sudah ada; tidak mengubah stok / status opname.
        DB::statement("UPDATE `{$table}` AS h INNER JOIN `katalog_produk` AS p ON p.id = h.produk_id
            SET h.produk_id_snapshot = COALESCE(h.produk_id_snapshot, h.produk_id),
                h.nama_produk_snapshot = COALESCE(h.nama_produk_snapshot, p.nama_produk),
                h.barcode_snapshot = COALESCE(h.barcode_snapshot, p.barcode)
            WHERE h.produk_id IS NOT NULL");

        // Tidak aman melonggarkan FK jika nama historis tidak bisa disalin.
        $missing = DB::table($table)
            ->whereNotNull('produk_id')->whereNull('nama_produk_snapshot')->exists();
        if ($missing) {
            throw new RuntimeException("Snapshot nama produk di {$table} belum lengkap; migration dihentikan.");
        }

        $constraints = DB::select(
            "SELECT k.CONSTRAINT_NAME AS name, r.DELETE_RULE AS delete_rule
             FROM information_schema.KEY_COLUMN_USAGE AS k
             INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r
               ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
              AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
              AND r.TABLE_NAME = k.TABLE_NAME
             WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = ?
               AND k.COLUMN_NAME = 'produk_id'
               AND k.REFERENCED_TABLE_SCHEMA = DATABASE()
               AND k.REFERENCED_TABLE_NAME = 'katalog_produk'
               AND k.REFERENCED_COLUMN_NAME = 'id'",
            [$table]
        );
        if (count($constraints) !== 1) {
            if ($requiredForeignKey) {
                throw new RuntimeException("Diharapkan tepat 1 FK {$table}.produk_id menuju katalog_produk.id; ditemukan ".count($constraints).'.');
            }
            return;
        }

        $name = $constraints[0]->name;
        $rule = strtoupper($constraints[0]->delete_rule);
        $nullable = DB::selectOne(
            "SELECT IS_NULLABLE AS nullable FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'produk_id'",
            [$table]
        );

        if ($rule === 'SET NULL' && $nullable?->nullable === 'YES') {
            return; // Aman bila migration pernah diterapkan sebagian.
        }
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropForeign($name));
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->unsignedBigInteger('produk_id')->nullable()->change());
        Schema::table($table, fn (Blueprint $blueprint) => $blueprint->foreign('produk_id', $name)
            ->references('id')->on('katalog_produk')->nullOnDelete());
    }

    public function down(): void
    {
        // Tidak reversible secara aman setelah ada FK yang menjadi NULL
        // akibat hard delete. Rollback otomatis dapat merusak histori.
        throw new RuntimeException('Rollback otomatis tidak aman; pulihkan backup database bila diperlukan.');
    }
};
