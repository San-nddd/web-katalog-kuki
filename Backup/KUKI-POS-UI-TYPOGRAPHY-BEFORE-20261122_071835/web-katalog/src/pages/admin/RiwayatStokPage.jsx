import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './AdminLayout'
import ManagementLayout from './ManagementLayout'
import { getProduk } from '../../services/produkService'
import { getMutasiStok, koreksiStok } from '../../services/mutasiStokService'

const angka = new Intl.NumberFormat('id-ID')
const jenisLabel = {
  stok_awal: 'Stok awal',
  produksi: 'Produksi harian',
  koreksi: 'Koreksi stok',
  opname: 'Stock opname',
  rusak: 'Barang rusak',
  kedaluwarsa: 'Barang kedaluwarsa',
}

function RiwayatStokPage({ readOnly = false }) {
  const [rows, setRows] = useState([])
  const [produk, setProduk] = useState([])
  const [filters, setFilters] = useState({ produkId: '', jenis: '', tanggalMulai: '', tanggalSelesai: '' })
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [produkKoreksi, setProdukKoreksi] = useState('')
  const [stokBaru, setStokBaru] = useState('')
  const [keterangan, setKeterangan] = useState('')

  const refresh = useCallback(() => setReloadKey((old) => old + 1), [])

  useEffect(() => {
    let active = true
    getProduk()
      .then((data) => { if (active) setProduk(Array.isArray(data) ? data : []) })
      .catch(() => { /* Riwayat tetap tersedia meskipun daftar pilihan produk gagal. */ })
    return () => { active = false }
  }, [reloadKey])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getMutasiStok({ page, ...filters })
      .then((data) => {
        if (!active) return
        setRows(Array.isArray(data?.items) ? data.items : [])
        setLastPage(Number(data?.last_page || 1))
        setTotal(Number(data?.total || 0))
      })
      .catch((err) => { if (active) setError(err.message || 'Riwayat stok gagal dimuat.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [page, filters, reloadKey])

  const pilihan = useMemo(() => produk.find((p) => String(p.id) === produkKoreksi), [produk, produkKoreksi])
  const setFilter = (key) => (event) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, [key]: event.target.value }))
  }

  const simpanKoreksi = async (event) => {
    event.preventDefault()
    if (!pilihan) return
    const nilai = Number(stokBaru)
    if (!Number.isSafeInteger(nilai) || nilai < 0 || nilai > 4294967295) {
      setError('Masukkan stok akhir berupa bilangan bulat nonnegatif.')
      return
    }
    if (keterangan.trim().length < 8) {
      setError('Alasan koreksi minimal 8 karakter.')
      return
    }
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await koreksiStok({
        produk_id: Number(pilihan.id),
        stok_sebelum: Number(pilihan.stok),
        stok_baru: nilai,
        keterangan: keterangan.trim(),
      })
      setMessage('Koreksi berhasil disimpan dan tercatat dalam riwayat.')
      setStokBaru('')
      setKeterangan('')
      refresh()
    } catch (err) {
      setError(err.message || 'Koreksi stok gagal disimpan. Periksa stok terbaru.')
      refresh()
    } finally {
      setSaving(false)
    }
  }

  const content = (
    <>
      <div className="admin-form-toolbar">
        
        <Link className="admin-btn admin-btn-ghost" to={readOnly ? '/management/opname-stok' : '/admin/opname-stok'}>Stock Opname</Link>
      </div>
      {error && <div className="admin-alert" role="alert">{error}</div>}
      {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}

      {!readOnly && (
        <section className="admin-card management-section">
          <div className="admin-card-head"><h2 className="display-font">Koreksi Stok</h2></div>
          <p className="management-data-note">
            Gunakan untuk barang rusak, hilang, atau hasil stok opname. Produksi baru tetap dicatat di halaman Produksi Harian.
          </p>
          <form className="admin-form" onSubmit={simpanKoreksi}>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Produk</span>
                <select value={produkKoreksi} onChange={(event) => { setProdukKoreksi(event.target.value); setStokBaru('') }} required>
                  <option value="">Pilih produk</option>
                  {produk.map((p) => <option value={p.id} key={p.id}>{p.nama} — stok {angka.format(p.stok || 0)}</option>)}
                </select>
              </label>
              <label className="admin-field">
                <span>Stok setelah koreksi</span>
                <input type="number" min="0" max="4294967295" step="1" value={stokBaru} onChange={(event) => setStokBaru(event.target.value)} disabled={!pilihan} required />
              </label>
            </div>
            {pilihan && <p className="management-data-note">Stok tercatat: <strong>{angka.format(pilihan.stok || 0)} pcs</strong>. Nilai baru menggantikan stok ini.</p>}
            <label className="admin-field">
              <span>Alasan koreksi (wajib)</span>
              <textarea rows={2} minLength={8} maxLength={500} value={keterangan} onChange={(event) => setKeterangan(event.target.value)} placeholder="Contoh: 3 pcs rusak saat pengecekan sore" required />
            </label>
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || !pilihan}>{saving ? 'Menyimpan…' : 'Simpan Koreksi'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="admin-card management-section">
        <div className="admin-card-head">
          <h2 className="display-font">Riwayat Perubahan Stok</h2>
          <span>{angka.format(total)} catatan</span>
        </div>
        <div className="admin-form-grid">
          <label className="admin-field"><span>Produk</span>
            <select value={filters.produkId} onChange={setFilter('produkId')}>
              <option value="">Semua produk</option>
              {produk.map((p) => <option value={p.id} key={p.id}>{p.nama}</option>)}
            </select>
          </label>
          <label className="admin-field"><span>Jenis perubahan</span>
            <select value={filters.jenis} onChange={setFilter('jenis')}>
              <option value="">Semua jenis</option>
              {Object.entries(jenisLabel).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label className="admin-field"><span>Dari tanggal</span><input type="date" value={filters.tanggalMulai} onChange={setFilter('tanggalMulai')} /></label>
          <label className="admin-field"><span>Sampai tanggal</span><input type="date" min={filters.tanggalMulai || undefined} value={filters.tanggalSelesai} onChange={setFilter('tanggalSelesai')} /></label>
        </div>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={refresh}>Muat ulang</button>
        {loading ? <p className="admin-empty">Memuat riwayat…</p>
          : rows.length === 0 ? <p className="admin-empty">Belum ada catatan untuk filter ini. Perubahan sebelum modul dipasang tidak tercatat secara otomatis.</p>
          : <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>Waktu (WIB)</th><th>Produk</th><th>Jenis</th><th>Perubahan</th><th>Stok awal → akhir</th><th>Alasan</th><th>Petugas</th></tr></thead>
            <tbody>{rows.map((r) => <tr key={r.id}>
              <td>{r.waktu ? new Date(r.waktu).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '—'}</td>
              <td>{r.nama_produk}{r.barcode && <small className="admin-sub">SKU: {r.barcode}</small>}</td>
              <td>{jenisLabel[r.jenis] || r.jenis}</td>
              <td>{r.perubahan > 0 ? '+' : ''}{angka.format(r.perubahan)}</td>
              <td>{angka.format(r.stok_sebelum)} → {angka.format(r.stok_sesudah)}</td>
              <td>{r.keterangan}</td>
              <td>{r.petugas}</td>
            </tr>)}</tbody>
          </table></div>}
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-ghost" disabled={loading || page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
          <span>Halaman {page} dari {lastPage}</span>
          <button type="button" className="admin-btn admin-btn-ghost" disabled={loading || page >= lastPage} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
        </div>
      </section>
    </>
  )

  return readOnly
    ? <ManagementLayout>{content}</ManagementLayout>
    : <AdminLayout title="Riwayat Perubahan Stok">{content}</AdminLayout>
}

export default RiwayatStokPage
