import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { getProduk } from '../../services/produkService'
import { getKategori } from '../../services/kategoriService'
import { formatRupiah } from '../../utils/mockData'
import useAdminTranslation from '../../hooks/useAdminTranslation'

function DashboardPage() {
  const { t } = useAdminTranslation()
  const [produk, setProduk] = useState([])
  const [kategori, setKategori] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getProduk()
      .then((data) => active && setProduk(data))
      .catch((err) => active && setError(err.message))

    getKategori()
      .then((data) => active && setKategori(data))
      .catch((err) => active && setError(err.message))

    return () => {
      active = false
    }
  }, [])

  const stokMenipis = produk.filter((item) => item.tersedia && item.stok <= item.stokMinimum)
  const terbaru = produk.slice(0, 5)

  const stats = [
    { label: 'Total Produk', value: produk.length },
    { label: 'Total Kategori', value: kategori.length },
    { label: 'Stok Menipis', value: stokMenipis.length },
  ]

  return (
    <AdminLayout title={t("Dashboard")}>
      {error && (
        <div className="admin-alert" role="alert">
          {error}
        </div>
      )}

      <div className="admin-stats">
        {stats.map((stat) => (
          <div className="admin-stat" key={stat.label}>
            <span className="admin-stat-value display-font">{stat.value}</span>
            <span className="admin-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="display-font">{t("Produk Terbaru")}</h2>
          <div className="admin-card-actions">
            <Link to="/admin/kategori" className="admin-btn admin-btn-ghost">
              {t("Kelola Kategori")}
            </Link>
            <Link to="/admin/produk" className="admin-btn admin-btn-primary">
              {t("Kelola Produk")}
            </Link>
          </div>
        </div>

        {terbaru.length === 0 ? (
          <p className="admin-empty">{t("Belum ada produk. Tambahkan produk pertama Anda.")}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("Produk")}</th>
                  <th>{t("Kategori")}</th>
                  <th>{t("Harga")}</th>
                  <th>{t("Stok")}</th>
                </tr>
              </thead>
              <tbody>
                {terbaru.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nama}</td>
                    <td>{item.kategori || '-'}</td>
                    <td>{formatRupiah(item.harga)}</td>
                    <td>{item.stok}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {stokMenipis.length > 0 && (
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="display-font">{t("Perhatian Stok")}</h2>
          </div>
          <ul className="admin-list">
            {stokMenipis.map((item) => (
              <li key={item.id}>
                <strong>{item.nama}</strong> {t("— sisa")} {item.stok} {t("(minimum")} {item.stokMinimum})
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminLayout>
  )
}

export default DashboardPage
