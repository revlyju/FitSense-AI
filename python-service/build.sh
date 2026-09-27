#!/usr/bin/env bash
set -e

echo "=== [1/2] Attempting to extract shared graphics libraries for MediaPipe ==="
mkdir -p local_libs
cd local_libs
apt-get download libgles2 libegl1 libgl1 libglvnd0 2>/dev/null || true
for f in *.deb; do
  [ -f "$f" ] && dpkg -x "$f" . 2>/dev/null || true
done
cd ..

echo "=== [2/2] Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Build completed successfully! ==="
