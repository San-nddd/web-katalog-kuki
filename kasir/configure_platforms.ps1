$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$android = 'android/app/src/main/AndroidManifest.xml'
if (Test-Path $android) {
  $xml = Get-Content $android -Raw
  if ($xml -notmatch 'android.permission.CAMERA') {
    $xml = $xml.Replace('<application', '    <uses-permission android:name="android.permission.CAMERA" />' + "`n" + '    <uses-permission android:name="android.permission.INTERNET" />' + "`n" + '    <application')
  }
  Set-Content $android $xml -Encoding UTF8
}
$debug = 'android/app/src/debug/AndroidManifest.xml'
if (Test-Path $debug) {
  $xml = Get-Content $debug -Raw
  if ($xml -notmatch 'usesCleartextTraffic') {
    $xml = $xml.Replace('<application', '<application android:usesCleartextTraffic="true"')
    Set-Content $debug $xml -Encoding UTF8
  }
}
$plist = 'ios/Runner/Info.plist'
if (Test-Path $plist) {
  $xml = Get-Content $plist -Raw
  $values = @(
    @('NSCameraUsageDescription', 'Kuki POS membutuhkan kamera untuk scan barcode produk.'),
    @('NSLocalNetworkUsageDescription', 'Kuki POS tersambung ke server Laravel lokal untuk sinkronisasi.'),
    @('UIRequiresFullScreen', 'TRUE')
  )
  $insert = ''
  if ($xml -notmatch '<key>NSCameraUsageDescription</key>') {
    $insert += "`n`t<key>NSCameraUsageDescription</key>`n`t<string>Kuki POS membutuhkan kamera untuk scan barcode produk.</string>"
  }
  if ($xml -notmatch '<key>NSLocalNetworkUsageDescription</key>') {
    $insert += "`n`t<key>NSLocalNetworkUsageDescription</key>`n`t<string>Kuki POS tersambung ke server lokal untuk sinkronisasi.</string>"
  }
  if ($xml -notmatch '<key>UIRequiresFullScreen</key>') {
    $insert += "`n`t<key>UIRequiresFullScreen</key>`n`t<true/>"
  }
  if ($xml -notmatch '<key>NSAllowsLocalNetworking</key>') {
    $insert += "`n`t<key>NSAppTransportSecurity</key>`n`t<dict><key>NSAllowsLocalNetworking</key><true/></dict>"
  }
  if ($insert) {
    $loc = $xml.IndexOf('<dict>')
    if ($loc -ge 0) {
      $loc += '<dict>'.Length
      $xml = $xml.Insert($loc, $insert)
      Set-Content $plist $xml -Encoding UTF8
    }
  }
}
Write-Host 'Izin Android/iOS disiapkan. Release membutuhkan HTTPS dan signing iOS melalui Mac.'
