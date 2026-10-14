// Service autentikasi Admin (Sanctum token).

import { api, clearSession, getStoredUser, getToken, setSession } from './api'

export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password })
  setSession(response.data.token, response.data.user)
  return response.data.user
}

export async function logout() {
  try {
    await api.post('/auth/logout', {})
  } finally {
    clearSession()
  }
}

export function currentUser() {
  return getToken() ? getStoredUser() : null
}

export function isLoggedIn() {
  return Boolean(getToken())
}
