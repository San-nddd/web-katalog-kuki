
// Kuki Bakehouse - React/Vite API client
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

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
  const normalizedPath = `/${String(path).replace(/^\/+/, '')}`
  const httpMethod = method.toUpperCase()

  // FormData tidak boleh menggunakan Content-Type: application/json.
  // Dukung juga komponen lama yang mungkin memanggil api.post(path, formData).
  const uploadData = formData || (typeof FormData !== 'undefined' && body instanceof FormData ? body : null)
  const hasJsonBody = !uploadData && body !== undefined
  const headers = { Accept: 'application/json' }
  const activeToken = token !== undefined ? token : auth ? getToken() : null

  if (activeToken) headers.Authorization = `Bearer ${activeToken}`
  if (hasJsonBody) headers['Content-Type'] = 'application/json'

  const fetchOptions = {
    method: httpMethod,
    headers,
    body: uploadData || (hasJsonBody ? JSON.stringify(body) : undefined),
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}${normalizedPath}`, fetchOptions)
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
      data?.message || `Permintaan API gagal (HTTP ${response.status}).`,
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
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  postForm: (path, formData) => request(path, { method: 'POST', formData }),
}

export function assetUrl(path) {
  if (!path) return null
  const url = String(path).trim()
  if (/^(https?:|data:|blob:|\/\/)/i.test(url)) return url

  // Jika backend berjalan di origin berbeda dari Vite, /storage harus
  // mengarah ke backend Laravel, bukan origin frontend.
  if (/^\/storage(?:\/|$)/.test(url)) return `${ASSET_URL}${url}`
  if (url.startsWith('/')) return url

  return `${ASSET_URL}/storage/${url.replace(/^storage\//, '')}`
}
