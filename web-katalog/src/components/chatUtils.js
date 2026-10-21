/*
  Helper bersama untuk Kuki Assistant (dipakai KukiAssistant & ChatWindow).
  Satu tempat untuk: normalisasi pesan, membaca respons API, status, dan penggabungan pesan.
*/

export const POLLING_INTERVAL = 3000

/*
  ngrok -> Vite proxy -> Laravel.
  Gunakan path relatif agar polling memakai domain yang sama dengan web,
  baik di localhost:5173 maupun lewat ngrok-free.dev.
  Pastikan vite.config.js mem-proxy /api ke http://127.0.0.1:8000.
*/
export const obrolanUrl = (sessionId) =>
  `/api/assistant/obrolan/${encodeURIComponent(sessionId)}`

// Status lifecycle yang valid: AI_ACTIVE -> WAITING_ADMIN -> ADMIN_ACTIVE -> CLOSED
const VALID_STATUS = ['AI_ACTIVE', 'HANDOVER_PENDING', 'WAITING_ADMIN', 'ADMIN_ACTIVE', 'CLOSED']

export function normalizeMessage(message) {
  const rawSender = String(
    message.sender ?? message.pengirim ?? message.tipe_pengirim ?? message.role ?? 'user',
  ).trim().toLowerCase()

  let sender = 'user'

  if (['bot', 'ai', 'kuki', 'assistant'].includes(rawSender)) {
    sender = 'bot'
  } else if (['admin', 'administrator'].includes(rawSender)) {
    sender = 'admin'
  } else if (['user', 'customer', 'pengunjung', 'pelanggan'].includes(rawSender)) {
    sender = 'user'
  } else if (['system', 'sistem'].includes(rawSender)) {
    sender = 'system'
  }

  const text = message.text ?? message.isi ?? message.message ?? message.pesan ?? ''

  // Fallback ID hanya dipakai kalau backend tidak mengirim id.
  const fallbackId = `${sender}-${message.created_at ?? message.waktu ?? ''}-${text}`

  return {
    ...message,
    id: message.id ?? fallbackId,
    sender,
    text,
  }
}

export function getMessagesFromResponse(response) {
  const payload = response?.data ?? response

  if (Array.isArray(payload?.messages)) return payload.messages
  if (Array.isArray(payload?.pesan)) return payload.pesan
  if (Array.isArray(payload)) return payload

  return []
}

// Konversi status internal dan status Laravel menjadi lifecycle UI yang sama.
export function normalizeStatus(value) {
  if (!value) return null

  const key = String(value).trim().toUpperCase().replace(/[\s-]+/g, '_')

  if (VALID_STATUS.includes(key)) return key
  if (['SELESAI', 'DITUTUP', 'CLOSED'].includes(key)) return 'CLOSED'
  if (['MENUNGGU', 'MEMBUTUHKAN_ADMIN', 'BUTUH_ADMIN'].includes(key)) return 'WAITING_ADMIN'
  if (['DITANGANI', 'ADMIN'].includes(key)) return 'ADMIN_ACTIVE'
  if (['AKTIF', 'TIDAK_PERLU'].includes(key)) return 'AI_ACTIVE'

  return null
}

export function getStatusFromResponse(response) {
  const payload = response?.data ?? response
  const rawStatus =
    payload?.status ?? payload?.obrolan?.status ?? payload?.conversation?.status
  const rawHandover =
    payload?.status_handover ??
    payload?.obrolan?.status_handover ??
    payload?.conversation?.status_handover

  const status = normalizeStatus(rawStatus)
  const handover = String(rawHandover ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')

  // Status selesai harus menang atas status handover yang mungkin masih tersimpan.
  if (status === 'CLOSED') return 'CLOSED'

  // Di Laravel: status='aktif' juga digunakan saat Admin sudah membalas.
  // Oleh karena itu status_handover lebih spesifik daripada status='aktif'.
  if (['DITANGANI', 'ADMIN_ACTIVE'].includes(handover)) return 'ADMIN_ACTIVE'
  if (['MEMBUTUHKAN_ADMIN', 'BUTUH_ADMIN', 'WAITING_ADMIN'].includes(handover)) {
    return 'WAITING_ADMIN'
  }
  if (handover === 'HANDOVER_PENDING') return 'HANDOVER_PENDING'

  return status
}

/*
  Gabungkan riwayat dari server (sumber kebenaran) dengan pesan lokal yang belum
  sempat muncul di server (pesan optimistis / pesan error).

  - Pesan lokal yang sudah ada di server (pengirim & teks sama) dibuang -> tidak duplikat.
  - Mengembalikan referensi `previous` bila tidak ada perubahan, agar tidak re-render
    dan tidak memicu auto-scroll setiap polling.
*/
export function mergeMessages(previous, server) {
  if (server.length === 0) return previous

  // Pesan server yang sudah tampil (bukan lokal) tidak boleh dipakai untuk mencocokkan pesan lokal baru.
  const shownIds = new Set(
    previous.filter((message) => !message.local).map((message) => String(message.id)),
  )
  const candidates = server.filter((item) => !shownIds.has(String(item.id)))
  const used = new Set()

  const pendingLocal = previous.filter((message) => {
    if (!message.local) return false

    const matchIndex = candidates.findIndex(
      (item, index) =>
        !used.has(index) && item.sender === message.sender && item.text === message.text,
    )

    if (matchIndex !== -1) {
      used.add(matchIndex)
      return false
    }

    return true
  })

  const merged = [...server, ...pendingLocal]

  const unchanged =
    merged.length === previous.length &&
    merged.every(
      (message, index) =>
        String(message.id) === String(previous[index].id) && message.text === previous[index].text,
    )

  return unchanged ? previous : merged
}