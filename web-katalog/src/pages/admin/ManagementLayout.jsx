import useAdminTranslation from '../../hooks/useAdminTranslation'
import { Link, useNavigate } from 'react-router-dom'
import { currentUser, logout } from '../../services/authService'
import './admin.css'
import './management.css'

const navigationItems = [
  ['overview', 'Dashboard Overview'],
  ['sales', 'Sales Monitoring'],
  ['inventory', 'Inventory Monitoring'],
  ['production', 'Production Monitoring'],
  ['top-products', 'Top Selling Products'],
  ['reports', 'Business Reports'],
  ['notifications', 'Notifications'],
]

function ManagementLayout({ children }) {
  const { t } = useAdminTranslation()

  const navigate = useNavigate()
  const user = currentUser()
  // Akun manager lama memiliki hak akses operasional yang sama dengan admin.
  // Setelah normalisasi role, backend akan mengembalikan role admin.
  const isAdminManager = user?.role === 'admin' || user?.role === 'manager'
  const roleLabel = isAdminManager
    ? 'Admin / Manager'
    : user?.role === 'owner'
      ? 'Owner'
      :t("Pengguna")

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/admin/login')
    }
  }

  return (
    <div className="admin-layout management-layout">
      <aside className="admin-sidebar management-sidebar">
        <div className="admin-brand">
          <span className="admin-logo" aria-hidden="true">{t("K")}</span>
          <div>
            <strong>{t("Kuki Management")}</strong>
            <small>{t("Business Overview")}</small>
          </div>
        </div>

        <nav className="admin-nav management-nav" aria-label={t("Management navigation")}>
          {navigationItems.map(([section, label]) => (
            <a href={`#${section}`} key={section}>{t(label)}</a>
          ))}
        </nav>

        <div className="admin-user">
          <span className="admin-user-email">{user?.name || user?.email || roleLabel}</span>
          <small className="management-role">{roleLabel}</small>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={handleLogout}
          >
            {t("Keluar")}
          </button>
          <Link className="management-admin-link" to="/">{t("Lihat situs publik")}</Link>
          {isAdminManager && (
            <Link className="management-admin-link" to="/admin">{t("Buka CMS Admin")}</Link>
          )}
        </div>
      </aside>

      <main className="admin-main management-main">
        <header className="admin-topbar">
          <h1 className="display-font">{t("Management Dashboard")}</h1>
        </header>
        <div className="admin-content management-content">{children}</div>
      </main>
    </div>
  )
}

export default ManagementLayout
