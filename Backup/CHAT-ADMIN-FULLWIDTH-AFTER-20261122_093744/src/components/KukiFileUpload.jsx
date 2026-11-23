import { useId, useState } from 'react'

/**
 * Upload modern untuk form baru. Event onChange tetap event input biasa,
 * sehingga handler lama e.target.files masih bisa dipakai.
 */
export default function KukiFileUpload({
  label = 'Pilih Foto',
  hint = 'JPG, PNG, WebP',
  accept = 'image/jpeg,image/png,image/webp',
  multiple = false,
  disabled = false,
  onChange,
  className = '',
  ...props
}) {
  const id = useId()
  const [selected, setSelected] = useState('Belum ada file dipilih')

  const handleChange = (event) => {
    const files = Array.from(event.target.files || [])
    setSelected(
      files.length === 0
        ? 'Belum ada file dipilih'
        : files.length === 1
          ? files[0].name
          : `${files.length} file dipilih`,
    )
    onChange?.(event)
  }

  return (
    <div className={`kuki-file-upload ${className}`}>
      <label className={`kuki-file-upload__button${disabled ? ' is-disabled' : ''}`} htmlFor={id}>
        <span aria-hidden="true" className="kuki-file-upload__icon">↑</span>
        <span className="kuki-file-upload__copy">
          <strong>{label}</strong>
          <small>{hint}</small>
        </span>
      </label>
      <input
        id={id}
        className="kuki-file-upload-hidden"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleChange}
        {...props}
      />
      <small className="kuki-file-upload__filename" aria-live="polite">{selected}</small>
    </div>
  )
}
