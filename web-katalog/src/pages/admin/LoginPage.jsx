import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login } from '../../services/authService'
import './admin.css'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.')
      return
    }

    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(location.state?.from || '/admin', { replace: true })
    } catch (err) {
      setError(
        err.status === 401 || err.status === 422
          ? err.message || 'Email atau password salah.'
          : err.message || 'Gagal masuk. Silakan coba lagi.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <span className="admin-logo admin-login-logo" aria-hidden="true">
          K
        </span>
        <h1 className="display-font">Admin Content Management</h1>
        <p>Masuk untuk mengelola katalog Kuki Bakehouse.</p>

        {error && (
          <div className="admin-alert" role="alert">
            {error}
          </div>
        )}

        <label className="admin-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@kukibakehouse.com"
            autoComplete="username"
          />
        </label>

        <label className="admin-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? 'Memproses...' : 'Masuk'}
        </button>

        <Link className="admin-login-back" to="/">
          Kembali ke situs
        </Link>
      </form>
    </div>
  )
}

export default LoginPage
