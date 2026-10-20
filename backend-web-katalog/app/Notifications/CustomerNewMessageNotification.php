<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class CustomerNewMessageNotification extends Notification
{
    public function __construct(
        private readonly int|string $obrolanId,
        private readonly int|string $pesanId,
        private readonly string $pesan
    ) {
    }

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
        $isiPesan = trim($this->pesan);

        if (mb_strlen($isiPesan) > 120) {
            $isiPesan = mb_substr($isiPesan, 0, 117).'...';
        }

        return (new WebPushMessage)
            ->title('Pesan baru dari Customer')
            ->body(
                $isiPesan !== ''
                    ? $isiPesan
                    : 'Customer mengirim pesan baru.'
            )
            ->icon('/favicon.ico')

            // Dibuat unik per pesan agar notif baru
            // tidak menggantikan notif sebelumnya.
            ->tag(
                'customer-message-'
                .$this->obrolanId
                .'-'
                .$this->pesanId
            )
            ->data([
                'url' => '/admin/chat/'.$this->obrolanId,
                'obrolan_id' => $this->obrolanId,
                'pesan_id' => $this->pesanId,
                'type' => 'CUSTOMER_NEW_MESSAGE',
            ])
            ->options([
                'TTL' => 300,
            ]);
    }
}