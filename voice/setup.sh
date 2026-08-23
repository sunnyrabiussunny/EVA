#!/bin/bash
set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   EVA Voice Agent — Setup                   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

VENV="$HOME/eva-voice-env"
INSTALL_DIR="$HOME/eva-voice"

# ── TTS engine ──
echo "⟳  Installing TTS engine (espeak)..."
sudo apt install -y espeak espeak-data libespeak-dev 2>/dev/null || true

# ── scipy for wav writing ──
echo "⟳  Installing scipy..."
source "$VENV/bin/activate"
pip install scipy --quiet

# ── Create install dir ──
mkdir -p "$INSTALL_DIR/logs"

# ── Copy agent script ──
cp "$(dirname "$0")/eva_voice.py" "$INSTALL_DIR/"

# ── Create launcher script ──
cat > "$INSTALL_DIR/eva-voice" << 'LAUNCHER'
#!/bin/bash
source "$HOME/eva-voice-env/bin/activate"
exec python3 "$HOME/eva-voice/eva_voice.py" "$@"
LAUNCHER
chmod +x "$INSTALL_DIR/eva-voice"

# ── Create systemd service for auto-start ──
cat > /tmp/eva-voice.service << SYSTEMD
[Unit]
Description=EVA Voice Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$VENV/bin:/usr/local/bin:/usr/bin:/bin"
Environment="EVA_API=http://localhost:4000/api"
Environment="OLLAMA_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=llama3.1:latest"
Environment="WAKE_WORD=hey eva"
Environment="BRIEF_HOUR=7"
ExecStart=$VENV/bin/python3 $INSTALL_DIR/eva_voice.py start
Restart=on-failure
RestartSec=5
StandardOutput=append:$INSTALL_DIR/logs/eva-voice.log
StandardError=append:$INSTALL_DIR/logs/eva-voice.log

[Install]
WantedBy=multi-user.target
SYSTEMD

echo ""
echo "✓  EVA Voice Agent installed at $INSTALL_DIR"
echo ""
echo "Quick test:"
echo "  source ~/eva-voice-env/bin/activate"
echo "  ~/eva-voice/eva-voice test"
echo ""
echo "Run commands:"
echo "  ~/eva-voice/eva-voice boardroom 'show me revenue performance'"
echo "  ~/eva-voice/eva-voice idea 'Finnish market robot subscription model'"
echo "  ~/eva-voice/eva-voice research 'Keto Software competitor analysis'"
echo "  ~/eva-voice/eva-voice brief"
echo ""
echo "Start wake word mode (say 'Hey EVA' to activate):"
echo "  ~/eva-voice/eva-voice start"
echo ""
echo "Install as system service (auto-start on boot):"
echo "  sudo cp /tmp/eva-voice.service /etc/systemd/system/"
echo "  sudo systemctl enable eva-voice"
echo "  sudo systemctl start eva-voice"
echo ""
