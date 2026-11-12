'use strict'
// Patch non-destruktif terhadap source: cari pola yang dikenal, tolak bila berbeda.
// Tidak menjalankan migration ataupun mengakses database secara langsung.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const rootArg = process.argv[2]
const check = process.argv.includes('--check')
if (!rootArg || rootArg.startsWith('--')) {
  console.error('Penggunaan: node apply-hard-delete.cjs "E:\\Ekosistem-kuki" [--check]')
  process.exit(1)
}
const root = path.resolve(rootArg)
const backend = path.join(root, 'backend-web-katalog')
const files = {
  controller: path.join(backend, 'app', 'Http', 'Controllers', 'produkController.php'),
  opnameController: path.join(backend, 'app', 'Http', 'Controllers', 'Api', 'StockOpnameController.php'),
  model: path.join(backend, 'app', 'Models', 'produk.php'),
  migration: path.join(backend, 'database', 'migrations', '2026_11_12_120000_prepare_hard_delete_produk_with_history.php'),
}
const migrationSrc = path.join(__dirname, 'backend', 'database', 'migrations', path.basename(files.migration))
const abort = msg => { console.error('DIBATALKAN (tanpa menulis file): ' + msg); process.exit(2) }
for (const key of ['controller','opnameController','model']) if (!fs.existsSync(files[key])) abort(`File wajib tidak ditemukan: ${files[key]}`)
if (!fs.existsSync(migrationSrc)) abort(`Migration di paket tidak ditemukan: ${migrationSrc}`)
const orig = Object.fromEntries(['controller','opnameController','model'].map(k => [k, fs.readFileSync(files[k],'utf8')]))
if (/\buse\s+SoftDeletes\s*;/.test(orig.model)) abort('Model produk menggunakan SoftDeletes. Pulihkan/selesaikan konfigurasi SoftDeletes dahulu; jangan mencampur hard dan soft delete.')
if (!/class\s+produk\s+extends\s+/.test(orig.model)) abort('Model produk berbeda dari snapshot, diperlukan inspeksi manual.')

function getMethod(src, name) {
  const re = new RegExp('public\\s+function\\s+' + name + '\\s*\\([^)]*\\)\\s*(?::\\s*[\\\\\\w]+)?\\s*\\{', 'g')
  const m = re.exec(src)
  if (!m) abort(`Method ${name}() tidak ditemukan / signature berubah`)
  const start = m.index
  const open = m.index + m[0].lastIndexOf('{')
  let depth = 0, close = -1
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    if (src[i] === '}') { depth--; if (!depth) { close=i; break } }
  }
  if (close < 0) abort(`Method ${name}(): pasangan kurung tidak ditemukan`)
  return {start, end:close+1, text:src.slice(start,close+1)}
}

const m = getMethod(orig.controller,'destroy')
if (!/\$produk->delete\s*\(\s*\)\s*;/.test(m.text)) abort('destroy() tidak menggunakan $produk->delete() seperti source yang pernah dibagikan.')
// Jangan menimpa logika destroy() terbaru (misalnya invalidasi cache atau audit).
// SHA berikut adalah fingerprint method destroy dari source yang diperiksa.
const expectedDestroyHash = '2feff6b6c0bb7eaa00f2d219fdce1df8494b9c6689cd28bf421712fc76a3186f'
const currentDestroyHash = crypto.createHash('sha256').update(m.text.replace(/\r\n/g,'\n')).digest('hex')
if (currentDestroyHash !== expectedDestroyHash) abort('Isi destroy() sudah berbeda dari source yang diperiksa. Kirim produkController.php terbaru agar cache/audit tidak tertimpa.')
if (/forceDelete\s*\(/.test(m.text)) abort('destroy() telah memiliki forceDelete; audit manual dibutuhkan.')
if (/KUKI_HARD_DELETE_BERSYARAT_V1/.test(m.text)) abort('Patch sudah terpasang di controller. Tidak perlu memasang ulang.')

const newDestroy = `public function destroy(string $id): JsonResponse
    {
        // KUKI_HARD_DELETE_BERSYARAT_V1
        // Hard delete permanen, hanya jika seluruh histori dapat dipertahankan.
        try {
            return \\Illuminate\\Support\\Facades\\DB::transaction(function () use ($id) {
                $produk = produk::query()->lockForUpdate()->find($id);
                if (! $produk) {
                    return response()->json(['success' => false, 'message' => 'Produk tidak ditemukan.', 'data' => null], 404);
                }

                $db = \\Illuminate\\Support\\Facades\\DB::connection();
                $schema = \\Illuminate\\Support\\Facades\\Schema::class;
                $idProduk = $produk->id;

                // Dilarang menghapus produk yang masih dipakai sesi opname aktif.
                if ($schema::hasTable('opname_stok_detail') && $schema::hasTable('opname_stok')) {
                    $masihAktif = \\Illuminate\\Support\\Facades\\DB::table('opname_stok_detail as d')
                        ->join('opname_stok as o', 'o.id', '=', 'd.opname_id')
                        ->where('d.produk_id', $idProduk)
                        ->whereNotIn('o.status', ['selesai', 'dibatalkan'])
                        ->exists();
                    if ($masihAktif) {
                        return response()->json(['success' => false,
                            'message' => 'Produk masih digunakan pada sesi opname yang belum selesai/dibatalkan.',
                        ], 409);
                    }
                }

                // Audit SELURUH foreign key ke katalog_produk, bukan opname saja.
                $references = $db->select("SELECT k.TABLE_NAME AS child_table,
                            k.COLUMN_NAME AS child_column, k.REFERENCED_COLUMN_NAME AS parent_column, r.DELETE_RULE AS delete_rule
                    FROM information_schema.KEY_COLUMN_USAGE k
                    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
                      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
                     AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
                     AND r.TABLE_NAME = k.TABLE_NAME
                    WHERE k.TABLE_SCHEMA = DATABASE()
                      AND k.REFERENCED_TABLE_SCHEMA = DATABASE()
                      AND k.REFERENCED_TABLE_NAME = 'katalog_produk'");

                $safeHistory = ['opname_stok_detail', 'mutasi_stok'];
                foreach ($references as $ref) {
                    $table = $ref->child_table;
                    $column = $ref->child_column;
                    // Identifier berasal dari information_schema; pembatas tambahan.
                    if (! preg_match('/^[a-zA-Z0-9_]+$/', $table) || ! preg_match('/^[a-zA-Z0-9_]+$/', $column)) {
                        return response()->json(['success' => false, 'message' => 'Struktur FK tidak dikenali.'], 409);
                    }
                    $used = \\Illuminate\\Support\\Facades\\DB::table($table)
                        ->where($column, $idProduk)->exists();
                    if (! $used) continue;

                    if (! in_array($table, $safeHistory, true) || $column !== 'produk_id'
                        || strtoupper($ref->delete_rule) !== 'SET NULL'
                        || ! $schema::hasColumn($table, 'nama_produk_snapshot')
                        || ! $schema::hasColumn($table, 'produk_id_snapshot')
                        || ! $schema::hasColumn($table, 'barcode_snapshot')) {
                        return response()->json(['success' => false,
                            'message' => 'Produk masih direferensikan oleh tabel '.$table.'. Riwayat tabel ini belum mendukung hapus permanen. Hubungi pengembang.',
                        ], 409);
                    }
                }

                // Jaga kasus tabel histori yang belum punya FK sesuai standar.
                foreach ($safeHistory as $table) {
                    if (! $schema::hasTable($table)) continue;
                    if (! $schema::hasColumn($table, 'produk_id')) continue;
                    $used = \\Illuminate\\Support\\Facades\\DB::table($table)
                        ->where('produk_id', $idProduk)->exists();
                    if (! $used) continue;
                    $isSafe = collect($references)->contains(fn ($ref) =>
                        $ref->child_table === $table && $ref->child_column === 'produk_id'
                        && strtoupper($ref->delete_rule) === 'SET NULL');
                    if (! $isSafe) {
                        return response()->json(['success' => false,
                            'message' => 'Jalankan migration Hard Delete agar referensi histori '.$table.' aman.',
                        ], 409);
                    }
                    \\Illuminate\\Support\\Facades\\DB::table($table)
                        ->where('produk_id', $idProduk)
                        ->update([
                            'produk_id_snapshot' => $idProduk,
                            'nama_produk_snapshot' => $produk->nama_produk,
                            'barcode_snapshot' => $produk->barcode,
                        ]);
                }

                // Tidak menghapus gambar historis, transaksi, opname atau mutasi.
                $produk->delete();

                return response()->json(['success' => true,
                    'message' => 'Produk dihapus permanen. Riwayat opname dan mutasi tetap tersimpan.',
                    'data' => null,
                ]);
            });
        } catch (\\Illuminate\\Database\\QueryException $e) {
            // Lapisan terakhir jika skema berubah atau muncul FK baru.
            if ((int) ($e->errorInfo[1] ?? 0) === 1451) {
                return response()->json(['success' => false,
                    'message' => 'Produk masih digunakan pada riwayat lain yang belum mendukung hapus permanen.',
                ], 409);
            }
            throw $e;
        }
    }`
const controller = orig.controller.slice(0,m.start) + newDestroy + orig.controller.slice(m.end)

let opname = orig.opnameController
const fromName = "'nama_produk' => $item->produk?->nama_produk ?? 'Produk tidak ditemukan',"
const toName = "'nama_produk' => $item->produk?->nama_produk ?? $item->nama_produk_snapshot ?? 'Produk historis',"
const fromBarcode = "'barcode' => $item->produk?->barcode,"
const toBarcode = "'barcode' => $item->produk?->barcode ?? $item->barcode_snapshot,"
if (!opname.includes(toName)) {
  if (!opname.includes(fromName) || !opname.includes(fromBarcode)) abort('Format show() StockOpnameController berbeda; perlu source terbaru untuk mengubah fallback snapshot.')
  opname = opname.replace(fromName,toName).replace(fromBarcode,toBarcode)
}

const migration = fs.readFileSync(migrationSrc,'utf8')
if (fs.existsSync(files.migration) && fs.readFileSync(files.migration,'utf8')!==migration) abort('Nama migration sudah digunakan dengan isi berbeda. Tolong kirim migration yang ada.')
const changes = [
  {key:'controller', content:controller},
  {key:'opnameController', content:opname},
  {key:'migration', content:migration},
].filter(x=> !fs.existsSync(files[x.key]) || fs.readFileSync(files[x.key],'utf8')!==x.content)
console.log('Project:',root)
console.log('Rencana perubahan:', changes.map(x=>path.relative(root,files[x.key])).join(' | ') || 'tidak ada')
console.log('Database TIDAK disentuh oleh installer ini.')
if (check) {console.log('CHECK OK: semua pola source cocok. Tidak ada file yang ditulis.');process.exit(0)}
const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const backupDir=path.join(backend,'_backup_harddelete_'+stamp)
fs.mkdirSync(backupDir,{recursive:true})
const written=[]
try {
  for(const x of changes) {
    const file=files[x.key]
    const backup=path.join(backupDir,x.key+'.bak')
    if(fs.existsSync(file)) fs.copyFileSync(file,backup)
    fs.mkdirSync(path.dirname(file),{recursive:true})
    fs.writeFileSync(file,x.content,'utf8')
    written.push({file,backup,existed:fs.existsSync(backup)})
    console.log('TERPASANG:',path.relative(root,file))
  }
}catch(e){
  console.error('GAGAL, sedang memulihkan source:',e.message)
  for (const w of written.reverse()) if(w.existed)fs.copyFileSync(w.backup,w.file); else if(fs.existsSync(w.file))fs.unlinkSync(w.file)
  process.exit(3)
}
console.log('Backup source:',backupDir)
console.log('SELANJUTNYA: backup MySQL lalu jalankan php artisan migrate; lalu php artisan optimize:clear.')
