import useAdminTranslation from '../../hooks/useAdminTranslation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import { getProduk } from '../../services/produkService'
import {
  getProduksiHarian,
  catatProduksiHarian,
  konfirmasiCetakProduksi,
} from '../../services/produksiHarianService'
import {
  analisisLabel,
  cetakLabelBarcode,
  UKURAN_LABEL,
  KERAPATAN,
  MODE_CETAK,
  BATAS_CETAK_LABEL,
} from '../../utils/printBarcodeLabels'
import './ProduksiHarianPage.css'

const format = (jumlah) => new Intl.NumberFormat('id-ID').format(jumlah)

const errorText = (err, t = (value) => value) => {
  const pesan = err?.data?.errors
  const detail = pesan && typeof pesan === 'object' ? Object.values(pesan).flat().filter(Boolean).join(' ') : ''
  return t(detail || err?.message || 'Terjadi kesalahan.')
}

function PilihanCetak({ item, onSelesai }) {
  const { t } = useAdminTranslation()

  const [jumlah, setJumlah] = useState(() => String(Math.min(item.jumlah_siap_cetak, BATAS_CETAK_LABEL)))
  const [ukuran, setUkuran] = useState(() =>
    UKURAN_LABEL.find((opsi) => !analisisLabel(item.barcode, opsi.id, 'normal').error)?.id || '80x35'
  )
  const [kerapatan, setKerapatan] = useState('normal')
  const [media, setMedia] = useState('a4')
  const [baruBukaPrint, setBaruBukaPrint] = useState(false)
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')
  const nilaiJumlah = jumlah.trim() ? Number(jumlah) : NaN
  const validJumlah = Number.isSafeInteger(nilaiJumlah) && nilaiJumlah >= 1 &&
    nilaiJumlah <= BATAS_CETAK_LABEL && nilaiJumlah <= item.jumlah_siap_cetak
  const analisis = useMemo(() => analisisLabel(item.barcode, ukuran, kerapatan), [item.barcode, ukuran, kerapatan])

  const cetak = () => {
    if (!validJumlah || analisis.error || baruBukaPrint) return
    setError('')
    const hasil = cetakLabelBarcode({
      barcode: item.barcode,
      productName: item.nama_produk,
      jumlah: nilaiJumlah,
      ukuranId: ukuran,
      kerapatanId: kerapatan,
      media,
    })
    if (hasil.error) setError(hasil.error)
    else setBaruBukaPrint(true)
  }

  const konfirmasi = async () => {
    if (!baruBukaPrint || !validJumlah) return
    setProses(true)
    setError('')
    try {
      await konfirmasiCetakProduksi(item.id, nilaiJumlah)
      // Server telah mencatat. Jangan izinkan klik konfirmasi kedua kalinya
      // hanya karena GET daftar berikutnya mengalami gangguan jaringan.
      setBaruBukaPrint(false)
      try {
        await onSelesai()
      } catch {
        setError(t("Konfirmasi cetak SUDAH tersimpan, tetapi daftar gagal diperbarui. Muat ulang halaman; jangan konfirmasi ulang."))
      }
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="kuki-produksi-cetak">
      <label>{t("Jumlah label (sisa maks.")} {format(item.jumlah_siap_cetak)} {t("pcs)")}
        <input type="number" min="1" step="1"
          max={Math.min(item.jumlah_siap_cetak, BATAS_CETAK_LABEL)}
          value={jumlah} onChange={(e) => { setJumlah(e.target.value); setBaruBukaPrint(false) }}
          disabled={proses} />
      </label>
      <label>{t("Ukuran stiker")}
        <select value={ukuran} disabled={proses} onChange={(e) => { setUkuran(e.target.value); setBaruBukaPrint(false) }}>
          {UKURAN_LABEL.map((opsi) => <option key={opsi.id} value={opsi.id}>{opsi.nama}</option>)}
        </select>
      </label>
      <label>{t("Kerapatan")}
        <select value={kerapatan} disabled={proses} onChange={(e) => { setKerapatan(e.target.value); setBaruBukaPrint(false) }}>
          {KERAPATAN.map((opsi) => <option key={opsi.id} value={opsi.id}>{opsi.nama}</option>)}
        </select>
      </label>
      <label>{t("Media")}
        <select value={media} disabled={proses} onChange={(e) => { setMedia(e.target.value); setBaruBukaPrint(false) }}>
          {MODE_CETAK.map((opsi) => <option key={opsi.id} value={opsi.id}>{opsi.nama}</option>)}
        </select>
      </label>
      {analisis.error && <p className="kuki-produksi-warning" role="alert">{analisis.error}</p>}
      {error && <p className="kuki-produksi-warning" role="alert">{error}</p>}
      <div className="kuki-produksi-actions">
        <button type="button" className="admin-btn admin-btn-ghost"
          disabled={!validJumlah || Boolean(analisis.error) || proses || baruBukaPrint} onClick={cetak}>
          <span aria-hidden="true">▤</span> {t("Cetak")} {validJumlah ? nilaiJumlah : ''} {t("Label")}
        </button>
        {baruBukaPrint && (
          <button type="button" className="admin-btn admin-btn-primary" disabled={proses} onClick={konfirmasi}>
            {proses ?t("Menyimpan...") :t("Sudah tercetak — Konfirmasi")}
          </button>
        )}
      </div>
      {baruBukaPrint && (
        <p className="kuki-produksi-help">{t("Konfirmasi hanya jika label benar-benar keluar dari printer. Jika cetak dibatalkan, tutup panel tanpa konfirmasi.")}</p>
      )}
    </div>
  )
}

export default function ProduksiHarianPage() {
  const { t } = useAdminTranslation()

  const [produk, setProduk] = useState([])
  const [ringkasan, setRingkasan] = useState(null)
  const [produkId, setProdukId] = useState('')
  const [jumlah, setJumlah] = useState('1')
  const [tanggalLihat, setTanggalLihat] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [cetakId, setCetakId] = useState(null)
  const [refreshNo, setRefreshNo] = useState(0)

  const refresh = useCallback(async (tanggal) => {
    const [items, data] = await Promise.all([
      getProduk(),
      getProduksiHarian(tanggal),
    ])
    setProduk(items)
    setRingkasan(data)
    setTanggalLihat(data.tanggal)
  }, [])

  useEffect(() => {
    let aktif = true
    setLoading(true)
    Promise.all([getProduk(), getProduksiHarian()])
      .then(([items, data]) => {
        if (!aktif) return
        setProduk(items)
        setRingkasan(data)
        setTanggalLihat(data.tanggal)
      })
      .catch((err) => { if (aktif) setError(errorText(err, t)) })
      .finally(() => { if (aktif) setLoading(false) })
    return () => { aktif = false }
  }, [])

  const refreshData = useCallback(async () => {
    await refresh(tanggalLihat)
    setRefreshNo((x) => x + 1)
  }, [refresh, tanggalLihat])

  const catat = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    const angka = Number(jumlah)
    if (!produkId || !Number.isSafeInteger(angka) || angka < 1 || angka > 10000) {
      setError(t("Pilih produk dan isi jumlah 1 sampai 10.000 pcs."))
      return
    }
    setSaving(true)
    try {
      await catatProduksiHarian(produkId, angka)
      setJumlah('1')
      setMessage(t('{jumlah} pcs berhasil dicatat dan ditambahkan ke stok produk.', { jumlah: format(angka) }))
      try {
        await refresh() // kembali ke hari ini; produksi tidak bisa dibackdate
      } catch {
        setError(t("Produksi SUDAH tersimpan, tetapi daftar gagal diperbarui. Tekan Perbarui; jangan catat ulang jumlah yang sama."))
      }
    } catch (err) {
      setError(errorText(err, t))
    } finally {
      setSaving(false)
    }
  }

  const daftar = Array.isArray(ringkasan?.items) ? ringkasan.items : []
  const jumlahDiproduksi = Number(ringkasan?.total_produksi ?? 0)
  const belumDicetak = Number(ringkasan?.total_belum_dicetak ?? 0)

  return (
    <AdminLayout title={t("Produksi Harian")}>
      <div className="admin-form-toolbar">
        <Link to="/admin/produk" className="admin-btn admin-btn-ghost">{t("← Kembali ke Produk")}</Link>
      </div>

      {message && <div role="status" className="admin-alert admin-alert-success">{message}</div>}
      {error && <div role="alert" className="admin-alert">{error}</div>}

      <section className="admin-card">
        <div className="admin-card-head"><h2 className="display-font">{t("Catat Produksi Hari Ini")}</h2></div>
        <p className="admin-sub">{t("Jumlah yang dicatat akan")} <strong>{t("menambah stok produk")}</strong>{t(". Jangan masukkan kembali stok yang sudah dicatat melalui menu Ubah Produk.")}</p>
        <form className="admin-form kuki-produksi-form" onSubmit={catat}>
          <label className="admin-field">{t("Produk")}
            <select value={produkId} onChange={(e) => setProdukId(e.target.value)} disabled={saving || loading} required>
              <option value="">{t("Pilih produk dari katalog")}</option>
              {produk.map((item) => <option key={item.id} value={item.id}>
                {item.nama} — {item.kategori ||t("Tanpa kategori")} {t("(stok:")} {format(item.stok)})
              </option>)}
            </select>
          </label>
          <label className="admin-field">{t("Jumlah produksi baru (pcs)")}
            <input type="number" min="1" max="10000" step="1" value={jumlah} disabled={saving || loading}
              onChange={(e) => setJumlah(e.target.value)} required />
          </label>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || loading || !produkId}>
            {saving ?t("Menyimpan...") :t("+ Catat Produksi")}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="display-font">{t("Riwayat Produksi")}</h2>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => {
            setError('')
            refreshData().catch((err) => setError(errorText(err, t)))
          }} disabled={loading}>{t("Perbarui")}</button>
        </div>
        <div className="kuki-produksi-filter">
          <label className="admin-field">{t("Tanggal pencatatan")}
            <input type="date" value={tanggalLihat} onChange={(e) => {
              const tanggal = e.target.value
              setTanggalLihat(tanggal)
              setCetakId(null)
              setError('')
              setLoading(true)
              refresh(tanggal).catch((err) => setError(errorText(err, t))).finally(() => setLoading(false))
            }} />
          </label>
          <p className="admin-sub">{t("Produksi baru hanya dapat dicatat untuk hari ini (WIB). Cetak dan konfirmasi label juga untuk hari ini.")}</p>
        </div>
        <div className="kuki-produksi-metrics">
          <div><small>{t("Produksi")} {tanggalLihat ||t("hari ini")}</small><strong>{format(jumlahDiproduksi)} {t("pcs")}</strong></div>
          <div><small>{t("Belum ditandai tercetak")}</small><strong>{format(belumDicetak)} {t("label")}</strong></div>
          <div><small>{t("Jumlah jenis produk")}</small><strong>{format(daftar.length)}</strong></div>
        </div>

        {loading ? <p className="admin-empty">{t("Memuat data...")}</p> : daftar.length === 0 ? (
          <p className="admin-empty">{t("Belum ada produksi pada tanggal ini.")}</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>{t("Produk")}</th><th>{t("Stok")}</th><th>{t("Produksi")}</th><th>{t("Sudah cetak")}</th><th>{t("Belum cetak")}</th><th>{t("Aksi")}</th></tr></thead>
              <tbody>
                {daftar.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.nama_produk}</strong><small className="admin-sub">{item.nama_kategori || '-'} · {item.barcode ||t("Tanpa barcode")}</small></td>
                    <td>{format(item.stok_saat_ini)}</td>
                    <td>{format(item.jumlah_produksi)}</td>
                    <td>{format(item.jumlah_label_tercetak)}</td>
                    <td><strong>{format(item.jumlah_belum_dicetak)}</strong></td>
                    <td>
                      <button type="button" className="admin-btn admin-btn-ghost"
                        onClick={() => setCetakId((id) => id === item.id ? null : item.id)}
                        disabled={!item.barcode || item.jumlah_siap_cetak <= 0 || ringkasan?.tanggal !== ringkasan?.tanggal_hari_ini}>
                        {cetakId === item.id ?t("Tutup") :t("Cetak label")}
                      </button>
                      {cetakId === item.id && (
                        <PilihanCetak key={`${item.id}-${refreshNo}`} item={item} onSelesai={async () => {
                          await refreshData()
                          setCetakId(null)
                          setMessage(t("Jumlah label tercetak sudah dicatat."))
                        }} />
                      )}
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
