const DB_NAME = 'kuki_admin_audio'
const DB_VERSION = 1
const STORE_NAME = 'notification_sounds'

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Browser ini tidak mendukung IndexedDB.'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(
      request.error || new Error('Gagal membuka penyimpanan audio.')
    )
  })
}

async function withStore(mode, callback) {
  const db = await openDatabase()

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode)
      const store = transaction.objectStore(STORE_NAME)

      let request

      try {
        request = callback(store)
      } catch (error) {
        reject(error)
        return
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(
        request.error || new Error('Operasi audio custom gagal.')
      )
    })
  } finally {
    db.close()
  }
}

export async function simpanAudioCustom(key, file) {
  if (!(file instanceof File)) {
    throw new Error('File audio tidak valid.')
  }

  const allowedTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
  ]

  const extensionAllowed =
    /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)

  if (
    file.type &&
    !allowedTypes.includes(file.type) &&
    !extensionAllowed
  ) {
    throw new Error(
      'Format audio harus MP3, WAV, OGG, M4A, atau AAC.'
    )
  }

  const maxBytes = 5 * 1024 * 1024

  if (file.size > maxBytes) {
    throw new Error('Ukuran audio maksimal 5 MB.')
  }

  const record = {
    name: file.name,
    type: file.type || 'audio/mpeg',
    size: file.size,
    updatedAt: new Date().toISOString(),
    blob: file,
  }

  await withStore(
    'readwrite',
    (store) => store.put(record, key),
  )

  return {
    name: record.name,
    type: record.type,
    size: record.size,
    updatedAt: record.updatedAt,
  }
}

export async function ambilAudioCustom(key) {
  return withStore(
    'readonly',
    (store) => store.get(key),
  )
}

export async function hapusAudioCustom(key) {
  return withStore(
    'readwrite',
    (store) => store.delete(key),
  )
}

export async function metadataAudioCustom(key) {
  const record = await ambilAudioCustom(key)

  if (!record) {
    return null
  }

  return {
    name: record.name,
    type: record.type,
    size: record.size,
    updatedAt: record.updatedAt,
  }
}
