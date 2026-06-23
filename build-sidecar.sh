#!/usr/bin/env bash
# build-sidecar.sh
# Compile data_fetch Go binary และวางในตำแหน่งที่ Tauri ต้องการ
#
# Tauri sidecar naming convention:
#   binaries/<name>-<target-triple>[.exe]
#
# ตัวอย่าง:
#   binaries/hawknet-fetch-x86_64-unknown-linux-gnu
#   binaries/hawknet-fetch-x86_64-apple-darwin
#   binaries/hawknet-fetch-aarch64-apple-darwin
#   binaries/hawknet-fetch-x86_64-pc-windows-msvc.exe

set -euo pipefail

BINARY_NAME="hawknet-fetch"
OUTPUT_DIR="src-tauri/binaries"

mkdir -p "$OUTPUT_DIR"

# ตรวจสอบว่า rustc มี target triple ไหม
if command -v rustc &>/dev/null; then
    TARGET_TRIPLE=$(rustc -Vv | grep host | cut -f2 -d' ')
else
    # fallback detect
    case "$(uname -s)" in
        Linux*)
            ARCH=$(uname -m)
            case $ARCH in
                x86_64)  TARGET_TRIPLE="x86_64-unknown-linux-gnu" ;;
                aarch64) TARGET_TRIPLE="aarch64-unknown-linux-gnu" ;;
                *)       TARGET_TRIPLE="${ARCH}-unknown-linux-gnu" ;;
            esac
            ;;
        Darwin*)
            ARCH=$(uname -m)
            case $ARCH in
                x86_64) TARGET_TRIPLE="x86_64-apple-darwin" ;;
                arm64)  TARGET_TRIPLE="aarch64-apple-darwin" ;;
                *)      TARGET_TRIPLE="${ARCH}-apple-darwin" ;;
            esac
            ;;
        MINGW*|MSYS*|CYGWIN*)
            TARGET_TRIPLE="x86_64-pc-windows-msvc"
            ;;
        *)
            echo "❌ Unknown OS: $(uname -s)"
            exit 1
            ;;
    esac
fi

# Windows ต้องการ .exe
EXT=""
if [[ "$TARGET_TRIPLE" == *"windows"* ]]; then
    EXT=".exe"
fi

OUTPUT_PATH="${OUTPUT_DIR}/${BINARY_NAME}-${TARGET_TRIPLE}${EXT}"

echo "🔨 Building data_fetch for ${TARGET_TRIPLE}..."
echo "   Output: ${OUTPUT_PATH}"

cd data_fetch

# Build Go binary
CGO_ENABLED=0 go build \
    -ldflags="-s -w" \
    -o "../${OUTPUT_PATH}" \
    ./main.go

cd ..

chmod +x "$OUTPUT_PATH" 2>/dev/null || true

echo "✅ Built: ${OUTPUT_PATH}"
echo ""
echo "Next steps:"
echo "  pnpm tauri dev    → dev mode (sidecar auto-starts)"
echo "  pnpm tauri build  → production build"