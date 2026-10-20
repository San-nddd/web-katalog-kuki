<?php

use App\Http\Controllers\AdminChatController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\kategoriController;
use App\Http\Controllers\produkController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\PushSubscriptionController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\BlogController;
use App\Http\Controllers\Api\BlogCategoryController;
use App\Http\Controllers\Api\BlogCommentController;
use App\Http\Controllers\Api\BlogMediaController;


Route::post('/assistant/chat', [AssistantController::class, 'chat'])->middleware('throttle:10,1');
Route::get('/assistant/obrolan/{sessionId}', [AssistantController::class, 'obrolan']);
Route::post('/assistant/handover', [AssistantController::class, 'handover'])->middleware('throttle:5,1');

Route::get('/produk', [produkController::class, 'index']);
Route::get('/produk/{id}', [produkController::class, 'show']);
Route::get('/kategori', [kategoriController::class, 'index']);
Route::get('/kategori/{id}', [kategoriController::class, 'show']);
Route::get('/testimonial', [TestimonialController::class, 'index']);
Route::get('/testimonial/{testimonial}', [TestimonialController::class, 'show']);

Route::get('/blog/kategori', [BlogCategoryController::class, 'index']);
Route::get('/blog', [BlogController::class, 'index']);
Route::get('/blog/{slug}', [BlogController::class, 'show']);
Route::get('/blog/{slug}/komentar', [BlogCommentController::class, 'index']);
Route::post('/blog/{slug}/komentar', [BlogCommentController::class, 'store'])->middleware('throttle:5,1');

Route::get('/admin/blog', [BlogController::class, 'adminIndex']);
Route::post('/admin/blog', [BlogController::class, 'store']);
Route::put('/admin/blog/{post}', [BlogController::class, 'update']);
Route::delete('/admin/blog/{post}', [BlogController::class, 'destroy']);
Route::post('/admin/blog/kategori', [BlogCategoryController::class, 'store']);
Route::put('/admin/blog/kategori/{category}', [BlogCategoryController::class, 'update']);
Route::delete('/admin/blog/kategori/{category}', [BlogCategoryController::class, 'destroy']);
Route::get('/admin/blog/komentar', [BlogCommentController::class, 'adminIndex']);
Route::patch('/admin/blog/komentar/{comment}', [BlogCommentController::class, 'moderate']);
Route::delete('/admin/blog/komentar/{comment}', [BlogCommentController::class, 'destroy']);
Route::post('/admin/blog/{post}/balas', [BlogCommentController::class, 'adminReply']);
Route::post('/admin/blog/{post}/media', [BlogMediaController::class, 'upload']);
Route::delete('/admin/blog/media/{media}', [BlogMediaController::class, 'destroy']);
Route::post('/admin/blog/{post}/set-sampul', [BlogMediaController::class, 'uploadSampul']);

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::post('/produk', [produkController::class, 'store']);
    Route::put('/produk/{id}', [produkController::class, 'update']);
    Route::delete('/produk/{id}', [produkController::class, 'destroy']);
    Route::post('/produk/{id}/gambar', [produkController::class, 'uploadGambar']);

    Route::post('/kategori', [kategoriController::class, 'store']);
    Route::put('/kategori/{id}', [kategoriController::class, 'update']);
    Route::delete('/kategori/{id}', [kategoriController::class, 'destroy']);
    Route::post('/kategori/{id}/gambar', [kategoriController::class, 'uploadGambar']);

    Route::post('/testimonial', [TestimonialController::class, 'store']);
    Route::put('/testimonial/{testimonial}', [TestimonialController::class, 'update']);
    Route::delete('/testimonial/{testimonial}', [TestimonialController::class, 'destroy']);

    Route::prefix('admin')->group(function () {
        Route::get('/obrolan', [AdminChatController::class, 'index']);
        Route::get('/obrolan/statistik', [AdminChatController::class, 'statistik']);
        Route::get('/obrolan/pertanyaan-tidak-terjawab', [AdminChatController::class, 'pertanyaanTidakTerjawab']);

        Route::get('/obrolan/{id}', [AdminChatController::class, 'show']);
        Route::post('/obrolan/{id}/ambil', [AdminChatController::class, 'ambil']);
        Route::post('/obrolan/{id}/selesai', [AdminChatController::class, 'selesai']);
        Route::post('/obrolan/{id}/balas', [AdminChatController::class, 'balas']);
        Route::get('/obrolan/{id}/pesan', [AdminChatController::class, 'pesanBaru']);
        Route::post('/obrolan/{id}/baca', [AdminChatController::class, 'baca']);
        Route::get('/push/vapid-key', [PushSubscriptionController::class, 'vapidKey']);
        Route::post('/push/subscribe', [PushSubscriptionController::class, 'store']);
        Route::delete('/push/subscribe', [PushSubscriptionController::class, 'destroy']);
    });
});
