import { useRef, useState } from 'react'
import { UploadIcon, CheckIcon, LoaderIcon } from '../components/icons'
import './ImageUploadButton.css'

/**
 * Tombol upload gambar yang modern & interaktif
 * - Preview thumbnail di dalam tombol
 * - Loading state dengan spinner
 * - Success animation
 * - Tooltip informatif
 * - Menggunakan <label> untuk file input native (hindari warning user activation)
 */
function ImageUploadButton({
  currentImage,
  onUpload,
  disabled = false,
  title,
}) {
  const [state, setState] = useState('idle') // idle, uploading, success
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)
  const successTimeoutRef = useRef(null)

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validasi sederhana
    if (!file.type.startsWith('image/')) {
      alert('Hanya file gambar yang diperbolehkan.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal 5MB.')
      return
    }

    setState('uploading')
    setProgress(0)

    // Simulasi progress (karena uploadGambarProduk tidak expose progress)
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 15, 90))
    }, 200)

    try {
      await onUpload(file)
      clearInterval(progressInterval)
      setProgress(100)
      setState('success')

      // Reset ke idle setelah animasi success
      successTimeoutRef.current = setTimeout(() => {
        setState('idle')
        setProgress(0)
        // Reset file input value agar bisa pilih file yang sama lagi
        if (fileInputRef.current) fileInputRef.current.value = ''
      }, 1500)
    } catch {
      clearInterval(progressInterval)
      setState('idle')
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
      // Error ditangani di parent component (alert/toast)
    }
  }

  const isUploading = state === 'uploading'
  const isSuccess = state === 'success'

  // Tooltip text berdasarkan state
  const tooltipText = isUploading
    ? `Mengunggah... ${progress}%`
    : isSuccess
    ? 'Berhasil diunggah!'
    : title
    ? title
    : currentImage
    ? 'Klik untuk ganti gambar'
    : 'Klik untuk upload gambar'

  return (
    <label
      className={`image-upload-btn-wrapper ${currentImage ? 'has-image' : ''} ${isUploading ? 'uploading' : ''} ${isSuccess ? 'success' : ''} ${disabled ? 'disabled' : ''}`}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="image-upload-btn-input"
        disabled={disabled || isUploading}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div
        className="image-upload-btn-content"
        aria-busy={isUploading}
      >
        {isUploading && (
          <>
            <div className="image-upload-spinner" aria-hidden="true">
              <LoaderIcon width="20" height="20" />
            </div>
            <span className="image-upload-progress-text">{progress}%</span>
          </>
        )}

        {isSuccess && (
          <div className="image-upload-success" aria-hidden="true">
            <CheckIcon width="24" height="24" />
          </div>
        )}

        {!isUploading && !isSuccess && (
          <>
            {currentImage ? (
              <img
                className="image-upload-thumb"
                src={currentImage}
                alt="Preview gambar produk"
                loading="lazy"
              />
            ) : (
              <>
                <UploadIcon width="28" height="28" className="image-upload-icon" />
                <span className="image-upload-label">Upload</span>
              </>
            )}
          </>
        )}

        {/* Overlay badge saat hover */}
        {!isUploading && !isSuccess && !disabled && (
          <span className="image-upload-overlay">
            {currentImage ? 'Ganti' : 'Tambah'}
          </span>
        )}
      </div>

      {/* Tooltip */}
      <div className="image-upload-tooltip">{tooltipText}</div>
    </label>
  )
}

export default ImageUploadButton