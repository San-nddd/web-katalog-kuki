import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { login } from '../../services/authService'
import './admin.css'
import useAdminTranslation from '../../hooks/useAdminTranslation'

function LoginPage() {
  const { t } = useAdminTranslation()
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
      setError(t("Email dan password wajib diisi."))
      return
    }

    setLoading(true)
    try {
      const user = await login(email.trim(), password)
      const fallbackRoute =
        user.role === 'owner'
          ? '/management/dashboard'
          : '/admin'
      navigate(location.state?.from || fallbackRoute, { replace: true })
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
          {t("K")}
        </span>
        <h1 className="display-font">Admin &amp; Management</h1>
        <p>{t("Masuk untuk mengelola atau memantau Kuki Bakehouse.")}</p>

        {error && (
          <div className="admin-alert" role="alert">
            {error}
          </div>
        )}
        {location.state?.accessDenied && (
          <div className="admin-alert" role="alert">
            {t("Sesi ini tidak memiliki akses Admin. Silakan masuk dengan akun Admin.")}
          </div>
        )}

        <label className="admin-field">
          <span>{t("Email")}</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("admin@kukibakehouse.com")}
            autoComplete="username"
          />
        </label>

        <label className="admin-field">
          <span>{t("Password")}</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
          {loading ? t("Memproses...") : t("Masuk")}
        </button>

        <Link className="admin-login-back" to="/">
          {t("Kembali ke situs")}
        </Link>
      </form>
    </div>
  )
}

export default LoginPage
