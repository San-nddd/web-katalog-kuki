import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { getProduk, hapusProduk, uploadGambarProduk } from '../../services/produkService'
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
    if (filterKategori !== 'semua' && String(item.kategoriId ?? 'tanpa') !== filterKategori) return false
    if (filterStok === 'habis') return item.stok <= 0
    if (filterStok === 'menipis') return item.stok > 0 && item.stok <= item.stokMinimum
    if (filterStok === 'tersedia') return item.stok > 0
    return true
  }), [produk, filterKategori, filterStok])

  const muat = useCallback(() => {
    getProduk()
      .then((data) => {
        setProduk(data)
        setError('')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    muat()
  }, [muat])

  const handleHapus = async (item) => {
    const ok = window.confirm(("Hapus produk \"" + item.nama + "\"? Tindakan ini tidak bisa dibatalkan."))
    if (!ok) return

    try {
      await hapusProduk(item.id)
      setMessage(("Produk \"" + item.nama + "\" berhasil dihapus."))
      setError('')
      muat()
    } catch (err) {
      setError(err.message)
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
          <p className="admin-empty">{"Belum ada produk. Tambahkan produk pertama Anda."}</p>
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
                      <div className="admin-row-actions kuki-inventory-row-actions">
                        <Link to={`/admin/produk/${item.id}/edit`} className="admin-btn admin-btn-ghost">
                          {"Ubah"}
                        </Link>
                        <ImageUploadButton
                          currentImage={item.gambar ? assetUrl(item.gambar) : null}
                          onUpload={(file) => uploadGambarProduk(item.id, file).then(() => muat())}
                          disabled={loading}
                          title={`Klik untuk ${item.gambar ? 'mengganti' : 'mengunggah'} gambar ${item.nama}`}
                        />
                        <BarcodePrintButton produkId={item.id} stok={item.stok} value={item.barcode} productName={item.nama} />
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => handleHapus(item)}
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
      <ImagePreviewModal
        open={Boolean(previewSrc)}
        src={previewSrc}
        alt={previewAlt}
        onClose={() => setPreviewSrc(null)}
      />
    </AdminLayout>
  )
}

export default ProdukAdminPage
