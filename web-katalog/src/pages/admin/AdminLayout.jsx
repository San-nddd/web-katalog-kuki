import { translateAdminText } from '../../services/adminTranslations'
import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { currentUser, logout } from '../../services/authService'
import {
  getAdminPreferences,
  getEffectiveAdminTheme,
  subscribeAdminPreferences,
} from '../../services/adminPreferencesService'
import { getAdminCopy } from '../../services/adminI18n'
import { playAdminNotificationSound } from '../../services/notificationSoundService'
import {
  ambilPertanyaanTidakTerjawab,
  ambilStatistikObrolan,
} from '../../services/chatAdminService'
import {
  aktifkanPushNotifications,
  cekPushNotificationsAktif,
} from '../../services/pushNotificationService'
import './admin.css'
import useAdminTranslation from '../../hooks/useAdminTranslation'


function BellIcon({ width = 22, height = 22 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AdminLayout({ title, children }) {
  const navigate = useNavigate()
  const user = currentUser()
  const [preferences, setPreferences] = useState(() => getAdminPreferences())
  const t = (key, params) => translateAdminText(preferences.language, key, params)
  const copy = getAdminCopy(preferences.language)
  const effectiveTheme = getEffectiveAdminTheme(preferences.theme)

  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [notificationLoading, setNotificationLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [pushStatus, setPushStatus] = useState('checking')
  const [pushError, setPushError] = useState('')

  
  const initializedNotificationsRef = useRef(false)
  const knownNotificationIdsRef = useRef(new Set())
  const toastTimerRef = useRef(null)

  useEffect(() => {
    return subscribeAdminPreferences((next) => {
      setPreferences(next)
    })
  }, [])

  useEffect(() => {
    if (!navigator.serviceWorker) return undefined

    const handlePushMessage = (event) => {
      if (event?.data?.type !== 'KUKI_PUSH_RECEIVED') return

      const notification = event.data.notification || {}
      const data = notification.data || {}
      const notificationType = data.type || ''
      const obrolanId = data.obrolan_id || data.obrolanId || 'unknown'

      if (preferences.toastEnabled) {
        setToast({
          id: obrolanId,
          title: notification.title || 'Kuki Bakehouse Admin',
          message: notification.body ||t("Ada notifikasi baru untuk Admin."),
        })

        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current)
        }

        toastTimerRef.current = setTimeout(() => {
          setToast(null)
          toastTimerRef.current = null
        }, 6000)
      }

      const shouldSound =
        preferences.soundEnabled &&
        (
          (notificationType === 'HANDOVER_REQUESTED' &&
            preferences.soundOnHandover) ||
          (notificationType === 'CUSTOMER_NEW_MESSAGE' &&
            preferences.soundOnCustomerMessage)
        )

      if (shouldSound && document.visibilityState === 'visible') {
        const preset =
          notificationType === 'HANDOVER_REQUESTED'
            ? preferences.handoverSoundPreset
            : preferences.customerMessageSoundPreset

        playAdminNotificationSound({
          preset,
          volume: preferences.soundVolume,
          key: `notification:${notificationType}:${obrolanId}`,
          customAudioKey:
            notificationType === 'HANDOVER_REQUESTED'
              ? 'handover'
              : 'customer-message',
        })
      }
    }

    navigator.serviceWorker.addEventListener('message', handlePushMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handlePushMessage)
    }
  }, [
    preferences.soundEnabled,
    preferences.soundOnCustomerMessage,
    preferences.soundOnHandover,
    preferences.handoverSoundPreset,
    preferences.customerMessageSoundPreset,
    preferences.soundVolume,
    preferences.toastEnabled,
  ])

  const loadNotifications = useCallback(async () => {
    try {
      const [statsResponse, pendingResponse] = await Promise.all([
        ambilStatistikObrolan(),
        ambilPertanyaanTidakTerjawab({ limit: 5 }),
      ])

      const stats = statsResponse?.data || statsResponse || {}
      const pending = pendingResponse?.data || pendingResponse || []
      const meta = pendingResponse?.meta || {}

      const pendingItems = Array.isArray(pending) ? pending : []
      setNotifications(pendingItems)

      const currentIds = new Set(pendingItems.map((item) => String(item.id)))

      // Jangan munculkan toast untuk chat lama saat Admin baru membuka/refresh halaman.
      // Toast hanya muncul ketika ada ID chat baru setelah baseline pertama terbentuk.
      if (!initializedNotificationsRef.current) {
        knownNotificationIdsRef.current = currentIds
        initializedNotificationsRef.current = true
      } else {
        const newItems = pendingItems.filter(
          (item) => !knownNotificationIdsRef.current.has(String(item.id)),
        )

        if (newItems.length > 0) {
          const newest = newItems[0]

          if (preferences.toastEnabled) {
            setToast({
              id: newest.id,
              title:t("Customer meminta bantuan Admin"),
              message:
                newest.pertanyaan_terakhir?.isi ||t("Ada percakapan baru yang membutuhkan Admin."),
            })

            if (toastTimerRef.current) {
              clearTimeout(toastTimerRef.current)
            }

            toastTimerRef.current = setTimeout(() => {
              setToast(null)
              toastTimerRef.current = null
            }, 6000)
          }

          if (
            preferences.soundEnabled &&
            preferences.soundOnHandover &&
            document.visibilityState === 'visible'
          ) {
            playAdminNotificationSound({
              preset: preferences.handoverSoundPreset,
              volume: preferences.soundVolume,
              key: `notification:HANDOVER_REQUESTED:${newest.id}`,
              customAudioKey: 'handover',
            })
          }
        }

        knownNotificationIdsRef.current = currentIds
      }

      const totalPending =
        Number.isFinite(Number(stats?.total_pending))
          ? Number(stats.total_pending)
          : Number.isFinite(Number(meta?.total))
            ? Number(meta.total)
            : Array.isArray(pending)
              ? pending.length
              : 0

      setNotificationCount(Math.max(0, totalPending))
    } catch (error) {
      // Notifikasi tidak boleh mengganggu halaman Admin jika request gagal.
      console.error('Gagal memuat notifikasi chat Admin:', error)
    } finally {
      setNotificationLoading(false)
    }
  }, [
    preferences.soundEnabled,
    preferences.soundOnHandover,
    preferences.handoverSoundPreset,
    preferences.soundVolume,
    preferences.toastEnabled,
  ])

  useEffect(() => {
    loadNotifications()

    const interval = setInterval(
      loadNotifications,
      preferences.notificationRefreshMs,
    )

    const handleFocus = () => {
      loadNotifications()
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [loadNotifications, preferences.notificationRefreshMs])

  useEffect(() => {
    let mounted = true

    const checkPush = async () => {
      try {
        const result = await cekPushNotificationsAktif()
        if (mounted) setPushStatus(result.status)
      } catch {
        if (mounted) setPushStatus('inactive')
      }
    }

    checkPush()

    return () => {
      mounted = false
    }
  }, [])

  const handleAktifkanPush = async () => {
    if (pushStatus === 'loading') return

    setPushStatus('loading')
    setPushError('')

    try {
      await aktifkanPushNotifications()
      setPushStatus('active')
    } catch (error) {
      const message =
        error?.message || 'Gagal mengaktifkan notifikasi browser.'

      setPushError(message)

      if (/diblokir|blocked/i.test(message)) {
        setPushStatus('denied')
      } else {
        setPushStatus('inactive')
      }
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/admin/login')
    }
  }

  const handleOpenChat = (obrolanId) => {
    setNotificationOpen(false)
    navigate(`/admin/chat/${obrolanId}`)
  }

  return (
    <div
      className={[
        'admin-layout',
        `admin-theme-${effectiveTheme}`,
        `admin-density-${preferences.density}`,
        preferences.fontScale === 'large' ? 'admin-font-large' : '',
        preferences.reduceMotion ? 'admin-reduce-motion' : '',
      ].filter(Boolean).join(' ')}
    >
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-logo" aria-hidden="true">
            {t("K")}
          </span>
          <div>
            <strong>{t("Kuki Admin")}</strong>
            <small>{t("Katalog Content")}</small>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end>
            {t("Dashboard")}
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/management/dashboard">{t("Management Dashboard")}</NavLink>
          )}
          <NavLink to="/admin/produk">{copy.products}</NavLink>
          <NavLink to="/admin/kategori">{copy.categories}</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin/testimonial">{t("Testimonial")}</NavLink>}
          <NavLink to="/admin/chat">
            {copy.chat}
            {notificationCount > 0 && (
              <span className="admin-nav-chat-badge">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/settings">{copy.settings}</NavLink>
          <Link to="/">{copy.viewSite}</Link>
        </nav>

        <div className="admin-user">
          <span className="admin-user-email">{user?.email || '-'}</span>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={handleLogout}
          >
            {copy.logout}
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h1 className="display-font">{t(title)}</h1>

          <div className="admin-notification">
            <button
              type="button"
              className="admin-notification-button"
              onClick={() => {
                setNotificationOpen((prev) => !prev)
                loadNotifications()
              }}
              aria-label={t("Notifikasi chat")}
              aria-expanded={notificationOpen}
            >
              <BellIcon />

              {notificationCount > 0 && (
                <span className="admin-notification-badge">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="admin-notification-dropdown">
                <div className="admin-notification-head">
                  <div>
                    <strong>{copy.notifications}</strong>
                    <small>
                      {notificationCount > 0
                        ? copy.waitingCount(notificationCount)
                        : copy.noWaiting}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="admin-notification-refresh"
                    onClick={loadNotifications}
                    aria-label={t("Muat ulang notifikasi")}
                  >
                    ↻
                  </button>
                </div>

                <div className="admin-push-control">
                  {pushStatus === 'active' ? (
                    <div className="admin-push-active">
                      <span className="admin-push-active-dot" />
                      <div>
                        <strong>{copy.browserActive}</strong>
                        <small>
                          {copy.browserActiveHint}
                        </small>
                      </div>
                    </div>
                  ) : pushStatus === 'unsupported' ? (
                    <p className="admin-push-message">
                      {copy.browserUnsupported}
                    </p>
                  ) : pushStatus === 'denied' ? (
                    <p className="admin-push-message admin-push-message-error">
                      {copy.browserDenied}
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="admin-push-enable"
                      onClick={handleAktifkanPush}
                      disabled={
                        pushStatus === 'loading' ||
                        pushStatus === 'checking'
                      }
                    >
                      {pushStatus === 'loading'
                        ? copy.browserEnabling
                        : pushStatus === 'checking'
                          ? copy.browserChecking
                          : copy.browserEnable}
                    </button>
                  )}

                  {pushError && pushStatus !== 'denied' && (
                    <p className="admin-push-message admin-push-message-error">
                      {pushError}
                    </p>
                  )}
                </div>

                <div className="admin-notification-list">
                  {notificationLoading ? (
                    <p className="admin-notification-empty">
                      {copy.loadingNotifications}
                    </p>
                  ) : notifications.length === 0 ? (
                    <p className="admin-notification-empty">
                      {copy.allSafe}
                    </p>
                  ) : (
                    notifications.map((item) => (
                      <button
                        type="button"
                        className="admin-notification-item"
                        key={item.id}
                        onClick={() => handleOpenChat(item.id)}
                      >
                        <span className="admin-notification-dot" />

                        <span className="admin-notification-content">
                          <strong>{copy.customerNeedsHelp}</strong>
                          <span>
                            {item.pertanyaan_terakhir?.isi ||
                              copy.genericHelp}
                          </span>
                          <small>
                            {item.status === 'HANDOVER_PENDING'
                              ? copy.connectingAdmin
                              : copy.waitingAdmin}
                          </small>
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  className="admin-notification-all"
                  onClick={() => {
                    setNotificationOpen(false)
                    navigate('/admin/chat')
                  }}
                >
                  {copy.openAllChats}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="admin-content">{children}</div>

        {toast && (
          <div
            className="admin-chat-toast"
            role="status"
            aria-live="polite"
          >
            <button
              type="button"
              className="admin-chat-toast-body"
              onClick={() => handleOpenChat(toast.id)}
            >
              <span className="admin-chat-toast-icon">
                <BellIcon width={18} height={18} />
              </span>

              <span className="admin-chat-toast-content">
                <strong>{toast.title}</strong>
                <span>{toast.message}</span>
                <small>{copy.clickToOpen}</small>
              </span>
            </button>

            <button
              type="button"
              className="admin-chat-toast-close"
              onClick={() => setToast(null)}
              aria-label={t("Tutup notifikasi")}
            >
              {t("×")}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminLayout
