import { useCallback, useEffect, useRef, useState } from 'react'

/*
  Slider berputar tanpa putus (infinite loop) yang geser satu item per langkah.
  Dipakai oleh carousel kategori dan slider testimonial.

  Cara kerja: daftar item diputar urutannya setelah animasi selesai, jadi item pertama
  yang keluar di kiri otomatis muncul lagi di ujung kanan.

  phase:
    'idle'        diam
    'next'        track bergeser satu langkah ke kiri (animasi)
    'prev-start'  urutan sudah diputar mundur, track diletakkan satu langkah ke kiri (tanpa animasi)
    'prev-run'    track bergeser kembali ke posisi awal (animasi)
*/
export default function useLoopSlider(
  items,
  { interval = 4000, slideMs = 600, autoPlay = true } = {},
) {
  const [list, setList] = useState(items)
  const [phase, setPhaseState] = useState('idle')
  const [resetKey, setResetKey] = useState(0)
  const phaseRef = useRef('idle')
  const paused = useRef(false)

  const setPhase = useCallback((next) => {
    phaseRef.current = next
    setPhaseState(next)
  }, [])

  useEffect(() => {
    setList(items)
    setPhase('idle')
  }, [items, setPhase])

  const canLoop = items.length > 1

  const advance = useCallback(() => {
    if (!canLoop || phaseRef.current !== 'idle') return
    setPhase('next')
  }, [canLoop, setPhase])

  const retreat = useCallback(() => {
    if (!canLoop || phaseRef.current !== 'idle') return
    setList((current) => [current[current.length - 1], ...current.slice(0, -1)])
    setPhase('prev-start')
  }, [canLoop, setPhase])

  // prev-start -> prev-run setelah browser sempat menggambar posisi awal
  useEffect(() => {
    if (phase !== 'prev-start') return undefined
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase('prev-run'))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [phase, setPhase])

  const finish = useCallback(() => {
    const current = phaseRef.current
    if (current === 'next') {
      setList((l) => [...l.slice(1), l[0]])
      setPhase('idle')
    } else if (current === 'prev-run') {
      setPhase('idle')
    }
  }, [setPhase])

  // Pengaman: jika transitionend tidak terpanggil (mis. animasi dimatikan)
  useEffect(() => {
    if (phase !== 'next' && phase !== 'prev-run') return undefined
    const timer = setTimeout(finish, slideMs + 150)
    return () => clearTimeout(timer)
  }, [phase, slideMs, finish])

  const onEnd = useCallback(
    (event) => {
      if (event.target !== event.currentTarget) return
      if (event.propertyName && event.propertyName !== 'transform') return
      finish()
    },
    [finish],
  )

  // Putar otomatis
  useEffect(() => {
    if (!autoPlay || !canLoop) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const id = setInterval(() => {
      if (paused.current || document.hidden) return
      advance()
    }, interval)
    return () => clearInterval(id)
  }, [autoPlay, canLoop, interval, advance, resetKey])

  const slideNext = useCallback(() => {
    setResetKey((value) => value + 1)
    advance()
  }, [advance])

  const slidePrev = useCallback(() => {
    setResetKey((value) => value + 1)
    retreat()
  }, [retreat])

  const pause = useCallback(() => {
    paused.current = true
  }, [])

  const resume = useCallback(() => {
    paused.current = false
  }, [])

  return { list, phase, slideNext, slidePrev, onEnd, pause, resume, canLoop }
}