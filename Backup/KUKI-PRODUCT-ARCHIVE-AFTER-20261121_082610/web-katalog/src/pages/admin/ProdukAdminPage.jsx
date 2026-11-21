import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { arsipkanProduk, getProdukAdmin, pulihkanProduk, uploadGambarProduk } from '../../services/produkService'
import { formatRupiah } from '../../utils/mockData'
import { assetUrl } from '../../services/api'
import ImageUploadButton from '../../components/ImageUploadButton'
import ImagePreviewModal from '../../components/ImagePreviewModal'
import BarcodePrintButton from '../../components/BarcodePrintButton'
import './ProdukAdminKategori.css'

function ProdukAdminPage() {
  const [produk, setProduk] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewSrc, setPreviewSrc] = useState(null)
  const [previewAlt, setPreviewAlt] = useState('')
  const [filterKategori, setFilterKategori] = useState('semua')
  const [filterStok, setFilterStok] = useState('semua')
  const [filterStatus, setFilterStatus] = useState('aktif')
  const [confirmArsip, setConfirmArsip] = useState(null)
  const [saving, setSaving] = useState(false)

  const pilihanKategori = useMemo(() => {
    const items = new Map()
    for (const item of produk) {
      if (item.kategoriId != null) {
        items.set(String(item.kategoriId), item.kategori || `Kategori #${item.kategoriId}`)
      }
    }
    return [...items.entries()].sort((a, b) => a[1].localeCompare(b[1], 'id'))
  }, [produk])

  const produkTerfilter = useMemo(() => produk.filter((item) => {
    if (filterStatus === 'aktif' && !item.aktif) return false
    if (filterStatus === 'arsip' && item.aktif) return false
    if (filterKategori !== 'semua' && String(item.kategoriId ?? 'tanpa') !== filterKategori) return false
    if (filterStok === 'habis') return item.stok <= 0
    if (filterStok === 'menipis') return item.stok > 0 && item.stok <= item.stokMinimum
    if (filterStok === 'tersedia') return item.stok > 0
    return true
  }), [produk, filterKategori, filterStok, filterStatus])

  const muat = useCallback(() => {
    return getProdukAdmin(filterStatus)
      .then((data) => {
        setProduk(data)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [filterStatus])

  useEffect(() => {
    muat()
  }, [muat])

  const handleArsipkan = async () => {
    const item = confirmArsip
    if (!item) return

    setSaving(true)
    setMessage('')
    setError('')
    try {
      await arsipkanProduk(item.id)
      setMessage(("Produk \"" + item.nama + "\" berhasil diarsipkan."))
      await muat()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
      setConfirmArsip(null)
    }
  }

  const handlePulihkan = async (item) => {
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await pulihkanProduk(item.id)
      setMessage(("Produk \"" + item.nama + "\" berhasil dipulihkan."))
      await muat()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title={"Kelola Produk"}>
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

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="display-font">{"Daftar Produk"}</h2>
          <Link to="/admin/produk/baru" className="admin-btn admin-btn-primary">
            {"+ Tambah Produk"}
          </Link>
        </div>

        <div className="kuki-inventory-filters">
          <label className="kuki-inventory-filter">
            <span>{"Kategori"}</span>
            <select value={filterKategori} onChange={(event) => setFilterKategori(event.target.value)}>
              <option value="semua">{"Semua kategori"}</option>
              {pilihanKategori.map(([id, nama]) => <option key={id} value={id}>{nama}</option>)}
              {produk.some((item) => item.kategoriId == null) && <option value="tanpa">{"Tanpa kategori"}</option>}
            </select>
          </label>
          <label className="kuki-inventory-filter">
            <span>{"Status produk"}</span>
            <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
              <option value="aktif">{"Produk aktif"}</option>
              <option value="arsip">{"Produk diarsipkan"}</option>
            </select>
          </label>
          <label className="kuki-inventory-filter">
            <span>{"Kondisi stok"}</span>
            <select value={filterStok} onChange={(event) => setFilterStok(event.target.value)}>
              <option value="semua">{"Semua stok"}</option>
              <option value="tersedia">{"Tersedia"}</option>
              <option value="menipis">{"Menipis"}</option>
              <option value="habis">{"Habis"}</option>
            </select>
          </label>
          <span className="kuki-inventory-total" role="status">{produkTerfilter.length} {"dari"} {produk.length} {"produk"}</span>
        </div>

        {loading ? (
          <p className="admin-empty">{"Memuat produk..."}</p>
        ) : produk.length === 0 ? (
          <p className="admin-empty">
            {filterStatus === 'arsip'
              ? 'Belum ada produk yang diarsipkan.'
              : 'Belum ada produk. Tambahkan produk pertama Anda.'}
          </p>
        ) : produkTerfilter.length === 0 ? (
          <p className="admin-empty">{"Tidak ada produk untuk filter yang dipilih."}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{"Gambar"}</th>
                  <th>{"Produk"}</th>
                  <th>{"Kategori"}</th>
                  <th>{"Harga"}</th>
                  <th>{"Stok"}</th>
                  <th>{"Status"}</th>
                  <th>{"Aksi"}</th>
                </tr>
              </thead>
              <tbody>
                {produkTerfilter.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.gambar ? (
                        <button
                          type="button"
                          className="admin-thumb-btn"
                          onClick={() => {
                            setPreviewSrc(assetUrl(item.gambar))
                            setPreviewAlt(item.nama)
                          }}
                          aria-label={`Lihat gambar ${item.nama}`}
                        >
                          <img className="admin-thumb" src={item.gambar} alt={item.nama} />
                        </button>
                      ) : (
                        <span className="admin-thumb admin-thumb-empty" aria-label={"Tanpa gambar"}>
                          —
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>{item.nama}</strong>
                      {item.barcode && <small className="admin-sub">{"SKU:"} {item.barcode}</small>}
                    </td>
                    <td>{item.kategori || '-'}</td>
                    <td>{formatRupiah(item.harga)}</td>
                    <td>
                      <span className={`admin-badge ${item.stok <= item.stokMinimum ? 'warn' : ''}`}>
                        {item.stok}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${item.aktif ? '' : 'warn'}`}>
                        {item.aktif ? 'Aktif' : 'Diarsipkan'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions kuki-inventory-row-actions">
                        {item.aktif ? (
                          <>
                            <Link to={`/admin/produk/${item.id}/edit`} className="admin-btn admin-btn-ghost">
                              {"Ubah"}
                            </Link>
                            <ImageUploadButton
                              currentImage={item.gambar ? assetUrl(item.gambar) : null}
                              onUpload={(file) => uploadGambarProduk(item.id, file).then(() => muat())}
                              disabled={loading || saving}
                              title={`Klik untuk ${item.gambar ? 'mengganti' : 'mengunggah'} gambar ${item.nama}`}
                            />
                            <BarcodePrintButton produkId={item.id} stok={item.stok} value={item.barcode} productName={item.nama} />
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              disabled={saving}
                              onClick={() => setConfirmArsip(item)}
                            >
                              {"Hapus"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost"
                            disabled={saving}
                            onClick={() => handlePulihkan(item)}
                          >
                            {saving ? 'Memulihkan...' : 'Pulihkan'}
                          </button>
                        )}
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

      {confirmArsip && (
        <div
          className="admin-confirm-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setConfirmArsip(null)
          }}
        >
          <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="produk-arsip-title">
            <h2 id="produk-arsip-title" className="display-font">Hapus produk?</h2>
            <p>
              {`${confirmArsip.nama} akan diarsipkan dan hilang dari katalog serta POS. Riwayat transaksi, produksi, stok opname, dan mutasi stok tetap tersimpan.`}
            </p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={() => setConfirmArsip(null)}>
                Batal
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-danger"
                disabled={saving}
                onClick={handleArsipkan}
              >
                {saving ? 'Mengarsipkan...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default ProdukAdminPage
