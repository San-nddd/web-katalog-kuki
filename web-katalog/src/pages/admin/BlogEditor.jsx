// src/pages/admin/BlogEditor.jsx
import { useRef, useState } from 'react'
import {
  buatArtikelBlog,
  perbaruiArtikelBlog,
  unggahSampulArtikel,
  unggahMediaArtikel,
  hapusMediaArtikel,
  buatKategoriBlog,
  daftarKategoriBlog,
  urlMediaBlog,
  errorBlog,
} from '../../services/blogService'

const MAX_IMAGE = 5 * 1024 * 1024
const MAX_VIDEO = 50 * 1024 * 1024
const MAX_MEDIA = 20
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

function idBaru() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function jenisFile(file) {
  if (IMAGE_TYPES.has(file.type)) return 'foto'
  if (VIDEO_TYPES.has(file.type)) return 'video'
  return null
}

function bytes(size) {
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function BlogEditor({ article, categories, onCategoriesChange, onClose, onSaved }) {
  const [savedPost, setSavedPost] = useState(article)
  const [form, setForm] = useState({
    judul: article?.judul ?? '',
    ringkasan: article?.ringkasan ?? '',
    konten: article?.konten ?? '',
    blog_category_id: article?.blog_category_id ? String(article.blog_category_id) : '',
  })
  const [cover, setCover] = useState(article?.gambar_sampul_url || article?.gambar_sampul || '')
  const [coverFile, setCoverFile] = useState(null)
  const [media, setMedia] = useState(Array.isArray(article?.media) ? article.media : [])
  const [pendingMedia, setPendingMedia] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [working, setWorking] = useState(false)
  const [phase, setPhase] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const coverRef = useRef(null)
  const mediaRef = useRef(null)

  const update = (name, value) => setForm(prev => ({ ...prev, [name]: value }))

  const selectCover = e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE) {
      setError('Sampul harus JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.')
      e.target.value = ''
      return
    }
    setCoverFile(file)
    setError('')
  }

  const selectMedia = e => {
    const files = Array.from(e.target.files || [])
    const remaining = MAX_MEDIA - media.length - pendingMedia.length
    if (files.length > remaining) {
      setError(`Maksimal ${MAX_MEDIA} foto/video per artikel. Slot tersedia: ${Math.max(0, remaining)}.`)
      e.target.value = ''
      return
    }
    const invalid = files.find(f => {
      const type = jenisFile(f)
      return !type || (type === 'foto' && f.size > MAX_IMAGE) || (type === 'video' && f.size > MAX_VIDEO)
    })
    if (invalid) {
      setError(`File ${invalid.name} tidak didukung atau melebihi batas (foto 5 MB, video 50 MB).`)
      e.target.value = ''
      return
    }
    setPendingMedia(prev => [...prev, ...files.map(file => ({ id: idBaru(), file, caption: '' }))])
    setError('')
    e.target.value = ''
  }

  const addCategory = async () => {
    const nama = newCategory.trim()
    if (!nama || creatingCategory) return
    setCreatingCategory(true)
    setError('')
    try {
      const created = await buatKategoriBlog(nama)
      const updated = await daftarKategoriBlog()
      onCategoriesChange(updated)
      if (created?.id) update('blog_category_id', String(created.id))
      setNewCategory('')
      setInfo('Kategori blog berhasil dibuat.')
    } catch (e) {
      setError(errorBlog(e))
    } finally {
      setCreatingCategory(false)
    }
  }

  const save = async (targetStatus) => {
    if (working) return
    if (!form.judul.trim()) {
      setError('Judul artikel wajib diisi.')
      return
    }
    const hasText = Boolean(form.konten.trim())
    const hasMedia = Boolean(cover || coverFile || media.length || pendingMedia.length)
    if (targetStatus === 'published' && !hasText && !hasMedia) {
      setError('Untuk menerbitkan artikel, isi teks atau unggah foto/video terlebih dahulu.')
      return
    }

    setWorking(true)
    setError('')
    setInfo('')

    const payload = {
      judul: form.judul.trim(),
      ringkasan: form.ringkasan.trim() || null,
      konten: form.konten.trim() || null,
      blog_category_id: form.blog_category_id ? Number(form.blog_category_id) : null,
    }
    let saved = savedPost
    try {
      setPhase('Menyimpan artikel...')
      if (!savedPost?.id) {
        // Backend membuat draft dahulu agar ada ID untuk upload file.
        saved = await buatArtikelBlog({ ...payload, status: 'draft' })
      } else {
        // Artikel sudah terbit tetap terbit ketika sekadar mengedit media.
        const initialStatus = savedPost.status === 'published' && targetStatus === 'published'
          ? 'published'
          : 'draft'
        saved = await perbaruiArtikelBlog(savedPost.id, { ...payload, status: initialStatus })
      }

      if (saved?.id) setSavedPost(saved)
      if (!saved?.id) throw new Error('Server tidak mengembalikan ID artikel. Periksa respons API.')

      if (coverFile) {
        setPhase('Mengunggah sampul...')
        const newPost = await unggahSampulArtikel(saved.id, coverFile)
        if (newPost?.gambar_sampul_url || newPost?.gambar_sampul) {
          setCover(newPost.gambar_sampul_url || newPost.gambar_sampul)
        }
        setCoverFile(null)
        if (coverRef.current) coverRef.current.value = ''
      }

      const uploadQueue = [...pendingMedia]
      for (let i = 0; i < uploadQueue.length; i += 1) {
        const entry = uploadQueue[i]
        setPhase(`Mengunggah media ${i + 1} dari ${uploadQueue.length}...`)
        const uploaded = await unggahMediaArtikel(saved.id, entry.file, entry.caption)
        if (uploaded) setMedia(prev => [...prev, uploaded])
        // File yang berhasil diunggah langsung dihapus dari antrian untuk menghindari duplikasi bila ada error.
        setPendingMedia(prev => prev.filter(item => item.id !== entry.id))
      }
      if (mediaRef.current) mediaRef.current.value = ''

      if (targetStatus === 'published') {
        setPhase('Menerbitkan artikel...')
        saved = await perbaruiArtikelBlog(saved.id, { status: 'published' })
      }

      setPhase('Selesai')
      onSaved(targetStatus === 'published' ? 'Artikel berhasil diterbitkan.' : 'Artikel tersimpan sebagai draft.')
    } catch (e) {
      setError(`${errorBlog(e)}${saved?.id && !article?.id ? ' Draft sudah dibuat. Kamu bisa mencoba unggah ulang atau kembali ke daftar.' : ''}`)
    } finally {
      setWorking(false)
      setPhase('')
    }
  }

  const removeUploaded = async item => {
    if (!savedPost?.id || working) return
    if (!window.confirm('Hapus foto/video ini dari artikel?')) return
    setWorking(true)
    setError('')
    try {
      await hapusMediaArtikel(savedPost.id, item.id)
      setMedia(prev => prev.filter(m => m.id !== item.id))
      setInfo('Media berhasil dihapus.')
    } catch (e) {
      setError(errorBlog(e))
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="kblog-editor">
      <div className="kblog-editor-top">
        <button type="button" className="kblog-back" onClick={onClose} disabled={working}>← Kembali ke Blog</button>
        <div className="kblog-editor-actions">
          <button type="button" className="admin-btn admin-btn-ghost" disabled={working || creatingCategory} onClick={() => save('draft')}>Simpan Draft</button>
          <button type="button" className="admin-btn admin-btn-primary" disabled={working || creatingCategory} onClick={() => save('published')}>{working ? (phase || 'Memproses...') : 'Terbitkan Artikel'}</button>
        </div>
      </div>
      {error && <p className="kblog-alert kblog-alert-error" role="alert">{error}</p>}
      {info && <p className="kblog-alert kblog-alert-success" role="status">{info}</p>}
      {working && <p className="kblog-alert" role="status">{phase}</p>}

      <div className="kblog-editor-layout">
        <div className="kblog-editor-main">
          <section className="kblog-panel kblog-form-panel">
            <div className="kblog-panel-title"><div><span className="kblog-eyebrow">KONTEN UTAMA</span><h3>Detail Artikel</h3></div><span className="kblog-pill">{article?.status === 'published' ? 'Artikel Terbit' : 'Draft'}</span></div>
            <label className="kblog-field"><span>Judul Artikel <b>*</b></span><input maxLength={255} value={form.judul} onChange={e => update('judul', e.target.value)} placeholder="Contoh: Cerita di Balik Tiramisu Kuki" /></label>
            <label className="kblog-field"><span>Ringkasan</span><textarea rows={3} maxLength={500} value={form.ringkasan} onChange={e => update('ringkasan', e.target.value)} placeholder="Ringkasan singkat untuk kartu artikel (opsional)" /><small>{form.ringkasan.length}/500 karakter</small></label>
            <label className="kblog-field"><span>Isi Artikel</span><textarea className="kblog-body-editor" rows={12} value={form.konten} onChange={e => update('konten', e.target.value)} placeholder="Tulis cerita atau informasi produk. Kosongkan jika postingan hanya foto atau video." /><small>Teks bersifat opsional apabila ada foto/video. Konten disimpan sebagai teks biasa.</small></label>
          </section>

          <section className="kblog-panel kblog-form-panel">
            <div className="kblog-panel-title"><div><span className="kblog-eyebrow">GALERI</span><h3>Foto & Video</h3></div><span className="kblog-pill">{media.length + pendingMedia.length}/{MAX_MEDIA}</span></div>
            <label className="kblog-upload">
              <strong>＋ Pilih Foto atau Video</strong>
              <span>Bisa pilih banyak file. Foto: JPG/PNG/WebP ≤5 MB. Video: MP4/WebM/MOV ≤50 MB.</span>
              <input ref={mediaRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" multiple onChange={selectMedia} disabled={working || media.length + pendingMedia.length >= MAX_MEDIA} />
            </label>
            {pendingMedia.length > 0 && <div className="kblog-file-list"><h4>Siap diunggah ({pendingMedia.length})</h4>{pendingMedia.map(entry => (
              <div className="kblog-pending-file" key={entry.id}>
                <span aria-hidden="true">{jenisFile(entry.file) === 'foto' ? '▧' : '▶'}</span>
                <div><strong>{entry.file.name}</strong><small>{bytes(entry.file.size)} · {jenisFile(entry.file)}</small><input aria-label={`Caption untuk ${entry.file.name}`} maxLength={255} placeholder="Caption (opsional)" value={entry.caption} onChange={e => setPendingMedia(prev => prev.map(item => item.id === entry.id ? { ...item, caption: e.target.value } : item))}/></div>
                <button type="button" className="kblog-link-button kblog-danger-text" disabled={working} onClick={() => setPendingMedia(prev => prev.filter(item => item.id !== entry.id))}>Hapus</button>
              </div>
            ))}</div>}
            {media.length > 0 && <div className="kblog-gallery">
              {media.map(item => (
                <div className="kblog-gallery-item" key={item.id}>
                  {item.jenis === 'video' ? <video src={urlMediaBlog(item.url || item.path)} controls playsInline preload="metadata" /> : <img src={urlMediaBlog(item.url || item.path)} loading="lazy" alt={item.caption || 'Foto artikel'}/>}
                  <div className="kblog-gallery-caption"><span>{item.caption || (item.jenis === 'video' ? 'Video artikel' : 'Foto artikel')}</span><button type="button" className="kblog-link-button kblog-danger-text" onClick={() => removeUploaded(item)} disabled={working}>Hapus</button></div>
                </div>
              ))}
            </div>}
            {!media.length && !pendingMedia.length && <p className="kblog-muted">Belum ada media. Tambahkan foto atau video, lalu Simpan Draft atau Terbitkan Artikel.</p>}
          </section>
        </div>

        <div className="kblog-editor-sidebar">
          <section className="kblog-panel kblog-form-panel">
            <div className="kblog-panel-title"><div><span className="kblog-eyebrow">PENGATURAN</span><h3>Kategori</h3></div></div>
            <label className="kblog-field"><span>Kategori Blog</span><select value={form.blog_category_id} onChange={e => update('blog_category_id', e.target.value)}><option value="">Tanpa kategori</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nama}</option>)}</select></label>
            <div className="kblog-add-category"><label className="kblog-field"><span>Buat Kategori Baru</span><input maxLength={255} value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nama kategori" /></label><button type="button" className="admin-btn admin-btn-ghost" disabled={!newCategory.trim() || creatingCategory || working} onClick={addCategory}>{creatingCategory ? 'Menambahkan...' : '+ Tambah Kategori'}</button></div>
          </section>
          <section className="kblog-panel kblog-form-panel">
            <div className="kblog-panel-title"><div><span className="kblog-eyebrow">THUMBNAIL</span><h3>Gambar Sampul</h3></div></div>
            {(cover || coverFile) ? <div className="kblog-cover-preview">{coverFile ? <span>File siap: {coverFile.name}</span> : <img src={urlMediaBlog(cover)} alt="Sampul saat ini" />}</div> : <div className="kblog-cover-empty">Belum ada gambar sampul</div>}
            <label className="kblog-upload kblog-upload-sm"><strong>Pilih Sampul</strong><span>JPG, PNG, WebP maksimal 5 MB</span><input type="file" accept="image/jpeg,image/png,image/webp" ref={coverRef} onChange={selectCover} disabled={working}/></label>
            {coverFile && <button className="kblog-link-button" type="button" disabled={working} onClick={() => { setCoverFile(null); if (coverRef.current) coverRef.current.value = '' }}>Batalkan sampul baru</button>}
            <p className="kblog-muted">Sampul menjadi thumbnail pada kartu artikel Blog.</p>
          </section>
          <section className="kblog-panel kblog-form-panel kblog-info-panel"><strong>Alur Publikasi</strong><p>1. Isi judul dan konten atau pilih media.</p><p>2. Simpan Draft untuk upload berkas.</p><p>3. Klik Terbitkan agar artikel tampil di website.</p></section>
        </div>
      </div>
    </div>
  )
}

export default BlogEditor
