import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { getProdukById, simpanProduk, uploadGambarProduk } from '../../services/produkService'
import { getKategori } from '../../services/kategoriService'
import { assetUrl } from '../../services/api'
import ImageUpload from '../../components/ImageUpload'
const KOSONG = {
  nama: '',
  deskripsi: '',
  harga: '',
  kategoriId: '',
  barcode: '',
  slug: '',
  stok: '0',
  stokMinimum: '0',
  metadataAi: '',
}

function ProdukFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)

  // Key membuat form dibuat ulang saat berpindah antara tambah/ubah produk.
  return <ProdukFormInner key={isEdit ? `edit-${id}` : 'baru'} id={id} isEdit={isEdit} />
}

function ProdukFormInner({ id, isEdit }) {
  const navigate = useNavigate()

  const [form, setForm] = useState(KOSONG)
  const [kategori, setKategori] = useState([])
  const [gambarFile, setGambarFile] = useState(null)
  const [gambarLama, setGambarLama] = useState(null)
  const [error, setError] = useState('')
  const [loadedId, setLoadedId] = useState(null)
  const [saving, setSaving] = useState(false)

  // Saat mode edit berganti, form dianggap belum dimuat sampai data terbaru masuk.
  const loading = isEdit && loadedId !== String(id)

  useEffect(() => {
    let active = true

    getKategori()
      .then((data) => active && setKategori(data))
      .catch(() => {
        // Daftar kategori opsional: form tetap bisa dipakai.
      })

    if (!isEdit) return () => { active = false }

    getProdukById(id)
      .then((item) => {
        if (!active) return
        setForm({
          nama: item.nama,
          deskripsi: item.deskripsi,
          harga: String(item.harga),
          kategoriId: item.kategoriId ? String(item.kategoriId) : '',
          barcode: item.barcode || '',
          slug: item.slug || '',
          stok: String(item.stok ?? 0),
          stokMinimum: String(item.stokMinimum ?? 0),
          metadataAi: item.metadataAi || '',
        })
        setGambarLama(item.gambar)
        setLoadedId(String(id))
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setLoadedId(String(id))
        setError(err.message || 'Gagal memuat produk.')
      })

    return () => {
      active = false
    }
  }, [id, isEdit])

  const setField = (name) => (event) =>
    setForm((prev) => ({ ...prev, [name]: event.target.value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.nama.trim() || !form.deskripsi.trim() || !form.harga) {
      setError('Nama, deskripsi, dan harga wajib diisi.')
      return
    }

    if (Number(form.harga) < 0) {
      setError('Harga tidak boleh negatif.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        nama: form.nama.trim(),
        deskripsi: form.deskripsi.trim(),
        harga: Number(form.harga),
        kategoriId: form.kategoriId ? Number(form.kategoriId) : null,
        barcode: form.barcode.trim() || null,
        slug: form.slug.trim() || null,
        stok: Number(form.stok || 0),
        stokMinimum: Number(form.stokMinimum || 0),
        metadataAi: form.metadataAi.trim() || null,
      }

      let saved

      if (isEdit) {
        saved = await simpanProduk({ ...payload, id })
      } else {
        saved = await simpanProduk(payload)
      }

      const produkId = saved?.id || id

      if (gambarFile && produkId) {
        await uploadGambarProduk(produkId, gambarFile)
      }

      navigate('/admin/produk')
    } catch (err) {
      setError(err.message || 'Gagal menyimpan produk.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title={isEdit ? 'Ubah Produk' : 'Tambah Produk'}>
      <div className="admin-form-toolbar">
        <Link to="/admin/produk" className="admin-btn admin-btn-ghost">
          ← Kembali
        </Link>
      </div>

      {error && (
        <div className="admin-alert" role="alert">
          {error}
        </div>
      )}

      <section className="admin-card">
        {loading ? (
          <p className="admin-empty">Memuat produk...</p>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>Nama Produk *</span>
              <input type="text" value={form.nama} onChange={setField('nama')} placeholder="Croissant Butter" />
            </label>

            <label className="admin-field">
              <span>Deskripsi *</span>
              <textarea
                rows="4"
                value={form.deskripsi}
                onChange={setField('deskripsi')}
                placeholder="Croissant renyah dengan aroma butter..."
              />
            </label>

            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Harga (Rp) *</span>
                <input
                  type="number"
                  min="0"
                  value={form.harga}
                  onChange={setField('harga')}
                  placeholder="25000"
                />
              </label>

              <label className="admin-field">
                <span>Kategori</span>
                <select value={form.kategoriId} onChange={setField('kategoriId')}>
                  <option value="">Tanpa kategori</option>
                  {kategori.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Stok</span>
                <input type="number" min="0" value={form.stok} onChange={setField('stok')} />
              </label>

              <label className="admin-field">
                <span>Stok Minimum</span>
                <input
                  type="number"
                  min="0"
                  value={form.stokMinimum}
                  onChange={setField('stokMinimum')}
                />
              </label>

              <label className="admin-field">
                <span>Barcode / SKU</span>
                <input type="text" value={form.barcode} onChange={setField('barcode')} placeholder="KKB-001" />
              </label>

              <label className="admin-field">
                <span>Slug (opsional)</span>
                <input type="text" value={form.slug} onChange={setField('slug')} placeholder="croissant-butter" />
              </label>
            </div>

            <label className="admin-field">
              <span>Informasi AI (bahan, alergen, textur)</span>
              <textarea
                rows="3"
                value={form.metadataAi}
                onChange={setField('metadataAi')}
                placeholder="Bahan utama: tepung, butter, gula..."
              />
            </label>

            <label className="admin-field">
              <span>{isEdit ? 'Ganti Gambar' : 'Gambar Produk'}</span>
              <ImageUpload
                value={gambarLama ? assetUrl(gambarLama) : null}
                onChange={(file) => setGambarFile(file)}
                onRemove={() => setGambarFile(null)}
                label={isEdit ? 'Ganti Gambar' : 'Gambar Produk'}
                accept="image/*"
                maxSizeMB={5}
                previewSize={140}
              />
            </label>

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Produk'}
              </button>
              <Link to="/admin/produk" className="admin-btn admin-btn-ghost">
                Batal
              </Link>
            </div>
          </form>
        )}
      </section>
    </AdminLayout>
  )
}

export default ProdukFormPage
