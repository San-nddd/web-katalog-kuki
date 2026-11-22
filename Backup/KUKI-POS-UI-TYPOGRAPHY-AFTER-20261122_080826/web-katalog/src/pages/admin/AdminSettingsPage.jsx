import { useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import {
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
  })
  const [audioImportError, setAudioImportError] = useState('')

  const text = {
    title: 'Pengaturan',
    subtitle: 'Atur pengalaman Dashboard Admin pada perangkat ini.',
  }

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

    metadataAudioCustom('handover')
      .then((handover) => {
        if (!mounted) return

        setCustomAudioMeta({ handover })
      })
      .catch(() => {
        // Metadata audio custom tidak boleh mengganggu halaman Settings.
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleImportHandoverAudio = async (file) => {
    if (!file) return

    setAudioImportError('')

    try {
      const metadata = await simpanAudioCustom(
        'handover',
        file,
      )

      setCustomAudioMeta({ handover: metadata })
      update({ handoverSoundPreset: 'custom' })
    } catch (error) {
      setAudioImportError(
        error?.message ||
        'Gagal mengimpor audio custom.',
      )
    }
  }

  const handleRemoveHandoverAudio = async () => {
    await hapusAudioCustom('handover')

    setCustomAudioMeta({ handover: null })
    update({ handoverSoundPreset: 'alert' })
  }

  const update = (patch) => {
    const next = saveAdminPreferences(patch)
    setPreferences(next)
    setSavedHint('Tersimpan otomatis')

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
          <p className="admin-settings-kicker">{"KUKI ADMIN"}</p>
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
                <h3>{"Notifikasi"}</h3>
                <p>{"Atur notifikasi browser, notifikasi singkat, dan suara Dashboard Admin."}</p>
              </div>
            </div>
          </div>

          <div className="admin-browser-status">
            <div>
              <strong>{"Notifikasi Web"}</strong>
              <small>
                {pushStatus === 'active'
                  ? "Aktif pada browser ini."
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
                    ? "Mengaktifkan..."
                    : "Aktifkan"}
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
            label={"Toast di Dashboard"}
            description="Munculkan popup kecil saat ada chat baru."
          />

          <Toggle
            checked={preferences.soundEnabled}
            onChange={(value) => update({ soundEnabled: value })}
            label={"Suara notifikasi dalam Dashboard"}
            description="Bunyi diputar saat Dashboard terbuka dan browser mengizinkan audio."
          />

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{"Suara saat pelanggan meminta bantuan Admin"}</strong>
              <small>{"Pilih suara saat pelanggan meminta Admin mengambil alih percakapan."}</small>
            </span>

            <select
              value={preferences.handoverSoundPreset}
              onChange={(event) => update({
                handoverSoundPreset: event.target.value,
              })}
              disabled={!preferences.soundEnabled || !preferences.soundOnHandover}
            >
              <option value="soft">{"Lembut"}</option>
              <option value="chime">{"Lonceng"}</option>
              <option value="alert">{"Peringatan"}</option>
              <option value="custom">{"Audio Khusus"}</option>
              <option value="silent">{"Tanpa suara"}</option>
            </select>
          </div>

          <div className="admin-custom-audio-box">
            <div className="admin-custom-audio-info">
              <strong>{"Audio khusus saat alih percakapan"}</strong>
              <small>
                {customAudioMeta.handover?.name ||
                  "Belum ada file custom. MP3/WAV/OGG/M4A/AAC, maksimal 5 MB."}
              </small>
            </div>

            <div className="admin-custom-audio-actions">
              <label className="admin-btn admin-btn-file">
                {"Impor Audio"}
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,.mp3,.wav,.ogg,.m4a,.aac"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    handleImportHandoverAudio(file)
                    event.target.value = ''
                  }}
                  hidden
                />
              </label>

              {customAudioMeta.handover && (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={handleRemoveHandoverAudio}
                >
                  {"Hapus"}
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
              {"Uji Suara Alih Percakapan"}
            </button>
          </div>

          <div className="admin-setting-row admin-setting-volume">
            <span className="admin-setting-copy">
              <strong>{"Volume"}</strong>
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
            label={"Bunyi saat pelanggan meminta bantuan Admin"}
            description="Untuk HANDOVER_REQUESTED."
            disabled={!preferences.soundEnabled}
          />

        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">◐</span>
              <div>
                <h3>{"Tampilan"}</h3>
                <p>{"Sesuaikan tampilan Dashboard tanpa mengubah situs publik."}</p>
              </div>
            </div>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{"Tema"}</strong>
              <small>{"Tema sistem mengikuti tema perangkat."}</small>
            </span>

            <select
              value={preferences.theme}
              onChange={(event) => update({
                theme: event.target.value,
              })}
            >
              <option value="system">{"Sistem"}</option>
              <option value="light">{"Terang"}</option>
              <option value="dark">{"Gelap"}</option>
            </select>
          </div>

        </section>

        <section className="admin-settings-card">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">↻</span>
              <div>
                <h3>{"Pembaruan Data"}</h3>
                <p>{"Atur seberapa sering indikator chat Admin diperbarui."}</p>
              </div>
            </div>
          </div>

          <div className="admin-setting-row">
            <span className="admin-setting-copy">
              <strong>{"Interval notifikasi chat"}</strong>
              <small>{"Semakin cepat, semakin responsif tetapi request API lebih sering."}</small>
            </span>

            <select
              value={preferences.notificationRefreshMs}
              onChange={(event) => update({
                notificationRefreshMs: Number(event.target.value),
              })}
            >
              <option value={5000}>{"5 detik"}</option>
              <option value={10000}>{"10 detik"}</option>
              <option value={30000}>{"30 detik"}</option>
            </select>
          </div>
        </section>

        <section className="admin-settings-card admin-settings-danger-zone">
          <div className="admin-settings-card-head">
            <div>
              <span className="admin-settings-icon" aria-hidden="true">↺</span>
              <div>
                <h3>{"Reset Preferensi"}</h3>
                <p>{"Kembalikan pengaturan perangkat ini ke bawaan Kuki Admin."}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="admin-btn"
            onClick={handleReset}
          >
            {"Atur Ulang ke Bawaan"}
          </button>

          <small className="admin-settings-device-note">
            {"Preferensi disimpan di browser/perangkat ini. Data produk,\n            kategori, chat, dan akun tidak ikut dihapus."}
          </small>
        </section>
      </div>
    </AdminLayout>
  )
}

export default AdminSettingsPage
