<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Kuki Bakehouse Maps V4.
 * - Kunci HeiGIT tidak pernah dikirim ke browser.
 * - Destinasi hanya toko yang dikonfigurasi server.
 * - Foot-walking: HeiGIT dahulu, demo FOSSGIS hanya bila opt-in.
 * - Tidak menyimpan / logging koordinat pelanggan.
 */
class KukiLocationController extends Controller
{
    private const HEIGIT_BASE = 'https://api.heigit.org';

    private const FOSSGIS_BASE = 'https://routing.openstreetmap.de';

    private function apiKey(): ?string
    {
        $value = config('services.kuki_location.api_key');

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }

    private function destination(): ?array
    {
        $lat = config('services.kuki_location.store_lat');
        $lng = config('services.kuki_location.store_lng');
        if (! is_numeric($lat) || ! is_numeric($lng)) {
            return null;
        }
        $lat = (float) $lat;
        $lng = (float) $lng;
        if (abs($lat) > 90 || abs($lng) > 180 || ($lat === 0.0 && $lng === 0.0)) {
            return null;
        }

        return [$lng, $lat]; // GeoJSON: longitude, latitude.
    }

    private function walkingDemoEnabled(): bool
    {
        return config('services.kuki_location.walking_demo_fallback', false) === true;
    }

    public function geocode(Request $request): JsonResponse
    {
        $data = $request->validate(['text' => ['required', 'string', 'min:3', 'max:160']]);
        $key = $this->apiKey();
        if (! $key) {
            return response()->json(['message' => 'Layanan pencarian alamat belum dikonfigurasi.'], 503);
        }

        try {
            $res = Http::withHeaders(['Authorization' => $key])
                ->acceptJson()->timeout(12)->get(self::HEIGIT_BASE.'/pelias/v1/search', [
                    'text' => $data['text'],
                    'size' => 5,
                    'boundary.country' => 'ID',
                ]);
        } catch (ConnectionException $e) {
            Log::warning('Kuki geocode: penyedia tidak dapat dihubungi.');

            return response()->json(['message' => 'Penyedia pencarian alamat tidak dapat dihubungi.'], 503);
        }

        if ($res->status() === 429) {
            return response()->json(['message' => 'Batas pencarian sedang tercapai. Coba lagi nanti.'], 429);
        }
        if (! $res->successful()) {
            return response()->json(['message' => 'Pencarian alamat sedang tidak tersedia.'], 503);
        }

        $results = collect($res->json('features', []))
            ->filter(fn ($f) => is_array(data_get($f, 'geometry.coordinates')))
            ->map(function ($feature) {
                $coordinates = data_get($feature, 'geometry.coordinates');

                return [
                    'lat' => (float) ($coordinates[1] ?? 0),
                    'lng' => (float) ($coordinates[0] ?? 0),
                    'label' => (string) data_get($feature, 'properties.label', 'Alamat yang ditemukan'),
                ];
            })
            ->filter(fn ($item) => abs($item['lat']) <= 90 && abs($item['lng']) <= 180 && ! ($item['lat'] === 0.0 && $item['lng'] === 0.0))
            ->values()->all();

        return response()->json(['results' => $results]);
    }

    public function route(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'mode' => ['required', 'in:driving-car,cycling-regular,foot-walking'],
        ]);
        $end = $this->destination();
        if (! $end) {
            return response()->json(['message' => 'Koordinat tujuan toko belum dikonfigurasi.'], 503);
        }
        $start = [(float) $data['lng'], (float) $data['lat']];
        $mode = $data['mode'];
        $key = $this->apiKey();

        if (! $key && ! ($mode === 'foot-walking' && $this->walkingDemoEnabled())) {
            return response()->json(['message' => 'API key layanan rute belum dikonfigurasi.'], 503);
        }

        // Primary provider. Shorter timeout for walking so the optional fallback can respond.
        if ($key) {
            try {
                $response = Http::withHeaders(['Authorization' => $key])
                    ->asJson()
                    ->accept('application/geo+json')
                    ->connectTimeout(5)
                    ->timeout($mode === 'foot-walking' ? 12 : 18)
                    ->post(self::HEIGIT_BASE.'/openrouteservice/v2/directions/'.$mode.'/geojson', [
                        'coordinates' => [$start, $end],
                    ]);
            } catch (ConnectionException $e) {
                Log::warning('Kuki routing: HeiGIT timeout/koneksi gagal.', ['profile' => $mode]);
                if ($mode === 'foot-walking' && $this->walkingDemoEnabled()) {
                    return $this->walkingDemoRoute($start, $end);
                }

                return response()->json([
                    'message' => $mode === 'foot-walking'
                        ? 'Layanan rute jalan kaki sedang tidak merespons. Aktifkan fallback demo untuk pengujian atau coba lagi nanti.'
                        : 'Layanan perhitungan rute sedang tidak merespons. Coba lagi nanti.',
                ], 503);
            }

            if ($response->successful()) {
                $coordinates = $response->json('features.0.geometry.coordinates');
                $distance = $response->json('features.0.properties.summary.distance');
                $duration = $response->json('features.0.properties.summary.duration');
                if ($this->validRoute($coordinates, $distance, $duration)) {
                    return response()->json([
                        'coordinates' => $coordinates,
                        'distanceMeters' => (float) $distance,
                        'durationSeconds' => (float) $duration,
                        'source' => 'heigit',
                    ]);
                }

                return response()->json(['message' => 'Rute dari penyedia tidak valid atau tidak ditemukan.'], 422);
            }

            $status = $response->status();
            $providerCode = $response->json('error.code') ?? $response->json('code');
            // No raw body, auth header, URL with coordinates, or customer location in logs.
            Log::warning('Kuki routing: penyedia menolak permintaan.', [
                'profile' => $mode,
                'upstream_status' => $status,
                'provider_code' => is_scalar($providerCode) ? (string) $providerCode : null,
            ]);
            if ($status === 401) {
                return response()->json(['message' => 'API key HeiGIT tidak valid.'], 503);
            }
            if ($status === 403) {
                return response()->json(['message' => 'Akses HeiGIT ditolak. Periksa izin API key.'], 503);
            }
            if ($status === 429) {
                return response()->json(['message' => 'Kuota HeiGIT tercapai. Coba lagi nanti.'], 429);
            }
            if (in_array((string) $providerCode, ['2009', '2010', '2016'], true)) {
                return response()->json(['message' => 'Jalur tidak ditemukan. Pilih titik awal dan titik toko yang dekat jalan yang dapat dilalui.'], 422);
            }
            if (in_array($status, [400, 404, 413, 422], true)) {
                return response()->json(['message' => 'Titik awal atau tujuan tidak dapat dirutekan oleh layanan ini.'], 422);
            }
            if ($mode === 'foot-walking' && $status >= 500 && $this->walkingDemoEnabled()) {
                return $this->walkingDemoRoute($start, $end);
            }

            return response()->json([
                'message' => $mode === 'foot-walking'
                    ? 'Penyedia rute jalan kaki sedang bermasalah. Coba lagi nanti atau aktifkan fallback demo.'
                    : 'Penyedia rute sedang bermasalah. Coba lagi nanti.',
            ], 503);
        }

        // Walking-only demo when explicitly enabled, even without a HeiGIT key.
        return $this->walkingDemoRoute($start, $end);
    }

    private function validRoute(mixed $coordinates, mixed $distance, mixed $duration): bool
    {
        if (! is_array($coordinates) || count($coordinates) < 2) {
            return false;
        }
        if (! is_numeric($distance) || ! is_numeric($duration) || (float) $distance < 0 || (float) $duration < 0) {
            return false;
        }

        return collect($coordinates)->every(fn ($point) => is_array($point)
            && count($point) >= 2
            && is_numeric($point[0]) && is_numeric($point[1])
            && abs((float) $point[0]) <= 180 && abs((float) $point[1]) <= 90);
    }

    private function walkingDemoRoute(array $start, array $end): JsonResponse
    {
        // FOSSGIS fair-use: demo only. One query per ~2s per configured cache store.
        // This is NOT a commercial/production SLA. Do not persist route coordinates.
        if (! Cache::add('kuki:fossgis-demo:rate-gate', true, 2)) {
            return response()->json(['message' => 'Rute cadangan sedang dibatasi. Coba lagi beberapa detik.'], 429);
        }

        $coordinates = implode(',', $start).';'.implode(',', $end);
        // The /routed-foot/ prefix selects the *actual* pedestrian routing server.
        // OSRM's internal /route/v1/driving/ segment is standard for this instance.
        $url = self::FOSSGIS_BASE.'/routed-foot/route/v1/driving/'.$coordinates;
        try {
            $response = Http::withHeaders([
                'User-Agent' => 'KukiBakehouseWebsite/1.0 (limited map route preview)',
            ])->acceptJson()->connectTimeout(5)->timeout(10)->get($url, [
                'overview' => 'full',
                'geometries' => 'geojson',
                'steps' => 'false',
            ]);
        } catch (ConnectionException $e) {
            Log::warning('Kuki routing: demo pejalan kaki gagal terhubung.');

            return response()->json(['message' => 'Rute jalan kaki belum dapat dimuat dari kedua penyedia. Coba lagi nanti.'], 503);
        }

        if (! $response->successful()) {
            Log::warning('Kuki routing: demo pejalan kaki merespons error.', ['status' => $response->status()]);

            return response()->json(['message' => 'Server rute jalan kaki cadangan belum tersedia. Coba lagi nanti.'], 503);
        }

        $geometry = $response->json('routes.0.geometry.coordinates');
        $distance = $response->json('routes.0.distance');
        $duration = $response->json('routes.0.duration');
        if ($response->json('code') !== 'Ok' || ! $this->validRoute($geometry, $distance, $duration)) {
            return response()->json(['message' => 'Jalur pejalan kaki tidak ditemukan untuk titik tersebut. Pilih titik awal di jalan terdekat.'], 422);
        }

        return response()->json([
            'coordinates' => $geometry,
            'distanceMeters' => (float) $distance,
            'durationSeconds' => (float) $duration,
            'source' => 'fossgis-demo',
            'notice' => 'Pratinjau jalan kaki dari server demo FOSSGIS/OpenStreetMap. Estimasi dapat berbeda dari kondisi lapangan.',
        ]);
    }
}
