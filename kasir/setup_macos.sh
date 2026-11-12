#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v flutter >/dev/null || { echo 'Install Flutter SDK dulu'; exit 1; }
flutter create --org id.kukibakehouse --platforms=android,ios --project-name=kuki_pos --no-pub .
./configure_platforms.sh
flutter pub get
flutter analyze
printf '\nJalankan flutter run. Untuk iOS perlu Xcode signing.\n'
