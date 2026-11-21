<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class HandoverRequestedNotification extends Notification
{
    public function __construct(
        private readonly int|string $obrolanId,
        private readonly string $pesan,
        private readonly string $prioritas = 'normal',
        private readonly array $konteks = []
    ) {}

    public function via(object $notifiable): array
    {
        return [
            WebPushChannel::class,
        ];
    }

    public function toWebPush(
        object $notifiable,
        Notification $notification
    ): WebPushMessage {
        $prioritasTinggi = $this->prioritas === 'tinggi';
        $isi = trim($this->pesan);

        if (mb_strlen($isi) > 180) {
            $isi = mb_substr($isi, 0, 177).'...';
        }

        return (new WebPushMessage)
            ->title($prioritasTinggi
                ? 'Laporan prioritas tinggi - butuh Admin'
                : 'Customer membutuhkan Admin')
            ->body($prioritasTinggi ? '[PRIORITAS TINGGI] '.$isi : $isi)
            ->icon('/favicon.ico')
            ->tag('handover-'.$this->obrolanId)
            ->data([
                'url' => '/admin/chat/'.$this->obrolanId,
                'obrolan_id' => $this->obrolanId,
                'type' => 'HANDOVER_REQUESTED',
                'prioritas' => $this->prioritas,
                'konteks' => $this->konteks,
            ])
            ->options([
                'TTL' => 300,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'obrolan_id' => $this->obrolanId,
            'pesan' => $this->pesan,
            'prioritas' => $this->prioritas,
            'konteks' => $this->konteks,
        ];
    }
}
