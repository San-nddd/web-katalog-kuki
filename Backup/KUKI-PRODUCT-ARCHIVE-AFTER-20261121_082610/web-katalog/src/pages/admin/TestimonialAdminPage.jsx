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

      setMessage(form.id ?"Testimonial berhasil diperbarui." :"Testimonial berhasil ditambahkan.")
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
          ?"Testimonial pelanggan diverifikasi dan dipublikasikan."
          :"Status testimonial berhasil diperbarui.",
      )
      await loadTestimonials()
    } catch (moderationError) {
      setError(moderationError.message)
    }
  }

  const handleDeleteTestimonial = async (testimonial) => {
    if (!window.confirm(("Hapus testimonial dari \"" + testimonial.name + "\" beserta komentarnya?"))) return

    setError('')
    setMessage('')
    try {
      await deleteTestimonial(testimonial.id)
      setMessage("Testimonial berhasil dihapus.")
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
      setMessage("Status komentar berhasil diperbarui.")
      await loadComments()
    } catch (moderationError) {
      setError(moderationError.message)
    }
  }

  const handleDeleteComment = async (comment) => {
    if (!window.confirm("Hapus komentar ini?")) return

    setError('')
    setMessage('')
    try {
      await deleteTestimonialComment(comment.id)
      setMessage("Komentar berhasil dihapus.")
      await loadComments()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <AdminLayout title={"Kelola Testimonial"}>
      {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}
      {error && <div className="admin-alert" role="alert">{error}</div>}

      <div className="admin-card-actions" role="tablist" aria-label={"Kelola testimonial"}>
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
          {"Testimonial"}
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
          {"Moderasi Komentar"}
        </button>
      </div>

      {activeTab === 'testimonials' ? (
        <div className="admin-two-col">
          <section className="admin-card">
            <div className="admin-card-head">
              <h2 className="display-font">{form.id ?"Ubah Testimonial" :"Tambah Manual"}</h2>
            </div>
            <form className="admin-form" onSubmit={handleSave}>
              <label className="admin-field">
                <span>{"Nama pelanggan *"}</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  maxLength={255}
                  required
                />
              </label>
              <label className="admin-field">
                <span>{"Peran (opsional)"}</span>
                <input
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                  maxLength={255}
                />
              </label>
              <label className="admin-field">
                <span>{"Testimonial *"}</span>
                <textarea
                  value={form.quote}
                  onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
                  maxLength={5000}
                  rows={5}
                  required
                />
              </label>
              <label className="admin-field">
                <span>{"Status publikasi"}</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="pending">{"Menunggu"}</option>
                  <option value="published">{"Publikasikan"}</option>
                  {form.id && <option value="rejected">{"Ditolak"}</option>}
                </select>
              </label>
              <label className="admin-field">
                <span>{"Foto (opsional)"}</span>
                {!removePhoto && selectedTestimonial?.photo_path && !photoFile && (
                  <div className="admin-form-preview">
                    <img src={assetUrl(selectedTestimonial.photo_path)} alt={`Foto ${form.name || 'testimonial'}`} />
                    <span>{"Foto saat ini"}</span>
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
                    {"Hapus foto saat ini"}
                  </button>
                )}
              </label>
              <p className="admin-sub">
                {selectedTestimonial?.source === 'customer'
                  ?"Kiriman pelanggan; publikasi akan memverifikasi sumber kiriman."
                  :"Entri ini dicatat sebagai testimonial yang dimasukkan Admin, bukan kiriman pelanggan terverifikasi."}
              </p>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ?"Menyimpan..." : form.id ?"Simpan Perubahan" :"Tambah Testimonial"}
                </button>
                {form.id && (
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={resetForm}>
                    {"Batal"}
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2 className="display-font">{"Semua Testimonial"}</h2>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={loadTestimonials}>
                {"Muat ulang"}
              </button>
            </div>
            {loading ? (
              <p className="admin-empty">{"Memuat testimonial..."}</p>
            ) : testimonials.length === 0 ? (
              <p className="admin-empty">{"Belum ada testimonial."}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{"Nama"}</th>
                      <th>{"Sumber"}</th>
                      <th>{"Status"}</th>
                      <th>{"Komentar"}</th>
                      <th>{"Aksi"}</th>
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
                            {testimonial.source === 'customer' ? "Pelanggan" :"Manual Admin"}
                          </span>
                          {testimonial.isVerified && <small className="admin-sub">{"Terverifikasi"}</small>}
                        </td>
                        <td><span className={`admin-badge ${testimonial.status !== 'published' ? 'warn' : ''}`}>{testimonial.status}</span></td>
                        <td>{testimonial.comments_count ?? testimonial.commentCount}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => startEdit(testimonial)}>
                              {"Ubah"}
                            </button>
                            {testimonial.status !== 'published' && (
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary"
                                onClick={() => handleModerateTestimonial(testimonial, 'published')}
                              >
                                {testimonial.source === 'customer' ?"Verifikasi & publikasikan" :"Publikasikan"}
                              </button>
                            )}
                            {testimonial.status !== 'rejected' && (
                              <button
                                type="button"
                                className="admin-btn admin-btn-danger"
                                onClick={() => handleModerateTestimonial(testimonial, 'rejected')}
                              >
                                {"Tolak"}
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              onClick={() => handleDeleteTestimonial(testimonial)}
                            >
                              {"Hapus"}
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
            <h2 className="display-font">{"Komentar Testimonial"}</h2>
            <label className="admin-field">
              <span>{"Filter status"}</span>
              <select
                value={commentStatus}
                onChange={(event) => {
                  setLoading(true)
                  setCommentStatus(event.target.value)
                }}
              >
                <option value="pending">{"Menunggu"}</option>
                <option value="approved">{"Disetujui"}</option>
                <option value="rejected">{"Ditolak"}</option>
                <option value="">{"Semua"}</option>
              </select>
            </label>
          </div>
          {loading ? (
            <p className="admin-empty">{"Memuat komentar..."}</p>
          ) : comments.length === 0 ? (
            <p className="admin-empty">{"Tidak ada komentar untuk filter ini."}</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{"Testimonial"}</th>
                    <th>{"Pengirim"}</th>
                    <th>{"Komentar"}</th>
                    <th>{"Status"}</th>
                    <th>{"Aksi"}</th>
                  </tr>
                </thead>
                <tbody>
                  {comments.map((comment) => (
                    <tr key={comment.id}>
                      <td>{comment.testimonial?.name ||"Testimonial dihapus"}</td>
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
                              {"Setujui"}
                            </button>
                          )}
                          {comment.status !== 'rejected' && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              onClick={() => handleModerateComment(comment, 'rejected')}
                            >
                              {"Tolak"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() => handleDeleteComment(comment)}
                          >
                            {"Hapus"}
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
