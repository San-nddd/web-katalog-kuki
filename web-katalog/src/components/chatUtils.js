/*
  Helper bersama untuk Kuki Assistant (dipakai KukiAssistant & ChatWindow).
  Satu tempat untuk: normalisasi pesan, membaca respons API, status, dan penggabungan pesan.
*/

export const POLLING_INTERVAL = 3000

/*
  Alamat endpoint obrolan harus ke server Laravel (mis. :8000), BUKAN ke origin Vite (:5173).
  - Bila ada VITE_API_URL di .env, itu yang dipakai (akhiran "/api" otomatis dibuang).
  - Saat development tanpa env: host yang sama dengan halaman + port 8000
    (jadi tetap jalan di HP lewat IP laptop, mis. 192.168.x.x:8000).
  - Production tanpa env: relatif (/api/...), dengan asumsi web dan API satu domain.
  Idealnya fungsi ini dipindah ke assistantService agar memakai base URL yang sama persis.
*/
function apiOrigin() {
  const fromEnv = import.meta.env?.VITE_API_URL
  if (fromEnv) return String(fromEnv).replace(/\/+$/, '').replace(/\/api$/, '')
  if (import.meta.env?.DEV) return `${window.location.protocol}//${window.location.hostname}:8000`
  return ''
}

export const obrolanUrl = (sessionId) =>
  `${apiOrigin()}/api/assistant/obrolan/${encodeURIComponent(sessionId)}`

// Status lifecycle yang valid: AI_ACTIVE -> WAITING_ADMIN -> ADMIN_ACTIVE -> CLOSED
const VALID_STATUS = ['AI_ACTIVE', 'WAITING_ADMIN', 'ADMIN_ACTIVE', 'CLOSED']

export function normalizeMessage(message) {
  const rawSender = String(message.sender ?? message.pengirim ?? message.role ?? 'user').toLowerCase()

  let sender = 'user'

  if (['bot', 'ai', 'kuki', 'assistant'].includes(rawSender)) {
    sender = 'bot'
  } else if (['admin', 'administrator'].includes(rawSender)) {
    sender = 'admin'
  } else if (['user', 'customer', 'pengunjung', 'pelanggan'].includes(rawSender)) {
    sender = 'user'
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

// Hanya menerima nilai yang persis salah satu status resmi; selain itu diabaikan (null).
export function normalizeStatus(value) {
  if (!value) return null

  const key = String(value).trim().toUpperCase().replace(/[\s-]+/g, '_')

  if (VALID_STATUS.includes(key)) return key
  if (key === 'SELESAI') return 'CLOSED'

  return null
}

export function getStatusFromResponse(response) {
  const payload = response?.data ?? response

  return normalizeStatus(
    payload?.status ??
      payload?.obrolan?.status ??
      payload?.conversation?.status ??
      response?.status,
  )
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