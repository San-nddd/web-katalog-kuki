<?php

namespace App\Services;

class SafetyReportDetector
{
    private const STRONG_PATTERNS = [
        'benda_asing' => [
            'label' => 'Benda asing pada produk',
            'severity' => 4,
            'pattern' => '/\b(?:rambut|helai\s+rambut|kecoa|kecoak|serangga|kumbang|semut|lalat|nyamuk|tikus|cacing|ulat|kotoran|tahi|benda\s+asing|barang\s+asing|hewan|binatang|plastik|kaca|paku|kawat|benang)\b/iu',
        ],
        'bahan_berbahaya' => [
            'label' => 'Zat berbahaya pada produk',
            'severity' => 4,
            'pattern' => '/\b(?:oli|minyak\s+mesin|bensin|solar|bahan\s+kimia|zat\s+kimia|kimia|pemutih|deterjen|disinfektan|formalin|boraks|cairan\s+aneh|zat\s+aneh|zat\s+mencurigakan|bau\s+kimia|bau\s+bensin)\b/iu',
        ],
        'jamur' => [
            'label' => 'Dugaan jamur atau kontaminasi',
            'severity' => 4,
            'pattern' => '/\b(?:jamur|berjamur|kapang|bintik\s+hijau|bercak\s+hijau)\b/iu',
        ],
        'keracunan' => [
            'label' => 'Dugaan keracunan makanan',
            'severity' => 5,
            'pattern' => '/\b(?:keracunan|keracun|food\s+poisoning|anafilaksis|anafilaktik)\b/iu',
        ],
        'alergi' => [
            'label' => 'Reaksi alergi setelah mengonsumsi produk',
            'severity' => 5,
            'pattern' => '/\b(?:alergi|alergik|reaksi\s+alergi|urtikaria|biduran|gatal\s*-\s*gatal)\b/iu',
        ],
    ];

    private const CONTEXT_PATTERNS = [
        'kesehatan' => [
            'label' => 'Keluhan kesehatan terkait makanan',
            'severity' => 3,
            'pattern' => '/\b(?:muntah|mual|diare|sakit\s+perut|demam|lemas|pusing|sesak|sesak\s+napas|tidak\s+bisa\s+napas|gatal|ruam|bentol|bengkak|pingsan)\b/iu',
        ],
        'kontaminasi' => [
            'label' => 'Dugaan kontaminasi atau higienitas produk',
            'severity' => 3,
            'pattern' => '/\b(?:kotor|tidak\s+higienis|berlendir|lendir|najis|busuk|bau\s+busuk|jijik)\b/iu',
        ],
    ];

    private const FOOD_CONTEXT = '/\b(?:kue|roti|pastry|croissant|donat|cake|bolu|brownies|kuki|produk|makanan|makan|konsumsi|pesanan|order|kotak|box|bungkus|isi|potong|gigit|suap|toko)\b/iu';

    private const AFTER_EATING = '/\b(?:setelah|habis|sejak|usai|selesai)\s+(?:aku\s+|saya\s+|kam\s+)?(?:makan|konsumsi|makan\s+kue|makan\s+roti)\b/iu';

    private const NEGATION = '/(?:\b(?:tidak|nggak|enggak|gak|ga|bukan|tanpa)\s+(?:ada|berada|terdapat|terlihat)\s*)$/iu';

    private const MEDICAL_EMERGENCY = '/\b(?:sesak|sesak\s+napas|tidak\s+bisa\s+napas|anafilaksis|anafilaktik|pingsan|pendarahan|muntah\s+darah|lemas|gawat|darurat|igs)\b/iu';

    public function detect(string $message): ?array
    {
        $normalized = $this->normalize($message);

        $best = null;

        foreach (self::STRONG_PATTERNS as $kategori => $detail) {
            if (! $this->hasMatch($normalized, $detail['pattern'])) {
                continue;
            }

            $candidate = [
                'kategori' => $kategori,
                'label' => $detail['label'],
                'severity' => $detail['severity'],
            ];

            if ($best === null || $candidate['severity'] > $best['severity']) {
                $best = $candidate;
            }
        }

        if ($best === null) {
            $adaKonteksMakanan = preg_match(self::FOOD_CONTEXT, $normalized) === 1;
            $adaKonteksSetelahMakan = preg_match(self::AFTER_EATING, $normalized) === 1;

            if (! $adaKonteksMakanan && ! $adaKonteksSetelahMakan) {
                return null;
            }

            foreach (self::CONTEXT_PATTERNS as $kategori => $detail) {
                if (! $this->hasMatch($normalized, $detail['pattern'])) {
                    continue;
                }

                $candidate = [
                    'kategori' => $kategori,
                    'label' => $detail['label'],
                    'severity' => $detail['severity'],
                ];

                if ($best === null || $candidate['severity'] > $best['severity']) {
                    $best = $candidate;
                }
            }
        }

        if ($best === null) {
            return null;
        }

        return [
            'kategori' => $best['kategori'],
            'label' => $best['label'],
            'butuh_medis' => in_array($best['kategori'], ['keracunan', 'alergi'], true)
                || preg_match(self::MEDICAL_EMERGENCY, $normalized) === 1,
        ];
    }

    private function normalize(string $message): string
    {
        $text = mb_strtolower($message, 'UTF-8');
        $text = strtr($text, ['3' => 'e', '1' => 'i', '0' => 'o', '4' => 'a', '5' => 's']);
        $text = preg_replace('/([aeiou])\1+/u', '$1', $text) ?? $text;
        $text = preg_replace('/[^a-z0-9\s]+/u', ' ', $text) ?? $text;

        return preg_replace('/\s+/u', ' ', trim($text)) ?? $text;
    }

    private function hasMatch(string $text, string $pattern): bool
    {
        if (preg_match_all($pattern, $text, $matches, PREG_OFFSET_CAPTURE) === false) {
            return false;
        }

        foreach ($matches[0] as $match) {
            [$found, $offset] = $match;

            if ($found === '') {
                continue;
            }

            $prefix = mb_substr($text, max(0, $offset - 24), min(24, $offset));

            if (preg_match(self::NEGATION, $prefix) === 1) {
                continue;
            }

            return true;
        }

        return false;
    }
}
