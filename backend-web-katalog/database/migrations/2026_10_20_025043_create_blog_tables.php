<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('blog_categories', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blog_category_id')->nullable()->constrained('blog_categories')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('judul');
            $table->string('slug')->unique();
            $table->string('ringkasan', 500)->nullable();
            $table->longText('konten');
            $table->string('gambar_sampul', 1000)->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'published_at']);
        });

        Schema::create('blog_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blog_post_id')->constrained('blog_posts')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('blog_comments')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nama_pengirim', 100);
            $table->string('email_pengirim')->nullable();
            $table->text('isi');
            $table->string('status', 20)->default('pending');
            $table->boolean('is_admin')->default(false);
            $table->timestamps();
            $table->index(['blog_post_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_comments');
        Schema::dropIfExists('blog_posts');
        Schema::dropIfExists('blog_categories');
    }
};
