import { ambilAudioCustom } from './customNotificationAudioService'

const recentKeys = new Map()
const DEDUPE_MS = 4500

function cleanupRecentKeys(now) {
  for (const [key, time] of recentKeys.entries()) {
    if (now - time > DEDUPE_MS * 2) {
      recentKeys.delete(key)
    }
  }
}

function canPlayKey(key) {
  if (!key) return true

  const now = Date.now()
  cleanupRecentKeys(now)

  const last = recentKeys.get(key)

  if (last && now - last < DEDUPE_MS) {
    return false
  }

  recentKeys.set(key, now)
  return true
}

function getAudioContext() {
  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext

  if (!AudioContextClass) {
    return null
  }

  return new AudioContextClass()
}

function tone(context, {
  start,
  duration,
  frequency,
  volume,
  type = 'sine',
}) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(
    frequency,
    start,
  )

  gain.gain.setValueAtTime(
    0.0001,
    start,
  )

  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, volume),
    start + 0.015,
  )

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    start + duration,
  )

  oscillator.connect(gain)
  gain.connect(context.destination)

  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export async function playAdminNotificationSound({
  preset = 'chime',
  volume = 0.65,
  key = null,
  customAudioKey = null,
} = {}) {
  if (preset === 'silent') {
    return false
  }

  if (preset === 'custom') {
    if (!customAudioKey) {
      return false
    }

    try {
      const record = await ambilAudioCustom(customAudioKey)

      if (!record?.blob) {
        return false
      }

      const objectUrl = URL.createObjectURL(record.blob)
      const audio = new Audio(objectUrl)

      audio.volume = Math.min(
        1,
        Math.max(
          0,
          Number(volume) || 0,
        ),
      )

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl)
      }

      audio.addEventListener('ended', cleanup, { once: true })
      audio.addEventListener('error', cleanup, { once: true })

      await audio.play()

      return true
    } catch (error) {
      console.warn('Audio custom gagal diputar:', error)
      return false
    }
  }

  if (!canPlayKey(key)) {
    return false
  }

  const context = getAudioContext()

  if (!context) {
    return false
  }

  try {
    if (context.state === 'suspended') {
      await context.resume()
    }

    const safeVolume =
      Math.min(
        0.22,
        Math.max(
          0,
          Number(volume) || 0,
        ) * 0.22,
      )

    const now =
      context.currentTime + 0.02

    if (preset === 'soft') {
      tone(context, {
        start: now,
        duration: 0.28,
        frequency: 620,
        volume: safeVolume * 0.7,
      })
    } else if (preset === 'alert') {
      tone(context, {
        start: now,
        duration: 0.16,
        frequency: 740,
        volume: safeVolume,
        type: 'triangle',
      })

      tone(context, {
        start: now + 0.2,
        duration: 0.18,
        frequency: 880,
        volume: safeVolume,
        type: 'triangle',
      })
    } else {
      tone(context, {
        start: now,
        duration: 0.2,
        frequency: 660,
        volume: safeVolume * 0.85,
      })

      tone(context, {
        start: now + 0.18,
        duration: 0.3,
        frequency: 880,
        volume: safeVolume,
      })
    }

    window.setTimeout(() => {
      context.close().catch(() => {})
    }, 1200)

    return true
  } catch {
    context.close().catch(() => {})
    return false
  }
}
