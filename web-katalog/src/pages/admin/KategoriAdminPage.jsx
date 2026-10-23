import useAdminTranslation from '../../hooks/useAdminTranslation'
import { useCallback, useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import {
  getKategori,
  hapusKategori,
  simpanKategori,
  uploadGambarKategori,
} from '../../services/kategoriService'
import { assetUrl } from '../../services/api'
import ImageUploadEditor from '../../components/ImageUploadEditor/ImageUploadEditor'
import ImagePreviewModal from '../../components/ImagePreviewModal'

const KOSONG = { id: null, nama: '', slug: '' }

function KategoriAdminPage() {
  const { t } = useAdminTranslation()

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
      setError(t("Nama kategori wajib diisi."))
      return
    }

    setSaving(true)
    try {
      const payload = { nama: form.nama.trim(), slug: form.slug.trim() || null }
      if (form.id) payload.id = form.id

      const saved = await simpanKategori(payload)
      const kategoriId = saved?.id || form.id

      if (!kategoriId) {
        throw new Error(t("Kategori sudah dikirim, tetapi respons API tidak mengembalikan ID kategori."))
      }

      // Jika upload gambar gagal, klik Simpan lagi harus mengubah kategori yang
      // sudah dibuat, bukan membuat kategori duplikat.
      if (!form.id) setForm((prev) => ({ ...prev, id: kategoriId }))

      if (gambarFile) {
        await uploadGambarKategori(kategoriId, gambarFile)
      }

      setMessage(form.id ?t("Kategori berhasil diperbarui.") :t("Kategori berhasil ditambahkan."))
      setForm(KOSONG)
      setGambarFile(null)
      setGambarLama(null)
      muat()
    } catch (err) {
      setError(err.message ||t("Gagal menyimpan kategori."))
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
    const ok = window.confirm(t('Hapus kategori "{nama}"?', { nama: item.nama }))
    if (!ok) return

    try {
      await hapusKategori(item.id)
      setMessage(t('Kategori "{nama}" dihapus.', { nama: item.nama }))
      setError('')
      if (form.id === item.id) {
        setForm(KOSONG)
        setGambarFile(null)
        setGambarLama(null)
      }
      muat()
    } catch (err) {
      setError(err.message ||t("Gagal menghapus kategori."))
    }
  }

  return (
    <AdminLayout title={t("Kelola Kategori")}>
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
            <h2 className="display-font">{form.id ?t("Ubah Kategori") :t("Tambah Kategori")}</h2>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>{t("Nama Kategori *")}</span>
              <input
                type="text"
                value={form.nama}
                onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                placeholder={t("Croissant")}
              />
            </label>

            <label className="admin-field">
              <span>{t("Slug (opsional)")}</span>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder={t("croissant")}
              />
            </label>

            <div className="admin-field">
              <ImageUploadEditor
                key={form.id ? `kategori-${form.id}` : 'kategori-baru'}
                label={form.id ?t("Ganti Gambar") :t("Gambar Kategori")}
                initialUrl={gambarLama ? assetUrl(gambarLama) : ''}
                defaultRatio="1:1"
                maxFileMB={10}
                onChange={setGambarFile}
              />
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ?t("Menyimpan...") : form.id ?t("Simpan Perubahan") :t("Tambah Kategori")}
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
                  {t("Batal")}
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="display-font">{t("Daftar Kategori")}</h2>
          </div>

          {loading ? (
            <p className="admin-empty">{t("Memuat kategori...")}</p>
          ) : kategori.length === 0 ? (
            <p className="admin-empty">{t("Belum ada kategori.")}</p>
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
                        aria-label={t("Tanpa gambar")}
                      >
                        —
                      </span>
                    )}
                    <div>
                      <strong>{item.nama}</strong>
                      <small className="admin-sub">
                        {item.slug} · {item.jumlahProduk} {t("produk")}
                      </small>
                    </div>
                  </div>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      onClick={() => handleEdit(item)}
                    >
                      {t("Ubah")}
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleHapus(item)}
                    >
                      {t("Hapus")}
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
