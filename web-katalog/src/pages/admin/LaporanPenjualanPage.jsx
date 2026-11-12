import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import ManagementLayout from './ManagementLayout'
import {
  downloadLaporanPenjualanCsv,
  getLaporanPenjualan,
} from '../../services/laporanPenjualanService'
import './laporanPenjualan.css'

const angka = new Intl.NumberFormat('id-ID')
const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})
const metodeBayar = {
  tunai: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
}

function tanggalHariIni() {
  const bagian = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date()).map(({ type, value }) => [type, value]),
  )
  return `${bagian.year}-${bagian.month}-${bagian.day}`
}

function formatWaktu(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
}

function formatRupiah(value) {
  return rupiah.format(Number(value) || 0)
}

function LaporanPenjualanPage() {
  const location = useLocation()
  const Layout = location.pathname.startsWith('/admin/') ? AdminLayout : ManagementLayout
  const [formPeriode, setFormPeriode] = useState(() => {
    const hariIni = tanggalHariIni()
    return { dari: `${hariIni.slice(0, 7)}-01`, sampai: hariIni }
  })
  const [periode, setPeriode] = useState(formPeriode)
  const [halaman, setHalaman] = useState(1)
  const [laporan, setLaporan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ekspor, setEkspor] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    getLaporanPenjualan(periode.dari, periode.sampai, halaman)
      .then((data) => {
        if (active) {
          setLaporan(data)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) {
          setLaporan(null)
          setError(requestError?.message || 'Laporan penjualan gagal dimuat.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [periode, halaman, reload])

  const transaksi = laporan?.transaksi
  const terapkanFilter = useCallback((event) => {
    event.preventDefault()
    if (!formPeriode.dari || !formPeriode.sampai) {
      setError('Tanggal mulai dan tanggal selesai wajib diisi.')
      return
    }
    if (formPeriode.dari > formPeriode.sampai) {
      setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.')
      return
    }
    setError('')
    setLoading(true)
    setHalaman(1)
    setPeriode({ ...formPeriode })
    setReload((value) => value + 1)
  }, [formPeriode])

  const unduhCsv = async () => {
    setEkspor(true)
    setError('')
    try {
      await downloadLaporanPenjualanCsv(periode.dari, periode.sampai)
    } catch (downloadError) {
      setError(downloadError?.message || 'CSV laporan penjualan gagal diunduh.')
    } finally {
      setEkspor(false)
    }
  }

  const gantiHalaman = (nextPage) => {
    if (!transaksi || nextPage < 1 || nextPage > transaksi.last_page) return
    setLoading(true)
    setHalaman(nextPage)
  }

  return (
    <Layout title="Laporan Penjualan">
      {error && <div className="admin-alert" role="alert">{error}</div>}

      <section className="admin-card management-section kuki-sales-controls">
        <div className="admin-card-head">
          <div>
            <h2 className="display-font">Laporan Penjualan</h2>
            <p className="management-data-note">Ringkasan dari transaksi POS yang tersimpan di database.</p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={unduhCsv}
            disabled={loading || ekspor || !laporan}
          >
            {ekspor ? 'Menyiapkan CSV...' : 'Unduh CSV'}
          </button>
        </div>
        <form className="kuki-laporan-form" onSubmit={terapkanFilter}>
          <label className="admin-field">
            <span>Tanggal mulai</span>
            <input
              type="date"
              value={formPeriode.dari}
              onChange={(event) => setFormPeriode((value) => ({ ...value, dari: event.target.value }))}
              required
            />
          </label>
          <label className="admin-field">
            <span>Tanggal selesai</span>
            <input
              type="date"
              value={formPeriode.sampai}
              onChange={(event) => setFormPeriode((value) => ({ ...value, sampai: event.target.value }))}
              required
            />
          </label>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
            {loading ? 'Memuat...' : 'Tampilkan Laporan'}
          </button>
        </form>
        <p className="kuki-sales-note">Periode laporan maksimal 93 hari. Data mencakup transaksi tersimpan, bukan laba atau HPP.</p>
      </section>

      <section className="admin-stats kuki-sales-summary" aria-label="Ringkasan penjualan">
        <div className="admin-stat">
          <span className="admin-stat-label">Total penjualan</span>
          <strong className="admin-stat-value">{loading ? '…' : laporan ? formatRupiah(laporan.ringkasan.total_penjualan) : '—'}</strong>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">Jumlah transaksi</span>
          <strong className="admin-stat-value">{loading ? '…' : laporan ? angka.format(laporan.ringkasan.jumlah_transaksi) : '—'}</strong>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">Rata-rata transaksi</span>
          <strong className="admin-stat-value">{loading ? '…' : laporan ? formatRupiah(laporan.ringkasan.rata_rata_transaksi) : '—'}</strong>
        </div>
      </section>

      <section className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">Penjualan per Metode Pembayaran</h2>
        </div>
        {loading ? (
          <p className="admin-empty">Memuat ringkasan pembayaran...</p>
        ) : !laporan ? (
          <p className="admin-empty">Ringkasan pembayaran belum tersedia.</p>
        ) : !laporan?.per_metode?.length ? (
          <p className="admin-empty">Belum ada transaksi pada periode ini.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table kuki-sales-payment-table">
              <thead>
                <tr><th>Metode</th><th>Transaksi</th><th>Total penjualan</th></tr>
              </thead>
              <tbody>
                {laporan.per_metode.map((item) => (
                  <tr key={item.metode_bayar}>
                    <td>{metodeBayar[item.metode_bayar] || item.metode_bayar}</td>
                    <td>{angka.format(item.jumlah_transaksi)}</td>
                    <td>{formatRupiah(item.total_penjualan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">Rincian Transaksi</h2>
          {transaksi && <span>{angka.format(transaksi.total)} transaksi</span>}
        </div>
        {loading ? (
          <p className="admin-empty">Memuat transaksi...</p>
        ) : !laporan ? (
          <p className="admin-empty">Rincian transaksi belum tersedia.</p>
        ) : !transaksi?.items?.length ? (
          <p className="admin-empty">Belum ada transaksi pada periode ini.</p>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table kuki-sales-transactions-table">
                <thead>
                  <tr><th>Nomor</th><th>Waktu bayar</th><th>Kasir</th><th>Metode</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {transaksi.items.map((item) => (
                    <tr key={item.nomor}>
                      <td>{item.nomor}</td>
                      <td>{formatWaktu(item.dibayar_pada)}</td>
                      <td>{item.kasir || '—'}</td>
                      <td>{metodeBayar[item.metode_bayar] || item.metode_bayar}</td>
                      <td>{formatRupiah(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transaksi.last_page > 1 && (
              <div className="kuki-sales-pagination">
                <span>Halaman {transaksi.page} dari {transaksi.last_page}</span>
                <div>
                  <button type="button" className="admin-btn" onClick={() => gantiHalaman(transaksi.page - 1)} disabled={loading || transaksi.page <= 1}>Sebelumnya</button>
                  <button type="button" className="admin-btn" onClick={() => gantiHalaman(transaksi.page + 1)} disabled={loading || transaksi.page >= transaksi.last_page}>Berikutnya</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  )
}

export default LaporanPenjualanPage
