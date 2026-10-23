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
import useAdminTranslation from '../../hooks/useAdminTranslation'

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
  const { t } = useAdminTranslation()
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
          <p className="admin-settings-kicker">{t("KUKI ADMIN")}</p>
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
                <h3>{t("Notifikasi")}</h3>
                <p>{t("Atur browser push, toast, dan suara Dashboard Admin.")}</p>
              </div>
            </div>
          </div>

          <div className="admin-browser-status">
            <div>
              <strong>{t("Web Push")}</strong>
              <small>
                {pushStatus === 'active'
                  ? t("Aktif pada browser ini.")
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
                    ? t("Mengaktifkan...")
                    : t("Aktifkan")}
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
            label={t("Toast di Dashboard")}
            description="Munculkan popup kecil saat ada chat baru."
          />

          <Toggle
            checked={preferences.soundEnabled}
            onChange={(value) => update({ soundEnabled: value })}
            label={t("Suara notifikasi dalam Dashboard")}
            description="Bunyi diputar saat Dashboard terbuka dan browser mengizinkan audio."
          />

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{t("Suara saat customer minta Admin")}</strong>
              <small>{t("Pilih suara khusus untuk HANDOVER_REQUESTED.")}</small>
            </span>

            <select
              value={preferences.handoverSoundPreset}
              onChange={(event) => update({
                handoverSoundPreset: event.target.value,
              })}
              disabled={!preferences.soundEnabled || !preferences.soundOnHandover}
            >
              <option value="soft">{t("Soft")}</option>
              <option value="chime">{t("Chime")}</option>
              <option value="alert">{t("Alert")}</option>
              <option value="custom">{t("Audio Custom")}</option>
              <option value="silent">{t("Tanpa suara")}</option>
            </select>
          </div>

          <div className="admin-custom-audio-box">
            <div className="admin-custom-audio-info">
              <strong>{t("Audio custom handover")}</strong>
              <small>
                {customAudioMeta.handover?.name ||
                  t("Belum ada file custom. MP3/WAV/OGG/M4A/AAC, maksimal 5 MB.")}
              </small>
            </div>

            <div className="admin-custom-audio-actions">
              <label className="admin-btn admin-btn-file">
                {t("Import Audio")}
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
                  {t("Hapus")}
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
              {t("Tes Suara Handover")}
            </button>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{t("Suara saat customer mengirim pesan")}</strong>
              <small>{t("Pilih suara khusus untuk CUSTOMER_NEW_MESSAGE.")}</small>
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
              <option value="soft">{t("Soft")}</option>
              <option value="chime">{t("Chime")}</option>
              <option value="alert">{t("Alert")}</option>
              <option value="custom">{t("Audio Custom")}</option>
              <option value="silent">{t("Tanpa suara")}</option>
            </select>
          </div>

          <div className="admin-custom-audio-box">
            <div className="admin-custom-audio-info">
              <strong>{t("Audio custom pesan customer")}</strong>
              <small>
                {customAudioMeta.customerMessage?.name ||
                  t("Belum ada file custom. MP3/WAV/OGG/M4A/AAC, maksimal 5 MB.")}
              </small>
            </div>

            <div className="admin-custom-audio-actions">
              <label className="admin-btn admin-btn-file">
                {t("Import Audio")}
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
                  {t("Hapus")}
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
              {t("Tes Suara Pesan")}
            </button>
          </div>

          <div className="admin-setting-row admin-setting-volume">
            <span className="admin-setting-copy">
              <strong>{t("Volume")}</strong>
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
            label={t("Bunyi saat customer minta Admin")}
            description="Untuk HANDOVER_REQUESTED."
            disabled={!preferences.soundEnabled}
          />

          <Toggle
            checked={preferences.soundOnCustomerMessage}
            onChange={(value) => update({
              soundOnCustomerMessage: value,
            })}
            label={t("Bunyi saat customer kirim pesan baru")}
            description="Untuk CUSTOMER_NEW_MESSAGE setelah chat dialihkan."
            disabled={!preferences.soundEnabled}
          />
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">◐</span>
              <div>
                <h3>{t("Tampilan")}</h3>
                <p>{t("Sesuaikan tampilan Dashboard tanpa mengubah Public Web.")}</p>
              </div>
            </div>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{t("Tema")}</strong>
              <small>{t("System mengikuti tema perangkat.")}</small>
            </span>

            <select
              value={preferences.theme}
              onChange={(event) => update({
                theme: event.target.value,
              })}
            >
              <option value="system">{t("System")}</option>
              <option value="light">{t("Light")}</option>
              <option value="dark">{t("Dark")}</option>
            </select>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{t("Kepadatan tampilan")}</strong>
              <small>{t("Compact cocok untuk layar laptop/tablet.")}</small>
            </span>

            <select
              value={preferences.density}
              onChange={(event) => update({
                density: event.target.value,
              })}
            >
              <option value="comfortable">{t("Nyaman")}</option>
              <option value="compact">{t("Compact")}</option>
            </select>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{t("Ukuran teks")}</strong>
              <small>{t("Memengaruhi area Admin saja.")}</small>
            </span>

            <select
              value={preferences.fontScale}
              onChange={(event) => update({
                fontScale: event.target.value,
              })}
            >
              <option value="normal">{t("Normal")}</option>
              <option value="large">{t("Besar")}</option>
            </select>
          </div>

          <Toggle
            checked={preferences.reduceMotion}
            onChange={(value) => update({
              reduceMotion: value,
            })}
            label={t("Kurangi animasi")}
            description="Mengurangi transisi dan animasi pada Dashboard Admin."
          />
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">文</span>
              <div>
                <h3>{t("Bahasa")}</h3>
                <p>{t("Bahasa saat ini diterapkan pada shell Admin dan halaman Pengaturan.")}</p>
              </div>
            </div>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{t("Bahasa antarmuka")}</strong>
              <small>{t("Konten halaman lama akan diterjemahkan bertahap.")}</small>
            </span>

            <select
              value={preferences.language}
              onChange={(event) => update({
                language: event.target.value,
              })}
            >
              <option value="id">{t("Bahasa Indonesia")}</option>
              <option value="en">{t("English")}</option>
            </select>
          </div>
        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">↻</span>
              <div>
                <h3>{t("Refresh Data")}</h3>
                <p>{t("Atur seberapa sering indikator chat Admin diperbarui.")}</p>
              </div>
            </div>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{t("Interval notifikasi chat")}</strong>
              <small>{t("Semakin cepat, semakin responsif tetapi request API lebih sering.")}</small>
            </span>

            <select
              value={preferences.notificationRefreshMs}
              onChange={(event) => update({
                notificationRefreshMs: Number(event.target.value),
              })}
            >
              <option value={5000}>{t("5 detik")}</option>
              <option value={10000}>{t("10 detik")}</option>
              <option value={30000}>{t("30 detik")}</option>
            </select>
          </div>
        </section>

        <section className="admin-settings-card admin-settings-danger-zone">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">↺</span>
              <div>
                <h3>{t("Reset Preferensi")}</h3>
                <p>{t("Kembalikan pengaturan perangkat ini ke bawaan Kuki Admin.")}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn"
            onClick={handleReset}
          >
            {t("Reset ke Default")}
          </button>

          <small className="admin-settings-device-note">
            {t("Preferensi disimpan di browser/perangkat ini. Data produk,\n            kategori, chat, dan akun tidak ikut dihapus.")}
          </small>
        </section>
      </div>
    </AdminLayout>
  )
}

export default AdminSettingsPage
