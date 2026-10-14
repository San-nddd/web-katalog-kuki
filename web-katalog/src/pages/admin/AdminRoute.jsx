import { Navigate, useLocation } from 'react-router-dom'
import { isLoggedIn } from '../../services/authService'

function AdminRoute({ children }) {
  const location = useLocation()

  if (!isLoggedIn()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default AdminRoute
