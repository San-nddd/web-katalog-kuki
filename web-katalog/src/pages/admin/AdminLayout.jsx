import { NavLink, Link, useNavigate } from 'react-router-dom'
import { currentUser, logout } from '../../services/authService'
import './admin.css'

function AdminLayout({ title, children }) {
  const navigate = useNavigate()
  const user = currentUser()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/admin/login')
    }
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-logo" aria-hidden="true">
            K
          </span>
          <div>
            <strong>Kuki Admin</strong>
            <small>Katalog Content</small>
          </div>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end>
            Dashboard
          </NavLink>
          <NavLink to="/admin/produk">Produk</NavLink>
          <NavLink to="/admin/kategori">Kategori</NavLink>
          <NavLink to="/admin/chat">Chat</NavLink>
          <Link to="/">Lihat Situs</Link>
        </nav>

        <div className="admin-user">
          <span className="admin-user-email">{user?.email || '-'}</span>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <h1 className="display-font">{title}</h1>
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}

export default AdminLayout
