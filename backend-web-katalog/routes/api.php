<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Aapi\MutasiStokController;
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
use App\Http\Controllers\Api\LaporanInventarisController;
use App\Http\Controllers\Api\LaporanPenjualanController;
use App\Http\Controllers\Api\Pos\PosController;
use App\Http\Controllers\Api\KukiLocationController;

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

// Lokasi Kuki (Leaflet): publik, key HeiGIT diproses hanya oleh Laravel.
Route::get('/public/kuki-map/geocode', [KukiLocationController::class, 'geocode'])->middleware('throttle:10,1');
Route::post('/public/kuki-map/route', [KukiLocationController::class, 'route'])->middleware('throttle:10,1');


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

        // Varian Produk 
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
        Route::get('/laporan-inventaris', [LaporanInventarisController::class, 'index']);
        Route::get('/laporan-inventaris/export', [LaporanInventarisController::class, 'exportCsv']);
        Route::get('/laporan-penjualan', [LaporanPenjualanController::class, 'index']);
        Route::get('/laporan-penjualan/export', [LaporanPenjualanController::class, 'export']);
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

// Riwayat Mutasi Stok
Route::get('/admin/mutasi-stok', [MutasiStokController::class, 'index'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::post('/admin/mutasi-stok/koreksi', [MutasiStokController::class, 'koreksi'])->middleware(['auth:sanctum', 'can:manage-admin']);

// STOCK OPNAME 
Route::get('/admin/opname-stok', [\App\Http\Controllers\Api\StockOpnameController::class, 'index'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::get('/admin/opname-stok/ringkasan-pengeluaran', [\App\Http\Controllers\Api\StockOpnameController::class, 'ringkasanPengeluaran'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::get('/admin/opname-stok/{opnameStok}', [\App\Http\Controllers\Api\StockOpnameController::class, 'show'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::post('/admin/opname-stok', [\App\Http\Controllers\Api\StockOpnameController::class, 'store'])->middleware(['auth:sanctum', 'can:manage-admin']);
Route::put('/admin/opname-stok/{opnameStok}', [\App\Http\Controllers\Api\StockOpnameController::class, 'update'])->middleware(['auth:sanctum', 'can:manage-admin']);
Route::post('/admin/opname-stok/{opnameStok}/selesai', [\App\Http\Controllers\Api\StockOpnameController::class, 'selesai'])->middleware(['auth:sanctum', 'can:manage-admin']);
Route::post('/admin/opname-stok/{opnameStok}/batalkan', [\App\Http\Controllers\Api\StockOpnameController::class, 'batalkan'])->middleware(['auth:sanctum', 'can:manage-admin']);
Route::post('/admin/opname-stok/pengeluaran', [\App\Http\Controllers\Api\StockOpnameController::class, 'pengeluaran'])->middleware(['auth:sanctum', 'can:manage-admin']);


/*
|--------------------------------------------------------------------------
| POS KASIR
|--------------------------------------------------------------------------
*/ 
Route::prefix('pos')
    ->middleware(['auth:sanctum', 'can:manage-pos'])
    ->group(function () {
        Route::get('/transaksi', [PosController::class, 'index']);
        Route::post('/transaksi', [PosController::class, 'store']);
        Route::get('/transaksi/{transaksi}', [PosController::class, 'show']);
        Route::put('/transaksi/{transaksi}', [PosController::class, 'update']);
        Route::delete('/transaksi/{transaksi}', [PosController::class, 'destroy']);
    });

require __DIR__ . '/pos.php';