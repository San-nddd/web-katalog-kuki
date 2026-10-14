<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Informasi Toko Kuki Bakehouse
    |--------------------------------------------------------------------------
    | Digunakan oleh Kuki Assistant sebagai konteks informasi toko.
    | Ubah melalui environment variable tanpa menyentuh source code.
    */

    'nama' => env('KUKI_NAMA', 'Kuki Bakehouse'),

    'alamat' => env('KUKI_ALAMAT', 'Jl. Angkrek No.52, Situ, Kec. Sumedang Utara, Kabupaten Sumedang, Jawa Barat 45323'),

    'telepon' => env('KUKI_TELEPON', '+62 851-3524-3310'),

    'jam_buka' => env('KUKI_JAM_BUKA', 'Senin - Jumat: 09.00 - 17.00, Sabtu - Minggu: 08.00 - 18.00'),

    'deskripsi' => env('KUKI_DESKRIPSI', 'Kuki Bakehouse adalah toko kue dan roti yang menyajikan kue, roti, dan pastry segar yang dipanggang setiap hari.'),

];
