import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import ManagementLayout from './ManagementLayout'
import { getLaporanInventaris } from '../../services/laporanInventarisService'
import {
  downloadLaporanInventarisExcel,
  downloadLaporanInventarisPdf,
  cetakLaporanInventaris,
  periksaUsulanKoreksiExcel,
} from '../../services/laporanInventarisExportService'
import './laporanInventaris.css'

const angka = new Intl.NumberFormat('id-ID')
const namaJenis = {
  stok_awal: 'Stok awal',
  produksi: 'Produksi',
  koreksi: 'Koreksi stok',
  opname: 'Stock opname',
  rusak: 'Barang rusak',
  kedaluwarsa: 'Kedaluwarsa',
}
const fmt = (nilai) => angka.format(Number(nilai) || 0)
function fmtWaktu(teks) {
  if (!teks) return '—'
  const tanggal = new Date(teks)
  return Number.isNaN(tanggal.getTime())
    ? '—'
    : tanggal.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Metrik({ judul, nilai, keterangan }) {
  return (
    <div className="admin-stat">
      <span className="admin-stat-value display-font">{nilai}</span>
      <span className="admin-stat-label">{judul}</span>
      {keterangan && <small className="kuki-laporan-metric-note">{keterangan}</small>}
    </div>
  )
}

function LaporanInventarisPage() {
  // Gunakan sidebar sesuai asal route, data dan API laporan tetap sama.
  const location = useLocation()
  const Layout = location.pathname.startsWith('/admin/') ? AdminLayout : ManagementLayout
  const [mulai, setMulai] = useState('')
  const [selesai, setSelesai] = useState('')
  const [filterAktif, setFilterAktif] = useState({ mulai: '', selesai: '' })
  const [laporan, setLaporan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [eksporAktif, setEksporAktif] = useState('')
  const [hasilKoreksi, setHasilKoreksi] = useState(null)
  const [sedangCekKoreksi, setSedangCekKoreksi] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setHasilKoreksi(null)
    setError('')
    getLaporanInventaris(filterAktif.mulai, filterAktif.selesai)
      .then((data) => {
        if (!active) return
        if (!data?.periode || !data?.mutasi || !data?.stok_saat_ini) {
          throw new Error('Format laporan dari server tidak sesuai.')
        }
        setLaporan(data)
        setMulai(data.periode.mulai)
        setSelesai(data.periode.selesai)
      })
      .catch((err) => {
        if (!active) return
        setLaporan(null)
        setError(err?.message || 'Tidak dapat memuat laporan inventaris.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filterAktif, reload])

  const tren = useMemo(() => Array.isArray(laporan?.harian_produksi) ? laporan.harian_produksi : [], [laporan])
  const maksimum = useMemo(() => Math.max(1, ...tren.map((item) => Number(item.jumlah) || 0)), [tren])
  const rincian = Array.isArray(laporan?.mutasi?.berdasarkan_jenis) ? laporan.mutasi.berdasarkan_jenis : []
  const mutasi = Array.isArray(laporan?.mutasi_terakhir) ? laporan.mutasi_terakhir : []
  const applyFilter = useCallback((event) => {
    event.preventDefault()
    if (!mulai || !selesai) return setError('Tanggal mulai dan selesai wajib diisi.')
    if (mulai > selesai) return setError('Tanggal akhir tidak boleh lebih awal dari tanggal mulai.')
    setFilterAktif({ mulai, selesai })
    setReload((v) => v + 1)
  }, [mulai, selesai])

  const unduhFile = async (format) => {
    if (!laporan || eksporAktif) return
    setEksporAktif(format)
    setError('')
    try {
      if (format === 'excel') {
        await downloadLaporanInventarisExcel(laporan)
      } else if (format === 'pdf') {
        await downloadLaporanInventarisPdf(laporan)
      } else if (format === 'cetak') {
        await cetakLaporanInventaris(laporan)
      }
    } catch (err) {
      setError(err?.message || `Tidak dapat mengunduh laporan ${format.toUpperCase()}.`)
    } finally {
      setEksporAktif('')
    }
  }

  const cekBerkasExcel = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !laporan || sedangCekKoreksi) return
    setSedangCekKoreksi(true)
    setHasilKoreksi(null)
    setError('')
    try {
      const hasil = await periksaUsulanKoreksiExcel(file, laporan)
      setHasilKoreksi({ ...hasil, namaFile: file.name })
    } catch (err) {
      setError(err?.message || 'File Excel koreksi gagal dibaca.')
    } finally {
      setSedangCekKoreksi(false)
    }
  }

  return (
    <Layout title="Laporan Inventaris">
      <section className="admin-card management-section kuki-laporan-controls">
        <div className="admin-card-head">
          <h2 className="display-font">Laporan Inventaris</h2>
          <span>Stok, produksi, mutasi, dan stock opname</span>
        </div>
        <form className="kuki-laporan-form" onSubmit={applyFilter}>
          <label className="admin-field">Tanggal mulai
            <input type="date" value={mulai} onChange={(event) => setMulai(event.target.value)} required />
          </label>
          <label className="admin-field">Tanggal selesai
            <input type="date" value={selesai} onChange={(event) => setSelesai(event.target.value)} required />
          </label>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={loading || Boolean(eksporAktif)}>
            {loading ? 'Memuat...' : 'Tampilkan Laporan'}
          </button>
        </form>
        <div className="kuki-laporan-export-area" aria-label="Unduh dan cetak laporan">
          <div className="kuki-laporan-export-head">
            <div><strong>Ekspor dan cetak laporan</strong><small>Gunakan periode yang sudah ditampilkan di atas.</small></div>
          </div>
          <div className="kuki-laporan-export-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => unduhFile('excel')} disabled={loading || Boolean(eksporAktif) || !laporan}>
              {eksporAktif === 'excel' ? 'Menyiapkan Excel...' : 'Unduh Excel (.xlsx)'}
            </button>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => unduhFile('pdf')} disabled={loading || Boolean(eksporAktif) || !laporan}>
              {eksporAktif === 'pdf' ? 'Menyiapkan PDF...' : 'Unduh PDF (.pdf)'}
            </button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => unduhFile('cetak')} disabled={loading || Boolean(eksporAktif) || !laporan}>
              {eksporAktif === 'cetak' ? 'Menyiapkan cetak...' : 'Cetak Langsung'}
            </button>
          </div>
          <p className="kuki-laporan-export-info">
            Excel dapat diedit dan dicetak melalui Microsoft Excel atau aplikasi spreadsheet lainnya.
            PDF adalah dokumen arsip. Cetak Langsung membuka tampilan khusus cetak dan dialog printer;
            di sana kamu juga bisa memilih <strong>Save as PDF</strong>. Browser mungkin meminta izin membuka jendela baru.
          </p>
        </div>
        {error && <p role="alert" className="admin-alert management-error">{error}</p>}
        {loading && <p className="admin-empty">Memuat laporan dari server...</p>}
      </section>

      {!loading && laporan && (
        <div className="kuki-laporan-result">
          <section className="management-section" aria-label="Ringkasan laporan">
            <div className="management-section-heading">
              <h2 className="display-font">Ringkasan {laporan.periode.mulai} s.d. {laporan.periode.selesai}</h2>
              <span>Diambil {fmtWaktu(laporan.dibuat_pada)}</span>
            </div>
            <div className="admin-stats">
              <Metrik judul="Stok Saat Ini" nilai={`${fmt(laporan.stok_saat_ini.unit)} pcs`} keterangan="Posisi stok terkini, bukan jumlah stok selama periode" />
              <Metrik judul="Mutasi Masuk" nilai={`${fmt(laporan.mutasi.masuk)} pcs`} keterangan="Termasuk produksi, koreksi, dan opname yang menambah stok" />
              <Metrik judul="Mutasi Keluar" nilai={`${fmt(laporan.mutasi.keluar)} pcs`} keterangan="Termasuk rusak, kedaluwarsa, dan koreksi yang mengurangi stok" />
              <Metrik judul="Produksi Tercatat" nilai={`${fmt(laporan.produksi.jumlah)} pcs`} keterangan="Sudah termasuk di mutasi masuk; jangan dijumlahkan kembali" />
              <Metrik judul="Stock Opname Selesai" nilai={`${fmt(laporan.opname_selesai)} sesi`} />
              <Metrik judul="Stok Kritis / Habis" nilai={`${fmt(laporan.stok_saat_ini.kritis)} / ${fmt(laporan.stok_saat_ini.habis)}`} keterangan="Jumlah jenis produk, berdasarkan stok saat ini" />
            </div>
          </section>

          <section className="admin-card management-section">
            <div className="admin-card-head"><h2 className="display-font">Aktivitas Stok Berdasarkan Jenis</h2></div>
            {rincian.length === 0 ? <p className="admin-empty">Belum ada mutasi dalam periode ini.</p> : (
              <div className="admin-table-wrap">
                <table className="admin-table"><thead><tr><th>Jenis</th><th>Kejadian</th><th>Masuk</th><th>Keluar</th></tr></thead>
                  <tbody>{rincian.map((r) => (
                    <tr key={r.jenis}><td>{namaJenis[r.jenis] || r.jenis}</td><td>{fmt(r.kejadian)}</td>
                      <td>{fmt(r.masuk)} pcs</td><td>{fmt(r.keluar)} pcs</td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="admin-card management-section">
            <div className="admin-card-head"><h2 className="display-font">Grafik Produksi per Hari</h2></div>
            {tren.length === 0 ? <p className="admin-empty">Tidak ada produksi yang tercatat dalam periode ini.</p> : (
              <div className="kuki-laporan-chart" role="img" aria-label="Diagram jumlah produksi per tanggal">
                {tren.map((item) => (
                  <div className="kuki-laporan-bar-row" key={item.tanggal}>
                    <span>{item.tanggal}</span>
                    <div className="kuki-laporan-bar-track"><div className="kuki-laporan-bar" style={{ width: `${(Number(item.jumlah) / maksimum) * 100}%` }} /></div>
                    <strong>{fmt(item.jumlah)} pcs</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="admin-card management-section">
            <div className="admin-card-head"><h2 className="display-font">Riwayat Mutasi pada Periode</h2>
              <span>Maksimal {fmt(laporan.batas_tampilan_mutasi)} mutasi terbaru ditampilkan</span>
            </div>
            {mutasi.length === 0 ? <p className="admin-empty">Belum ada mutasi pada periode ini.</p> : (
              <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>Waktu</th><th>Produk</th><th>Jenis</th><th>Perubahan</th><th>Stok Akhir</th><th>Petugas</th><th>Alasan</th></tr></thead>
                <tbody>{mutasi.map((m) => (
                  <tr key={m.id}><td>{fmtWaktu(m.waktu)}</td><td>{m.produk}<small className="kuki-laporan-sku">{m.sku || '—'}</small></td>
                    <td>{namaJenis[m.jenis] || m.jenis}</td>
                    <td>{Number(m.perubahan) > 0 ? '+' : ''}{fmt(m.perubahan)}</td>
                    <td>{fmt(m.stok_sesudah)}</td><td>{m.petugas}</td><td>{m.keterangan || '—'}</td></tr>
                ))}</tbody>
              </table></div>
            )}
            {mutasi.length === laporan.batas_tampilan_mutasi && (
              <p className="management-data-note">Untuk riwayat periode lengkap, gunakan unduhan Excel atau PDF.</p>
            )}
          </section>
          <section className="kuki-laporan-correction-info" aria-label="Koreksi laporan">
            <strong>Menemukan data yang perlu dikoreksi?</strong>
            <p>Isi kolom kuning pada sheet <b>Usulan Koreksi</b> di Excel, lalu unggah kembali file untuk <b>memeriksa usulan</b> sebelum dicatat secara resmi. Ini hanya pratinjau, tidak mengubah stok atau riwayat database.</p>
            <div className="kuki-laporan-correction-actions">
              <label className="kuki-laporan-upload-label">
                {sedangCekKoreksi ? 'Memeriksa Excel...' : 'Periksa Excel Usulan Koreksi'}
                <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={cekBerkasExcel} disabled={sedangCekKoreksi || Boolean(eksporAktif)} />
              </label>
              {location.pathname.startsWith('/admin/') && <Link className="admin-btn admin-btn-ghost" to="/admin/mutasi-stok">Buka Koreksi Stok Admin</Link>}
            </div>
            {hasilKoreksi && (
              <div className="kuki-laporan-koreksi-hasil" aria-live="polite">
                <p><strong>{hasilKoreksi.namaFile}</strong>: {fmt(hasilKoreksi.usulan.length)} usulan valid, {fmt(hasilKoreksi.masalah.length)} baris bermasalah. Seluruh data diperiksa ulang dengan server.</p>
                {hasilKoreksi.masalah.length > 0 && (
                  <div className="kuki-laporan-koreksi-peringatan" role="alert">
                    {hasilKoreksi.masalah.slice(0, 10).map((teks, i) => <p key={i}>{teks}</p>)}
                    {hasilKoreksi.masalah.length > 10 && <p>Masih ada {fmt(hasilKoreksi.masalah.length - 10)} catatan lainnya.</p>}
                  </div>
                )}
                {hasilKoreksi.usulan.length > 0 && (
                  <div className="admin-table-wrap"><table className="admin-table">
                    <thead><tr><th>Produk</th><th>Perubahan tercatat</th><th>Usulan</th><th>Selisih</th><th>Alasan</th></tr></thead>
                    <tbody>{hasilKoreksi.usulan.slice(0, 100).map((item) => <tr key={item.nomor}>
                      <td>{item.produk}<small className="kuki-laporan-sku">{item.sku || '—'}</small></td>
                      <td>{fmt(item.tercatat)}</td><td>{fmt(item.usulan)}</td>
                      <td>{item.selisih > 0 ? '+' : ''}{fmt(item.selisih)}</td><td>{item.alasan}</td>
                    </tr>)}</tbody>
                  </table></div>
                )}
                {hasilKoreksi.usulan.length > 100 && <p>Menampilkan 100 usulan pertama. Usulan lainnya tetap tersimpan dalam Excel.</p>}
                <small>Admin harus melakukan koreksi resmi melalui menu Mutasi Stok atau Stock Opname. Owner tidak dapat mengubah stok melalui file Excel.</small>
              </div>
            )}
          </section>
          <p className="management-data-note kuki-laporan-note">Laporan stok tidak sama dengan laporan penjualan. Modul POS masih belum terintegrasi. Stok sebelum sistem Mutasi Stok diterapkan tidak memiliki riwayat lengkap.</p>
        </div>
      )}
    </Layout>
  )
}

export default LaporanInventarisPage
