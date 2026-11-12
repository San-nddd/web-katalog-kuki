"""Idempotent platform configuration after flutter create (Mac/Linux)."""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
manifest=root/'android/app/src/main/AndroidManifest.xml'
if manifest.exists():
    s=manifest.read_text()
    if 'android.permission.CAMERA' not in s:
        s=s.replace('<application', '<uses-permission android:name="android.permission.CAMERA" />\n    <uses-permission android:name="android.permission.INTERNET" />\n    <application',1)
    manifest.write_text(s)
debug=root/'android/app/src/debug/AndroidManifest.xml'
if debug.exists():
    s=debug.read_text()
    if 'usesCleartextTraffic' not in s:
        s=s.replace('<application','<application android:usesCleartextTraffic="true"',1)
    debug.write_text(s)
plist=root/'ios/Runner/Info.plist'
if plist.exists():
    s=plist.read_text()
    content=[]
    if 'NSCameraUsageDescription' not in s:
        content.append('<key>NSCameraUsageDescription</key><string>Kuki POS membutuhkan kamera untuk scan barcode produk.</string>')
    if 'NSLocalNetworkUsageDescription' not in s:
        content.append('<key>NSLocalNetworkUsageDescription</key><string>Kuki POS tersambung ke server lokal untuk sinkronisasi.</string>')
    if 'UIRequiresFullScreen' not in s:
        content.append('<key>UIRequiresFullScreen</key><true/>')
    if 'NSAllowsLocalNetworking' not in s:
        content.append('<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>')
    if content: s=s.replace('<dict>','<dict>\n    '+'\n    '.join(content),1)
    plist.write_text(s)
print('Platform camera/network/landscape configuration ready.')
