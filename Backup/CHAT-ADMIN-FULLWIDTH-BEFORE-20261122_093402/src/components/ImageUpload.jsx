import { useCallback, useRef, useState } from 'react'
import { UploadIcon, XIcon, RotateCcwIcon } from '../components/icons'
import './ImageUpload.css'

/**
 * Komponen upload gambar yang keren dengan:
 * - Drag & drop
 * - Preview dengan zoom
 * - Progress bar
 * - Validasi file
 * - Hapus/ganti gambar
 */
function ImageUpload({
  onChange,
  onRemove,
  accept = 'image/*',
  maxSizeMB = 5,
  multiple = false,
  disabled = false,
  previewSize = 120,
}) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [showLightbox, setShowLightbox] = useState(false)
  const fileInputRef = useRef(null)

  const validateFile = useCallback((file) => {
    if (!file) return true

    if (!accept.split(',').some(type => {
      if (type.endsWith('/*')) return file.type.startsWith(type.slice(0, -1))
      return file.type === type
    })) {
      setError(`Tipe file tidak didukung. Hanya ${accept} yang diperbolehkan.`)
      return false
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`Ukuran file terlalu besar. Maksimal ${maxSizeMB}MB.`)
      return false
    }

    setError('')
    return true
  }, [accept, maxSizeMB])

  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) return

    const fileList = multiple ? Array.from(files) : [files[0]]
    const validFiles = fileList.filter(validateFile)

    if (validFiles.length === 0) return

    if (multiple) {
      const previews = validFiles.map(f => URL.createObjectURL(f))
      setPreview(prev => [...(prev || []), ...previews])
      onChange(validFiles)
    } else {
      const file = validFiles[0]
      setPreview(URL.createObjectURL(file))
      onChange(file)
    }
  }, [multiple, onChange, validateFile])

  const handleDrop = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    handleFiles(event.dataTransfer.files)
  }, [disabled, handleFiles])

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleFileSelect = useCallback((event) => {
    if (disabled) return
    handleFiles(event.target.files)
  }, [disabled, handleFiles])

  const handleRemove = useCallback((index) => {
    if (multiple && Array.isArray(preview)) {
      const newPreviews = preview.filter((_, i) => i !== index)
      setPreview(newPreviews.length > 0 ? newPreviews : null)
      onChange(null, index)
    } else {
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
      onChange(null)
    }
    onRemove?.()
  }, [multiple, preview, onChange, onRemove])

  const handleRemoveAll = useCallback(() => {
    if (Array.isArray(preview)) {
      preview.forEach(p => URL.revokeObjectURL(p))
    } else if (preview) {
      URL.revokeObjectURL(preview)
    }
    setPreview(null)
    onChange(null)
    onRemove?.()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [preview, onChange, onRemove])

  const openLightbox = useCallback(() => {
    setShowLightbox(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setShowLightbox(false)
  }, [])

  const triggerFileInput = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }, [disabled])

  const renderPreview = useCallback(() => {
    if (!preview) return null

    const previews = Array.isArray(preview) ? preview : [preview]

    return (
      <div className="image-upload-preview">
        {previews.map((src, index) => (
          <div key={index} className="image-upload-preview-item">
            <img
              src={src}
              alt={`Preview ${index + 1}`}
              onClick={openLightbox}
            />
            <button
              type="button"
              className="image-upload-remove"
              onClick={(e) => { e.stopPropagation(); handleRemove(index); }}
              aria-label={`Hapus gambar ${index + 1}`}
            >
              <XIcon width="16" height="16" />
            </button>
          </div>
        ))}
      </div>
    )
  }, [preview, handleRemove, openLightbox])

  return (
    <div className="image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="image-upload-input"
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div
        className={`image-upload-dropzone ${preview ? 'has-preview' : ''} ${disabled ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={triggerFileInput}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') triggerFileInput(); }}
        style={{ '--preview-size': `${previewSize}px` }}
      >
        {preview ? (
          renderPreview()
        ) : (
          <div className="image-upload-placeholder">
            <UploadIcon width="48" height="48" />
            <p className="image-upload-text">
              <strong>Klik atau tarik gambar ke sini</strong>
              <br />
              <small>PNG, JPG, WebP hingga {maxSizeMB}MB</small>
            </p>
          </div>
        )}

        {error && (
          <div className="image-upload-error" role="alert">
            {error}
          </div>
        )}
      </div>

      {preview && (
        <div className="image-upload-actions">
          <button
            type="button"
            className="admin-btn admin-btn-ghost image-upload-action-btn"
            onClick={triggerFileInput}
            disabled={disabled}
          >
            <RotateCcwIcon width="16" height="16" /> Ganti
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-danger image-upload-action-btn"
            onClick={handleRemoveAll}
            disabled={disabled}
          >
            <XIcon width="16" height="16" /> Hapus
          </button>
        </div>
      )}

      {showLightbox && (
        <div className="image-lightbox" onClick={closeLightbox} role="dialog" aria-modal="true" aria-label="Pratinjau gambar penuh">
          <button className="image-lightbox-close" onClick={closeLightbox} aria-label="Tutup">
            <XIcon width="24" height="24" />
          </button>
          <img src={Array.isArray(preview) ? preview[0] : preview} alt="Pratinjau penuh" />
        </div>
      )}
    </div>
  )
}

export default ImageUpload