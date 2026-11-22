<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class BakerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nama' => fake()->name(),
            'spesialisasi' => fake()->randomElement([
                'Head Pastry Chef',
                'Pastry & Sourdough',
                'Pastry Assistant',
                'Cake Artist & Educator',
            ]),
            'foto' => null,
            'urutan' => fake()->numberBetween(0, 20),
            'aktif' => true,
        ];
    }
}
