import { useCallback, useEffect, useRef, useState } from 'react'
import AdminLayout from './AdminLayout'
import ImageUploadEditor from '../../components/ImageUploadEditor/ImageUploadEditor'
import ImagePreviewModal from '../../components/ImagePreviewModal'
import {
  aturPublikasiBaker,
  aturUrutanBaker,
  getAdminBakers,
  hapusBaker,
  hapusFotoBaker,
  mapAdminBaker,
  simpanBaker,
  uploadFotoBaker,
} from '../../services/bakerService'

const EMPTY_FORM = {
  id: null,
  nama: '',
  spesialisasi: '',
  urutan: 0,
  aktif: true,
}

function BakerAdminPage() {
  const [bakers, setBakers] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [selected, setSelected] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [previewFileUrl, setPreviewFileUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewSrc, setPreviewSrc] = useState(null)
  const [previewAlt, setPreviewAlt] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const previewUrlRef = useRef('')

  const releasePreviewUrl = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = ''
    }
  }

  const updatePhotoFile = (file) => {
    releasePreviewUrl()
    if (file) {
      previewUrlRef.current = URL.createObjectURL(file)
      setPreviewFileUrl(previewUrlRef.current)
    } else {
      setPreviewFileUrl('')
    }
    setPhotoFile(file)
  }

  const load = useCallback(async () => {
    try {
      setBakers(await getAdminBakers())
      setError('')
    } catch (loadError) {
      setError(loadError.message || 'Gagal memuat data bakers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    getAdminBakers()
      .then((data) => {
        if (!active) return
        setBakers(data)
        setError('')
      })
      .catch((loadError) => {
        if (active) setError(loadError.message || 'Gagal memuat data bakers.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  useEffect(() => {
    if (!confirmDelete) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setConfirmDelete(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [confirmDelete])

  const resetForm = () => {
    releasePreviewUrl()
    setPreviewFileUrl('')
    setForm(EMPTY_FORM)
    setSelected(null)
    setPhotoFile(null)
    setRemovePhoto(false)
  }

  const startEdit = (item) => {
    setForm({
      id: item.id,
      nama: item.nama,
      spesialisasi: item.spesialisasi,
      urutan: item.urutan,
      aktif: item.aktif,
    })
    setSelected(item)
    releasePreviewUrl()
    setPreviewFileUrl('')
    setPhotoFile(null)
    setRemovePhoto(false)
    setMessage('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!form.nama.trim() || !form.spesialisasi.trim()) {
      setError('Nama baker dan spesialisasi wajib diisi.')
      return
    }

    setSaving(true)
    try {
      const created = !form.id
      const saved = await simpanBaker(form)
      const bakerId = form.id || saved?.id

      if (!bakerId) {
        throw new Error('Baker tersimpan, tetapi API tidak mengembalikan ID.')
      }

      if (created) setForm((current) => ({ ...current, id: bakerId }))

      if (photoFile) {
        const uploaded = await uploadFotoBaker(bakerId, photoFile)
        setSelected(mapAdminBaker(uploaded.data))
      } else if (removePhoto) {
        const removed = await hapusFotoBaker(bakerId)
        setSelected(mapAdminBaker(removed.data))
      } else if (created) {
        setSelected(mapAdminBaker(saved))
      }

      setMessage(created ? 'Baker berhasil ditambahkan.' : 'Baker berhasil diperbarui.')
      resetForm()
      await load()
    } catch (saveError) {
      setError(saveError.message || 'Gagal menyimpan baker.')
    } finally {
      setSaving(false)
    }
  }

  const handlePublikasi = async (item) => {
    const nextStatus = !item.aktif
    setMessage('')
    setError('')
    try {
      await aturPublikasiBaker(item.id, nextStatus)
      setMessage(nextStatus ? `${item.nama} dipublikasikan.` : `${item.nama} ditarik dari publikasi.`)
      if (form.id === item.id) setForm((current) => ({ ...current, aktif: nextStatus }))
      if (selected?.id === item.id) setSelected((current) => ({ ...current, aktif: nextStatus }))
      await load()
    } catch (publicationError) {
      setError(publicationError.message || 'Gagal mengubah status publikasi.')
    }
  }

  const pindahUrutan = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= bakers.length) return

    const next = [...bakers]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)

    setMessage('')
    setError('')
    setSaving(true)
    try {
      await aturUrutanBaker(next.map((baker) => baker.id))
      setMessage('Urutan tampilan bakers berhasil diperbarui.')
      await load()
    } catch (reorderError) {
      setError(reorderError.message || 'Gagal mengubah urutan bakers.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    setMessage('')
    setError('')
    setSaving(true)
    try {
      await hapusBaker(item.id)
      setMessage(`${item.nama} berhasil dihapus.`)
      if (form.id === item.id) resetForm()
      await load()
    } catch (deleteError) {
      setError(deleteError.message || 'Gagal menghapus baker.')
    } finally {
      setSaving(false)
      setConfirmDelete(null)
    }
  }

  const previewPhoto = photoFile
    ? previewFileUrl
    : removePhoto
      ? ''
      : selected?.fotoUrl || ''

  return (
    <AdminLayout title="Kelola Bakers">
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
            <h2 className="display-font">{form.id ? 'Ubah Baker' : 'Tambah Baker'}</h2>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>Nama baker *</span>
              <input
                type="text"
                value={form.nama}
                maxLength={255}
                required
                onChange={(event) => setForm((current) => ({ ...current, nama: event.target.value }))}
                placeholder="Raka Wijaya"
              />
            </label>

            <label className="admin-field">
              <span>Spesialisasi *</span>
              <input
                type="text"
                value={form.spesialisasi}
                maxLength={255}
                required
                onChange={(event) => setForm((current) => ({ ...current, spesialisasi: event.target.value }))}
                placeholder="Head Pastry Chef"
              />
            </label>

            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Urutan tampilan</span>
                <input
                  type="number"
                  min="0"
                  max="65535"
                  value={form.urutan}
                  onChange={(event) => setForm((current) => ({ ...current, urutan: event.target.value }))}
                />
              </label>

              <label className="admin-field">
                <span>Status publikasi</span>
                <select
                  value={form.aktif ? 'published' : 'hidden'}
                  onChange={(event) => setForm((current) => ({ ...current, aktif: event.target.value === 'published' }))}
                >
                  <option value="published">Dipublikasikan</option>
                  <option value="hidden">Disembunyikan</option>
                </select>
              </label>
            </div>

            <div className="admin-field">
              <ImageUploadEditor
                key={`baker-${form.id || 'baru'}-${removePhoto ? 'tanpa-foto' : 'foto'}`}
                label={form.id ? 'Ganti Foto' : 'Foto Baker'}
                initialUrl={selected?.fotoUrl && !removePhoto ? selected.fotoUrl : ''}
                defaultRatio="3:4"
                maxFileMB={5}
                onChange={(file) => {
                  updatePhotoFile(file)
                  if (file) setRemovePhoto(false)
                }}
                onRemove={() => updatePhotoFile(null)}
              />
              {selected?.fotoUrl && !removePhoto && !photoFile && (
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  onClick={() => setRemovePhoto(true)}
                >
                  Hapus foto saat ini
                </button>
              )}
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : form.id ? 'Simpan Perubahan' : 'Tambah Baker'}
              </button>
              {form.id && (
                <button type="button" className="admin-btn admin-btn-ghost" onClick={resetForm}>
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="display-font">Pratinjau Konten</h2>
          </div>
          <div className="admin-baker-preview">
            <div className="baker-card">
              <h3 className="baker-name">{form.nama || 'Nama Baker'}</h3>
              <span className="baker-role">{form.spesialisasi || 'Spesialisasi'}</span>
              {previewPhoto ? (
                <img className="baker-photo" src={previewPhoto} alt={`Foto ${form.nama || 'baker'}`} />
              ) : (
                <div className="baker-photo" aria-hidden="true"></div>
              )}
            </div>
            <span className="admin-sub">
              Pratinjau kartu publik · {form.aktif ? 'Dipublikasikan' : 'Disembunyikan'}
            </span>
          </div>
        </section>
      </div>

      <section className="admin-card admin-card-spaced">
        <div className="admin-card-head">
          <h2 className="display-font">Daftar Bakers</h2>
        </div>

        {loading ? (
          <p className="admin-empty">Memuat bakers...</p>
        ) : bakers.length === 0 ? (
          <p className="admin-empty">Belum ada baker. Tambahkan konten pertama melalui form di atas.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Urutan</th>
                  <th>Baker</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {bakers.map((item, index) => (
                  <tr key={item.id}>
                    <td>
                      <span className="admin-badge">{item.urutan}</span>
                    </td>
                    <td>
                      <div className="admin-baker-row">
                        {item.fotoUrl ? (
                          <button
                            type="button"
                            className="admin-thumb-btn"
                            onClick={() => {
                              setPreviewSrc(item.fotoUrl)
                              setPreviewAlt(item.nama)
                            }}
                            aria-label={`Lihat foto ${item.nama}`}
                          >
                            <img className="admin-thumb" src={item.fotoUrl} alt={item.nama} />
                          </button>
                        ) : (
                          <span className="admin-thumb admin-thumb-empty" aria-label="Tanpa foto">
                            —
                          </span>
                        )}
                        <div>
                          <strong>{item.nama}</strong>
                          <span className="admin-sub">{item.spesialisasi}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge ${item.aktif ? '' : 'warn'}`}>
                        {item.aktif ? 'Publik' : 'Tersembunyi'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost"
                          disabled={saving}
                          onClick={() => pindahUrutan(index, -1)}
                        >
                          Naik
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost"
                          disabled={saving}
                          onClick={() => pindahUrutan(index, 1)}
                        >
                          Turun
                        </button>
                        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => startEdit(item)}>
                          Ubah
                        </button>
                        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => handlePublikasi(item)}>
                          {item.aktif ? 'Tarik' : 'Publikasikan'}
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => setConfirmDelete(item)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ImagePreviewModal
        open={Boolean(previewSrc)}
        src={previewSrc}
        alt={previewAlt}
        onClose={() => setPreviewSrc(null)}
      />

      {confirmDelete && (
        <div
          className="admin-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmDelete(null)
          }}
        >
          <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="baker-delete-title">
            <h2 id="baker-delete-title" className="display-font">Hapus baker?</h2>
            <p>
              {`${confirmDelete.nama} akan dihapus beserta fotonya. Tindakan ini tidak dapat dibatalkan.`}
            </p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setConfirmDelete(null)}>
                Batal
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={saving}
                onClick={() => handleDelete(confirmDelete)}
              >
                {saving ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default BakerAdminPage
