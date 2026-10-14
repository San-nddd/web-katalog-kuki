<?php

use App\Http\Controllers\AdminChatController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\kategoriController;
use App\Http\Controllers\produkController;
use App\Http\Controllers\Api\TestimonialController;
use Illuminate\Support\Facades\Route;

Route::post('/assistant/chat', [AssistantController::class, 'chat'])->middleware('throttle:10,1');
Route::get('/assistant/obrolan/{sessionId}', [AssistantController::class, 'obrolan']);
Route::post('/assistant/handover', [AssistantController::class, 'handover'])->middleware('throttle:5,1');

Route::get('/produk', [produkController::class, 'index']);
Route::get('/produk/{id}', [produkController::class, 'show']);
Route::get('/kategori', [kategoriController::class, 'index']);
Route::get('/kategori/{id}', [kategoriController::class, 'show']);
Route::get('/testimonial', [TestimonialController::class, 'index']);
Route::get('/testimonial/{testimonial}', [TestimonialController::class, 'show']);

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
        Route::post('/obrolan/{id}/balas', [AdminChatController::class, 'balas']);
        Route::get('/obrolan/{id}/pesan', [AdminChatController::class, 'pesanBaru']);
        Route::post('/obrolan/{id}/baca', [AdminChatController::class, 'baca']);
    });
});
