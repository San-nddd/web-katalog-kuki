<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Artikel dapat berupa teks saja, foto saja, video saja, atau kombinasi.
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->longText('konten')->nullable()->change();
        });

        Schema::create('blog_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blog_post_id')
                ->constrained('blog_posts')
                ->cascadeOnDelete();
            $table->string('jenis', 10); // foto atau video
            $table->string('path', 1000);
            $table->string('mime_type', 100);
            $table->string('caption', 255)->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
            $table->index(['blog_post_id', 'urutan']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_media');

        // Kembalikan kolom ke bentuk semula saat rollback.
        // PERINGATAN: data konten NULL akan menjadi teks kosong jika rollback.
        DB::table('blog_posts')->whereNull('konten')->update(['konten' => '']);
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->longText('konten')->nullable(false)->change();
        });
    }
};
