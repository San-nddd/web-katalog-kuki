import useAdminTranslation from '../../hooks/useAdminTranslation'
import { useEffect, useId, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { createPortal } from 'react-dom'
import { cropImageToFile } from './cropImage'
import './ImageUploadEditor.css'

const RATIOS = [
  { value: 'original', label: 'Asli' },
  { value: '16:9', label: '16:9 · Landscape' },
  { value: '4:3', label: '4:3 · Landscape' },
  { value: '1:1', label: '1:1 · Persegi' },
  { value: '3:4', label: '3:4 · Portrait' },
  { value: '9:16', label: '9:16 · Portrait' },
  { value: 'custom', label: 'Custom' },
]

const RATIO_VALUES = {
  '16:9': 16 / 9,
  '4:3': 4 / 3,
  '1:1': 1,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
}

function toPositive(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/**
 * Reusable foto uploader untuk Admin Kuki Bakehouse.
 * - onChange(file, metadata): file diedit dan siap ditambahkan ke FormData.
 * - initialUrl: gambar yang SUDAH disimpan (URL publik Laravel Storage).
 * - defaultRatio: original | 16:9 | 4:3 | 1:1 | 3:4 | 9:16 | custom
 * Tidak melakukan upload otomatis; tombol Simpan form tetap mengendalikan request.
 */
export default function ImageUploadEditor({
  label = 'Foto',
  initialUrl = '',
  defaultRatio = 'original',
  maxFileMB = 10,
  onChange,
}) {
  const { t } = useAdminTranslation()

  const inputId = useId()
  const inputRef = useRef(null)
  const [sourceFile, setSourceFile] = useState(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [editedFile, setEditedFile] = useState(null)
  const [editedPreview, setEditedPreview] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [ratio, setRatio] = useState(defaultRatio)
  const [originalRatio, setOriginalRatio] = useState(1)
  const [customWidth, setCustomWidth] = useState('1200')
  const [customHeight, setCustomHeight] = useState('800')
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [pixels, setPixels] = useState(null)

  useEffect(() => {
    if (!sourceFile) {
      setSourceUrl('')
      return
    }
    const url = URL.createObjectURL(sourceFile)
    setSourceUrl(url)
    const img = new Image()
    img.onload = () => setOriginalRatio(img.naturalWidth / img.naturalHeight)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [sourceFile])

  useEffect(() => {
    if (!editedFile) {
      setEditedPreview('')
      return
    }
    const url = URL.createObjectURL(editedFile)
    setEditedPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [editedFile])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) closeEditor()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, busy])

  function resetControls() {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setBrightness(100)
    setContrast(100)
    setRatio(defaultRatio)
    setOriginalRatio(1)
    setPixels(null)
  }

  function startEdit(file) {
    resetControls()
    setError('')
    setSourceFile(file)
    setIsOpen(true)
  }

  function closeEditor() {
    setIsOpen(false)
    setSourceFile(null) // jangan mengganti file yang sudah disetujui jika Batal
    setError('')
  }

  function handlePick(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t("Gunakan gambar JPG, PNG, atau WebP."))
      return
    }
    if (file.size > maxFileMB * 1024 * 1024) {
      setError(t('Ukuran gambar maksimal {jumlah} MB.', { jumlah: maxFileMB }))
      return
    }
    startEdit(file)
  }

  async function handleEditSaved() {
    const url = editedPreview || initialUrl
    if (!url || busy) return
    setBusy(true)
    setError('')
    try {
      // Blob preview hasil edit bisa dipakai tanpa download ulang dari Laravel.
      if (editedFile) {
        startEdit(editedFile)
      } else {
        const response = await fetch(url)
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const blob = await response.blob()
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) {
          throw new Error(t("Tipe file gambar tidak didukung."))
        }
        if (blob.size > maxFileMB * 1024 * 1024) {
          throw new Error(`File melebihi ${maxFileMB} MB.`)
        }
        startEdit(new File([blob], 'foto-tersimpan.jpg', { type: blob.type }))
      }
    } catch (err) {
      setError(t("Gagal membuka foto tersimpan. Pastikan URL storage dapat diakses dan CORS diizinkan. ") + err.message)
    } finally {
      setBusy(false)
    }
  }

  function chooseRatio(value) {
    setRatio(value)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setPixels(null)
  }

  const customRatio = toPositive(customWidth, 1200) / toPositive(customHeight, 800)
  // Jika diputar 90/270 derajat, rasio asli mengikuti orientasi gambar saat ini.
  const quarterTurn = Math.abs(Math.round(rotation / 90)) % 2 === 1
  const aspect = ratio === 'original'
    ? (quarterTurn ? 1 / originalRatio : originalRatio)
    : ratio === 'custom'
      ? Math.max(0.1, Math.min(10, customRatio))
      : RATIO_VALUES[ratio] || originalRatio

  async function applyEdit() {
    if (!sourceFile || !sourceUrl || !pixels || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await cropImageToFile({
        imageUrl: sourceUrl,
        cropPixels: pixels,
        rotation,
        brightness,
        contrast,
        filename: sourceFile.name,
      })
      setEditedFile(result.file)
      onChange?.(result.file, result.metadata)
      closeEditor()
    } catch (err) {
      setError(err.message ||t("Tidak dapat mengedit gambar."))
    } finally {
      setBusy(false)
    }
  }

  const preview = editedPreview || initialUrl

  return (
    <section className="kuki-image-editor">
      <label htmlFor={inputId} className="kuki-image-editor__label">{t(label)}</label>
      {preview && (
        <div className="kuki-image-editor__preview">
          <img src={preview} alt={`Pratinjau ${t(label)}`} />
        </div>
      )}
      <div className="kuki-image-editor__actions">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="kuki-image-editor__file-input"
          onChange={handlePick}
        />
        <button type="button" className="kuki-image-editor__button" onClick={() => inputRef.current?.click()}>
          {preview ?t("Ganti Foto") :t("Pilih Foto")}
        </button>
        {preview && (
          <button type="button" className="kuki-image-editor__button" disabled={busy} onClick={handleEditSaved}>
            {busy ? t('Memuat...') : t('Edit Foto')}
          </button>
        )}
      </div>
      <p className="kuki-image-editor__hint">{t("JPG/PNG/WebP · sumber maks.")} {maxFileMB} {t("MB. Hasil edit WebP maks. 2 MB (sesuai API Laravel).")}</p>
      {error && !isOpen && <p className="kuki-image-editor__error" role="alert">{error}</p>}

      {isOpen && sourceUrl && createPortal(
        <div className="kuki-image-editor__overlay" role="presentation">
          <div className="kuki-image-editor__dialog" role="dialog" aria-modal="true" aria-label={t("Editor Foto")}>
            <div className="kuki-image-editor__header">
              <h2>{t("Editor Foto")}</h2>
              <button type="button" className="kuki-image-editor__button" onClick={closeEditor} disabled={busy} aria-label={t("Tutup editor")}>✕</button>
            </div>
            <p className="kuki-image-editor__hint">{t("Geser foto untuk crop, lalu atur zoom, rotasi, kecerahan, dan kontras.")}</p>
            <div className="kuki-image-editor__crop-area">
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropAreaChange={(_, nextPixels) => setPixels(nextPixels)}
                style={{ mediaStyle: { filter: `brightness(${brightness}%) contrast(${contrast}%)` } }}
                showGrid
              />
            </div>

            <div className="kuki-image-editor__controls">
              <label className="kuki-image-editor__field">
                <span>{t("Rasio foto")}</span>
                <select value={ratio} onChange={(e) => chooseRatio(e.target.value)}>
                  {RATIOS.map((choice) => <option key={choice.value} value={choice.value}>{t(choice.label)}</option>)}
                </select>
              </label>

              {ratio === 'custom' && (
                <div className="kuki-image-editor__dimension-row">
                  <label className="kuki-image-editor__field">
                    <span>{t("Lebar rasio")}</span>
                    <input type="number" min="1" max="10000" value={customWidth} onChange={(e) => { setCustomWidth(e.target.value); setPixels(null) }} />
                  </label>
                  <label className="kuki-image-editor__field">
                    <span>{t("Tinggi rasio")}</span>
                    <input type="number" min="1" max="10000" value={customHeight} onChange={(e) => { setCustomHeight(e.target.value); setPixels(null) }} />
                  </label>
                </div>
              )}
              <label className="kuki-image-editor__field">
                <span>{t("Zoom:")} {zoom.toFixed(1)}{t("×")}</span>
                <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              </label>
              <label className="kuki-image-editor__field">
                <span>{t("Kecerahan:")} {brightness}%</span>
                <input type="range" min="50" max="150" step="1" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />
              </label>
              <label className="kuki-image-editor__field">
                <span>{t("Kontras:")} {contrast}%</span>
                <input type="range" min="50" max="150" step="1" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
              </label>
            </div>

            <div className="kuki-image-editor__footer">
              <div className="kuki-image-editor__actions">
                <button type="button" className="kuki-image-editor__button" onClick={() => { setRotation((r) => r - 90); setPixels(null) }}>{t("↶ Kiri")}</button>
                <button type="button" className="kuki-image-editor__button" onClick={() => { setRotation((r) => r + 90); setPixels(null) }}>{t("↷ Kanan")}</button>
                <button type="button" className="kuki-image-editor__button" onClick={resetControls}>{t("Reset")}</button>
              </div>
              <div className="kuki-image-editor__actions">
                <button type="button" className="kuki-image-editor__button" disabled={busy} onClick={closeEditor}>{t("Batal")}</button>
                <button type="button" className="kuki-image-editor__button kuki-image-editor__button--primary" disabled={busy || !pixels} onClick={applyEdit}>
                  {busy ? t("Memproses...") :t("Gunakan Foto")}
                </button>
              </div>
            </div>
            {error && <p className="kuki-image-editor__error" role="alert">{error}</p>}
            <p className="kuki-image-editor__hint">{t("Hasil edit disimpan sebagai WebP. Foto baru diunggah setelah tombol Simpan di form Admin ditekan.")}</p>
          </div>
        </div>,
        document.body,
      )}
    </section>
  )
}
