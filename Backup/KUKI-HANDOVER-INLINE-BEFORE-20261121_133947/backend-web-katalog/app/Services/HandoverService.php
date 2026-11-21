<?php

namespace App\Services;

use App\Models\Obrolan;
use App\Models\PesanObrolan;
use App\Models\User;
use App\Notifications\CustomerNewMessageNotification;
use App\Notifications\HandoverRequestedNotification;
use Illuminate\Support\Facades\Log;

class HandoverService
{
    public const PRIORITY_HIGH = 'tinggi';

    public const HANDOVER_MENUNGGU = 'membutuhkan_admin';

    public const HANDOVER_DITANGANI = 'ditangani';

    public const CONNECTING_MESSAGE = 'Sedang menghubungkan Anda ke Admin...';

    public const TIMEOUT_MESSAGE = 'Admin sedang belum dapat merespons langsung. Pesan Anda sudah masuk dan akan ditanggapi secepatnya.';

    public const ADMIN_JOINED_MESSAGE = 'Admin Kuki telah bergabung dalam percakapan.';

    public const CLOSED_MESSAGE = 'Percakapan ini telah selesai.';

    private const PENDING_SECONDS = 15;

    public function start(Obrolan $obrolan, string $alasan, string $prioritas = 'normal'): bool
    {
        $prioritasTinggi = $prioritas === self::PRIORITY_HIGH;
        $statusSebelumnya = $obrolan->status_handover;
        $prioritasSebelumnya = $obrolan->prioritas;

        if ($statusSebelumnya === self::HANDOVER_DITANGANI && ! $prioritasTinggi) {
            return false;
        }

        if ($statusSebelumnya === self::HANDOVER_MENUNGGU && ! $prioritasTinggi) {
            return false;
        }

        if (
            $statusSebelumnya === self::HANDOVER_MENUNGGU
            && $prioritasTinggi
            && $prioritasSebelumnya === self::PRIORITY_HIGH
        ) {
            return false;
        }

        if ($statusSebelumnya === self::HANDOVER_DITANGANI) {
            $obrolan->update(['prioritas' => self::PRIORITY_HIGH]);
            $this->tambahPesanSistem($obrolan, 'Laporan ditingkatkan ke prioritas tinggi: '.$alasan);
            $this->notifyAdmins($obrolan, $alasan, self::PRIORITY_HIGH, true);

            return true;
        }

        $baru = $statusSebelumnya !== self::HANDOVER_MENUNGGU;
        $diupgrade = ! $baru && $prioritasSebelumnya !== self::PRIORITY_HIGH;

        $obrolan->update([
            'status_handover' => self::HANDOVER_MENUNGGU,
            'status' => 'menunggu',
            'prioritas' => $prioritasTinggi ? self::PRIORITY_HIGH : $prioritasSebelumnya,
            'handover_started_at' => $obrolan->handover_started_at ?? now(),
        ]);

        if ($baru) {
            $awal = $prioritasTinggi
                ? 'Laporan prioritas tinggi diteruskan ke Admin: '
                : 'Permintaan handover ke admin: ';

            $this->tambahPesanSistem($obrolan, $awal.$alasan);
            $this->tambahPesanSistem($obrolan, self::CONNECTING_MESSAGE);
        } elseif ($diupgrade) {
            $this->tambahPesanSistem($obrolan, 'Laporan ditingkatkan ke prioritas tinggi: '.$alasan);
        } else {
            return false;
        }

        $this->notifyAdmins($obrolan, $alasan, $prioritasTinggi ? self::PRIORITY_HIGH : 'normal', $diupgrade);

        return true;
    }

    public function notifyCustomerMessage(Obrolan $obrolan, PesanObrolan $pesan): void
    {
        $lockKey = 'customer-message-push-'.$pesan->id;

        if (! cache()->add($lockKey, true, now()->addSeconds(10))) {
            return;
        }

        try {
            $admins = User::whereHas('pushSubscriptions')->get();

            foreach ($admins as $admin) {
                $admin->notify(new CustomerNewMessageNotification(
                    $obrolan->id,
                    $pesan->id,
                    (string) $pesan->pesan
                ));
            }

            Log::info('CUSTOMER_NEW_MESSAGE_PUSH_TERKIRIM', [
                'obrolan_id' => $obrolan->id,
                'pesan_id' => $pesan->id,
                'jumlah_admin' => $admins->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('CUSTOMER_NEW_MESSAGE_PUSH_GAGAL', [
                'obrolan_id' => $obrolan->id,
                'pesan_id' => $pesan->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function lifecycleStatus(Obrolan $obrolan): string
    {
        if ($obrolan->status === 'selesai') {
            return 'CLOSED';
        }

        if ($obrolan->status_handover === self::HANDOVER_DITANGANI) {
            return 'ADMIN_ACTIVE';
        }

        if ($obrolan->status_handover === self::HANDOVER_MENUNGGU) {
            $startedAt = $this->handoverStartedAt($obrolan);

            if (! $startedAt) {
                return 'WAITING_ADMIN';
            }

            return now()->lt($startedAt->copy()->addSeconds(self::PENDING_SECONDS))
                ? 'HANDOVER_PENDING'
                : 'WAITING_ADMIN';
        }

        return 'AI_ACTIVE';
    }

    public function applyHandoverTimeoutIfNeeded(Obrolan $obrolan): void
    {
        if ($obrolan->status_handover !== self::HANDOVER_MENUNGGU) {
            return;
        }

        $startedAt = $this->handoverStartedAt($obrolan);

        if (! $startedAt || now()->lt($startedAt->copy()->addSeconds(self::PENDING_SECONDS))) {
            return;
        }

        $obrolan->pesan()->firstOrCreate([
            'tipe_pengirim' => 'system',
            'pesan' => self::TIMEOUT_MESSAGE,
        ]);
    }

    public function handoverExpiresAt(Obrolan $obrolan): ?string
    {
        if ($obrolan->status_handover !== self::HANDOVER_MENUNGGU) {
            return null;
        }

        $startedAt = $this->handoverStartedAt($obrolan);

        return $startedAt?->copy()->addSeconds(self::PENDING_SECONDS)->toISOString();
    }

    private function notifyAdmins(
        Obrolan $obrolan,
        string $alasan,
        string $prioritas,
        bool $upgrade = false
    ): void {
        if ($obrolan->handover_notified_at && ! $upgrade) {
            return;
        }

        $lockKey = 'handover-notify-'.$obrolan->id;

        if (! cache()->add($lockKey, true, now()->addSeconds(10))) {
            return;
        }

        try {
            $admins = User::whereHas('pushSubscriptions')->get();
            $konteks = $this->konteksObrolan($obrolan, $prioritas);

            foreach ($admins as $admin) {
                $admin->notify(new HandoverRequestedNotification(
                    $obrolan->id,
                    $alasan,
                    $prioritas,
                    $konteks
                ));
            }

            $obrolan->update(['handover_notified_at' => now()]);

            Log::info('HANDOVER_NOTIFICATION_SENT', [
                'obrolan_id' => $obrolan->id,
                'prioritas' => $prioritas,
                'jumlah_admin' => $admins->count(),
            ]);
        } catch (\Throwable $e) {
            Log::error('HANDOVER_NOTIFICATION_GAGAL', [
                'obrolan_id' => $obrolan->id,
                'error' => $e->getMessage(),
            ]);
        } finally {
            cache()->forget($lockKey);
        }
    }

    private function konteksObrolan(Obrolan $obrolan, string $prioritas): array
    {
        return [
            'session_id' => $obrolan->session_id,
            'pertanyaan_awal' => $obrolan->pertanyaan_awal,
            'prioritas' => $prioritas,
            'status' => $this->lifecycleStatus($obrolan),
            'riwayat' => $obrolan->pesan()
                ->orderBy('id')
                ->get()
                ->map(fn (PesanObrolan $pesan) => [
                    'id' => $pesan->id,
                    'pengirim' => $pesan->tipe_pengirim,
                    'isi' => $pesan->pesan,
                    'created_at' => $pesan->created_at?->toISOString(),
                ])
                ->all(),
        ];
    }

    private function tambahPesanSistem(Obrolan $obrolan, string $pesan): void
    {
        $obrolan->pesan()->create([
            'tipe_pengirim' => 'system',
            'pesan' => $pesan,
        ]);
    }

    private function handoverStartedAt(Obrolan $obrolan)
    {
        if ($obrolan->handover_started_at) {
            return $obrolan->handover_started_at;
        }

        $pesan = $obrolan->pesan()
            ->where('tipe_pengirim', 'system')
            ->where(function ($query) {
                $query->where('pesan', self::CONNECTING_MESSAGE)
                    ->orWhere('pesan', 'like', 'Permintaan handover ke admin:%')
                    ->orWhere('pesan', 'like', 'Laporan prioritas tinggi diteruskan ke Admin:%')
                    ->orWhere('pesan', 'like', 'Laporan ditingkatkan ke prioritas tinggi:%');
            })
            ->oldest('id')
            ->first();

        return $pesan?->created_at ?? $obrolan->updated_at;
    }
}
