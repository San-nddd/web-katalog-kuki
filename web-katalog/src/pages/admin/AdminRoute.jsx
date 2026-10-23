import { Navigate, useLocation } from 'react-router-dom'
import { currentUser, isLoggedIn } from '../../services/authService'

function AdminRoute({ children }) {
  const location = useLocation()
  const user = currentUser()

  if (!isLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (user?.role === 'owner') {
    return <Navigate to="/management/dashboard" replace />
  }

  if (user?.role && user.role !== 'admin') {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname, accessDenied: true }}
      />
    )
  }

  return children
}

export default AdminRoute
