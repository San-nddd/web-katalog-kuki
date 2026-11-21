import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import ManagementLayout from './ManagementLayout'
import { getProduk } from '../../services/produkService'
import {
  ambilDaftarOpname, ambilDetailOpname, buatOpname, simpanHitungFisik,
  selesaikanOpname, batalkanOpname, keluarkanBarang, ringkasanPengeluaran,
} from '../../services/opnameStokService'

const format = (value) => new Intl.NumberFormat('id-ID').format(Number(value ?? 0))
const statusLabel = { draft: 'Draft', selesai: 'Selesai', dibatalkan: 'Dibatalkan' }
const tanggal = (value) => value ? new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '—'
const safeError = (err) => err?.data?.message || err?.message || 'Terjadi kesalahan. Silakan coba lagi.'

function StockOpnamePage({ readOnly = false }) {
  const [produk, setProduk] = useState([])
  const [sesi, setSesi] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [pilihId, setPilihId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [fisik, setFisik] = useState({})
  const [catatanDetail, setCatatanDetail] = useState({})
  const [dipilih, setDipilih] = useState([])
  const [catatanSesi, setCatatanSesi] = useState('')
  const [ringkasan, setRingkasan] = useState(null)
  const [jenisKeluar, setJenisKeluar] = useState('rusak')
  const [produkKeluar, setProdukKeluar] = useState('')
  const [jumlahKeluar, setJumlahKeluar] = useState('')
  const [tanggalKedaluwarsa, setTanggalKedaluwarsa] = useState('')
  const [alasanKeluar, setAlasanKeluar] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pesan, setPesan] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)

  const refresh = useCallback(() => setRevision((v) => v + 1), [])

  useEffect(() => {
    let aktif = true
    setLoading(true)
    setError('')
    Promise.all([getProduk(), ambilDaftarOpname({ status: filterStatus, page }), ringkasanPengeluaran()])
      .then(([items, result, summary]) => {
        if (!aktif) return
        setProduk(Array.isArray(items) ? items : [])
        setSesi(Array.isArray(result?.items) ? result.items : [])
        setTotal(Number(result?.total || 0))
        setLastPage(Number(result?.last_page || 1))
        setRingkasan(summary)
      })
      .catch((err) => { if (aktif) setError(safeError(err)) })
      .finally(() => { if (aktif) setLoading(false) })
    return () => { aktif = false }
  }, [filterStatus, page, revision])

  useEffect(() => {
    if (!pilihId) { setDetail(null); return undefined }
    let aktif = true
    setDetail(null)
    ambilDetailOpname(pilihId)
      .then((data) => {
        if (!aktif) return
        setDetail(data)
        setFisik(Object.fromEntries((data?.items || []).map((item) => [item.id, item.stok_fisik === null ? '' : String(item.stok_fisik)])))
        setCatatanDetail(Object.fromEntries((data?.items || []).map((item) => [item.id, item.catatan || ''])))
      })
      .catch((err) => { if (aktif) setError(safeError(err)) })
    return () => { aktif = false }
  }, [pilihId, revision])

  const pilihanProduk = useMemo(() => produk.find((p) => String(p.id) === produkKeluar), [produk, produkKeluar])
  const daftarProduk = useMemo(() => [...produk].sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id')), [produk])

  const jalankan = async (pekerjaan, sukses, { tutupDetail = false } = {}) => {
    setBusy(true); setError(''); setPesan('')
    try {
      await pekerjaan()
      if (tutupDetail) { setPilihId(null); setDetail(null) }
      setPesan(sukses)
      refresh()
    } catch (err) { setError(safeError(err)) }
    finally { setBusy(false) }
  }

  const buatSesi = (event) => {
    event.preventDefault()
    if (!dipilih.length) { setError('Pilih setidaknya satu produk untuk dihitung.'); return }
    jalankan(async () => {
      const result = await buatOpname(dipilih.map(Number), catatanSesi)
      setDipilih([]); setCatatanSesi(''); setPilihId(result.id)
      setPage(1); setFilterStatus('')
    }, 'Draft stock opname dibuat. Isi stok fisik dan simpan penghitungan.')
  }

  const simpanFisik = (event) => {
    event.preventDefault()
    const items = (detail?.items || []).map((item) => ({
      id: item.id,
      stok_fisik: Number(fisik[item.id]),
      catatan: catatanDetail[item.id] || '',
    }))
    if (items.some((item) => fisik[item.id] === '' || !Number.isSafeInteger(item.stok_fisik) || item.stok_fisik < 0 || item.stok_fisik > 4294967295)) {
      setError('Isi semua stok fisik dengan bilangan bulat nonnegatif.'); return
    }
    jalankan(() => simpanHitungFisik(detail.id, items), 'Hasil hitung fisik disimpan sebagai draft. Stok sistem belum berubah.')
  }

  const finalkan = () => {
    if (!window.confirm('Yakin finalisasi stock opname? Stok produk yang berbeda akan disesuaikan secara permanen.')) return
    jalankan(() => selesaikanOpname(detail.id), 'Stock opname selesai. Selisih stok masuk ke Riwayat Mutasi.', { tutupDetail: true })
  }

  const batalkan = () => {
    if (!window.confirm('Batalkan draft ini? Tidak ada perubahan stok.')) return
    jalankan(() => batalkanOpname(detail.id), 'Sesi dibatalkan tanpa mengubah stok.', { tutupDetail: true })
  }

  const simpanPengeluaran = (event) => {
    event.preventDefault()
    if (!pilihanProduk) { setError('Pilih produk terlebih dahulu.'); return }
    const jumlah = Number(jumlahKeluar)
    const stok = Number(pilihanProduk.stok ?? 0)
    if (!Number.isSafeInteger(jumlah) || jumlah < 1 || jumlah > stok) {
      setError('Jumlah keluar harus lebih dari nol dan tidak melebihi stok tersedia.'); return
    }
    if (alasanKeluar.trim().length < 8) { setError('Alasan minimal delapan karakter.'); return }
    if (jenisKeluar === 'kedaluwarsa' && !tanggalKedaluwarsa) { setError('Isi tanggal kedaluwarsa.'); return }
    jalankan(async () => {
      await keluarkanBarang({
        jenis: jenisKeluar,
        produk_id: Number(pilihanProduk.id),
        stok_sebelum: stok,
        jumlah,
        keterangan: alasanKeluar.trim(),
        ...(jenisKeluar === 'kedaluwarsa' ? { tanggal_kedaluwarsa: tanggalKedaluwarsa } : {}),
      })
      setJumlahKeluar(''); setAlasanKeluar(''); setTanggalKedaluwarsa(''); setProdukKeluar('')
    }, 'Barang berhasil dikeluarkan dari stok dan tercatat di Mutasi Stok.')
  }

  const konten = (
    <>
      <div className="admin-form-toolbar">
        <Link to={readOnly ? '/management/dashboard' : '/admin/mutasi-stok'} className="admin-btn admin-btn-ghost">
          ← {readOnly ? 'Dashboard Management' : 'Riwayat Mutasi Stok'}
        </Link>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={refresh} disabled={busy || loading}>Muat ulang</button>
      </div>
      {error && <div className="admin-alert" role="alert">{error}</div>}
      {pesan && <div className="admin-alert admin-alert-success" role="status">{pesan}</div>}

      <section className="management-section" id="ringkasan-opname">
        <h2 className="display-font">Stock Opname & Barang Tidak Layak Jual</h2>
        <p className="management-data-note">Hitung stok fisik, bandingkan dengan database, lalu finalisasi hanya setelah data dipastikan benar. Semua penyesuaian akan tercatat sebagai mutasi.</p>
        <div className="admin-stats">
          <div className="admin-stat"><span className="admin-stat-value display-font">{loading ? '…' : format(ringkasan?.rusak?.unit)}</span><span className="admin-stat-label">Barang Rusak Bulan Ini (pcs)</span></div>
          <div className="admin-stat"><span className="admin-stat-value display-font">{loading ? '…' : format(ringkasan?.kedaluwarsa?.unit)}</span><span className="admin-stat-label">Barang Kedaluwarsa Bulan Ini (pcs)</span></div>
          <div className="admin-stat"><span className="admin-stat-value display-font">{loading ? '…' : format(total)}</span><span className="admin-stat-label">Sesi Opname (filter)</span></div>
        </div>
      </section>

      {!readOnly && (
        <section className="admin-card management-section" id="buat-opname">
          <div className="admin-card-head"><h2 className="display-font">Buat Sesi Stock Opname</h2></div>
          <p className="management-data-note">Pilih maksimal 100 produk per sesi. Stok database disimpan sebagai acuan awal; belum ada perubahan stok.</p>
          <form className="admin-form" onSubmit={buatSesi}>
            <label className="admin-field"><span>Catatan sesi (opsional)</span><input maxLength={1000} value={catatanSesi} onChange={(e) => setCatatanSesi(e.target.value)} placeholder="Contoh: Pengecekan stok setelah tutup toko" /></label>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="admin-field">Pilih produk ({dipilih.length} dipilih)</legend>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                {daftarProduk.map((item) => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <input type="checkbox" checked={dipilih.includes(String(item.id))}
                      disabled={busy || (!dipilih.includes(String(item.id)) && dipilih.length >= 100)}
                      onChange={(e) => setDipilih((old) => e.target.checked ? [...old, String(item.id)] : old.filter((id) => id !== String(item.id)))} />
                    {item.nama} — Stok sistem: {format(item.stok)} pcs
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="admin-form-actions"><button className="admin-btn admin-btn-primary" type="submit" disabled={busy || !dipilih.length}>Buat Draft Opname</button></div>
          </form>
        </section>
      )}

      <section className="admin-card management-section" id="daftar-opname">
        <div className="admin-card-head"><h2 className="display-font">Daftar Sesi Stock Opname</h2><span>{format(total)} sesi</span></div>
        <div className="admin-form-grid"><label className="admin-field"><span>Filter status</span>
          <select value={filterStatus} onChange={(e) => { setPage(1); setFilterStatus(e.target.value); setPilihId(null) }}>
            <option value="">Semua status</option><option value="draft">Draft</option><option value="selesai">Selesai</option><option value="dibatalkan">Dibatalkan</option>
          </select>
        </label></div>
        {loading ? <p className="admin-empty">Memuat sesi…</p> : !sesi.length ? <p className="admin-empty">Belum ada sesi untuk filter ini.</p> :
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>ID</th><th>Waktu (WIB)</th><th>Status</th><th>Produk</th><th>Petugas</th><th>Aksi</th></tr></thead>
            <tbody>{sesi.map((item) => <tr key={item.id}>
              <td>#{item.id}</td><td>{tanggal(item.dibuat_pada)}</td><td>{statusLabel[item.status] || item.status}</td>
              <td>{format(item.jumlah_produk)}</td><td>{item.dibuat_oleh}</td>
              <td><button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={() => setPilihId(item.id)}>Lihat detail</button></td>
            </tr>)}</tbody>
          </table></div>}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage((v) => v - 1)}>Sebelumnya</button>
          <span>Halaman {page} dari {lastPage}</span>
          <button type="button" className="admin-btn admin-btn-ghost" disabled={page >= lastPage || loading} onClick={() => setPage((v) => v + 1)}>Berikutnya</button>
        </div>
      </section>

      {pilihId && !detail && <p className="admin-empty">Memuat detail opname…</p>}
      {detail && (
        <section className="admin-card management-section" id="detail-opname">
          <div className="admin-card-head"><h2 className="display-font">Detail Opname #{detail.id}</h2><span>{statusLabel[detail.status] || detail.status}</span></div>
          <p className="management-data-note">Dibuat {tanggal(detail.dibuat_pada)} oleh {detail.dibuat_oleh}. {detail.catatan || ''}</p>
          <form className="admin-form" onSubmit={simpanFisik}>
            <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Produk</th><th>Stok saat draft</th><th>Stok sekarang</th><th>Stok fisik</th><th>Selisih</th><th>Catatan</th></tr></thead>
              <tbody>{(detail.items || []).map((item) => {
                const val = fisik[item.id]
                const nilai = val === '' || val == null ? null : Number(val)
                const selisih = nilai === null || !Number.isFinite(nilai) ? null : nilai - Number(item.stok_sistem)
                const bisaUbah = detail.status === 'draft' && !readOnly
                return <tr key={item.id}>
                  <td>{item.nama_produk}<small className="admin-sub">{item.barcode || ''}</small></td>
                  <td>{format(item.stok_sistem)}</td><td>{format(item.stok_saat_ini)}</td>
                  <td>{bisaUbah ? <input aria-label={`Stok fisik ${item.nama_produk}`} type="number" min="0" max="4294967295" step="1" required value={val ?? ''} onChange={(e) => setFisik((old) => ({ ...old, [item.id]: e.target.value }))} /> : (item.stok_fisik == null ? '—' : format(item.stok_fisik))}</td>
                  <td>{selisih === null ? '—' : `${selisih > 0 ? '+' : ''}${format(selisih)}`}</td>
                  <td>{bisaUbah ? <input maxLength="400" aria-label={`Catatan ${item.nama_produk}`} value={catatanDetail[item.id] ?? ''} onChange={(e) => setCatatanDetail((old) => ({ ...old, [item.id]: e.target.value }))} /> : (item.catatan || '—')}</td>
                </tr>
              })}</tbody>
            </table></div>
            {!readOnly && detail.status === 'draft' && (
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>Simpan Hasil Hitung</button>
                <button type="button" className="admin-btn admin-btn-primary" disabled={busy} onClick={finalkan}>Finalisasi Stok</button>
                <button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={batalkan}>Batalkan Sesi</button>
              </div>
            )}
          </form>
          {!readOnly && detail.status === 'draft' && <p className="management-data-note">Simpan hasil hitung terlebih dahulu sebelum finalisasi. Jika stok berubah sejak draft dibuat, sistem menolak finalisasi agar stok tidak tertimpa.</p>}
        </section>
      )}

      {!readOnly && (
        <section className="admin-card management-section" id="pengeluaran-barang">
          <div className="admin-card-head"><h2 className="display-font">Barang Rusak / Kedaluwarsa</h2></div>
          <p className="management-data-note">Kurangi stok barang tidak layak jual. Tindakan ini dicatat di Riwayat Mutasi. Untuk kedaluwarsa, tanggal diisi manual karena belum ada pencatatan batch.</p>
          <form className="admin-form" onSubmit={simpanPengeluaran}>
            <div className="admin-form-grid">
              <label className="admin-field"><span>Jenis pengeluaran</span><select value={jenisKeluar} onChange={(e) => setJenisKeluar(e.target.value)}><option value="rusak">Rusak</option><option value="kedaluwarsa">Kedaluwarsa</option></select></label>
              <label className="admin-field"><span>Produk</span><select value={produkKeluar} onChange={(e) => { setProdukKeluar(e.target.value); setJumlahKeluar('') }} required><option value="">Pilih produk</option>{daftarProduk.map((item) => <option key={item.id} value={item.id}>{item.nama} — Stok {format(item.stok)}</option>)}</select></label>
              <label className="admin-field"><span>Jumlah keluar (pcs)</span><input type="number" min="1" step="1" max={pilihanProduk?.stok ?? 0} value={jumlahKeluar} onChange={(e) => setJumlahKeluar(e.target.value)} required /></label>
              {jenisKeluar === 'kedaluwarsa' && <label className="admin-field"><span>Tanggal kedaluwarsa produk</span><input type="date" required value={tanggalKedaluwarsa} onChange={(e) => setTanggalKedaluwarsa(e.target.value)} /></label>}
            </div>
            <label className="admin-field"><span>Alasan / kondisi (wajib)</span><textarea rows={2} minLength={8} maxLength={450} value={alasanKeluar} onChange={(e) => setAlasanKeluar(e.target.value)} placeholder="Contoh: Kemasan rusak dan produk tidak layak dijual" required /></label>
            <div className="admin-form-actions"><button type="submit" className="admin-btn admin-btn-primary" disabled={busy || !pilihanProduk}>Simpan Pengeluaran Stok</button></div>
          </form>
        </section>
      )}
    </>
  )

  return readOnly ? <ManagementLayout>{konten}</ManagementLayout> : <AdminLayout title="Stock Opname & Barang Rusak">{konten}</AdminLayout>
}

export default StockOpnamePage
