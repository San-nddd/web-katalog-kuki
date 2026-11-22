import { useCallback, useEffect, useState } from 'react'
import AdminLayout from './AdminLayout'
import {
  ambilDaftarPegawaiPos,
  tambahPegawaiPos,
  perbaruiPegawaiPos,
  hapusPegawaiPos,
  gantiPinPegawaiPos,
} from '../../services/pegawaiPosService'
import './manajemenPegawaiPos.css'

const FORM_AWAL = { kode: '', nama: '', pin: '', konfirmasiPin: '' }
const ROLE_OPTIONS = [
  { value: 'kasir', label: 'Kasir' },
  { value: 'admin', label: 'Admin POS' },
  { value: 'owner', label: 'Owner POS' },
]

function pesanApi(error) {
  const serverErrors = error?.data?.errors
  if (serverErrors && typeof serverErrors === 'object') {
    const first = Object.values(serverErrors).flat().find((message) => typeof message === 'string')
    if (first) return first
  }
  if (error?.status === 401) return 'Sesi Admin habis. Silakan login ulang.'
  if (error?.status === 403) return 'Akun ini tidak diizinkan mengelola pegawai kasir.'
  if (error?.status === 404) return 'API Manajemen Pegawai belum terdaftar. Periksa routes/pos.php.'
  return error?.message || 'Terjadi kesalahan saat menghubungi server.'
}

function validasiKode(kode) {
  if (!/^[A-Z0-9_-]{3,32}$/.test(kode)) {
    return 'Kode pegawai harus 3–32 karakter: huruf, angka, _ atau -.'
  }
  return ''
}

function validasiNama(nama) {
  if (nama.length < 2 || nama.length > 120) {
    return 'Nama pegawai harus 2–120 karakter.'
  }
  return ''
}

function validasiPin(pin, konfirmasi) {
  if (!/^[0-9]{6,8}$/.test(pin)) return 'Gunakan PIN berisi 6–8 angka.'
  if (pin !== konfirmasi) return 'Konfirmasi PIN belum sama.'
  return ''
}

function ManajemenPegawaiPosPage() {
  const [daftar, setDaftar] = useState([])
  const [form, setForm] = useState(FORM_AWAL)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sukses, setSukses] = useState('')
  const [pegawaiEdit, setPegawaiEdit] = useState(null)
  const [editForm, setEditForm] = useState({ kode: '', nama: '', role: 'kasir', aktif: true })
  const [editSaving, setEditSaving] = useState(false)
  const [pegawaiHapus, setPegawaiHapus] = useState(null)
  const [hapusSaving, setHapusSaving] = useState(false)
  const [pegawaiReset, setPegawaiReset] = useState(null)
  const [resetPin, setResetPin] = useState('')
  const [resetKonfirmasi, setResetKonfirmasi] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  const muat = useCallback(async () => {
    setLoading(true)
    try {
      const pegawai = await ambilDaftarPegawaiPos()
      setDaftar(pegawai)
      setError('')
    } catch (err) {
      setError(pesanApi(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let aktif = true
    const timer = setTimeout(() => {
      if (aktif) void muat()
    }, 0)
    return () => {
      aktif = false
      clearTimeout(timer)
    }
  }, [muat])

  const handleTambah = async (event) => {
    event.preventDefault()
    setError('')
    setSukses('')
    const kode = form.kode.trim().toUpperCase()
    const nama = form.nama.trim()
    const kodeError = validasiKode(kode)
    if (kodeError) { setError(kodeError); return }
    const namaError = validasiNama(nama)
    if (namaError) { setError(namaError); return }
    const pinError = validasiPin(form.pin, form.konfirmasiPin)
    if (pinError) { setError(pinError); return }
    setSaving(true)
    try {
      const baru = await tambahPegawaiPos({ kode, nama, pin: form.pin })
      setForm(FORM_AWAL)
      setSukses(`Akun ${baru?.kode || kode} berhasil dibuat. Pegawai dapat login di Flutter POS.`)
      await muat()
    } catch (err) {
      setError(pesanApi(err))
    } finally {
      setSaving(false)
    }
  }

  const bukaEdit = (pegawai) => {
    setPegawaiEdit(pegawai)
    setEditForm({
      kode: pegawai.kode || '',
      nama: pegawai.nama || '',
      role: pegawai.role || 'kasir',
      aktif: Boolean(pegawai.aktif),
    })
    setError('')
    setSukses('')
  }

  const tutupEdit = () => {
    if (editSaving) return
    setPegawaiEdit(null)
    setError('')
  }

  const handleEdit = async (event) => {
    event.preventDefault()
    if (!pegawaiEdit) return
    setError('')
    setSukses('')
    const kode = editForm.kode.trim().toUpperCase()
    const nama = editForm.nama.trim()
    const kodeError = validasiKode(kode)
    if (kodeError) { setError(kodeError); return }
    const namaError = validasiNama(nama)
    if (namaError) { setError(namaError); return }
    setEditSaving(true)
    try {
      const diperbarui = await perbaruiPegawaiPos(pegawaiEdit.id, {
        kode,
        nama,
        role: editForm.role,
        aktif: editForm.aktif,
      })
      setDaftar((items) => items.map((item) => (
        item.id === pegawaiEdit.id ? { ...item, ...diperbarui } : item
      )))
      setPegawaiEdit(null)
      setSukses(`Data pegawai ${diperbarui?.kode || kode} berhasil diperbarui.`)
    } catch (err) {
      setError(pesanApi(err))
    } finally {
      setEditSaving(false)
    }
  }

  const tutupHapus = () => {
    if (hapusSaving) return
    setPegawaiHapus(null)
    setError('')
  }

  const handleHapus = async () => {
    if (!pegawaiHapus) return
    setError('')
    setSukses('')
    setHapusSaving(true)
    try {
      const hasil = await hapusPegawaiPos(pegawaiHapus.id)
      const tersimpan = hasil?.pegawai || { ...pegawaiHapus, aktif: false }
      setDaftar((items) => items.map((item) => (
        item.id === pegawaiHapus.id ? { ...item, ...tersimpan } : item
      )))
      setPegawaiHapus(null)
      setSukses(hasil?.message || `Pegawai ${pegawaiHapus.kode} dinonaktifkan. Riwayat tetap disimpan.`)
    } catch (err) {
      setError(pesanApi(err))
    } finally {
      setHapusSaving(false)
    }
  }

  const handleGantiPin = async (event) => {
    event.preventDefault()
    setError('')
    setSukses('')
    if (!pegawaiReset) return
    const pinError = validasiPin(resetPin, resetKonfirmasi)
    if (pinError) { setError(pinError); return }
    setResetSaving(true)
    try {
      await gantiPinPegawaiPos(pegawaiReset.id, resetPin)
      const kode = pegawaiReset.kode
      setPegawaiReset(null)
      setResetPin('')
      setResetKonfirmasi('')
      setSukses(`PIN ${kode} telah diganti. Sesi kasir lama otomatis dicabut.`)
    } catch (err) {
      setError(pesanApi(err))
    } finally {
      setResetSaving(false)
    }
  }

  const tutupReset = () => {
    if (resetSaving) return
    setPegawaiReset(null)
    setResetPin('')
    setResetKonfirmasi('')
    setError('')
  }

  return (
    <AdminLayout title="Manajemen Pegawai Kasir">
      <div className="pegawai-pos-page">
        <p className="pegawai-pos-intro">
          Daftarkan pegawai untuk masuk ke aplikasi Flutter POS menggunakan kode pegawai dan PIN.
          Akun ini terpisah dari akun Admin website.
        </p>

        {error && <div className="admin-alert" role="alert">{error}</div>}
        {sukses && <div className="admin-alert admin-alert-success" role="status">{sukses}</div>}

        <div className="pegawai-pos-grid">
          <section className="admin-card">
            <div className="admin-card-head"><h2 className="display-font">Tambah Pegawai</h2></div>
            <form className="admin-form" onSubmit={handleTambah} autoComplete="off">
              <label className="admin-field">
                <span>Kode pegawai *</span>
                <input value={form.kode} maxLength={32} placeholder="KASIR01"
                  onChange={(e) => setForm((f) => ({ ...f, kode: e.target.value.toUpperCase() }))}
                  autoCapitalize="characters" required />
              </label>
              <label className="admin-field">
                <span>Nama pegawai *</span>
                <input value={form.nama} maxLength={120} placeholder="Nama pegawai"
                  onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))} required />
              </label>
              <label className="admin-field">
                <span>PIN (6–8 angka) *</span>
                <input type="password" inputMode="numeric" pattern="[0-9]{6,8}"
                  minLength={6} maxLength={8} autoComplete="new-password" value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Buat PIN khusus pegawai" required />
              </label>
              <label className="admin-field">
                <span>Konfirmasi PIN *</span>
                <input type="password" inputMode="numeric" pattern="[0-9]{6,8}"
                  minLength={6} maxLength={8} autoComplete="new-password" value={form.konfirmasiPin}
                  onChange={(e) => setForm((f) => ({ ...f, konfirmasiPin: e.target.value.replace(/\D/g, '') }))}
                  placeholder="Ulangi PIN" required />
              </label>
              <p className="pegawai-pos-hint">Jangan menggunakan PIN contoh seperti 123456. PIN tidak pernah ditampilkan kembali setelah disimpan.</p>
              <div className="admin-form-actions">
                <button className="admin-btn admin-btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Buat Akun Pegawai'}
                </button>
              </div>
            </form>
          </section>

          <section className="admin-card">
            <div className="admin-card-head pegawai-pos-list-head">
              <h2 className="display-font">Daftar Pegawai</h2>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={muat} disabled={loading}>
                {loading ? 'Memuat...' : 'Muat Ulang'}
              </button>
            </div>
            {loading ? (
              <p className="admin-empty">Memuat data pegawai...</p>
            ) : daftar.length === 0 ? (
              <p className="admin-empty">Belum ada pegawai. Gunakan formulir di samping untuk membuat akun pertama.</p>
            ) : (
              <div className="pegawai-pos-scroll">
                <table className="pegawai-pos-table">
                  <thead><tr><th>Kode</th><th>Nama</th><th>Role</th><th>Status</th><th>Tindakan</th></tr></thead>
                  <tbody>
                    {daftar.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.kode}</strong></td>
                        <td>{p.nama}</td>
                        <td>{ROLE_OPTIONS.find((option) => option.value === p.role)?.label || p.role || 'Kasir'}</td>
                        <td><span className={`pegawai-pos-status ${p.aktif ? 'pegawai-pos-aktif' : 'pegawai-pos-nonaktif'}`}>
                          {p.aktif ? 'Aktif' : 'Nonaktif'}
                        </span></td>
                        <td>
                          <div className="pegawai-pos-actions">
                            <button type="button" className="admin-btn admin-btn-ghost"
                              onClick={() => bukaEdit(p)}>Edit</button>
                            <button type="button" className="admin-btn admin-btn-ghost"
                              onClick={() => {
                                setPegawaiReset(p)
                                setResetPin('')
                                setResetKonfirmasi('')
                                setError('')
                                setSukses('')
                              }}>Ganti PIN</button>
                            <button type="button" className="admin-btn admin-btn-danger"
                              disabled={!p.aktif}
                              onClick={() => {
                                setPegawaiHapus(p)
                                setError('')
                                setSukses('')
                              }}>Hapus</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {pegawaiEdit && (
          <div className="pegawai-pos-backdrop" role="presentation" onClick={tutupEdit}>
            <section className="pegawai-pos-dialog admin-card" role="dialog" aria-modal="true"
              aria-labelledby="pegawai-pos-edit-title" onClick={(e) => e.stopPropagation()}>
              <h2 className="display-font" id="pegawai-pos-edit-title">Edit {pegawaiEdit.kode}</h2>
              <form className="admin-form" onSubmit={handleEdit} autoComplete="off">
                <label className="admin-field">
                  <span>Kode pegawai *</span>
                  <input value={editForm.kode} maxLength={32}
                    onChange={(e) => setEditForm((f) => ({ ...f, kode: e.target.value.toUpperCase() }))}
                    autoCapitalize="characters" required />
                </label>
                <label className="admin-field">
                  <span>Nama pegawai *</span>
                  <input value={editForm.nama} maxLength={120}
                    onChange={(e) => setEditForm((f) => ({ ...f, nama: e.target.value }))} required />
                </label>
                <label className="admin-field">
                  <span>Role POS</span>
                  <select value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="pegawai-pos-check">
                  <input type="checkbox" checked={editForm.aktif}
                    onChange={(e) => setEditForm((f) => ({ ...f, aktif: e.target.checked }))} />
                  <span>Aktifkan akun pegawai</span>
                </label>
                <p className="pegawai-pos-hint">
                  Menonaktifkan pegawai akan mencabut sesi POS aktif dan mencegah login kembali.
                  Riwayat transaksi dan shift tidak dihapus.
                </p>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={tutupEdit} disabled={editSaving}>Batal</button>
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={editSaving}>
                    {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {pegawaiHapus && (
          <div className="pegawai-pos-backdrop" role="presentation" onClick={tutupHapus}>
            <section className="pegawai-pos-dialog admin-card" role="alertdialog" aria-modal="true"
              aria-labelledby="pegawai-pos-hapus-title" onClick={(e) => e.stopPropagation()}>
              <h2 className="display-font" id="pegawai-pos-hapus-title">Nonaktifkan {pegawaiHapus.kode}?</h2>
              <p>
                Pegawai tidak akan bisa login kembali dan sesi aktif dicabut.
                Riwayat {Number(pegawaiHapus.jumlah_transaksi || 0)} transaksi dan{' '}
                {Number(pegawaiHapus.jumlah_shift || 0)} shift tetap disimpan.
              </p>
              <div className="admin-form-actions">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={tutupHapus} disabled={hapusSaving}>Batal</button>
                <button type="button" className="admin-btn admin-btn-danger" onClick={handleHapus} disabled={hapusSaving}>
                  {hapusSaving ? 'Menonaktifkan...' : 'Ya, Nonaktifkan'}
                </button>
              </div>
            </section>
          </div>
        )}

        {pegawaiReset && (
          <div className="pegawai-pos-backdrop" role="presentation" onClick={tutupReset}>
            <section className="pegawai-pos-dialog admin-card" role="dialog" aria-modal="true"
              aria-labelledby="pegawai-pos-dialog-title" onClick={(e) => e.stopPropagation()}>
              <h2 className="display-font" id="pegawai-pos-dialog-title">Ganti PIN {pegawaiReset.kode}</h2>
              <p>Setelah PIN diganti, seluruh sesi login pegawai tersebut akan dicabut.</p>
              <form className="admin-form" onSubmit={handleGantiPin} autoComplete="off">
                <label className="admin-field"><span>PIN baru</span>
                  <input type="password" inputMode="numeric" pattern="[0-9]{6,8}" minLength={6} maxLength={8}
                    autoComplete="new-password" value={resetPin} required
                    onChange={(e) => setResetPin(e.target.value.replace(/\D/g, ''))} />
                </label>
                <label className="admin-field"><span>Konfirmasi PIN baru</span>
                  <input type="password" inputMode="numeric" pattern="[0-9]{6,8}" minLength={6} maxLength={8}
                    autoComplete="new-password" value={resetKonfirmasi} required
                    onChange={(e) => setResetKonfirmasi(e.target.value.replace(/\D/g, ''))} />
                </label>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={tutupReset} disabled={resetSaving}>Batal</button>
                  <button type="submit" className="admin-btn admin-btn-primary" disabled={resetSaving}>
                    {resetSaving ? 'Menyimpan...' : 'Simpan PIN Baru'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default ManajemenPegawaiPosPage
