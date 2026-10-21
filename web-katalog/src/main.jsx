import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

function pasangMetadataPwa() {
  console.log("URL API Saat Ini:", import.meta.env.VITE_API_BASE_URL);

  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link')
    manifest.rel = 'manifest'
    manifest.href = '/manifest.webmanifest'
    document.head.appendChild(manifest)
  }

  if (!document.querySelector('meta[name="theme-color"]')) {
    const themeColor = document.createElement('meta')
    themeColor.name = 'theme-color'
    themeColor.content = '#3b2417'
    document.head.appendChild(themeColor)
  }

  if (!document.querySelector('meta[name="mobile-web-app-capable"]')) {
    const mobileCapable = document.createElement('meta')
    mobileCapable.name = 'mobile-web-app-capable'
    mobileCapable.content = 'yes'
    document.head.appendChild(mobileCapable)
  }

  if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const appleCapable = document.createElement('meta')
    appleCapable.name = 'apple-mobile-web-app-capable'
    appleCapable.content = 'yes'
    document.head.appendChild(appleCapable)
  }

  if (!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) {
    const appleStatusBar = document.createElement('meta')
    appleStatusBar.name = 'apple-mobile-web-app-status-bar-style'
    appleStatusBar.content = 'default'
    document.head.appendChild(appleStatusBar)
  }

  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const appleIcon = document.createElement('link')
    appleIcon.rel = 'apple-touch-icon'
    appleIcon.href = '/icons/kuki-192.png'
    document.head.appendChild(appleIcon)
  }
}

pasangMetadataPwa()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })
    } catch (error) {
      console.error('Service Worker gagal didaftarkan:', error)
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
