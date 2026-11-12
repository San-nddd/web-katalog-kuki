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
import ProduksiHarianPage from './pages/admin/ProduksiHarianPage'
import ProdukFormPage from './pages/admin/ProdukFormPage'
import KategoriAdminPage from './pages/admin/KategoriAdminPage'
import ChatAdminPage from './pages/admin/ChatAdminPage'
import TestimonialAdminPage from './pages/admin/TestimonialAdminPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminRoute from './pages/admin/AdminRoute'
import ManagementRoute from './pages/admin/ManagementRoute'
import ManagementDashboardPage from './pages/admin/ManagementDashboardPage'
import RiwayatStokPage from './pages/admin/RiwayatStokPage'
import StockOpnamePage from './pages/admin/StockOpnamePage'
import './pages/sections.css'
import './App.css'
import SmoothScroll from './components/SmoothScroll'
import LaporanInventarisPage from './pages/admin/LaporanInventarisPage'
import ManajemenPegawaiPosPage from './pages/admin/ManajemenPegawaiPosPage'
import LaporanPenjualanPage from './pages/admin/LaporanPenjualanPage'
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
          path="/management/dashboard"
          element={
            <ManagementRoute>
              <ManagementDashboardPage />
            </ManagementRoute>
          }
        />
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
          path="/admin/produksi-harian"
          element={
            <AdminRoute>
              <ProduksiHarianPage />
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
          path="/admin/testimonial"
          element={
            <AdminRoute>
              <TestimonialAdminPage />
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
        <Route path="/admin/mutasi-stok" element={<AdminRoute><RiwayatStokPage /></AdminRoute>} />
        <Route path="/management/mutasi-stok" element={<ManagementRoute><RiwayatStokPage readOnly /></ManagementRoute>} />
        <Route path="/admin/opname-stok" element={<AdminRoute><StockOpnamePage /></AdminRoute>} />
        <Route path="/management/opname-stok" element={<ManagementRoute><StockOpnamePage readOnly /></ManagementRoute>} />
        {/* Pegawai POS: hanya akun Admin, tanpa akses pengunjung. */}
        <Route path="/admin/pegawai" element={<AdminRoute><ManajemenPegawaiPosPage /></AdminRoute>} />
        {/* Halaman Admin: gunakan URL dan guard Admin. */}
        <Route path="/admin/management/laporan-inventaris" element={<AdminRoute><LaporanInventarisPage /></AdminRoute>} />
        <Route path="/admin/management/laporan-penjualan" element={<AdminRoute><LaporanPenjualanPage /></AdminRoute>} />
        {/* Halaman Owner/Management: akses read-only dengan guard Management. */}
        <Route path="/management/laporan-inventaris" element={<ManagementRoute><LaporanInventarisPage /></ManagementRoute>} />
        <Route path="/management/laporan-penjualan" element={<ManagementRoute><LaporanPenjualanPage /></ManagementRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
