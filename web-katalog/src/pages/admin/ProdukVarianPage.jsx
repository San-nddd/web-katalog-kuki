import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import BarcodePrintButton from '../../components/BarcodePrintButton'
import { getProdukById } from '../../services/produkService'
import {
  getAdminVarianProduk,
  hapusVarianProduk,
  simpanVarianProduk,
} from '../../services/produkVarianService'
import { formatRupiah } from '../../utils/mockData'
import './ProdukVarianPage.css'
const FORM_KOSONG = {
  id: null,
  namaVarian: '',
  sku: '',
  barcode: '',
  harga: '',
  stok: '0',
  stokMinimum: '0',
  aktif: true,
}

function pesanError(error) {
  const errors = error?.data?.errors
  if (errors && typeof errors === 'object') {
    const messages = Object.values(errors).flat().filter(Boolean)
    if (messages.length) return messages.join(' ')
  }
  return error?.message || 'Terjadi kesalahan. Silakan coba lagi.'
}

function ProdukVarianPage() {
  const { id: produkId } = useParams()
  const [produk, setProduk] = useState(null)
  const [varian, setVarian] = useState([])
  const [form, setForm] = useState({ ...FORM_KOSONG })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const [dataProduk, dataVarian] = await Promise.all([
        getProdukById(produkId),
        getAdminVarianProduk(produkId),
      ])
      setProduk(dataProduk)
      setVarian(dataVarian)
      setError('')
    } catch (err) {
      setError(pesanError(err))
    } finally {
      setLoading(false)
    }
  }, [produkId])

  useEffect(() => {
    muat()
  }, [muat])

  const setField = (name) => (event) => {
    setForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const resetForm = () => {
    setForm({ ...FORM_KOSONG })
    setError('')
  }

  const mulaiEdit = (item) => {
    setForm({
      id: item.id,
      namaVarian: item.namaVarian || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      harga: String(item.harga ?? ''),
      stok: String(item.stok ?? 0),
      stokMinimum: String(item.stokMinimum ?? 0),
      aktif: Boolean(item.aktif),
    })
    setError('')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const simpan = async (event) => {
    event.preventDefault()
    if (saving || deletingId !== null) return

    const harga = Number(form.harga)
    const stok = Number(form.stok)
    const stokMinimum = Number(form.stokMinimum)
    if (!form.namaVarian.trim() || form.harga === '' || !Number.isFinite(harga) || harga < 0 || harga > 99999999.99) {
      setError("Nama varian dan harga yang valid wajib diisi.")
      return
    }
    if (![stok, stokMinimum].every((nilai) => Number.isSafeInteger(nilai) && nilai >= 0 && nilai <= 4294967295)) {
      setError("Stok dan stok minimum harus bilangan bulat tidak negatif.")
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const editMode = Boolean(form.id)
      await simpanVarianProduk(produkId, {
        id: form.id,
        namaVarian: form.namaVarian.trim(),
        sku: form.sku.trim().toUpperCase() || null,
        barcode: form.barcode.trim().toUpperCase() || null,
        harga,
        stok,
        stokMinimum,
        aktif: form.aktif,
      })
      setForm({ ...FORM_KOSONG })
      setMessage(editMode ? 'Varian berhasil diperbarui.' : 'Varian berhasil ditambahkan.')
      await muat()
    } catch (err) {
      setError(pesanError(err))
    } finally {
      setSaving(false)
    }
  }

  const hapus = async (item) => {
    if (saving || deletingId !== null) return
    const ok = window.confirm(
      `Hapus permanen varian "${item.namaVarian}"? Gunakan status Nonaktif jika hanya ingin menyembunyikannya.`,
    )
    if (!ok) return

    setDeletingId(item.id)
    setError('')
    setMessage('')
    try {
      await hapusVarianProduk(produkId, item.id)
      if (form.id === item.id) setForm({ ...FORM_KOSONG })
      setMessage(`Varian "${item.namaVarian}" berhasil dihapus.`)
      await muat()
    } catch (err) {
      setError(pesanError(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <AdminLayout title={"Kelola Varian Produk"}>
      <div className="admin-form-toolbar kuki-varian-toolbar">
        <Link to="/admin/produk" className="admin-btn admin-btn-ghost">{"← Daftar Produk"}</Link>
        <Link to={`/admin/produk/${produkId}/edit`} className="admin-btn admin-btn-ghost">
          {"Ubah Produk Utama"}
        </Link>
      </div>

      {error && <div className="admin-alert" role="alert">{error}</div>}
      {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="display-font">{"Varian:"} {produk?.nama || "Memuat produk..."}</h2>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={muat} disabled={loading || saving}>
            {"Muat Ulang"}
          </button>
        </div>
        <p className="admin-sub">
          {"Setiap rasa atau ukuran memiliki SKU, barcode, harga, dan stok sendiri.\n          Produk utama tetap satu kartu di katalog."}
        </p>
        {produk?.barcode && (
          <p className="admin-sub">
            {"Barcode produk utama:"} <strong>{produk.barcode}</strong>{". Jangan gunakan kode yang sama pada varian."}
          </p>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="display-font">{form.id ? "Ubah Varian" : "+ Tambah Varian"}</h2>
          {form.id && (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={resetForm} disabled={saving}>
              {"Batal Edit"}
            </button>
          )}
        </div>
        <form className="admin-form" onSubmit={simpan}>
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>{"Nama Varian *"}</span>
              <input value={form.namaVarian} onChange={setField('namaVarian')} maxLength={150}
                placeholder={"Contoh: Original / 16 cm"} required disabled={loading || saving} />
            </label>
            <label className="admin-field">
              <span>{"Harga Varian (Rp) *"}</span>
              <input type="number" value={form.harga} onChange={setField('harga')}
                min="0" max="99999999.99" step="0.01" placeholder={"Isi harga sebenarnya"}
                required disabled={loading || saving} />
            </label>
            <label className="admin-field">
              <span>{"SKU"}</span>
              <input value={form.sku} onChange={setField('sku')} maxLength={100}
                placeholder={"Kosongkan untuk generate otomatis"} disabled={loading || saving} />
            </label>
            <label className="admin-field">
              <span>{"Barcode Code 128"}</span>
              <input value={form.barcode} onChange={setField('barcode')} maxLength={100}
                placeholder={"Kosongkan untuk memakai SKU"} disabled={loading || saving} />
            </label>
            <label className="admin-field">
              <span>{"Stok"}</span>
              <input type="number" min="0" step="1" value={form.stok}
                onChange={setField('stok')} disabled={loading || saving} />
            </label>
            <label className="admin-field">
              <span>{"Stok Minimum"}</span>
              <input type="number" min="0" step="1" value={form.stokMinimum}
                onChange={setField('stokMinimum')} disabled={loading || saving} />
            </label>
          </div>
          <label className="admin-field kuki-varian-checkbox">
            <input type="checkbox" checked={form.aktif}
              onChange={(event) => setForm((prev) => ({ ...prev, aktif: event.target.checked }))}
              disabled={loading || saving} />
            <span>{"Varian aktif (ditampilkan di katalog)"}</span>
          </label>
          <p className="admin-sub">
            {"Kode hanya menerima huruf A–Z, angka, dan tanda hubung.\n            Saat mengedit, kode kosong tidak akan menghapus kode yang sudah tersimpan."}
          </p>
          <div className="admin-form-actions">
            <button className="admin-btn admin-btn-primary" type="submit" disabled={loading || saving || deletingId !== null}>
              {saving ? "Menyimpan..." : form.id ? 'Simpan Perubahan' : 'Tambah Varian'}
            </button>
            {form.id && <button type="button" className="admin-btn admin-btn-ghost" onClick={resetForm} disabled={saving}>{"Batal"}</button>}
          </div>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="display-font">{"Daftar Varian ("}{varian.length})</h2>
        </div>
        {loading ? (
          <p className="admin-empty">{"Memuat varian..."}</p>
        ) : varian.length === 0 ? (
          <p className="admin-empty">{"Belum ada varian. Tambahkan varian pertama melalui form di atas."}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{"Varian"}</th>
                  <th>{"SKU / Barcode"}</th>
                  <th>{"Harga"}</th>
                  <th>{"Stok"}</th>
                  <th>{"Status"}</th>
                  <th>{"Aksi"}</th>
                </tr>
              </thead>
              <tbody>
                {varian.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.namaVarian}</strong></td>
                    <td>
                      <span className="kuki-varian-code">{item.sku}</span>
                      {item.barcode !== item.sku && (
                        <small className="admin-sub">{"Barcode:"} {item.barcode}</small>
                      )}
                    </td>
                    <td>{formatRupiah(item.harga)}</td>
                    <td>
                      <span className={`admin-badge ${item.stok <= item.stokMinimum ? 'warn' : ''}`}>
                        {item.stok}
                      </span>
                      <small className="admin-sub">{"Min."} {item.stokMinimum}</small>
                    </td>
                    <td><span className={`admin-badge ${!item.aktif ? 'warn' : ''}`}>
                      {item.aktif ? "Aktif" : "Nonaktif"}
                    </span></td>
                    <td>
                      <div className="admin-row-actions kuki-varian-row-actions">
                        <button type="button" className="admin-btn admin-btn-ghost"
                          onClick={() => mulaiEdit(item)} disabled={saving || deletingId !== null}>{"Ubah"}</button>
                        <BarcodePrintButton value={item.barcode} productName={`${produk?.nama || 'Produk'} - ${item.namaVarian}`} />
                        <button type="button" className="admin-btn admin-btn-danger"
                          onClick={() => hapus(item)} disabled={saving || deletingId !== null}>
                          {deletingId === item.id ? "Menghapus..." : "Hapus"}
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
    </AdminLayout>
  )
}

export default ProdukVarianPage
