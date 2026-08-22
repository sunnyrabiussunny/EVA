#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   E.V.A. — Executive Virtual Assistant       ║"
echo "║   Deploying to http://192.168.10.120:9999    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Run: sudo apt install docker.io"
  exit 1
fi

echo "⟳  Stopping old containers (data is preserved)..."
docker compose down 2>/dev/null || true

echo "⟳  Building E.V.A. (3-5 min first time)..."
docker compose build --no-cache

echo "⟳  Starting..."
docker compose up -d

sleep 4

if docker ps | grep eva-frontend > /dev/null; then
  echo ""
  echo "✓  E.V.A. is live!"
  echo ""
  echo "   Open:        http://192.168.10.120:9999"
  echo "   Backend API: http://192.168.10.120:4000"
  echo ""
  echo "   Knowledge files stored in Docker volume: eva_persistent_data"
  echo "   Data survives restarts and updates."
  echo ""
  echo "   Ollama models on this server:"
  ollama list 2>/dev/null || echo "   (run: ollama list)"
  echo ""
  echo "   Logs:  docker logs -f eva-frontend"
  echo "   Stop:  docker compose down"
else
  echo "❌ Failed. Check: docker logs eva-frontend"
  echo "   Also: docker logs eva-backend"
  exit 1
fi
