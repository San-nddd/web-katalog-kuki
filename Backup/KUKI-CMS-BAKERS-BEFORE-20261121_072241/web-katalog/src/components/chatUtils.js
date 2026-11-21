
/*
  Helper bersama untuk Kuki Assistant
  Digunakan oleh KukiAssistant & ChatWindow.

  Fungsi:
  - Konfigurasi API Laravel
  - URL polling
  - Validasi response API
  - Normalisasi pesan
  - Normalisasi lifecycle
  - Penggabungan pesan tanpa duplikasi
*/

export const POLLING_INTERVAL = 3000

/*
  KONFIGURASI API KUKI BAKEHOUSE

  Production:
  Laravel hosting sekolah.

  Development:
  Bisa menggunakan Vite proxy apabila
  VITE_API_URL=/api.

  Pastikan seluruh request chat menggunakan
  backend yang sama.
*/

const configuredApiUrl = import.meta.env.VITE_API_URL

const DEFAULT_API_URL =
  import.meta.env.DEV
    ? '/api'
    : 'https://kukibakehouse.smkn1sumedang.sch.id/api'

export const API_BASE_URL = String(
  configuredApiUrl || DEFAULT_API_URL
).replace(/\/+$/, '')

/*
  Membentuk URL endpoint Laravel.
  Hindari /api/api jika konfigurasi sudah
  berakhiran /api.
*/

export function apiUrl(path) {
  const normalizedPath = String(path)
    .replace(/^\/+/, '')

  return `${API_BASE_URL}/${normalizedPath}`
}

/*
  URL riwayat percakapan customer.
*/

export const obrolanUrl = (sessionId) =>
  apiUrl(
    `assistant/obrolan/${encodeURIComponent(sessionId)}`
  )

/*
  Interval polling 3 detik.
*/

export const POLLING_INTERVAL_MS = POLLING_INTERVAL

/*
  Status lifecycle:
  AI_ACTIVE
  HANDOVER_PENDING
  WAITING_ADMIN
  ADMIN_ACTIVE
  CLOSED
*/

const VALID_STATUS = [
  'AI_ACTIVE',
  'HANDOVER_PENDING',
  'WAITING_ADMIN',
  'ADMIN_ACTIVE',
  'CLOSED',
]

/*
  NORMALISASI PESAN
*/

export function normalizeMessage(message) {
  const source = message ?? {}

  const rawSender = String(
    source.sender ??
    source.pengirim ??
    source.tipe_pengirim ??
    source.role ??
    'user'
  )
    .trim()
    .toLowerCase()

  let sender = 'user'

  if (
    ['bot', 'ai', 'kuki', 'assistant'].includes(rawSender)
  ) {
    sender = 'bot'
  } else if (
    ['admin', 'administrator'].includes(rawSender)
  ) {
    sender = 'admin'
  } else if (
    [
      'user',
      'customer',
      'pengunjung',
      'pelanggan',
    ].includes(rawSender)
  ) {
    sender = 'user'
  } else if (
    ['system', 'sistem'].includes(rawSender)
  ) {
    sender = 'system'
  }

  const text = String(
    source.text ??
    source.isi ??
    source.message ??
    source.pesan ??
    ''
  )

  const fallbackId =
    `${sender}-${source.created_at ?? source.waktu ?? ''}-${text}`

  return {
    ...source,
    id: source.id ?? fallbackId,
    sender,
    text,
  }
}

/*
  IDENTITAS PESAN
*/

export function messageIdentityKey(message) {
  return `${message.sender}::${String(message.id)}`
}

/*
  MEMBACA PESAN DARI RESPONSE LARAVEL

  Mendukung:
  response.data.messages
  response.data.pesan
  response.messages
  response.pesan
*/

export function getMessagesFromResponse(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload?.messages)) {
    return payload.messages
  }

  if (Array.isArray(payload?.pesan)) {
    return payload.pesan
  }

  if (Array.isArray(payload)) {
    return payload
  }

  return []
}

/*
  NORMALISASI STATUS
*/

export function normalizeStatus(value) {
  if (!value) return null

  const key = String(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  if (VALID_STATUS.includes(key)) {
    return key
  }

  if (
    ['SELESAI', 'DITUTUP', 'CLOSED'].includes(key)
  ) {
    return 'CLOSED'
  }

  if (
    [
      'MENUNGGU',
      'MEMBUTUHKAN_ADMIN',
      'BUTUH_ADMIN',
    ].includes(key)
  ) {
    return 'WAITING_ADMIN'
  }

  if (
    ['DITANGANI', 'ADMIN'].includes(key)
  ) {
    return 'ADMIN_ACTIVE'
  }

  if (
    ['AKTIF', 'TIDAK_PERLU'].includes(key)
  ) {
    return 'AI_ACTIVE'
  }

  return null
}

/*
  MEMBACA STATUS DARI RESPONSE API
*/

export function getStatusFromResponse(response) {
  const payload = response?.data ?? response

  const rawStatus =
    payload?.status ??
    payload?.obrolan?.status ??
    payload?.conversation?.status

  const rawHandover =
    payload?.status_handover ??
    payload?.obrolan?.status_handover ??
    payload?.conversation?.status_handover

  const status = normalizeStatus(rawStatus)

  const handover = String(rawHandover ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

  // Percakapan selesai selalu prioritas.
  if (status === 'CLOSED') {
    return 'CLOSED'
  }

  // Admin sudah mengambil alih.
  if (
    ['DITANGANI', 'ADMIN_ACTIVE'].includes(handover)
  ) {
    return 'ADMIN_ACTIVE'
  }

  // Menunggu Admin.
  if (
    [
      'MEMBUTUHKAN_ADMIN',
      'BUTUH_ADMIN',
      'WAITING_ADMIN',
    ].includes(handover)
  ) {
    return 'WAITING_ADMIN'
  }

  if (handover === 'HANDOVER_PENDING') {
    return 'HANDOVER_PENDING'
  }

  return status
}

/*
  FETCH RIWAYAT CHAT

  Menghindari error:
  - HTML Vercel dianggap JSON
  - Response HTTP gagal
  - Response API tidak valid

  Fungsi ini bisa digunakan oleh callback
  polling KukiAssistant / ChatWindow.
*/

export async function fetchChatHistory(
  sessionId,
  options = {}
) {
  if (!sessionId) {
    throw new Error(
      'Session ID chat belum tersedia.'
    )
  }

  const response = await fetch(
    obrolanUrl(sessionId),
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: options.signal,
    }
  )

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(
      `Chat polling gagal. HTTP ${response.status}`
    )
  }

  const contentType =
    response.headers.get('content-type') || ''

  if (
    !contentType
      .toLowerCase()
      .includes('application/json')
  ) {
    throw new Error(
      'Polling gagal: server tidak mengembalikan JSON Laravel.'
    )
  }

  const data = await response.json()

  if (
    data === null ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    throw new Error(
      'Format respons riwayat chat tidak valid.'
    )
  }

  if (data.success === false) {
    throw new Error(
      data.message ||
      'Gagal mengambil riwayat chat.'
    )
  }

  return data
}

/*
  GABUNGKAN PESAN SERVER DAN PESAN LOKAL

  Server merupakan sumber kebenaran.

  Pesan lokal yang sudah tercatat di server
  akan dihapus agar tidak terjadi duplikasi.
*/

export function mergeMessages(previous, server) {
  if (!Array.isArray(server) || server.length === 0) {
    return previous
  }

  const shownIds = new Set(
    previous
      .filter((message) => !message.local)
      .map((message) => String(message.id))
  )

  const candidates = server.filter(
    (item) => !shownIds.has(String(item.id))
  )

  const used = new Set()

  const pendingLocal = previous.filter((message) => {
    if (!message.local) {
      return false
    }

    const matchIndex = candidates.findIndex(
      (item, index) =>
        !used.has(index) &&
        item.sender === message.sender &&
        item.text === message.text
    )

    if (matchIndex !== -1) {
      used.add(matchIndex)
      return false
    }

    return true
  })

  const merged = [
    ...server,
    ...pendingLocal,
  ]

  const unchanged =
    merged.length === previous.length &&
    merged.every(
      (message, index) =>
        String(message.id) ===
          String(previous[index].id) &&
        message.text === previous[index].text &&
        message.sender === previous[index].sender
    )

  return unchanged ? previous : merged
}
