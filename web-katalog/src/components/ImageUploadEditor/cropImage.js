/**
 * Crop + rotasi + kontras/kecerahan, dengan transparansi tetap dipertahankan.
 * Maks output API Laravel gambar <= 2048KB (produk/kategori).
 */
async function canvasBlob(canvas, quality) {
  const blob = await new Promise((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error('Gagal memproses foto.')),
    'image/webp',
    quality,
  ))
  return blob
}

export async function cropImageToFile({
  imageUrl,
  cropPixels,
  rotation = 0,
  brightness = 100,
  contrast = 100,
  filename = 'foto',
  maxSide = 1600,
  maxOutputBytes = 2 * 1024 * 1024 - 16384,
}) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca.'))
    img.src = imageUrl
  })

  const width = image.naturalWidth
  const height = image.naturalHeight
  if (!width || !height || width * height > 30_000_000) {
    throw new Error('Resolusi gambar tidak didukung (maksimal 30 megapiksel).')
  }

  const angle = ((rotation % 360) * Math.PI) / 180
  const rotatedWidth = Math.ceil(Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle)))
  const rotatedHeight = Math.ceil(Math.abs(height * Math.cos(angle)) + Math.abs(width * Math.sin(angle)))
  const rotated = document.createElement('canvas')
  rotated.width = rotatedWidth
  rotated.height = rotatedHeight
  const ctx = rotated.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia di browser.')
  ctx.translate(rotatedWidth / 2, rotatedHeight / 2)
  ctx.rotate(angle)
  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`
  ctx.drawImage(image, -width / 2, -height / 2)

  const x = Math.max(0, Math.min(rotatedWidth - 1, Math.round(cropPixels.x)))
  const y = Math.max(0, Math.min(rotatedHeight - 1, Math.round(cropPixels.y)))
  const cropWidth = Math.min(rotatedWidth - x, Math.max(1, Math.round(cropPixels.width)))
  const cropHeight = Math.min(rotatedHeight - y, Math.max(1, Math.round(cropPixels.height)))
  const scale = Math.min(1, maxSide / Math.max(cropWidth, cropHeight))
  let targetWidth = Math.max(1, Math.round(cropWidth * scale))
  let targetHeight = Math.max(1, Math.round(cropHeight * scale))
  let blob
  let out

  // Crop langsung dari rotated canvas; output tanpa fill putih menjaga alpha.
  for (let attempt = 0; attempt < 7; attempt += 1) {
    out = document.createElement('canvas')
    out.width = targetWidth
    out.height = targetHeight
    const outCtx = out.getContext('2d')
    if (!outCtx) throw new Error('Tidak dapat membuat canvas hasil.')
    outCtx.imageSmoothingEnabled = true
    outCtx.imageSmoothingQuality = 'high'
    outCtx.drawImage(rotated, x, y, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight)
    blob = await canvasBlob(out, Math.max(0.57, 0.88 - attempt * 0.05))
    if (blob.size <= maxOutputBytes) break
    targetWidth = Math.max(300, Math.floor(targetWidth * 0.79))
    targetHeight = Math.max(300, Math.floor(targetHeight * 0.79))
  }

  if (!blob || blob.size > maxOutputBytes) {
    throw new Error('Ukuran foto masih di atas batas 2 MB. Pilih area crop lebih kecil.')
  }
  // Browser fallback to PNG jika tidak bisa encode WebP. PNG juga mendukung alpha.
  const ext = blob.type === 'image/webp' ? 'webp' : 'png'
  const base = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-') || 'foto'
  const file = new File([blob], `${base}-edited.${ext}`, { type: blob.type })
  return {
    file,
    metadata: {
      width: out.width,
      height: out.height,
      sizeBytes: file.size,
      mimeType: file.type,
      aspectRatio: Number((out.width / out.height).toFixed(5)),
    },
  }
}
