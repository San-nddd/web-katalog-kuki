import { Link, useLocation, useNavigate } from 'react-router-dom'
import { currentUser, logout } from '../../services/authService'
import './admin.css'
import './management.css'



function ManagementLayout({ title = 'Dashboard Manajemen', children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const onDashboard = location.pathname === '/management/dashboard'
  const user = currentUser()
  // Akun manager lama memiliki hak akses operasional yang sama dengan admin.
  // Setelah normalisasi role, backend akan mengembalikan role admin.
  const isAdminManager = user?.role === 'admin' || user?.role === 'manager'
  const roleLabel = isAdminManager
    ? 'Admin / Manager'
    : user?.role === 'owner'
      ? 'Owner'
      : 'Pengguna'

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
          <span className="admin-logo" aria-hidden="true">K</span>
          <div>
            <strong>Manajemen Kuki</strong>
            <small>Ringkasan Bisnis</small>
          </div>
        </div>

        <nav className="admin-nav management-nav" aria-label="Navigasi manajemen">
          <Link to="/management/dashboard">Dashboard Management</Link>
          <Link to="/management/mutasi-stok">Riwayat Mutasi Stok</Link>
          <Link to="/management/opname-stok">Stock Opname</Link>
          <Link to="/management/laporan-inventaris">Laporan Inventaris</Link>
          <Link to="/management/laporan-penjualan">Laporan Penjualan</Link>
        </nav>

        <div className="admin-user">
          <span className="admin-user-email">{user?.name || user?.email || roleLabel}</span>
          <small className="management-role">{roleLabel}</small>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={handleLogout}
          >
            Keluar
          </button>
          <Link className="management-admin-link" to="/">Lihat situs publik</Link>
          {isAdminManager && (
            <Link className="management-admin-link" to="/admin">Buka CMS Admin</Link>
          )}
        </div>
      </aside>

      <main className="admin-main management-main">
        <header className="admin-topbar">
          <h1 className="display-font">{title}</h1>
        </header>
        <div className="admin-content management-content">{children}</div>
      </main>
    </div>
  )
}

export default ManagementLayout
