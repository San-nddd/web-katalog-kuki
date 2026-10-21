
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export const ASSET_URL = API_BASE_URL.replace(/\/api$/, '')

const TOKEN_KEY = 'kuki_admin_token'
const USER_KEY = 'kuki_admin_user'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function request(path, { method = 'GET', body, formData, token, auth = true } = {}) {
  const headers = { Accept: 'application/json' }
  const activeToken = token !== undefined ? token : auth ? getToken() : null

  if (activeToken) headers.Authorization = `Bearer ${activeToken}`
  if (body) headers['Content-Type'] = 'application/json'

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: formData || (body ? JSON.stringify(body) : undefined),
    })
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server. Silakan coba lagi.', 0, null)
  }

  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    if (response.status === 401 && activeToken) clearSession()
    throw new ApiError(
      data?.message || 'Terjadi kesalahan. Silakan coba lagi.',
      response.status,
      data,
    )
  }

  return data
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  postForm: (path, formData) => request(path, { method: 'POST', formData }),
}

export function assetUrl(path) {
  if (!path) return null
  if (/^(https?:|data:|blob:)/.test(path)) return path
  if (path.startsWith('/')) return path
  return `${ASSET_URL}/storage/${path}`
}
