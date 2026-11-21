const STORAGE_KEY = 'kuki_admin_preferences_v1'
const EVENT_NAME = 'kuki:admin-preferences-changed'

export const DEFAULT_ADMIN_PREFERENCES = {
  theme: 'system',

  toastEnabled: true,
  soundEnabled: true,
  handoverSoundPreset: 'alert',
  soundVolume: 0.65,
  soundOnHandover: true,

  notificationRefreshMs: 5000,
}

function sanitizePreferences(value = {}) {
  const next = {
    ...DEFAULT_ADMIN_PREFERENCES,
    ...value,
  }

  delete next.language
  delete next.density
  delete next.fontScale
  delete next.reduceMotion
  delete next.soundPreset
  delete next.customerMessageSoundPreset
  delete next.soundOnCustomerMessage

  if (!['system', 'light', 'dark'].includes(next.theme)) {
    next.theme = DEFAULT_ADMIN_PREFERENCES.theme
  }

  if (!['soft', 'chime', 'alert', 'custom', 'silent'].includes(next.handoverSoundPreset)) {
    next.handoverSoundPreset = DEFAULT_ADMIN_PREFERENCES.handoverSoundPreset
  }

  const volume = Number(next.soundVolume)
  next.soundVolume = Number.isFinite(volume)
    ? Math.min(1, Math.max(0, volume))
    : DEFAULT_ADMIN_PREFERENCES.soundVolume

  const refresh = Number(next.notificationRefreshMs)
  next.notificationRefreshMs = [5000, 10000, 30000].includes(refresh)
    ? refresh
    : DEFAULT_ADMIN_PREFERENCES.notificationRefreshMs

  next.toastEnabled = Boolean(next.toastEnabled)
  next.soundEnabled = Boolean(next.soundEnabled)
  next.soundOnHandover = Boolean(next.soundOnHandover)

  return next
}

export function getAdminPreferences() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return { ...DEFAULT_ADMIN_PREFERENCES }
    }

    return sanitizePreferences(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_ADMIN_PREFERENCES }
  }
}

export function saveAdminPreferences(patch = {}) {
  const current = getAdminPreferences()
  const next = sanitizePreferences({
    ...current,
    ...patch,
  })

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(next),
  )

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: next,
    }),
  )

  return next
}

export function resetAdminPreferences() {
  window.localStorage.removeItem(STORAGE_KEY)

  const next = {
    ...DEFAULT_ADMIN_PREFERENCES,
  }

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: next,
    }),
  )

  return next
}

export function subscribeAdminPreferences(callback) {
  const handler = (event) => {
    callback(
      event?.detail ||
      getAdminPreferences(),
    )
  }

  window.addEventListener(
    EVENT_NAME,
    handler,
  )

  return () => {
    window.removeEventListener(
      EVENT_NAME,
      handler,
    )
  }
}

export function getEffectiveAdminTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    return theme
  }

  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }

  return 'light'
}
