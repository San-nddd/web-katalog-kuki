
<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AdminChatController;
use App\Http\Controllers\AssistantController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\kategoriController;
use App\Http\Controllers\ManagementDashboardController;
use App\Http\Controllers\produkController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\Api\TestimonialController;
use App\Http\Controllers\Api\TestimonialCommentController;
use App\Http\Controllers\Api\ProdukVarianController;
use App\Http\Controllers\Api\ProduksiHarianController;

/*
|--------------------------------------------------------------------------
| PUBLIC API
|--------------------------------------------------------------------------
*/

// Kuki Assistant
Route::post('/assistant/chat', [AssistantController::class, 'chat'])->middleware('throttle:10,1');
Route::get('/assistant/obrolan/{sessionId}', [AssistantController::class, 'obrolan']);
Route::post('/assistant/handover', [AssistantController::class, 'handover'])->middleware('throttle:5,1');

// Produk
Route::get('/produk', [produkController::class, 'index']);
Route::get('/produk/{id}', [produkController::class, 'show']);
Route::get('/produk/{produk}/varian', [ProdukVarianController::class, 'index']);

// Kategori
Route::get('/kategori', [kategoriController::class, 'index']);
Route::get('/kategori/{id}', [kategoriController::class, 'show']);

// Testimonial
Route::get('/testimonial', [TestimonialController::class, 'index']);
Route::get('/testimonial/{testimonial}', [TestimonialController::class, 'show']);
Route::post('/testimonial', [TestimonialController::class, 'submit'])->middleware('throttle:3,1');

// Komentar Testimonial
Route::get('/testimonial/{testimonial}/komentar', [TestimonialCommentController::class, 'index']);
Route::post('/testimonial/{testimonial}/komentar', [TestimonialCommentController::class, 'store'])->middleware('throttle:5,1');

// Authentication
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');


/*
|--------------------------------------------------------------------------
| AUTHENTICATED API
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    /*
    |--------------------------------------------------------------------------
    | ADMIN ONLY
    |--------------------------------------------------------------------------
    */

    Route::middleware('can:manage-admin')->group(function () {

        // Manajemen Produk
        Route::post('/produk', [produkController::class, 'store']);
        Route::put('/produk/{id}', [produkController::class, 'update']);
        Route::delete('/produk/{id}', [produkController::class, 'destroy']);
        Route::post('/produk/{id}/gambar', [produkController::class, 'uploadGambar']);

        // Manajemen Kategori
        Route::post('/kategori', [kategoriController::class, 'store']);
        Route::put('/kategori/{id}', [kategoriController::class, 'update']);
        Route::delete('/kategori/{id}', [kategoriController::class, 'destroy']);
        Route::post('/kategori/{id}/gambar', [kategoriController::class, 'uploadGambar']);

        // Produksi Harian
        Route::get('/admin/produksi-harian', [ProduksiHarianController::class, 'index']);
        Route::post('/admin/produksi-harian', [ProduksiHarianController::class, 'store']);
        Route::post('/admin/produksi-harian/{produksiHarian}/konfirmasi-cetak', [ProduksiHarianController::class, 'konfirmasiCetak']);

        // Admin Chat & Push Notifications
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

            // Push Notifications
            Route::get('/push/vapid-key', [PushSubscriptionController::class, 'vapidKey']);
            Route::post('/push/subscribe', [PushSubscriptionController::class, 'store']);
            Route::delete('/push/subscribe', [PushSubscriptionController::class, 'destroy']);

        });

        // Varian Produk (Legacy)
        Route::get('/admin/produk/{produk}/varian', [ProdukVarianController::class, 'adminIndex']);
        Route::post('/admin/produk/{produk}/varian', [ProdukVarianController::class, 'store']);
        Route::put('/admin/produk/{produk}/varian/{varian}', [ProdukVarianController::class, 'update']);
        Route::delete('/admin/produk/{produk}/varian/{varian}', [ProdukVarianController::class, 'destroy']);

    });
});


/*
|--------------------------------------------------------------------------
| MANAGEMENT DASHBOARD
|--------------------------------------------------------------------------
*/

Route::prefix('management')
    ->middleware(['auth:sanctum', 'can:view-management-dashboard'])
    ->group(function () {
        Route::get('/dashboard', [ManagementDashboardController::class, 'show']);
    });


/*
|--------------------------------------------------------------------------
| ADMIN TESTIMONIAL
|--------------------------------------------------------------------------
*/

Route::prefix('admin/testimonial')
    ->middleware(['auth:sanctum', 'can:manage-testimonials'])
    ->group(function () {

        // CRUD Testimonial
        Route::get('/', [TestimonialController::class, 'adminIndex']);
        Route::post('/', [TestimonialController::class, 'store']);

        // Moderasi Komentar
        Route::get('/komentar', [TestimonialCommentController::class, 'adminIndex']);
        Route::patch('/komentar/{comment}/moderasi', [TestimonialCommentController::class, 'moderate']);
        Route::delete('/komentar/{comment}', [TestimonialCommentController::class, 'destroy']);

        // Manajemen Testimonial
        Route::put('/{testimonial}', [TestimonialController::class, 'update']);
        Route::delete('/{testimonial}', [TestimonialController::class, 'destroy']);
        Route::patch('/{testimonial}/moderasi', [TestimonialController::class, 'moderate']);
        Route::post('/{testimonial}/foto', [TestimonialController::class, 'uploadPhoto']);
        Route::delete('/{testimonial}/foto', [TestimonialController::class, 'deletePhoto']);

    });
