import useAdminTranslation from '../../hooks/useAdminTranslation'
import { useCallback, useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import ImageUpload from '../../components/ImageUpload'
import { assetUrl } from '../../services/api'
import {
  deleteTestimonial,
  deleteTestimonialComment,
  deleteTestimonialPhoto,
  getAdminTestimonialComments,
  getAdminTestimonials,
  moderateTestimonial,
  moderateTestimonialComment,
  saveManualTestimonial,
  uploadTestimonialPhoto,
} from '../../services/testimonialService'

const EMPTY_FORM = {
  id: null,
  name: '',
  role: '',
  quote: '',
  status: 'pending',
}

function TestimonialAdminPage() {
  const { t } = useAdminTranslation()

  const [testimonials, setTestimonials] = useState([])
  const [comments, setComments] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedTestimonial, setSelectedTestimonial] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [commentStatus, setCommentStatus] = useState('pending')
  const [activeTab, setActiveTab] = useState('testimonials')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadTestimonials = useCallback(async () => {
    try {
      setTestimonials(await getAdminTestimonials())
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadComments = useCallback(async () => {
    try {
      setComments(await getAdminTestimonialComments(commentStatus))
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [commentStatus])

  useEffect(() => {
    let active = true
    const request = activeTab === 'testimonials'
      ? getAdminTestimonials()
      : getAdminTestimonialComments(commentStatus)

    request
      .then((data) => {
        if (active && activeTab === 'testimonials') {
          setTestimonials(data)
        } else if (active) {
          setComments(data)
        }
        if (active) setError('')
      })
      .catch((loadError) => {
        if (active) setError(loadError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeTab, commentStatus])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setSelectedTestimonial(null)
    setPhotoFile(null)
    setRemovePhoto(false)
  }

  const startEdit = (testimonial) => {
    setSelectedTestimonial(testimonial)
    setForm({
      id: testimonial.id,
      name: testimonial.name || '',
      role: testimonial.role || '',
      quote: testimonial.quote || '',
      status: testimonial.status,
    })
    setPhotoFile(null)
    setRemovePhoto(false)
    setMessage('')
    setError('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const saved = await saveManualTestimonial(form)
      const testimonialId = form.id || saved.id

      if (!form.id) {
        setForm((current) => ({ ...current, id: testimonialId }))
        setSelectedTestimonial(saved)
      }

      if (photoFile) {
        await uploadTestimonialPhoto(testimonialId, photoFile)
      } else if (removePhoto && testimonialId) {
        await deleteTestimonialPhoto(testimonialId)
      }

      if (form.id && selectedTestimonial?.status !== form.status) {
        await moderateTestimonial(testimonialId, form.status)
      }

      setMessage(form.id ?t("Testimonial berhasil diperbarui.") :t("Testimonial berhasil ditambahkan."))
      resetForm()
      await loadTestimonials()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSaving(false)
    }
  }

  const handleModerateTestimonial = async (testimonial, status) => {
    setError('')
    setMessage('')
    try {
      await moderateTestimonial(testimonial.id, status)
      setMessage(
        testimonial.source === 'customer' && status === 'published'
          ?t("Testimonial pelanggan diverifikasi dan dipublikasikan.")
          :t("Status testimonial berhasil diperbarui."),
      )
      await loadTestimonials()
    } catch (moderationError) {
      setError(moderationError.message)
    }
  }

  const handleDeleteTestimonial = async (testimonial) => {
    if (!window.confirm(t('Hapus testimonial dari "{nama}" beserta komentarnya?', { nama: testimonial.name }))) return

    setError('')
    setMessage('')
    try {
      await deleteTestimonial(testimonial.id)
      setMessage(t("Testimonial berhasil dihapus."))
      if (form.id === testimonial.id) resetForm()
      await loadTestimonials()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  const handleModerateComment = async (comment, status) => {
    setError('')
    setMessage('')
    try {
      await moderateTestimonialComment(comment.id, status)
      setMessage(t("Status komentar berhasil diperbarui."))
      await loadComments()
    } catch (moderationError) {
      setError(moderationError.message)
    }
  }

  const handleDeleteComment = async (comment) => {
    if (!window.confirm(t("Hapus komentar ini?"))) return

    setError('')
    setMessage('')
    try {
      await deleteTestimonialComment(comment.id)
      setMessage(t("Komentar berhasil dihapus."))
      await loadComments()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <AdminLayout title={t("Kelola Testimonial")}>
      {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}
      {error && <div className="admin-alert" role="alert">{error}</div>}

      <div className="admin-card-actions" role="tablist" aria-label={t("Kelola testimonial")}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'testimonials'}
          className={`admin-btn ${activeTab === 'testimonials' ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
          onClick={() => {
            setLoading(true)
            setActiveTab('testimonials')
          }}
        >
          {t("Testimonial")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'comments'}
          className={`admin-btn ${activeTab === 'comments' ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
          onClick={() => {
            setLoading(true)
            setActiveTab('comments')
          }}
        >
          {t("Moderasi Komentar")}
        </button>
      </div>

      {activeTab === 'testimonials' ? (
        <div className="admin-two-col">
          <section className="admin-card">
            <div className="admin-card-head">
              <h2 className="display-font">{form.id ?t("Ubah Testimonial") :t("Tambah Manual")}</h2>
            </div>
            <form className="admin-form" onSubmit={handleSave}>
              <label className="admin-field">
                <span>{t("Nama pelanggan *")}</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  maxLength={255}
                  required
                />
              </label>
              <label className="admin-field">
                <span>{t("Peran (opsional)")}</span>
                <input
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  maxLength={255}
                />
              </label>
              <label className="admin-field">
                <span>{t("Testimonial *")}</span>
                <textarea
                  value={form.quote}
                  onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
                  maxLength={5000}
                  rows={5}
                  required
                />
              </label>
              <label className="admin-field">
                <span>{t("Status publikasi")}</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="pending">{t("Menunggu")}</option>
                  <option value="published">{t("Publikasikan")}</option>
                  {form.id && <option value="rejected">{t("Ditolak")}</option>}
                </select>
              </label>
              <label className="admin-field">
                <span>{t("Foto (opsional)")}</span>
                {!removePhoto && selectedTestimonial?.photo_path && !photoFile && (
                  <div className="admin-form-preview">
                    <img src={assetUrl(selectedTestimonial.photo_path)} alt={`Foto ${form.name || 'testimonial'}`} />
                    <span>{t("Foto saat ini")}</span>
                  </div>
                )}
                <ImageUpload
                  key={`${form.id || 'new'}-${removePhoto ? 'removed' : 'photo'}`}
                  onChange={(file) => {
                    setPhotoFile(file)
                    if (file) setRemovePhoto(false)
                  }}
                  onRemove={() => setPhotoFile(null)}
                  accept="image/jpeg,image/png,image/webp"
                  maxSizeMB={5}
                  previewSize={120}
                />
                {selectedTestimonial?.photo_path && !removePhoto && !photoFile && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => setRemovePhoto(true)}
                  >
                    {t("Hapus foto saat ini")}
                  </button>
                )}
              </label>
              <p className="admin-sub">
                {selectedTestimonial?.source === 'customer'
                  ?t("Kiriman pelanggan; publikasi akan memverifikasi sumber kiriman.")
                  :t("Entri ini dicatat sebagai testimonial yang dimasukkan Admin, bukan kiriman pelanggan terverifikasi.")}
              </p>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ?t("Menyimpan...") : form.id ?t("Simpan Perubahan") :t("Tambah Testimonial")}
                </button>
                {form.id && (
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={resetForm}>
                    {t("Batal")}
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2 className="display-font">{t("Semua Testimonial")}</h2>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={loadTestimonials}>
                {t("Muat ulang")}
              </button>
            </div>
            {loading ? (
              <p className="admin-empty">{t("Memuat testimonial...")}</p>
            ) : testimonials.length === 0 ? (
              <p className="admin-empty">{t("Belum ada testimonial.")}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("Nama")}</th>
                      <th>{t("Sumber")}</th>
                      <th>{t("Status")}</th>
                      <th>{t("Komentar")}</th>
                      <th>{t("Aksi")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testimonials.map((testimonial) => (
                      <tr key={testimonial.id}>
                        <td>
                          <strong>{testimonial.name}</strong>
                          <small className="admin-sub">{testimonial.quote}</small>
                        </td>
                        <td>
                          <span className="admin-badge">
                            {testimonial.source === 'customer' ? t("Pelanggan") :t("Manual Admin")}
                          </span>
                          {testimonial.isVerified && <small className="admin-sub">{t("Terverifikasi")}</small>}
                        </td>
                        <td><span className={`admin-badge ${testimonial.status !== 'published' ? 'warn' : ''}`}>{testimonial.status}</span></td>
                        <td>{testimonial.comments_count ?? testimonial.commentCount}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => startEdit(testimonial)}>
                              {t("Ubah")}
                            </button>
                            {testimonial.status !== 'published' && (
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary"
                                onClick={() => handleModerateTestimonial(testimonial, 'published')}
                              >
                                {testimonial.source === 'customer' ?t("Verifikasi & publikasikan") :t("Publikasikan")}
                              </button>
                            )}
                            {testimonial.status !== 'rejected' && (
                              <button
                                type="button"
                                className="admin-btn admin-btn-danger"
                                onClick={() => handleModerateTestimonial(testimonial, 'rejected')}
                              >
                                {t("Tolak")}
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              onClick={() => handleDeleteTestimonial(testimonial)}
                            >
                              {t("Hapus")}
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
        </div>
      ) : (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="display-font">{t("Komentar Testimonial")}</h2>
            <label className="admin-field">
              <span>{t("Filter status")}</span>
              <select
                value={commentStatus}
                onChange={(event) => {
                  setLoading(true)
                  setCommentStatus(event.target.value)
                }}
              >
                <option value="pending">{t("Menunggu")}</option>
                <option value="approved">{t("Disetujui")}</option>
                <option value="rejected">{t("Ditolak")}</option>
                <option value="">{t("Semua")}</option>
              </select>
            </label>
          </div>
          {loading ? (
            <p className="admin-empty">{t("Memuat komentar...")}</p>
          ) : comments.length === 0 ? (
            <p className="admin-empty">{t("Tidak ada komentar untuk filter ini.")}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("Testimonial")}</th>
                    <th>{t("Pengirim")}</th>
                    <th>{t("Komentar")}</th>
                    <th>{t("Status")}</th>
                    <th>{t("Aksi")}</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((comment) => (
                    <tr key={comment.id}>
                      <td>{comment.testimonial?.name ||t("Testimonial dihapus")}</td>
                      <td>{comment.name}</td>
                      <td>{comment.comment}</td>
                      <td><span className={`admin-badge ${comment.status !== 'approved' ? 'warn' : ''}`}>{comment.status}</span></td>
                      <td>
                        <div className="admin-row-actions">
                          {comment.status !== 'approved' && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary"
                              onClick={() => handleModerateComment(comment, 'approved')}
                            >
                              {t("Setujui")}
                            </button>
                          )}
                          {comment.status !== 'rejected' && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              onClick={() => handleModerateComment(comment, 'rejected')}
                            >
                              {t("Tolak")}
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() => handleDeleteComment(comment)}
                          >
                            {t("Hapus")}
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
      )}
    </AdminLayout>
  )
}

export default TestimonialAdminPage
