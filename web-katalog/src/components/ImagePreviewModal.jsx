import { useEffect } from 'react'
import { XIcon } from './icons'
import './ImageUpload.css'

function ImagePreviewModal({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return

    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !src) return null

  return (
    <div
      className="image-lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pratinjau gambar produk"
    >
      <button type="button" className="image-lightbox-close" onClick={onClose} aria-label="Tutup">
        <XIcon width="24" height="24" />
      </button>
      <img src={src} alt={alt || 'Pratinjau gambar produk'} />
    </div>
  )
}

export default ImagePreviewModal
