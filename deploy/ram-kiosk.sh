#!/usr/bin/env bash
# Abre o rosto do RAM em tela cheia (modo quiosque) quando o backend estiver no ar.
# Chamado pelo autostart da sessão gráfica (veja o README).

URL="${RAM_FACE_URL:-http://localhost:8000/face}"

# espera o backend responder (até ~60 s)
for _ in $(seq 60); do
  curl -fs "http://localhost:8000/api/info" >/dev/null && break
  sleep 1
done

# nome do executável muda entre versões do Raspberry Pi OS / distros
BROWSER=$(command -v chromium || command -v chromium-browser || command -v google-chrome)

exec "$BROWSER" \
  --kiosk "$URL" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  --incognito
