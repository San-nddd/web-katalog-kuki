import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CategoryPage from './pages/CategoryPage'
import ContactPage from './pages/ContactPage'
import BakersPage from './pages/BakersPage'
import KatalogPage from './pages/KatalogPage'
import DetailProdukPage from './pages/DetailProdukPage'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import ProdukAdminPage from './pages/admin/ProdukAdminPage'
import ProdukFormPage from './pages/admin/ProdukFormPage'
import KategoriAdminPage from './pages/admin/KategoriAdminPage'
import ChatAdminPage from './pages/admin/ChatAdminPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminRoute from './pages/admin/AdminRoute'
import './pages/sections.css'
import './App.css'
import SmoothScroll from './components/SmoothScroll'
function App() {
  console.log("URL API Saat Ini:", import.meta.env.VITE_API_BASE_URL);

  return (
    <div className="App">
      <SmoothScroll />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category" element={<CategoryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/bakers" element={<BakersPage />} />
        <Route path="/katalog" element={<KatalogPage />} />
        <Route path="/produk/:id" element={<DetailProdukPage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <DashboardPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/produk"
          element={
            <AdminRoute>
              <ProdukAdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/produk/baru"
          element={
            <AdminRoute>
              <ProdukFormPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/produk/:id/edit"
          element={
            <AdminRoute>
              <ProdukFormPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/kategori"
          element={
            <AdminRoute>
              <KategoriAdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/chat"
          element={
            <AdminRoute>
              <ChatAdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/chat/:id"
          element={
            <AdminRoute>
              <ChatAdminPage />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/settings"
          element={
            <AdminRoute>
              <AdminSettingsPage />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
