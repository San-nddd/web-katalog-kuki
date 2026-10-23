<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('customer')->index();
        });

        DB::table('users')->update(['role' => 'admin']);

        Schema::table('testimonials', function (Blueprint $table) {
            $table->string('name')->nullable();
            $table->string('role')->nullable();
            $table->text('quote')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('source')->default('manual')->index();
            $table->string('status')->default('published')->index();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
        });

        Schema::create('testimonial_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('testimonial_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('comment');
            $table->string('status')->default('pending')->index();
            $table->foreignId('moderated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('moderated_at')->nullable();
            $table->timestamps();
            $table->index(['testimonial_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('testimonial_comments');

        Schema::table('testimonials', function (Blueprint $table) {
            $table->dropForeign(['verified_by']);
            $table->dropColumn([
                'name',
                'role',
                'quote',
                'photo_path',
                'source',
                'status',
                'verified_at',
                'verified_by',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropColumn('role');
        });
    }
};
