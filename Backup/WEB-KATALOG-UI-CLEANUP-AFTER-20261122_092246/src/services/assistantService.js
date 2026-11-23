// Service Kuki Assistant: satu-satunya tempat request chat & riwayat.
// API key Gemini hanya berada di backend, tidak pernah dikirim dari sini.

import { api, ApiError } from './api'

const SESSION_KEY = 'kuki_assistant_session'

export function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = buatId()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

// Buat sesi baru (dipakai ketika percakapan dimulai ulang).
export function buatSession() {
  const sessionId = buatId()
  localStorage.setItem(SESSION_KEY, sessionId)
  return sessionId
}

export async function kirimPesanAssistant({ sessionId, message, productId } = {}) {
  const payload = {
    session_id: sessionId || getSessionId(),
    message,
  }

  if (productId) payload.product_id = productId

  const response = await api.post('/assistant/chat', payload)
  return response.data
}

export async function ambilRiwayat(sessionId = getSessionId()) {
  try {
    const response = await api.get(`/assistant/obrolan/${encodeURIComponent(sessionId)}`)
    return response.data
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function mintaHandoverKeAdmin({ sessionId, reason } = {}) {
  const payload = {
    session_id: sessionId || getSessionId(),
    reason: reason || 'Pengguna meminta bantuan admin manusia',
  }
  const response = await api.post('/assistant/handover', payload)
  return response.data
}

function buatId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
