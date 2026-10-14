import { useCallback, useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import {
  getKategori,
  hapusKategori,
  simpanKategori,
  uploadGambarKategori,
} from '../../services/kategoriService'
import { assetUrl } from '../../services/api'
import ImageUpload from '../../components/ImageUpload'
import ImagePreviewModal from '../../components/ImagePreviewModal'

const KOSONG = { id: null, nama: '', slug: '' }

function KategoriAdminPage() {
  const [kategori, setKategori] = useState([])
  const [form, setForm] = useState(KOSONG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [gambarFile, setGambarFile] = useState(null)
  const [gambarLama, setGambarLama] = useState(null)
  const [previewSrc, setPreviewSrc] = useState(null)
  const [previewAlt, setPreviewAlt] = useState('')

  const muat = useCallback(() => {
    getKategori()
      .then((data) => {
        setKategori(data)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!form.nama.trim()) {
      setError('Nama kategori wajib diisi.')
      return
    }

    setSaving(true)
    try {
      const payload = { nama: form.nama.trim(), slug: form.slug.trim() || null }
      if (form.id) payload.id = form.id

      const saved = await simpanKategori(payload)
      const kategoriId = saved?.id || form.id

      if (gambarFile && kategoriId) {
        await uploadGambarKategori(kategoriId, gambarFile)
      }

      setMessage(form.id ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.')
      setForm(KOSONG)
      setGambarFile(null)
      setGambarLama(null)
      muat()
    } catch (err) {
      setError(err.message || 'Gagal menyimpan kategori.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setForm({ id: item.id, nama: item.nama, slug: item.slug || '' })
    setGambarLama(item.gambar)
    setGambarFile(null)
    setMessage('')
    setError('')
  }

  const handleHapus = async (item) => {
    const ok = window.confirm(`Hapus kategori "${item.nama}"?`)
    if (!ok) return

    try {
      await hapusKategori(item.id)
      setMessage(`Kategori "${item.nama}" dihapus.`)
      setError('')
      if (form.id === item.id) setForm(KOSONG)
      muat()
    } catch (err) {
      setError(err.message || 'Gagal menghapus kategori.')
    }
  }

  return (
    <AdminLayout title="Kelola Kategori">
      {message && (
        <div className="admin-alert admin-alert-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="admin-alert" role="alert">
          {error}
        </div>
      )}

      <div className="admin-two-col">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="display-font">{form.id ? 'Ubah Kategori' : 'Tambah Kategori'}</h2>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>Nama Kategori *</span>
              <input
                type="text"
                value={form.nama}
                onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                placeholder="Croissant"
              />
            </label>

            <label className="admin-field">
              <span>Slug (opsional)</span>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="croissant"
              />
            </label>

            <label className="admin-field">
              <span>{form.id ? 'Ganti Gambar' : 'Gambar Kategori'}</span>
              <ImageUpload
                value={gambarLama ? assetUrl(gambarLama) : null}
                onChange={(file) => setGambarFile(file)}
                onRemove={() => setGambarFile(null)}
                accept="image/*"
                maxSizeMB={5}
                previewSize={140}
              />
            </label>

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Tambah Kategori'}
              </button>
              {form.id && (
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() => {
                    setForm(KOSONG)
                    setGambarFile(null)
                    setGambarLama(null)
                  }}
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="display-font">Daftar Kategori</h2>
          </div>

          {loading ? (
            <p className="admin-empty">Memuat kategori...</p>
          ) : kategori.length === 0 ? (
            <p className="admin-empty">Belum ada kategori.</p>
          ) : (
            <ul className="admin-kategori-list">
              {kategori.map((item) => (
                <li key={item.id}>
                  <div className="admin-kategori-main">
                    {item.gambar ? (
                      <button
                        type="button"
                        className="admin-thumb-btn"
                        onClick={() => {
                          setPreviewSrc(item.gambar)
                          setPreviewAlt(item.nama)
                        }}
                        aria-label={`Lihat gambar ${item.nama}`}
                      >
                        <img
                          className="admin-category-thumbnail"
                          src={item.gambar}
                          alt={item.nama}
                        />
                      </button>
                    ) : (
                      <span
                        className="admin-category-thumbnail admin-category-thumbnail-empty"
                        aria-label="Tanpa gambar"
                      >
                        —
                      </span>
                    )}
                    <div>
                      <strong>{item.nama}</strong>
                      <small className="admin-sub">
                        {item.slug} · {item.jumlahProduk} produk
                      </small>
                    </div>
                  </div>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => handleEdit(item)}
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleHapus(item)}
                    >
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <ImagePreviewModal
        open={Boolean(previewSrc)}
        src={previewSrc}
        alt={previewAlt}
        onClose={() => setPreviewSrc(null)}
      />
    </AdminLayout>
  )
}

export default KategoriAdminPage
