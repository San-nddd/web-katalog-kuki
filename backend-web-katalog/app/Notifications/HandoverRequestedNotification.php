<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class HandoverRequestedNotification extends Notification
{
    public function __construct(
        private readonly int|string $obrolanId,
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
        return (new WebPushMessage)
            ->title('Customer membutuhkan Admin')
            ->body($this->pesan)
            ->icon('/favicon.ico')
            ->tag('handover-'.$this->obrolanId)
            ->data([
                'url' => '/admin/chat/'.$this->obrolanId,
                'obrolan_id' => $this->obrolanId,
                'type' => 'HANDOVER_REQUESTED',
            ])
            ->options([
                'TTL' => 300,
            ]);
    }
}