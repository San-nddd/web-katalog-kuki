import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const LENIS_SRC = 'https://unpkg.com/lenis@1.3.8/dist/lenis.min.js'

function loadLenis() {
  if (window.Lenis) return Promise.resolve(window.Lenis)

  return new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-lenis-cdn]')
    if (!script) {
      script = document.createElement('script')
      script.src = LENIS_SRC
      script.async = true
      script.setAttribute('data-lenis-cdn', '')
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => resolve(window.Lenis))
    script.addEventListener('error', () => reject(new Error('Lenis gagal dimuat')))
  })
}

function SmoothScroll() {
  const lenisRef = useRef(null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let cancelled = false
    let instance = null

    loadLenis()
      .then((Lenis) => {
        if (cancelled || !Lenis) return
        instance = new Lenis({
          duration: 1.1,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          autoRaf: true,
        })
        lenisRef.current = instance
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (instance) instance.destroy()
      lenisRef.current = null
    }
  }, [])

  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}

export default SmoothScroll