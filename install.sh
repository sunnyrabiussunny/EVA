#!/usr/bin/env bash
# EVA — Executive Virtual Assistant
# One-Click Install: Ubuntu / macOS / Raspberry Pi
# Windows: use install.bat

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

print() { echo -e "${CYAN}[EVA]${NC} $1"; }
ok()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
err()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo -e "${BOLD}  ╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}  ║  EVA — Executive Virtual Assistant   ║${NC}"
echo -e "${BOLD}  ║  Self-hosted · Private · AI-powered  ║${NC}"
echo -e "${BOLD}  ╚══════════════════════════════════════╝${NC}"
echo ""

# ── Docker check ─────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  print "Docker not found. Installing..."
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    ok "Docker installed"
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    err "Please install Docker Desktop: https://docker.com/products/docker-desktop"
  fi
else
  ok "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
fi

# ── .env ─────────────────────────────────────────────────
if [ ! -f .env ]; then
  print "Creating .env..."
  cat > .env << 'ENVEOF'
# ── AI PROVIDER ────────────────────────────────────────────
# Option A: Claude API — get free key at console.anthropic.com
ANTHROPIC_API_KEY=

# Option B: Local Ollama — install from ollama.com, then: ollama pull llama3
OLLAMA_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3

# auto = tries Claude first, falls back to Ollama
AI_PROVIDER=auto
ENVEOF
  ok ".env created — edit it to add your ANTHROPIC_API_KEY"
else
  ok ".env already exists (settings kept)"
fi

mkdir -p data
ok "Data directory ready"

# ── Build & Start ─────────────────────────────────────────
print "Building EVA (first build: ~3 minutes)..."

if docker compose version &>/dev/null 2>&1; then
  docker compose down --remove-orphans 2>/dev/null || true
  docker compose up -d --build
else
  docker-compose down --remove-orphans 2>/dev/null || true
  docker-compose up -d --build
fi

ok "EVA is running!"

# ── systemd service (Linux only) ─────────────────────────
if [[ "$OSTYPE" == "linux-gnu"* ]] && command -v systemctl &>/dev/null; then
  INSTALL_DIR="$(pwd)"
  sudo tee /etc/systemd/system/eva.service > /dev/null << SVCEOF
[Unit]
Description=EVA — Executive Virtual Assistant
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
SVCEOF
  sudo systemctl daemon-reload
  sudo systemctl enable eva 2>/dev/null || true
  ok "Installed as system service (auto-starts on reboot)"
fi

# ── Done ─────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}  ╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}  ║  EVA is ready!                       ║${NC}"
echo -e "${GREEN}${BOLD}  ║  http://localhost:3737               ║${NC}"
echo -e "${GREEN}${BOLD}  ╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Set up AI:${NC}"
echo -e "  Claude API → add to .env: ${BOLD}ANTHROPIC_API_KEY=sk-ant-...${NC}"
echo -e "  Ollama     → ${BOLD}ollama pull llama3${NC} (free, local)"
echo -e "  Then:      → ${BOLD}docker compose restart${NC}"
echo ""
