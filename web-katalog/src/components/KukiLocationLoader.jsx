import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import '../styles/kukiLocationMap.css'

// Hanya memuat Leaflet saat section mendekati viewport.
const KukiLocationMap = lazy(() => import('./KukiLocationMap'))

export default function KukiLocationLoader() {
  const rootRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setReady(true)
      return undefined
    }
    const element = rootRef.current
    if (!element) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setReady(true)
        observer.disconnect()
      }
    }, { rootMargin: '350px 0px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="kuki-location-entry">
      {ready ? (
        <Suspense fallback={<MapPlaceholder />}>
          <KukiLocationMap />
        </Suspense>
      ) : (
        <MapPlaceholder />
      )}
    </div>
  )
}

function MapPlaceholder() {
  return (
    <section id="lokasi-kuki" className="kuki-location-map kuki-location-map--placeholder" aria-label="Lokasi Kuki Bakehouse">
      <div className="kuki-location-map__heading">
        <span className="kuki-location-map__eyebrow">FIND US · KUKI BAKEHOUSE</span>
        <h2>Temukan Lokasi Kami</h2>
        <p>Peta interaktif dimuat saat bagian ini terlihat.</p>
      </div>
      <div className="kuki-location-map__skeleton" aria-hidden="true" />
    </section>
  )
}
