#!/usr/bin/env node
/*
 * Kuki Bakehouse: migrasi teks UI statis JSX ke t() untuk SELURUH halaman Admin.
 * Tidak mengubah className, value input, API/route, SKU, dan data dinamis.
 * Butuh TypeScript compiler untuk parsing JSX: npm install -D typescript
 * Simpan cadangan/commit sebelum menjalankan script.
 */
const fs = require('fs');
const path = require('path');
let ts;
try { ts = require('typescript') } catch {
  console.error('Belum ada TypeScript. Jalankan di folder frontend: npm install -D typescript');
  process.exit(1);
}

const root = process.cwd();
const folder = path.join(root, 'src', 'pages', 'admin');
const dict = path.join(root, 'src', 'services', 'adminTranslations.js');
const seen = [];
let translated = 0;
let filesChanged = 0;
const excluded = new Set(['svg', 'script', 'style', 'code', 'pre', 'textarea', 'kbd']);
const attrs = new Set(['placeholder', 'title', 'aria-label', 'aria-description', 'alt', 'label', 'helperText']);

if (!fs.existsSync(folder)) {
  console.error('Folder src/pages/admin tidak ditemukan. Jalankan dari root folder FRONTEND.');
  process.exit(1);
}
if (!fs.existsSync(dict)) {
  console.error('adminTranslations.js belum ditemukan. Salin dari paket ini ke src/services/.');
  process.exit(1);
}

// Cari key dalam kamus English agar laporan gap lebih akurat.
let englishKeys = new Set();
const dsrc = fs.readFileSync(dict, 'utf8');
const enMatch = dsrc.match(/const en\s*=\s*\{([\s\S]*?)\n\}/);
if (enMatch) {
  for (const match of enMatch[1].matchAll(/^\s*([\"'])(.*?)\1\s*:/gm)) englishKeys.add(match[2]);
}
// Termasuk frasa tambahan untuk Settings di Object.assign(en, {...}).
for(const match of dsrc.matchAll(/^\s*\"([^\"\n]+)\"\s*:/gm)) englishKeys.add(match[1]);
for(const match of dsrc.matchAll(/^\s*'([^'\n]+)'\s*:/gm)) englishKeys.add(match[1]);

function walkFiles(dir) {
  let out = [];
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out = out.concat(walkFiles(full));
    else if (/\.jsx$/.test(item.name)) out.push(full);
  }
  return out;
}
function isPascal(str) { return /^[A-Z][\w]*$/.test(str || '') }
function componentFor(node) {
  for (let p = node; p; p = p.parent) {
    if (ts.isFunctionDeclaration(p) && isPascal(p.name?.text) && p.body && ts.isBlock(p.body)) return p;
    if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && ts.isBlock(p.body)) {
      const par = p.parent;
      if (ts.isVariableDeclaration(par) && isPascal(par.name?.text)) return p;
    }
  }
  return null;
}
function jsxTagName(node) {
  const tag = node?.tagName;
  return tag && ts.isIdentifier(tag) ? tag.text.toLowerCase() : '';
}
function inExcluded(node) {
  for (let p = node.parent; p; p=p.parent) {
    if (ts.isJsxElement(p) && excluded.has(jsxTagName(p.openingElement))) return true;
  }
  return false;
}
function shouldTranslate(str) {
  const text = str.trim();
  return text.length > 0 && /[A-Za-zÀ-ÿ]/.test(text) && !text.includes('&') && !/^https?:/.test(text) && text.length < 550;
}
function makeT(raw) { return `t(${JSON.stringify(raw)})` }

const adminOnlyComponents = [
  'src/components/BarcodePreview.jsx',
  'src/components/BarcodePrintButton.jsx',
  'src/components/ImageUploadEditor/ImageUploadEditor.jsx',
  'src/components/BarcodePrintModal.jsx',
].map(f => path.join(root,f)).filter(fs.existsSync);

for (const file of [...walkFiles(folder), ...adminOnlyComponents]) {
  const src = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
  if (ast.parseDiagnostics.length) {
    console.warn('Lewati file dengan error JSX:',path.relative(root,file));
    continue;
  }
  const edits = [];
  const affectedComponents = new Set();
  const add = (start,end,replacement) => edits.push({start,end,replacement});
  const pathLabel = path.relative(root,file).replaceAll('\\','/');
  const record = (text,node) => {
    seen.push({ file:pathLabel, line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1, text, translated:englishKeys.has(text) });
  };
  const process = (node) => {
    if (ts.isJsxText(node) && !inExcluded(node)) {
      const text = src.slice(node.pos,node.end);
      const trimmed = text.trim();
      if (shouldTranslate(text)) {
        const comp = componentFor(node);
        if (comp) {
          const startWS = text.match(/^\s*/)?.[0] || '';
          const endWS = text.match(/\s*$/)?.[0] || '';
          add(node.pos,node.end,`${startWS}{${makeT(trimmed)}}${endWS}`);
          affectedComponents.add(comp);
          record(trimmed,node);
          translated++;
        }
      }
    } else if (ts.isJsxAttribute(node) && attrs.has(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) {
      const str = node.initializer.text;
      if (shouldTranslate(str) && !inExcluded(node)) {
        const comp = componentFor(node);
        if (comp) {
          add(node.initializer.getStart(ast),node.initializer.end,`{${makeT(str)}}`);
          affectedComponents.add(comp);
          record(str,node);
          translated++;
        }
      }
    } else if (ts.isStringLiteral(node) && !inExcluded(node) && (
      (ts.isConditionalExpression(node.parent)
        && (node.parent.whenTrue===node || node.parent.whenFalse===node)
        && ts.isJsxExpression(node.parent.parent)
        && !ts.isJsxAttribute(node.parent.parent.parent)) ||
      (ts.isBinaryExpression(node.parent)
        && node.parent.right===node
        && ['AmpersandAmpersandToken','BarBarToken','QuestionQuestionToken'].includes(ts.SyntaxKind[node.parent.operatorToken.kind])
        && ts.isJsxExpression(node.parent.parent)
        && !ts.isJsxAttribute(node.parent.parent.parent)) ||
      (ts.isJsxExpression(node.parent) && !ts.isJsxAttribute(node.parent.parent))
    )) {
      const comp = componentFor(node);
      if (comp && shouldTranslate(node.text)) {
        add(node.getStart(ast),node.end,makeT(node.text));
        affectedComponents.add(comp);
        record(node.text,node);
        translated++;
      }
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && /^(setError|setMessage|setSuccess|setNotice|setWarning|alert|confirm)$/.test(node.expression.text)
      && node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
      const first=node.arguments[0];
      const comp=componentFor(node);
      if (comp && shouldTranslate(first.text)) {
        add(first.getStart(ast),first.end,makeT(first.text));
        affectedComponents.add(comp);
        record(first.text,node);
        translated++;
      }
    }
    ts.forEachChild(node,process);
  };
  process(ast);
  if (!edits.length) continue;

  const alreadyHooked = new Set();
  for(const comp of affectedComponents){
    const bodyText=src.slice(comp.body.getStart(ast),comp.body.end);
    const hasT = /\bconst\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useAdminTranslation\s*\(/.test(bodyText) || /\bconst\s+t\s*=/.test(bodyText);
    if (hasT) { alreadyHooked.add(comp); continue; }
    add(comp.body.getStart(ast)+1,comp.body.getStart(ast)+1,'\n  const { t } = useAdminTranslation()');
  }

  if(!/from\s*['"][^'"]*useAdminTranslation['"]/.test(src)) {
    const imports=ast.statements.filter(ts.isImportDeclaration);
    const last=imports.at(-1);
    const rel=path.relative(path.dirname(file),path.join(root,'src','hooks','useAdminTranslation')).replaceAll('\\','/');
    const spec=rel.startsWith('.')?rel:`./${rel}`;
    add(last ? last.end : 0,last ? last.end : 0,`\nimport useAdminTranslation from '${spec}'`);
  }

  edits.sort((a,b)=>b.start-a.start || b.end-a.end);
  let out=src;
  for (const edit of edits) out=out.slice(0,edit.start)+edit.replacement+out.slice(edit.end);
  const check=ts.createSourceFile(file,out,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
  if(check.parseDiagnostics.length){
    console.warn('Tidak dipasang karena sintaks JSX gagal:',pathLabel,check.parseDiagnostics[0].messageText);
    continue;
  }
  fs.writeFileSync(file,out,'utf8');
  filesChanged++;
  console.log('Diperbarui:',pathLabel);
}
const total=seen.length;
const missing=seen.filter(x=>!x.translated);
const report=[
  'KUKI ADMIN I18N - LAPORAN CAKUPAN',
  `Halaman berubah: ${filesChanged}`,
  `String UI statis dibungkus t(): ${total}`,
  `Belum punya terjemahan EN dalam adminTranslations.js: ${missing.length}`,
  '',
  'MASIH PERLU DITERJEMAHKAN (tidak ada padanan di kamus):',
  ...missing.map(x=>`${x.file}:${x.line} | ${x.text}`),
  '',
  'CATATAN: SetError, teks error dari Laravel, template dinamis, dan data API tidak diubah otomatis.',
  'Ubah terjemahan dalam kamus lalu jalankan pengujian Admin di kedua bahasa.',
].join('\n');
const reportFile=path.join(root,'LAPORAN_BAHASA_ADMIN.txt');
if (total > 0 || !fs.existsSync(reportFile)) {
  fs.writeFileSync(reportFile,report,'utf8');
}
console.log(`\nSelesai. ${filesChanged} file; ${total} teks statis. ${missing.length} teks belum ada terjemahan.\nLaporan: ${reportFile}`);
