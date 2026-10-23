import useAdminTranslation from '../../hooks/useAdminTranslation'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { getProdukById, simpanProduk, uploadGambarProduk } from '../../services/produkService'
import { getKategori } from '../../services/kategoriService'
import { assetUrl } from '../../services/api'
import ImageUploadEditor from '../../components/ImageUploadEditor/ImageUploadEditor'
import BarcodePreview from '../../components/BarcodePreview'
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
  const { t } = useAdminTranslation()

  const navigate = useNavigate()

  const [form, setForm] = useState(KOSONG)
  const [kategori, setKategori] = useState([])
  const [gambarFile, setGambarFile] = useState(null)
  const [gambarLama, setGambarLama] = useState(null)
  const [error, setError] = useState('')
  const [loadedId, setLoadedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedLabel, setSavedLabel] = useState(null)

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
        setSavedLabel({
          name: String(item.nama ?? '').trim(),
          barcode: String(item.barcode ?? '').trim(),
          stok: String(item.stok ?? 0),
        })
        setLoadedId(String(id))
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setLoadedId(String(id))
        setError(err.message ||t("Gagal memuat produk."))
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
      setError(t("Nama, deskripsi, dan harga wajib diisi."))
      return
    }

    if (Number(form.harga) < 0) {
      setError(t("Harga tidak boleh negatif."))
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
      setError(err.message ||t("Gagal menyimpan produk."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title={isEdit ?t("Ubah Produk") :t("Tambah Produk")}>
      <div className="admin-form-toolbar">
        <Link to="/admin/produk" className="admin-btn admin-btn-ghost">
          {t("← Kembali")}
        </Link>
      </div>

      {error && (
        <div className="admin-alert" role="alert">
          {error}
        </div>
      )}

      <section className="admin-card">
        {loading ? (
          <p className="admin-empty">{t("Memuat produk...")}</p>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <label className="admin-field">
              <span>{t("Nama Produk *")}</span>
              <input type="text" value={form.nama} onChange={setField('nama')} placeholder={t("Croissant Butter")} />
            </label>

            <label className="admin-field">
              <span>{t("Deskripsi *")}</span>
              <textarea
                rows="4"
                value={form.deskripsi}
                onChange={setField('deskripsi')}
                placeholder={t("Croissant renyah dengan aroma butter...")}
              />
            </label>

            <div className="admin-form-grid">
              <label className="admin-field">
                <span>{t("Harga (Rp) *")}</span>
                <input
                  type="number"
                  min="0"
                  value={form.harga}
                  onChange={setField('harga')}
                  placeholder="25000"
                />
              </label>

              <label className="admin-field">
                <span>{t("Kategori")}</span>
                <select value={form.kategoriId} onChange={setField('kategoriId')}>
                  <option value="">{t("Tanpa kategori")}</option>
                  {kategori.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>{t("Stok")}</span>
                <input type="number" min="0" value={form.stok} onChange={setField('stok')} />
              </label>

              <label className="admin-field">
                <span>{t("Stok Minimum")}</span>
                <input
                  type="number"
                  min="0"
                  value={form.stokMinimum}
                  onChange={setField('stokMinimum')}
                />
              </label>

              <label className="admin-field">
                <span>{t("Barcode / SKU")}</span>
                <input type="text" value={form.barcode} onChange={setField('barcode')} placeholder={t("KKB-001")} />
              </label>

              <label className="admin-field">
                <span>{t("Slug (opsional)")}</span>
                <input type="text" value={form.slug} onChange={setField('slug')} placeholder={t("croissant-butter")} />
              </label>
            </div>

            <BarcodePreview
              produkId={id}
              stok={Number(form.stok || 0)}
              value={form.barcode}
              productName={form.nama}
              canPrint={Boolean(
                isEdit && !saving && !error && savedLabel &&
                savedLabel.barcode === form.barcode.trim() &&
                savedLabel.name === form.nama.trim() &&
                savedLabel.stok === String(form.stok || 0)
              )}
            />

            <label className="admin-field">
              <span>{t("Informasi AI (bahan, alergen, textur)")}</span>
              <textarea
                rows="3"
                value={form.metadataAi}
                onChange={setField('metadataAi')}
                placeholder={t("Bahan utama: tepung, butter, gula...")}
              />
            </label>

            <div className="admin-field">
              <ImageUploadEditor
                label={isEdit ?t("Ganti / Edit Gambar Produk") :t("Gambar Produk")}
                initialUrl={gambarLama ? assetUrl(gambarLama) : ''}
                defaultRatio="1:1"
                maxFileMB={10}
                onChange={(file) => setGambarFile(file)}
              />
            </div>

            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                {saving ?t("Menyimpan...") : isEdit ?t("Simpan Perubahan") :t("Tambah Produk")}
              </button>
              <Link to="/admin/produk" className="admin-btn admin-btn-ghost">
                {t("Batal")}
              </Link>
            </div>
          </form>
        )}
      </section>
    </AdminLayout>
  )
}

export default ProdukFormPage
