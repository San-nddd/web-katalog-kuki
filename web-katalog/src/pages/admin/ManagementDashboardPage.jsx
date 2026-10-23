import useAdminTranslation from '../../hooks/useAdminTranslation'
import { useEffect, useState } from 'react'
import ManagementLayout from './ManagementLayout'
import './managementProduction.css'
import { getManagementDashboard } from '../../services/managementService'

const numberFormatter = new Intl.NumberFormat('id-ID')
const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

// Tampilkan tanda — jika data belum tersedia, bukan angka nol palsu.
function formatNumber(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) {
    return '—'
  }
  return numberFormatter.format(Number(value))
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) {
    return '—'
  }
  return currencyFormatter.format(Number(value))
}

// Bisa menerima objek data langsung maupun respons API { success, data }.
function unwrapDashboard(response) {
  if (response?.inventory) return response
  if (response?.data?.inventory) return response.data
  if (response?.data?.data?.inventory) return response.data.data
  throw new Error('Format respons Management Dashboard tidak sesuai.')
}

function Unavailable({ children }) {
  return (
    <div className="management-unavailable" role="status">
      {children}
    </div>
  )
}

function ManagementDashboardPage() {
  const { t, locale } = useAdminTranslation()

  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    getManagementDashboard()
      .then((response) => {
        if (active) {
          setDashboard(unwrapDashboard(response))
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) {
          setDashboard(null)
          setError(t(requestError?.message || "Dashboard gagal dimuat."))
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const inventory = dashboard?.inventory
  const production = dashboard?.production
  const hasProduction = !loading && !error && Boolean(production)
  const maxDailyProduction = Math.max(1, ...(production?.trend || []).map((item) => Number(item.produced) || 0))
  const salesAvailable = !error && dashboard?.sales?.available === true
  const hasInventory = !loading && !error && Boolean(inventory)

  return (
    <ManagementLayout>
      {error && (
        <div className="admin-alert management-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={() => {
              setLoading(true)
              setError('')
              setReloadKey((key) => key + 1)
            }}
          >
            {t("Coba lagi")}
          </button>
        </div>
      )}

      <section id="overview" className="management-section">
        <div className="management-section-heading">
          <h2 className="display-font">{t("Dashboard Overview")}</h2>
          <div className="management-heading-actions">
            {!error && dashboard?.generated_at && (
              <span>{t("Data diperbarui")} {new Date(dashboard.generated_at).toLocaleString(locale, { timeZone: 'Asia/Jakarta' })} {t("WIB")}</span>
            )}
            <button
              className="admin-btn admin-btn-ghost"
              type="button"
              disabled={loading}
              onClick={() => {
                setLoading(true)
                setError('')
                setReloadKey((key) => key + 1)
              }}
            >
              {t("Perbarui Data")}
            </button>
          </div>
        </div>

        <div className="admin-stats">
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : salesAvailable ? formatCurrency(dashboard?.sales?.today_revenue) : '—'}
            </span>
            <span className="admin-stat-label">{t("Pendapatan Hari Ini")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : salesAvailable ? formatNumber(dashboard?.sales?.today_transactions) : '—'}
            </span>
            <span className="admin-stat-label">{t("Transaksi Hari Ini")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : hasInventory ? formatNumber(inventory.available_products) : '—'}
            </span>
            <span className="admin-stat-label">{t("Produk Tersedia")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : hasInventory ? formatNumber(inventory.critical_stock) : '—'}
            </span>
            <span className="admin-stat-label">{t("Stok Kritis")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : hasInventory ? formatNumber(inventory.out_of_stock) : '—'}
            </span>
            <span className="admin-stat-label">{t("Stok Habis")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : hasInventory ? formatNumber(inventory.total_products) : '—'}
            </span>
            <span className="admin-stat-label">{t("Total Produk")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : hasInventory ? formatNumber(inventory.total_stock_units) : '—'}
            </span>
            <span className="admin-stat-label">{t("Total Unit Stok")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : hasProduction ? formatNumber(production.today_produced) : '—'}
            </span>
            <span className="admin-stat-label">{t("Produksi Hari Ini")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : hasProduction ? formatNumber(production.today_printed) : '—'}
            </span>
            <span className="admin-stat-label">{t("Label Tercetak Hari Ini")}</span>
          </div>
          <div className="admin-stat">
            <span className="admin-stat-value display-font">
              {loading ? '…' : hasProduction ? formatNumber(production.today_unprinted) : '—'}
            </span>
            <span className="admin-stat-label">{t("Label Belum Dicetak")}</span>
          </div>
        </div>
        {!loading && !error && !salesAvailable && (
          <p className="management-data-note">{t(dashboard?.sales?.message || 'Data penjualan belum tersedia.')}</p>
        )}
      </section>

      <section id="sales" className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">{t("Sales Monitoring")}</h2>
        </div>
        {loading ? (
          <p className="admin-empty">{t("Memuat data penjualan…")}</p>
        ) : error ? (
          <Unavailable>{t("Data penjualan gagal dimuat.")}</Unavailable>
        ) : salesAvailable ? (
          <p className="management-data-note">
            {t("Pendapatan hari ini:")} {formatCurrency(dashboard?.sales?.today_revenue)} {t("— Transaksi hari ini:")} {formatNumber(dashboard?.sales?.today_transactions)}
          </p>
        ) : (
          <Unavailable>
            {t(dashboard?.sales?.message || 'Data penjualan belum tersedia.')}
          </Unavailable>
        )}
      </section>

      <section id="inventory" className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">{t("Inventory Monitoring")}</h2>
          {hasInventory && (
            <span>{formatNumber(inventory.total_products)} {t("produk terdata")}</span>
          )}
        </div>
        {loading ? (
          <p className="admin-empty">{t("Memuat data stok…")}</p>
        ) : error ? (
          <p className="admin-empty">{t("Data stok tidak dapat dimuat.")}</p>
        ) : !inventory ? (
          <p className="admin-empty">{t("Data stok belum tersedia.")}</p>
        ) : !Array.isArray(inventory.items) ? (
          <p className="admin-empty">{t("Daftar stok tidak tersedia.")}</p>
        ) : inventory.items.length === 0 ? (
          <p className="admin-empty">{t("Tidak ada stok kritis atau habis.")}</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("Produk")}</th>
                    <th>{t("Stok Saat Ini")}</th>
                    <th>{t("Minimum Stok")}</th>
                    <th>{t("Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{formatNumber(item.stock)}</td>
                      <td>{formatNumber(item.minimum_stock)}</td>
                      <td>
                        {item.status === 'out_of_stock' ?t("Habis") : t("Kritis")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {inventory.items_limited && (
              <p className="management-data-note">
                {t("Daftar dibatasi 50 produk dengan stok kritis atau habis.")}
              </p>
            )}
          </>
        )}
      </section>

      <section id="production" className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">{t("Production Monitoring")}</h2>
          {hasProduction && <span>{t("Operasional")} {production.date} {t("· WIB")}</span>}
        </div>
        {loading ? (
          <p className="admin-empty">{t("Memuat data produksi harian…")}</p>
        ) : error ? (
          <Unavailable>{t("Data produksi gagal dimuat.")}</Unavailable>
        ) : !production ? (
          <Unavailable>{t("Data produksi belum tersedia.")}</Unavailable>
        ) : (
          <>
            <div className="management-production-summary">
              <div><strong>{formatNumber(production.today_produced)}</strong><span>{t("Diproduksi hari ini")}</span></div>
              <div><strong>{formatNumber(production.today_printed)}</strong><span>{t("Label tercetak")}</span></div>
              <div><strong>{formatNumber(production.today_unprinted)}</strong><span>{t("Label belum dicetak")}</span></div>
              <div><strong>{formatNumber(production.last_7_days_produced)}</strong><span>{t("Produksi 7 hari terakhir")}</span></div>
            </div>

            <div className="management-production-chart">
              <h3>{t("Produksi 7 Hari Terakhir")}</h3>
              <p className="management-data-note">{t("Jumlah unit yang diproduksi per tanggal, termasuk hari dengan produksi 0.")}</p>
              <div className="management-production-bars" role="img" aria-label={`Grafik produksi tujuh hari. ${(production.trend || []).map((item) => `${item.date}: ${item.produced} unit`).join('; ')}`}>
                {(production.trend || []).map((item) => (
                  <div className="management-production-day" key={item.date}>
                    <span className="management-production-number">{formatNumber(item.produced)}</span>
                    <div className="management-production-track">
                      <div
                        className="management-production-bar"
                        style={{ height: `${Math.max(0, Number(item.produced) || 0) / maxDailyProduction * 100}%` }}
                      />
                    </div>
                    <span className="management-production-dayname">
                      {new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(`${item.date}T00:00:00+07:00`))}
                    </span>
                    <small>{item.date.slice(8, 10)}</small>
                  </div>
                ))}
              </div>
            </div>

            <h3 className="management-production-table-title">{t("Rincian Produksi Hari Ini")}</h3>
            {!production.items?.length ? (
              <p className="admin-empty">{t("Belum ada produksi tercatat hari ini.")}</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>{t("Produk")}</th><th>{t("Diproduksi")}</th><th>{t("Label Tercetak")}</th><th>{t("Belum Dicetak")}</th><th>{t("Stok Saat Ini")}</th></tr>
                  </thead>
                  <tbody>
                    {production.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{formatNumber(item.produced)}</td>
                        <td>{formatNumber(item.printed)}</td>
                        <td>{formatNumber(item.unprinted)}</td>
                        <td>{formatNumber(item.current_stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {production.items_limited && (
              <p className="management-data-note">{t("Hanya 20 produk dengan produksi terbanyak yang ditampilkan.")}</p>
            )}
            <p className="management-data-note">{t("Angka label berasal dari konfirmasi Admin, bukan deteksi otomatis printer. Pencetakan ulang dari menu Produk tidak masuk hitungan produksi.")}</p>
          </>
        )}
      </section>

      <section id="top-products" className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">{t("Top Selling Products")}</h2>
        </div>
        {loading ? (
          <p className="admin-empty">{t("Memuat data penjualan…")}</p>
        ) : error ? (
          <Unavailable>{t("Data produk terlaris gagal dimuat.")}</Unavailable>
        ) : (
          <Unavailable>
            {t("Peringkat produk terlaris belum tersedia karena belum ada sumber transaksi penjualan.")}
          </Unavailable>
        )}
      </section>

      <section id="reports" className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">{t("Business Reports")}</h2>
        </div>
        {loading ? (
          <p className="admin-empty">{t("Memeriksa ketersediaan laporan…")}</p>
        ) : error ? (
          <Unavailable>{t("Data laporan gagal dimuat.")}</Unavailable>
        ) : (
          <>
            <Unavailable>
              {t(dashboard?.reports?.message || "Laporan penjualan belum tersedia.")}
            </Unavailable>
            <p className="management-data-note">
              {t("Ringkasan stok berdasarkan katalog_produk. Statistik produksi 7 hari terakhir tersedia di Production Monitoring.")}
            </p>
          </>
        )}
      </section>

      <section id="notifications" className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">{t("Notifications")}</h2>
        </div>
        {loading ? (
          <p className="admin-empty">{t("Memuat notifikasi operasional…")}</p>
        ) : error || !inventory || !production ? (
          <Unavailable>{t("Notifikasi operasional belum dapat dimuat.")}</Unavailable>
        ) : (
          <ul className="management-production-alerts">
            {inventory.out_of_stock > 0 && <li><strong>{formatNumber(inventory.out_of_stock)} {t("produk habis.")}</strong> {t("Periksa daftar Inventory Monitoring.")}</li>}
            {inventory.critical_stock > 0 && <li><strong>{formatNumber(inventory.critical_stock)} {t("produk stok kritis.")}</strong> {t("Pertimbangkan penambahan produksi.")}</li>}
            {production.today_unprinted > 0 && <li><strong>{formatNumber(production.today_unprinted)} {t("label belum dicetak")}</strong> {t("dari produksi hari ini.")}</li>}
            {inventory.out_of_stock === 0 && inventory.critical_stock === 0 && production.today_unprinted === 0 && <li>{t("Tidak ada stok kritis, stok habis, atau label produksi tertunda yang terdeteksi.")}</li>}
          </ul>
        )}
        <p className="management-data-note">{t("Notifikasi ini merupakan ringkasan kondisi terbaru, bukan push notification.")}</p>
      </section>
    </ManagementLayout>
  )
}

export default ManagementDashboardPage
