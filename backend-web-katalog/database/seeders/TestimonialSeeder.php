<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Testimonial;

class TestimonialSeeder extends Seeder
{
    public function run(): void
    {
        \ = [
            [
                'nama' => 'Michael Turner',
                'isi' => 'Kuki Bakehouse selalu jadi andalan kami untuk setiap acara. Burnt Cheesecake-nya juara, dan custom cake-nya selalu tepat sesuai keinginan.',
                'rating' => 5,
                'status' => 1,
                'urutan' => 1,
            ],
            [
                'nama' => 'Sarah Putri',
                'isi' => 'Garden Cheesecake-nya lembut banget, gak terlalu manis. Sudah langganan dua tahun dan kualitasnya tidak pernah mengecewakan.',
                'rating' => 5,
                'status' => 1,
                'urutan' => 2,
            ],
            [
                'nama' => 'Daniel Hartono',
                'isi' => 'Pesan Tiramisu dan Lapis Legit untuk keluarga, hasilnya cantik dan rasanya luar biasa. Semua tamu bertanya di mana pesannya.',
                'rating' => 5,
                'status' => 1,
                'urutan' => 3,
            ],
        ];
        foreach (\ as \) {
            Testimonial::firstOrCreate(['nama' => \['nama']], \);
        }
    }
}
