/*
  Jalankan dari root FRONTEND: node scripts/pasang-mutasi-stok.cjs ../backend-web-katalog .
  Hanya mengedit tiga controller/router backend dan App.jsx, setelah memeriksa penanda.
  Script menolak melakukan patch jika struktur berbeda. Backup otomatis dibuat.
*/
const fs = require('node:fs')
const path = require('node:path')

const backend = path.resolve(process.argv[2] || '../backend-web-katalog')
const frontend = path.resolve(process.argv[3] || '.')
const paths = {
  produk: path.join(backend, 'app/Http/Controllers/produkController.php'),
  produksi: path.join(backend, 'app/Http/Controllers/Api/ProduksiHarianController.php'),
  api: path.join(backend, 'routes/api.php'),
  app: path.join(frontend, 'src/App.jsx'),
}
// Pastikan file modul baru sudah disalin, supaya tidak menimbulkan Class Not Found.
const requiredModules = [
  path.join(backend, 'app/Models/MutasiStok.php'),
  path.join(backend, 'app/Models/ProduksiHarian.php'),
  path.join(backend, 'app/Http/Controllers/Api/MutasiStokController.php'),
  path.join(frontend, 'src/pages/admin/RiwayatStokPage.jsx'),
  path.join(frontend, 'src/services/mutasiStokService.js'),
]
const missingModules = requiredModules.filter(file => !fs.existsSync(file))
if (missingModules.length) {
  console.error('File modul belum disalin. Tidak ada file yang diubah:\n' + missingModules.join('\n'))
  process.exit(1)
}

const files = {}
for (const [name, file] of Object.entries(paths)) {
  if (!fs.existsSync(file)) {
    console.error(`File tidak ditemukan: ${file}`)
    process.exit(1)
  }
  files[name] = fs.readFileSync(file, 'utf8')
}

function replaceOnce(text, oldPart, newPart, label) {
  if (!text.includes(oldPart)) throw new Error(`STRUKTUR BERBEDA: ${label}. Tidak ada file yang diubah.`)
  return text.replace(oldPart, newPart)
}

// Cari method yang relevan, bukan kemunculan kata "create" pada method lain.
function getMethodRange(source, name) {
  const method = new RegExp(`\\bpublic\\s+function\\s+${name}\\s*\\(`, 'i').exec(source)
  if (!method) throw new Error(`Method ${name}() tidak ditemukan pada produkController.`)
  const start = method.index
  const rest = source.slice(start + method[0].length)
  const next = /\b(?:public|protected|private)\s+function\s+\w+\s*\(/.exec(rest)
  return { start, end: next ? start + method[0].length + next.index : source.length }
}

// Parsing sampai tutup kurung dan semicolon, termasuk jika argumen multiline.
function readCallUntilSemicolon(source, openParen) {
  let depth = 0, quote = null, escaped = false
  for (let i = openParen; i < source.length; i++) {
    const c = source[i]
    if (quote) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'") { quote = c; continue }
    if (c === '(') depth++
    if (c === ')') {
      depth--
      if (depth === 0) {
        const after = /^\s*;/.exec(source.slice(i + 1))
        if (!after) return null
        return i + 1 + after[0].length
      }
    }
  }
  return null
}

function createTrackedSource(source) {
  const { start, end } = getMethodRange(source, 'store')
  const section = source.slice(start, end)
  if (/MutasiStok\s*::\s*create/.test(section)) {
    throw new Error('Pencatatan stok awal mungkin sudah ada di method store(). Periksa manual agar tidak dobel.')
  }
  // Menerima spacing, kapitalisasi, multiline, query()->create(), argumen berbeda.
  const rx = /\$produk\s*=\s*(?:\\?App\\Models\\)?produk\s*::\s*(?:query\s*\(\s*\)\s*->\s*)?create\s*\(/i
  const match = rx.exec(section)
  if (!match) {
    const lines = section.split(/\r?\n/).filter(x => /create\s*\(|save\s*\(|firstOrCreate|updateOrCreate/i.test(x)).slice(0, 6)
    throw new Error(`STRUKTUR BERBEDA: Pencatatan stok awal. Tidak ada file yang diubah.\n`+
      `Method store() tidak memakai pola \"$produk = produk::create(...)\".\n`+
      `Baris terkait:\n${lines.length ? lines.join('\n') : '(tidak ditemukan create/save)'}\n`+
      `Jangan paksa patch; kirim method store() dari produkController.php.`)
  }
  const openParen = start + match.index + match[0].lastIndexOf('(')
  const statementEnd = readCallUntilSemicolon(source, openParen)
  if (statementEnd === null || statementEnd > end) {
    throw new Error('STRUKTUR BERBEDA: Pencatatan stok awal. Pemanggilan create() tidak bisa dibaca dengan aman.')
  }
  const statementStart = start + match.index
  const full = source.slice(statementStart, statementEnd)
  const expression = full.replace(/^\$produk\s*=\s*/, '').replace(/;\s*$/, '').trim()
  const variables = Array.from(expression.matchAll(/\$[a-z_]\w*/gi), x => x[0])
    .filter(x => !['$this', '$created', '$produk'].includes(x))
  const captured = Array.from(new Set(['$request', ...variables])).join(', ')
  const replacement = `$produk = DB::transaction(function () use (${captured}) {\n` +
    `                // KUKI STOCK LEDGER: PRODUCT - stok awal\n` +
    `                $created = ${expression};\n` +
    `                $stokAwal = (int) ($created->stok ?? 0);\n` +
    `                if ($stokAwal > 0) {\n` +
    `                    MutasiStok::create([\n` +
    `                        'produk_id' => $created->id,\n` +
    `                        'pengguna_id' => $request->user()?->getAuthIdentifier(),\n` +
    `                        'jenis' => 'stok_awal',\n` +
    `                        'perubahan' => $stokAwal,\n` +
    `                        'stok_sebelum' => 0,\n` +
    `                        'stok_sesudah' => $stokAwal,\n` +
    `                        'keterangan' => 'Stok awal saat produk ditambahkan.',\n` +
    `                    ]);\n` +
    `                }\n` +
    `                return $created;\n` +
    `            });`
  return source.slice(0, statementStart) + replacement + source.slice(statementEnd)
}

function updateTrackedSource(source) {
  const { start, end } = getMethodRange(source, 'update')
  const section = source.slice(start, end)
  if (/MutasiStok\s*::\s*create/.test(section)) {
    throw new Error('Pencatatan perubahan stok mungkin sudah ada di method update(). Periksa manual agar tidak dobel.')
  }
  const rx = /\$produk\s*->\s*update\s*\(/i
  const match = rx.exec(section)
  if (!match) {
    const lines = section.split(/\r?\n/).filter(x => /update\s*\(|save\s*\(/i.test(x)).slice(0, 6)
    throw new Error(`STRUKTUR BERBEDA: Edit Produk. Tidak ada file yang diubah.\n`+
      `Cari: ${lines.length ? lines.join('\n') : '(tidak ditemukan update/save)'}\n`+
      `Kirim method update() dari produkController.php.`)
  }
  const openParen = start + match.index + match[0].lastIndexOf('(')
  const statementEnd = readCallUntilSemicolon(source, openParen)
  if (statementEnd === null || statementEnd > end) throw new Error('STRUKTUR BERBEDA: Edit Produk tidak bisa dibaca dengan aman.')
  const statementStart = start + match.index
  const full = source.slice(statementStart, statementEnd)
  const argument = full.replace(/^\$produk\s*->\s*update\s*\(/i, '').replace(/\)\s*;\s*$/, '').trim()
  const variables = Array.from(argument.matchAll(/\$[a-z_]\w*/gi), x => x[0])
    .filter(x => !['$this', '$locked', '$produk'].includes(x))
  const captured = Array.from(new Set(['$id', '$request', ...variables])).join(', ')
  const replacement = `$produk = DB::transaction(function () use (${captured}) {\n`+
    `                // KUKI STOCK LEDGER: PRODUCT - stok diubah dari Edit Produk\n`+
    `                $locked = produk::query()->lockForUpdate()->findOrFail($id);\n`+
    `                $sebelum = (int) ($locked->stok ?? 0);\n`+
    `                $locked->update(${argument});\n`+
    `                $sesudah = (int) ($locked->stok ?? 0);\n`+
    `                if ($sebelum !== $sesudah) {\n`+
    `                    MutasiStok::create([\n`+
    `                        'produk_id' => $locked->id,\n`+
    `                        'pengguna_id' => $request->user()?->getAuthIdentifier(),\n`+
    `                        'jenis' => 'koreksi',\n`+
    `                        'perubahan' => $sesudah - $sebelum,\n`+
    `                        'stok_sebelum' => $sebelum,\n`+
    `                        'stok_sesudah' => $sesudah,\n`+
    `                        'keterangan' => 'Stok diubah melalui form Edit Produk.',\n`+
    `                    ]);\n`+
    `                }\n`+
    `                return $locked;\n`+
    `            });`
  return source.slice(0, statementStart) + replacement + source.slice(statementEnd)
}

function importIfMissing(source, fqcn) {
  const directive = `use ${fqcn};`
  if (source.includes(directive)) return source
  if (!source.includes('use App\\Models\\produk;')) throw new Error(`Import produk tidak ditemukan; tidak dapat menambahkan ${fqcn}.`)
  return source.replace('use App\\Models\\produk;', `use App\\Models\\produk;\n${directive}`)
}

try {
  if (files.produk.includes('KUKI STOCK LEDGER: PRODUCT') || files.produksi.includes('KUKI STOCK LEDGER: PRODUCTION')) {
    throw new Error('Patch mutasi stok tampaknya sudah diterapkan. Tidak ada file yang diubah.')
  }

  // 1) produkController: log stok awal saat produk dibuat, koreksi via form Edit Produk.
  files.produk = importIfMissing(files.produk, 'App\\Models\\MutasiStok')
  files.produk = importIfMissing(files.produk, 'App\\Models\\ProduksiHarian')
  files.produk = importIfMissing(files.produk, 'Illuminate\\Support\\Facades\\DB')
  files.produk = createTrackedSource(files.produk)
  files.produk = updateTrackedSource(files.produk)

  // Blokir penghapusan produk bersejarah SEBELUM foto produk dihapus.
  const destroyStart = files.produk.indexOf('public function destroy(')
  if (destroyStart < 0) throw new Error('Method destroy() produkController tidak ditemukan.')
  const uploadStart = files.produk.indexOf('public function uploadGambar(', destroyStart)
  if (uploadStart < 0) throw new Error('Method uploadGambar() produkController tidak ditemukan.')
  const segment = files.produk.slice(destroyStart, uploadStart)
  const guardTarget = `        if ($produk->gambar_produk) {`
  const guard = `        // KUKI STOCK LEDGER: PRODUCT (riwayat audit tidak boleh terhapus)
        if (MutasiStok::where('produk_id', $produk->id)->exists() || ProduksiHarian::where('produk_id', $produk->id)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Produk memiliki riwayat stok/produksi dan tidak bisa dihapus. Arsipkan produk jika sudah tidak dijual.',
            ], 409);
        }

` + guardTarget
  const adjusted = replaceOnce(segment, guardTarget, guard, 'Perlindungan penghapusan produk')
  files.produk = files.produk.slice(0, destroyStart) + adjusted + files.produk.slice(uploadStart)

  // 2) Produksi Harian: transaksi produksi juga mencatat mutasi masuk.
  files.produksi = replaceOnce(files.produksi,
    'use App\\Models\\ProduksiHarian;',
    'use App\\Models\\ProduksiHarian;\nuse App\\Models\\MutasiStok;',
    'Import ProduksiHarianController')
  files.produksi = replaceOnce(files.produksi,
    'function () use ($tanggal, $produkId, $jumlah) {',
    'function () use ($tanggal, $produkId, $jumlah, $request) {',
    'Scope request transaksi produksi')
  files.produksi = replaceOnce(files.produksi,
    `$batch->increment('jumlah_produksi', $jumlah);
            $item->increment('stok', $jumlah);`,
    `$batch->increment('jumlah_produksi', $jumlah);
            $item->increment('stok', $jumlah);

            // KUKI STOCK LEDGER: PRODUCTION (mutasi masuk di transaksi yang sama)
            MutasiStok::create([
                'produk_id' => $produkId,
                'pengguna_id' => $request->user()?->getAuthIdentifier(),
                'jenis' => 'produksi',
                'perubahan' => $jumlah,
                'stok_sebelum' => $stokSaatIni,
                'stok_sesudah' => $stokSaatIni + $jumlah,
                'keterangan' => 'Penambahan stok dari produksi harian.',
                'referensi_tipe' => 'produksi_harian',
                'referensi_id' => $batch->id,
            ]);`,
    'Pencatatan mutasi produksi')

  // 3) routes/api.php: GET Admin+Owner, POST Admin only, satu route per baris.
  if (files.api.includes('/admin/mutasi-stok')) throw new Error('Route mutasi stok sudah ditemukan. Tidak ada perubahan.')
  if (!files.api.includes('use App\\Http\\Controllers\\Api\\MutasiStokController;')) {
    files.api = replaceOnce(files.api, '<?php', '<?php\n\nuse App\\Http\\Controllers\\Api\\MutasiStokController;', 'Import API baru')
  }
  files.api += `
// Riwayat Mutasi Stok — GET Admin/Owner, koreksi hanya Admin.
Route::get('/admin/mutasi-stok', [MutasiStokController::class, 'index'])->middleware(['auth:sanctum', 'can:view-management-dashboard']);
Route::post('/admin/mutasi-stok/koreksi', [MutasiStokController::class, 'koreksi'])->middleware(['auth:sanctum', 'can:manage-admin']);
`

  // 4) Tambahkan dua route React dengan proteksi yang SUDAH ada.
  const importMarker = "import ManagementDashboardPage from './pages/admin/ManagementDashboardPage'"
  files.app = replaceOnce(files.app, importMarker,
    importMarker + "\nimport RiwayatStokPage from './pages/admin/RiwayatStokPage'", 'Import halaman React')
  const routeMarker = '        <Route path="*"'
  const routes = `        <Route path="/admin/mutasi-stok" element={<AdminRoute><RiwayatStokPage /></AdminRoute>} />
        <Route path="/management/mutasi-stok" element={<ManagementRoute><RiwayatStokPage readOnly /></ManagementRoute>} />
`
  files.app = replaceOnce(files.app, routeMarker, routes + routeMarker, 'Route React wildcard')

  // Validasi semua perubahan dulu di memori, baru tulis + backup.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_')
  for (const [name, file] of Object.entries(paths)) {
    fs.copyFileSync(file, `${file}.bak-mutasi-${stamp}`)
    fs.writeFileSync(file, files[name], 'utf8')
    console.log(`Diperbarui: ${name} → ${file}`)
  }
  console.log('Patch berhasil. Berikutnya jalankan php artisan migrate dan php artisan route:list --path=mutasi-stok.')
} catch (err) {
  console.error(err.message)
  process.exitCode = 1
}
