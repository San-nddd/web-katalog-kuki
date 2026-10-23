import { Navigate, useLocation } from 'react-router-dom'
import { currentUser, isLoggedIn } from '../../services/authService'

function ManagementRoute({ children }) {
  const location = useLocation()
  const user = currentUser()

  if (!isLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  if (!['admin', 'manager', 'owner'].includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ManagementRoute
