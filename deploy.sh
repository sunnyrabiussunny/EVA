#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   E.V.A. — Executive Virtual Assistant       ║"
echo "║   Deploying to http://$(hostname -I | awk '{print $1}'):9999    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found."
  echo "   Run: sudo apt install docker.io docker-compose-v2"
  exit 1
fi

# Remove version warning from docker-compose
sed -i '/^version:/d' docker-compose.yml 2>/dev/null || true

echo "⟳  Stopping old containers..."
docker compose down 2>/dev/null || true

echo "⟳  Building EVA (3-5 min first time)..."
docker compose build --no-cache

echo "⟳  Starting..."
docker compose up -d

sleep 5

if docker ps | grep eva-frontend > /dev/null; then
  IP=$(hostname -I | awk '{print $1}')
  echo ""
  echo "✓  E.V.A. is live!"
  echo ""
  echo "   Open:        http://${IP}:9999"
  echo "   Backend API: http://${IP}:4000"
  echo ""
  echo "   Ollama models:"
  ollama list 2>/dev/null || echo "   (run: ollama list)"
  echo ""
  echo "   Logs:  docker logs -f eva-frontend"
  echo "   Stop:  docker compose down"
  echo "   Update: git pull origin main && ./deploy.sh"
else
  echo "❌ Failed. Check:"
  echo "   docker logs eva-backend"
  echo "   docker logs eva-frontend"
  exit 1
fi
