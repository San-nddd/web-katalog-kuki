<?php
// POTONGAN SAJA, JANGAN GANTI routes/api.php SECARA UTUH.
// Gabungkan import & dua route ini SETELAH memeriksa kode routes/api.php terkini.
use App\Http\Controllers\Api\KukiLocationController;

// Publik, throttle 10 permintaan/IP/menit tiap endpoint.
// Pastikan kebijakan rate limiter dan reverse proxy (trusted proxies) aplikasi sesuai deployment.
Route::get('/public/kuki-map/geocode', [KukiLocationController::class, 'geocode'])->middleware('throttle:10,1');
Route::post('/public/kuki-map/route', [KukiLocationController::class, 'route'])->middleware('throttle:10,1');
