$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  throw 'Flutter SDK tidak ada di PATH. Install Flutter terlebih dahulu lalu coba flutter doctor.'
}
Write-Host '[1/4] Membuat scaffold Android/iOS (tanpa overwrite file Dart)'
flutter create --org id.kukibakehouse --platforms=android,ios --project-name=kuki_pos --no-pub .
if ($LASTEXITCODE -ne 0) { throw 'flutter create gagal' }
Write-Host '[2/4] Mengatur izin platform'
& "$PSScriptRoot/configure_platforms.ps1"
Write-Host '[3/4] Mengambil dependencies'
flutter pub get
if ($LASTEXITCODE -ne 0) { throw 'flutter pub get gagal' }
Write-Host '[4/4] Analisis kode (1x)'
flutter analyze
Write-Host 'Setup selesai. Jalankan flutter run dan gunakan MODE DEMO untuk mengecek UI.'
