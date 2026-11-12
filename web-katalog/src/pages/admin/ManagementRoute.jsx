import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { api, getToken } from '../../services/api'

/**
 * Proteksi halaman Management Kuki Bakehouse.
 *
 * Jangan bergantung pada role yang tersimpan di localStorage: datanya bisa
 * tertinggal dari login sebelumnya. Validasi ulang ke /api/auth/user.
 * Backend tetap menjadi penentu izin lewat Sanctum dan Gate.
 *
 * Tidak pernah melempar pengguna ke situs publik saat role tidak cocok.
 */
function ManagementRoute({ children }) {
  const location = useLocation()
  const hasToken = Boolean(getToken())
  const [status, setStatus] = useState('memeriksa')
  const [pesan, setPesan] = useState('')
  const [percobaan, setPercobaan] = useState(0)

  const retryAccessCheck = () => {
    setStatus('memeriksa')
    setPesan('')
    setPercobaan((n) => n + 1)
  }

  useEffect(() => {
    if (!hasToken) return undefined

    let aktif = true

    api.get('/auth/user')
      .then((response) => {
        if (!aktif) return
        // Bentuk respons AuthController: { success: true, data: { role: ... } }
        const pengguna = response?.data?.user ?? response?.data
        const role = String(pengguna?.role || '').trim().toLowerCase()

        setStatus(['admin', 'owner'].includes(role) ? 'diizinkan' : 'ditolak')
        if (!['admin', 'owner'].includes(role)) {
          setPesan('Akun ini tidak memiliki hak akses Management. Silakan gunakan akun Admin atau Owner.')
        }
      })
      .catch((error) => {
        if (!aktif) return
        if (error?.status === 401) {
          // Token kedaluwarsa atau tidak valid.
          setStatus('login')
          return
        }
        if (error?.status === 403) {
          setStatus('ditolak')
          setPesan('Akun tidak mempunyai izin untuk membuka Management.')
          return
        }
        setStatus('gagal')
        setPesan(error?.message || 'Tidak dapat memeriksa login ke server Laravel.')
      })

    return () => { aktif = false }
  }, [hasToken, percobaan])

  // Pengunjung tanpa token dan token yang tidak valid diarahkan ke Login,
  // tidak ke halaman publik. Tujuan semula disimpan untuk alur login.
  if (!hasToken || status === 'login') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (status === 'diizinkan') return children

  if (status === 'memeriksa') {
    return (
      <main role="status" style={{ padding: '32px', maxWidth: 680, margin: '60px auto' }}>
        Memeriksa akses Management…
      </main>
    )
  }

  return (
    <main role="alert" style={{ padding: '32px', maxWidth: 680, margin: '60px auto' }}>
      <h1>{status === 'ditolak' ? 'Akses Management ditolak' : 'Pemeriksaan login gagal'}</h1>
      <p>{pesan}</p>
      {status === 'gagal' && (
        <button type="button" onClick={retryAccessCheck}>
          Coba lagi
        </button>
      )}
      {' '}
      <Link to="/admin/login">Halaman Login</Link>
    </main>
  )
}

export default ManagementRoute
