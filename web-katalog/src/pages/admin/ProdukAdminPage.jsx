import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { getProduk, hapusProduk, uploadGambarProduk } from '../../services/produkService'
import { formatRupiah } from '../../utils/mockData'
import { assetUrl } from '../../services/api'
import ImageUploadButton from '../../components/ImageUploadButton'
import ImagePreviewModal from '../../components/ImagePreviewModal'

function ProdukAdminPage() {
  const [produk, setProduk] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [previewSrc, setPreviewSrc] = useState(null)
  const [previewAlt, setPreviewAlt] = useState('')

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
    const ok = window.confirm(`Hapus produk "${item.nama}"? Tindakan ini tidak bisa dibatalkan.`)
    if (!ok) return

    try {
      await hapusProduk(item.id)
      setMessage(`Produk "${item.nama}" berhasil dihapus.`)
      setError('')
      muat()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AdminLayout title="Kelola Produk">
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
          <h2 className="display-font">Daftar Produk</h2>
          <Link to="/admin/produk/baru" className="admin-btn admin-btn-primary">
            + Tambah Produk
          </Link>
        </div>

        {loading ? (
          <p className="admin-empty">Memuat produk...</p>
        ) : produk.length === 0 ? (
          <p className="admin-empty">Belum ada produk. Tambahkan produk pertama Anda.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Gambar</th>
                  <th>Produk</th>
                  <th>Kategori</th>
                  <th>Harga</th>
                  <th>Stok</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {produk.map((item) => (
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
                        <span className="admin-thumb admin-thumb-empty" aria-label="Tanpa gambar">
                          —
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>{item.nama}</strong>
                      {item.barcode && <small className="admin-sub">SKU: {item.barcode}</small>}
                    </td>
                    <td>{item.kategori || '-'}</td>
                    <td>{formatRupiah(item.harga)}</td>
                    <td>
                      <span className={`admin-badge ${item.stok <= item.stokMinimum ? 'warn' : ''}`}>
                        {item.stok}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <Link to={`/admin/produk/${item.id}/edit`} className="admin-btn admin-btn-ghost">
                          Ubah
                        </Link>
                        <ImageUploadButton
                          currentImage={item.gambar ? assetUrl(item.gambar) : null}
                          onUpload={(file) => uploadGambarProduk(item.id, file).then(() => muat())}
                          disabled={loading}
                          title={`Klik untuk ${item.gambar ? 'ganti' : 'upload'} gambar ${item.nama}`}
                        />
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => handleHapus(item)}
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
    </AdminLayout>
  )
}

export default ProdukAdminPage
