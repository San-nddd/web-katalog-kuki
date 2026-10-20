import { useEffect, useMemo, useState } from 'react'
import AdminLayout from './AdminLayout'
import {
  DEFAULT_ADMIN_PREFERENCES,
  getAdminPreferences,
  resetAdminPreferences,
  saveAdminPreferences,
} from '../../services/adminPreferencesService'
import {
  aktifkanPushNotifications,
  cekPushNotificationsAktif,
} from '../../services/pushNotificationService'
import {
  playAdminNotificationSound,
} from '../../services/notificationSoundService'
import {
  hapusAudioCustom,
  metadataAudioCustom,
  simpanAudioCustom,
} from '../../services/customNotificationAudioService'
import './admin.css'
import './admin-settings.css'

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}) {
  return (
    <label className="admin-setting-toggle-row">
      <span className="admin-setting-copy">
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>

      <span className="admin-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span className="admin-switch-track" aria-hidden="true" />
      </span>
    </label>
  )
}

function AdminSettingsPage() {
  const [preferences, setPreferences] = useState(
    () => getAdminPreferences(),
  )

  const [pushStatus, setPushStatus] = useState('checking')
  const [pushError, setPushError] = useState('')
  const [savedHint, setSavedHint] = useState('')
  const [customAudioMeta, setCustomAudioMeta] = useState({
    handover: null,
    customerMessage: null,
  })
  const [audioImportError, setAudioImportError] = useState('')

  const languageIsEnglish = preferences.language === 'en'

  const text = useMemo(
    () => ({
      title: languageIsEnglish ? 'Settings' : 'Pengaturan',
      subtitle: languageIsEnglish
        ? 'Personalize this Admin dashboard on this device.'
        : 'Atur pengalaman Dashboard Admin pada perangkat ini.',
    }),
    [languageIsEnglish],
  )

  useEffect(() => {
    let mounted = true

    cekPushNotificationsAktif()
      .then((result) => {
        if (mounted) {
          setPushStatus(result.status)
        }
      })
      .catch(() => {
        if (mounted) {
          setPushStatus('inactive')
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    Promise.all([
      metadataAudioCustom('handover'),
      metadataAudioCustom('customer-message'),
    ])
      .then(([handover, customerMessage]) => {
        if (!mounted) return

        setCustomAudioMeta({
          handover,
          customerMessage,
        })
      })
      .catch(() => {
        // Metadata audio custom tidak boleh mengganggu halaman Settings.
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleImportAudio = async (slot, file) => {
    if (!file) return

    setAudioImportError('')

    try {
      const storageKey =
        slot === 'handover'
          ? 'handover'
          : 'customer-message'

      const metadata = await simpanAudioCustom(
        storageKey,
        file,
      )

      setCustomAudioMeta((prev) => ({
        ...prev,
        [slot === 'handover'
          ? 'handover'
          : 'customerMessage']: metadata,
      }))

      if (slot === 'handover') {
        update({ handoverSoundPreset: 'custom' })
      } else {
        update({ customerMessageSoundPreset: 'custom' })
      }
    } catch (error) {
      setAudioImportError(
        error?.message ||
        'Gagal mengimpor audio custom.',
      )
    }
  }

  const handleRemoveAudio = async (slot) => {
    const storageKey =
      slot === 'handover'
        ? 'handover'
        : 'customer-message'

    await hapusAudioCustom(storageKey)

    setCustomAudioMeta((prev) => ({
      ...prev,
      [slot === 'handover'
        ? 'handover'
        : 'customerMessage']: null,
    }))

    if (slot === 'handover') {
      update({ handoverSoundPreset: 'alert' })
    } else {
      update({ customerMessageSoundPreset: 'chime' })
    }
  }

  const update = (patch) => {
    const next = saveAdminPreferences(patch)
    setPreferences(next)
    setSavedHint(
      next.language === 'en'
        ? 'Saved automatically'
        : 'Tersimpan otomatis',
    )

    window.setTimeout(() => {
      setSavedHint('')
    }, 1500)
  }

  const handleEnablePush = async () => {
    if (pushStatus === 'loading') return

    setPushStatus('loading')
    setPushError('')

    try {
      await aktifkanPushNotifications()
      setPushStatus('active')
    } catch (error) {
      const message =
        error?.message ||
        'Gagal mengaktifkan notifikasi browser.'

      setPushError(message)

      if (/diblokir|blocked/i.test(message)) {
        setPushStatus('denied')
      } else {
        setPushStatus('inactive')
      }
    }
  }

  const handleReset = () => {
    const next = resetAdminPreferences()
    setPreferences(next)
  }

  return (
    <AdminLayout title={text.title}>
      <div className="admin-settings-intro">
        <div>
          <p className="admin-settings-kicker">KUKI ADMIN</p>
          <h2 className="display-font">{text.title}</h2>
          <p>{text.subtitle}</p>
        </div>

        {savedHint && (
          <span className="admin-settings-saved">
            {savedHint}
          </span>
        )}
      </div>

      <div className="admin-settings-grid">
        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">🔔</span>
              <div>
                <h3>Notifikasi</h3>
                <p>Atur browser push, toast, dan suara Dashboard Admin.</p>
              </div>
            </div>
          </div>

          <div className="admin-browser-status">
            <div>
              <strong>Web Push</strong>
              <small>
                {pushStatus === 'active'
                  ? 'Aktif pada browser ini.'
                  : pushStatus === 'denied'
                    ? 'Diblokir oleh browser.'
                    : pushStatus === 'unsupported'
                      ? 'Tidak didukung browser ini.'
                      : 'Belum aktif pada browser ini.'}
              </small>
            </div>

            {pushStatus !== 'active' &&
              pushStatus !== 'unsupported' &&
              pushStatus !== 'denied' && (
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleEnablePush}
                  disabled={
                    pushStatus === 'loading' ||
                    pushStatus === 'checking'
                  }
                >
                  {pushStatus === 'loading'
                    ? 'Mengaktifkan...'
                    : 'Aktifkan'}
                </button>
              )}
          </div>

          {pushError && (
            <p className="admin-settings-error">
              {pushError}
            </p>
          )}

          {audioImportError && (
            <p className="admin-settings-error">
              {audioImportError}
            </p>
          )}

          <Toggle
            checked={preferences.toastEnabled}
            onChange={(value) => update({ toastEnabled: value })}
            label="Toast di Dashboard"
            description="Munculkan popup kecil saat ada chat baru."
          />

          <Toggle
            checked={preferences.soundEnabled}
            onChange={(value) => update({ soundEnabled: value })}
            label="Suara notifikasi dalam Dashboard"
            description="Bunyi diputar saat Dashboard terbuka dan browser mengizinkan audio."
          />

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>Suara saat customer minta Admin</strong>
              <small>Pilih suara khusus untuk HANDOVER_REQUESTED.</small>
            </span>

            <select
              value={preferences.handoverSoundPreset}
              onChange={(event) => update({
                handoverSoundPreset: event.target.value,
              })}
              disabled={!preferences.soundEnabled || !preferences.soundOnHandover}
            >
              <option value="soft">Soft</option>
              <option value="chime">Chime</option>
              <option value="alert">Alert</option>
              <option value="custom">Audio Custom</option>
              <option value="silent">Tanpa suara</option>
            </select>
          </div>

          <div className="admin-custom-audio-box">
            <div className="admin-custom-audio-info">
              <strong>Audio custom handover</strong>
              <small>
                {customAudioMeta.handover?.name ||
                  'Belum ada file custom. MP3/WAV/OGG/M4A/AAC, maksimal 5 MB.'}
              </small>
            </div>

            <div className="admin-custom-audio-actions">
              <label className="admin-btn admin-btn-file">
                Import Audio
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,.mp3,.wav,.ogg,.m4a,.aac"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    handleImportAudio('handover', file)
                    event.target.value = ''
                  }}
                  hidden
                />
              </label>

              {customAudioMeta.handover && (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() => handleRemoveAudio('handover')}
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          <div className="admin-settings-inline-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={() => playAdminNotificationSound({
                preset: preferences.handoverSoundPreset,
                volume: preferences.soundVolume,
                key: `settings-handover-${Date.now()}`,
                customAudioKey: 'handover',
              })}
              disabled={
                !preferences.soundEnabled ||
                !preferences.soundOnHandover ||
                preferences.handoverSoundPreset === 'silent'
              }
            >
              Tes Suara Handover
            </button>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>Suara saat customer mengirim pesan</strong>
              <small>Pilih suara khusus untuk CUSTOMER_NEW_MESSAGE.</small>
            </span>

            <select
              value={preferences.customerMessageSoundPreset}
              onChange={(event) => update({
                customerMessageSoundPreset: event.target.value,
              })}
              disabled={
                !preferences.soundEnabled ||
                !preferences.soundOnCustomerMessage
              }
            >
              <option value="soft">Soft</option>
              <option value="chime">Chime</option>
              <option value="alert">Alert</option>
              <option value="custom">Audio Custom</option>
              <option value="silent">Tanpa suara</option>
            </select>
          </div>

          <div className="admin-custom-audio-box">
            <div className="admin-custom-audio-info">
              <strong>Audio custom pesan customer</strong>
              <small>
                {customAudioMeta.customerMessage?.name ||
                  'Belum ada file custom. MP3/WAV/OGG/M4A/AAC, maksimal 5 MB.'}
              </small>
            </div>

            <div className="admin-custom-audio-actions">
              <label className="admin-btn admin-btn-file">
                Import Audio
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,.mp3,.wav,.ogg,.m4a,.aac"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    handleImportAudio('customerMessage', file)
                    event.target.value = ''
                  }}
                  hidden
                />
              </label>

              {customAudioMeta.customerMessage && (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() => handleRemoveAudio('customerMessage')}
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          <div className="admin-settings-inline-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={() => playAdminNotificationSound({
                preset: preferences.customerMessageSoundPreset,
                volume: preferences.soundVolume,
                key: `settings-message-${Date.now()}`,
                customAudioKey: 'customer-message',
              })}
              disabled={
                !preferences.soundEnabled ||
                !preferences.soundOnCustomerMessage ||
                preferences.customerMessageSoundPreset === 'silent'
              }
            >
              Tes Suara Pesan
            </button>
          </div>

          <div className="admin-setting-row admin-setting-volume">
            <span className="admin-setting-copy">
              <strong>Volume</strong>
              <small>
                {Math.round(preferences.soundVolume * 100)}%
              </small>
            </span>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={preferences.soundVolume}
              onChange={(event) => update({
                soundVolume: Number(event.target.value),
              })}
              disabled={!preferences.soundEnabled}
            />
          </div>


          <Toggle
            checked={preferences.soundOnHandover}
            onChange={(value) => update({
              soundOnHandover: value,
            })}
            label="Bunyi saat customer minta Admin"
            description="Untuk HANDOVER_REQUESTED."
            disabled={!preferences.soundEnabled}
          />

          <Toggle
            checked={preferences.soundOnCustomerMessage}
            onChange={(value) => update({
              soundOnCustomerMessage: value,
            })}
            label="Bunyi saat customer kirim pesan baru"
            description="Untuk CUSTOMER_NEW_MESSAGE setelah chat dialihkan."
            disabled={!preferences.soundEnabled}
          />
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">◐</span>
              <div>
                <h3>Tampilan</h3>
                <p>Sesuaikan tampilan Dashboard tanpa mengubah Public Web.</p>
              </div>
            </div>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>Tema</strong>
              <small>System mengikuti tema perangkat.</small>
            </span>

            <select
              value={preferences.theme}
              onChange={(event) => update({
                theme: event.target.value,
              })}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>Kepadatan tampilan</strong>
              <small>Compact cocok untuk layar laptop/tablet.</small>
            </span>

            <select
              value={preferences.density}
              onChange={(event) => update({
                density: event.target.value,
              })}
            >
              <option value="comfortable">Nyaman</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>Ukuran teks</strong>
              <small>Memengaruhi area Admin saja.</small>
            </span>

            <select
              value={preferences.fontScale}
              onChange={(event) => update({
                fontScale: event.target.value,
              })}
            >
              <option value="normal">Normal</option>
              <option value="large">Besar</option>
            </select>
          </div>

          <Toggle
            checked={preferences.reduceMotion}
            onChange={(value) => update({
              reduceMotion: value,
            })}
            label="Kurangi animasi"
            description="Mengurangi transisi dan animasi pada Dashboard Admin."
          />
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">文</span>
              <div>
                <h3>Bahasa</h3>
                <p>Bahasa saat ini diterapkan pada shell Admin dan halaman Pengaturan.</p>
              </div>
            </div>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>Bahasa antarmuka</strong>
              <small>Konten halaman lama akan diterjemahkan bertahap.</small>
            </span>

            <select
              value={preferences.language}
              onChange={(event) => update({
                language: event.target.value,
              })}
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">↻</span>
              <div>
                <h3>Refresh Data</h3>
                <p>Atur seberapa sering indikator chat Admin diperbarui.</p>
              </div>
            </div>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>Interval notifikasi chat</strong>
              <small>Semakin cepat, semakin responsif tetapi request API lebih sering.</small>
            </span>

            <select
              value={preferences.notificationRefreshMs}
              onChange={(event) => update({
                notificationRefreshMs: Number(event.target.value),
              })}
            >
              <option value={5000}>5 detik</option>
              <option value={10000}>10 detik</option>
              <option value={30000}>30 detik</option>
            </select>
          </div>
        </section>

        <section className="admin-settings-card admin-settings-danger-zone">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">↺</span>
              <div>
                <h3>Reset Preferensi</h3>
                <p>Kembalikan pengaturan perangkat ini ke bawaan Kuki Admin.</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn"
            onClick={handleReset}
          >
            Reset ke Default
          </button>

          <small className="admin-settings-device-note">
            Preferensi disimpan di browser/perangkat ini. Data produk,
            kategori, chat, dan akun tidak ikut dihapus.
          </small>
        </section>
      </div>
    </AdminLayout>
  )
}

export default AdminSettingsPage
