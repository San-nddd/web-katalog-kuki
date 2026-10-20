import { api } from './api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)

  return Uint8Array.from(
    [...rawData].map((char) => char.charCodeAt(0))
  )
}

export function pushDidukung() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function cekPushNotificationsAktif() {
  if (!pushDidukung()) {
    return {
      status: 'unsupported',
      subscription: null,
    }
  }

  if (Notification.permission === 'denied') {
    return {
      status: 'denied',
      subscription: null,
    }
  }

  const registration =
    await navigator.serviceWorker.getRegistration('/')

  if (!registration) {
    return {
      status: 'inactive',
      subscription: null,
    }
  }

  const subscription =
    await registration.pushManager.getSubscription()

  return {
    status: subscription ? 'active' : 'inactive',
    subscription,
  }
}

export async function aktifkanPushNotifications() {
  if (!pushDidukung()) {
    throw new Error(
      'Browser ini belum mendukung Web Push Notification.'
    )
  }

  if (Notification.permission === 'denied') {
    throw new Error(
      'Izin notifikasi diblokir. Aktifkan izin notifikasi dari pengaturan browser.'
    )
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('Izin notifikasi belum diberikan.')
  }

  const registration =
    await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

  await navigator.serviceWorker.ready

  let subscription =
    await registration.pushManager.getSubscription()

  if (!subscription) {
    const response = await api.get(
      '/admin/push/vapid-key'
    )

    const payload = response?.data ?? response

    const publicKey =
      payload?.data?.public_key ??
      payload?.public_key

    if (!publicKey) {
      throw new Error(
        'VAPID public key tidak ditemukan dari server.'
      )
    }

    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(publicKey),
      })
  }

  const json = subscription.toJSON()

  await api.post('/admin/push/subscribe', {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    },
    content_encoding: 'aes128gcm',
  })

  return subscription
}