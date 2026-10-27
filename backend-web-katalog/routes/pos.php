<?php
// Tambahkan require __DIR__.'/pos.php'; SATU KALI di akhir routes/api.php.
// File ini otomatis menerima prefix /api dari bootstrap Laravel.

use App\Http\Controllers\Api\Pos\PosController;
use Illuminate\Support\Facades\Route;

Route::prefix('pos')->group(function () {
    Route::post('/login', [PosController::class, 'login'])->middleware('throttle:5,1');
    Route::prefix('admin')->middleware(['auth:sanctum', 'can:manage-admin'])->group(function () {
        Route::post('/pegawai', [PosController::class, 'buatPegawai']);
        Route::get('/pegawai', [PosController::class, 'daftarPegawai']);
        Route::patch('/pegawai/{pegawai}/pin', [PosController::class, 'ubahPin']);
    });

    // Gunakan middleware class agar kompatibel dengan Router Laravel dan bisa diuji.
    Route::middleware(\App\Http\Middleware\PosAuthenticate::class)->group(function () {
        Route::get('/me', [PosController::class, 'me']);
        Route::post('/logout', [PosController::class, 'logout']);
        Route::get('/catalog', [PosController::class, 'catalog']);
        Route::get('/shift', [PosController::class, 'shift']);
        Route::post('/shift/start', [PosController::class, 'startShift']);
        Route::post('/shift/end', [PosController::class, 'endShift']);
        Route::get('/transactions', [PosController::class, 'transactions']);
        Route::get('/transactions/{transaksi}', [PosController::class, 'transactionDetail']);
        Route::post('/transactions', [PosController::class, 'checkout'])->middleware('throttle:60,1');
        Route::get('/report', [PosController::class, 'report']);
    });
});
