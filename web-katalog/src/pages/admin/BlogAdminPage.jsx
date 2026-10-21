// src/pages/admin/BlogAdminPage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import AdminLayout from './AdminLayout'
import BlogEditor from './BlogEditor'
import {
  daftarArtikelAdmin,
  daftarKategoriBlog,
  hapusArtikelBlog,
  urlMediaBlog,
  errorBlog,
} from '../../services/blogService'

function tanggal(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function BlogAdminPage() {
  const [articles, setArticles] = useState([])
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(undefined) // undefined = list, null = buat baru
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [deleting, setDeleting] = useState(null)

  const reload = useCallback(async (page = 1) => {
    setBusy(true)
    setLoadError('')
    try {
      const [list, cat] = await Promise.all([daftarArtikelAdmin(page), daftarKategoriBlog()])
      setArticles(list.items)
      setPagination({ currentPage: list.currentPage, lastPage: list.lastPage, total: list.total })
      setCategories(cat)
    } catch (error) {
      setLoadError(errorBlog(error))
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => { void reload(1) }, [reload])

  const filtered = useMemo(() => articles.filter(post => {
    const search = query.toLowerCase().trim()
    const matchQuery = !search || [post.judul, post.slug, post.ringkasan].some(x => String(x || '').toLowerCase().includes(search))
    return matchQuery && (filter === 'all' || post.status === filter)
  }), [articles, query, filter])

  const remove = async (post) => {
    if (!window.confirm(`Hapus artikel “${post.judul}” beserta media dan komentarnya? Tindakan ini tidak bisa dibatalkan.`)) return
    setDeleting(post.id)
    setNotice('')
    try {
      await hapusArtikelBlog(post.id)
      setNotice('Artikel berhasil dihapus.')
      await reload(pagination.currentPage)
    } catch (error) {
      setLoadError(errorBlog(error))
    } finally {
      setDeleting(null)
    }
  }

  const finishEditor = async (message = '') => {
    setSelected(undefined)
    if (message) setNotice(message)
    await reload(pagination.currentPage)
  }

  return (
    <AdminLayout title={selected === undefined ? 'Manajemen Blog' : selected ? 'Edit Artikel' : 'Artikel Baru'}>
      <div className="kblog-admin">
        {selected !== undefined ? (
          <BlogEditor
            key={selected?.id ?? 'new'}
            article={selected}
            categories={categories}
            onClose={() => finishEditor()}
            onSaved={finishEditor}
            onCategoriesChange={setCategories}
          />
        ) : (
          <>
            <div className="kblog-heading">
              <div>
                <span className="kblog-eyebrow">KUKI CONTENT MANAGEMENT</span>
                <h2>Artikel & Cerita Kuki</h2>
                <p>Kelola artikel, dokumentasi foto, dan video untuk halaman Blog publik.</p>
              </div>
              <button className="admin-btn admin-btn-primary" type="button" onClick={() => { setSelected(null); setNotice('') }}>
                + Buat Artikel
              </button>
            </div>

            {loadError && <p className="kblog-alert kblog-alert-error" role="alert">{loadError}</p>}
            {notice && <p className="kblog-alert kblog-alert-success" role="status">{notice}</p>}

            <div className="kblog-stat-grid">
              <div className="kblog-stat"><span>Total artikel</span><strong>{pagination.total}</strong><small>Semua halaman</small></div>
              <div className="kblog-stat"><span>Draft pada halaman ini</span><strong>{articles.filter(p => p.status === 'draft').length}</strong><small>Belum dipublikasikan</small></div>
              <div className="kblog-stat"><span>Terbit pada halaman ini</span><strong>{articles.filter(p => p.status === 'published').length}</strong><small>Sudah dipublikasikan</small></div>
            </div>

            <section className="kblog-panel">
              <div className="kblog-toolbar">
                <label className="kblog-search">
                  <span className="kblog-sr-only">Cari artikel pada halaman ini</span>
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari judul, ringkasan, atau slug..." />
                </label>
                <select aria-label="Filter status" value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="all">Semua status</option>
                  <option value="published">Terbit</option>
                  <option value="draft">Draft</option>
                </select>
                <button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={() => reload(pagination.currentPage)}>↻ Muat Ulang</button>
              </div>

              {busy ? (
                <div className="kblog-empty" role="status">Memuat artikel...</div>
              ) : filtered.length === 0 ? (
                <div className="kblog-empty">
                  <strong>Belum ada artikel yang cocok.</strong>
                  <p>{articles.length ? 'Coba ubah kata pencarian atau filter.' : 'Buat artikel pertama untuk mulai mengisi Blog Kuki Bakehouse.'}</p>
                </div>
              ) : (
                <div className="kblog-table-wrap">
                  <table className="kblog-table">
                    <thead><tr><th>Artikel</th><th>Kategori</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr></thead>
                    <tbody>{filtered.map(post => (
                      <tr key={post.id}>
                        <td><div className="kblog-article-cell">
                          <div className="kblog-thumb">
                            {post.gambar_sampul_url || post.gambar_sampul ? <img src={urlMediaBlog(post.gambar_sampul_url || post.gambar_sampul)} alt="" loading="lazy" /> : <span>KB</span>}
                          </div>
                          <div><strong>{post.judul}</strong><small>/{post.slug}</small><small>{post.media?.length || 0} media</small></div>
                        </div></td>
                        <td>{post.kategori?.nama || 'Tanpa kategori'}</td>
                        <td><span className={`kblog-status kblog-status-${post.status === 'published' ? 'published' : 'draft'}`}>{post.status === 'published' ? 'Terbit' : 'Draft'}</span></td>
                        <td>{tanggal(post.published_at || post.created_at)}</td>
                        <td><div className="kblog-table-actions">
                          <button
                            type="button"
                            className="kblog-action-btn kblog-action-btn--edit"
                            onClick={() => setSelected(post)}
                            aria-label={`Edit artikel ${post.judul}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="kblog-action-btn kblog-action-btn--delete"
                            disabled={deleting === post.id}
                            onClick={() => remove(post)}
                            aria-label={`Hapus artikel ${post.judul}`}
                          >
                            {deleting === post.id ? 'Menghapus...' : 'Hapus'}
                          </button>
                        </div></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <div className="kblog-pagination">
                <span>Halaman {pagination.currentPage} dari {pagination.lastPage}</span>
                <div>
                  <button type="button" className="admin-btn admin-btn-ghost" disabled={busy || pagination.currentPage <= 1} onClick={() => reload(pagination.currentPage - 1)}>Sebelumnya</button>
                  <button type="button" className="admin-btn admin-btn-ghost" disabled={busy || pagination.currentPage >= pagination.lastPage} onClick={() => reload(pagination.currentPage + 1)}>Berikutnya</button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

export default BlogAdminPage
