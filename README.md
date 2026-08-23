<div align="center">

# E.V.A.
### Executive Virtual Assistant

**Self-hosted AI boardroom intelligence. Powered by Ollama. Runs entirely on your own server.**

[![License: MIT](https://img.shields.io/badge/License-MIT-6c63ff.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-00bbf9.svg)](docker-compose.yml)
[![Ollama](https://img.shields.io/badge/AI-Ollama%20Offline-00f5d4.svg)](https://ollama.com)
[![Port](https://img.shields.io/badge/Port-9999-f59e0b.svg)](http://localhost:9999)

*Ask a question out loud. Get a live boardroom dashboard in seconds. No cloud. No subscription. Your data stays yours.*

</div>

---

## What is E.V.A.?

EVA is a self-hosted executive assistant that turns your company documents into live boardroom intelligence. Upload financial reports, business plans, meeting transcripts, and due diligence files — then ask questions in plain English (or by voice) and get real-time dashboards and AI-powered insights — all running locally on your own server using Ollama.

**No OpenAI required. No cloud APIs. No data leaves your server.**

---

## Features

### Boardroom (Landing Page)
- Voice-activated queries — speak your question, get a live report instantly
- Animated AI avatar with states: Standby / Listening / Processing / Reporting
- Real KPI tiles extracted from your actual uploaded documents — not hardcoded
- Source selector — choose exactly which files to use per query
- Live charts: Revenue Trend, Sales Pipeline, Dept Budgets, Cash Flow, KPI Radar
- Upload meeting transcripts and get AI analysis instantly

### Knowledge Base
- Upload company files permanently to your server (PDF, Excel, Word, CSV, Markdown, JSON)
- Drag-and-drop .md import directly in the browser
- Files survive container restarts and updates via Docker named volume
- Manage all files from inside the app — view, delete, add
- All files automatically available to boardroom queries

### Idea Vault
- Capture ideas instantly with title, body, and category
- Edit any idea with pencil button — full modal editor
- Full view modal — see complete idea and AI expansion
- Drag-and-drop .md file import as ideas
- AI expansion via Ollama — turns rough idea into full concept with first action step

### Content Queue
- AI-generated posts for LinkedIn, Twitter, Newsletter
- Auto-fills queue from your ideas and knowledge base
- Status pipeline: Draft → Ready → Published

### Projects and Tasks
- Full project management: status, priority, progress, deadlines
- AI project health analysis — score, next actions, risks, opportunities
- Task board with priority sorting

### AI Insights
- Proactive analysis of your projects, tasks, content, and ideas
- Powered entirely by Ollama — no internet required

### Voice Agent (EVA Voice)
- Say **"Hey EVA"** to activate from anywhere
- Voice-to-Idea: speak an idea, it saves to Idea Vault automatically
- Hands-free Boardroom: voice query → live dashboard
- Research Agent: say "research X" → web search → summarized → saved to Knowledge Base
- Daily Brief: reads your morning brief out loud at 7am automatically

### Background AI Toggle
- One-click stop/start for all background AI tasks from the sidebar
- Manual boardroom queries still work when background AI is off
- Saves RAM on lower-spec servers

---

## One-Command Install

### Ubuntu / Debian (Recommended)

**Step 1 — Install Docker**
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER && newgrp docker
```

**Step 2 — Install Ollama and pull models**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1
ollama pull qwen3:0.6b-q4_K_M
```

**Step 3 — Create Docker network and volume**
```bash
docker network create eva-network 2>/dev/null || true
docker volume create eva_persistent_data 2>/dev/null || true
```

**Step 4 — Deploy EVA**
```bash
git clone https://github.com/sunnyrabiussunny/EVA.git eva-aria
cd eva-aria
cp .env.example .env
chmod +x deploy.sh
./deploy.sh
```

Open in browser: **http://YOUR_SERVER_IP:9999**

---

### Windows (Git Bash — push code to GitHub)

This is for developers who want to push code changes to GitHub from Windows.

**Step 1 — Install Git for Windows**

Download from: https://git-scm.com/download/win
During install, select "Use Git from Git Bash only"

**Step 2 — Clone the repo**
```bash
# Open Git Bash
cd "C:/Users/YOUR_NAME/Downloads"
git clone https://github.com/sunnyrabiussunny/EVA.git
cd EVA
```

**Step 3 — Make changes, commit, push**
```bash
git add -A
git commit -m "your change description"
git push origin main
```

**Step 4 — Deploy on Ubuntu server (from Windows PowerShell)**
```powershell
ssh ubuntuasus@YOUR_SERVER_IP "cd ~/eva-aria && docker compose down && git pull origin main && ./deploy.sh"
```

---

### macOS

**Step 1 — Install prerequisites**
```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Ollama
brew install ollama
ollama serve &
ollama pull llama3.1

# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
```

**Step 2 — Create network and volume**
```bash
docker network create eva-network 2>/dev/null || true
docker volume create eva_persistent_data 2>/dev/null || true
```

**Step 3 — Deploy**
```bash
git clone https://github.com/sunnyrabiussunny/EVA.git eva-aria
cd eva-aria
cp .env.example .env
./deploy.sh
```

---

## Update to Latest Version

One command — your data is always safe:

```bash
cd ~/eva-aria && docker compose down && git pull origin main && ./deploy.sh
```

Your knowledge base files and SQLite database are stored in a Docker named volume (`eva_persistent_data`) and are **never deleted** during updates.

---

## Install Voice Agent

After EVA is running, set up the voice agent for hands-free operation:

```bash
# Install dependencies
sudo apt install -y ffmpeg portaudio19-dev python3-pyaudio sox espeak python3-venv
python3 -m venv ~/eva-voice-env
source ~/eva-voice-env/bin/activate
pip install openai-whisper sounddevice numpy requests duckduckgo-search scipy

# Install EVA Voice Agent
cd ~/eva-aria/voice
chmod +x setup.sh
./setup.sh

# Test connections
~/eva-voice/eva-voice test

# Try text commands first
~/eva-voice/eva-voice brief
~/eva-voice/eva-voice idea "Finnish market robot subscription model"
~/eva-voice/eva-voice research "Keto Software competitor Finland"
~/eva-voice/eva-voice boardroom "show me revenue performance"

# Start wake word mode
~/eva-voice/eva-voice start
# Then say: "Hey EVA, show me the revenue performance"
```

**Auto-start voice agent on boot:**
```bash
sudo cp /tmp/eva-voice.service /etc/systemd/system/
sudo systemctl enable eva-voice
sudo systemctl start eva-voice
```

---

## Demo Data

Download `acme-robotics-demo-data.md` from this repo and upload it to the Knowledge Base inside EVA. Then ask:

- *"Show me the revenue performance this year"*
- *"What does our sales pipeline look like?"*
- *"Give me the executive scorecard"*
- *"What are our key risks?"*
- *"What is our cash runway?"*

EVA will extract real numbers from the file and generate live dashboards with actual KPIs labelled by source.

---

## Data and Backups

All persistent data lives in a Docker named volume:

```
eva_persistent_data/
├── aios.db                  # SQLite database
└── knowledge-files/         # Your uploaded company documents
```

**Back up your data:**
```bash
docker run --rm \
  -v eva_persistent_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/eva-backup-$(date +%Y%m%d).tar.gz /data
echo "Saved to eva-backup-$(date +%Y%m%d).tar.gz"
```

**Restore from backup:**
```bash
docker run --rm \
  -v eva_persistent_data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/eva-backup-YYYYMMDD.tar.gz -C /
```

---

## Manage the Service

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View live logs
docker logs -f eva-backend
docker logs -f eva-frontend

# Rebuild after code change
docker compose up -d --build

# Restart backend only (faster)
docker compose up -d --build backend

# Check container status
docker ps | grep eva

# Stop background AI only
curl -X POST http://localhost:4000/api/ai/toggle \
  -H "Content-Type: application/json" \
  -d '{"running": false}'
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure before deploying.

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `ollama` | `ollama` for offline, `claude` for Anthropic API |
| `OLLAMA_MODEL` | `llama3.1:latest` | Model name — must match `ollama list` output |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama endpoint from inside Docker |
| `ANTHROPIC_API_KEY` | *(blank)* | Optional — only needed if `AI_PROVIDER=claude` |
| `DATA_DIR` | `/app/data` | Where DB and knowledge files are stored |

---

## Ollama Model Guide

| Model | Size | Speed | Best For |
|---|---|---|---|
| `llama3.1:latest` | 4.9 GB | Medium | Deep document analysis, boardroom reports |
| `qwen3:0.6b-q4_K_M` | 522 MB | Very fast | Quick queries, low RAM servers |
| `gemma4:e4b` | 9.6 GB | Slow | Most accurate, high-RAM servers |

Switch models from **Boardroom → Configure** inside EVA without restarting.

---

## Architecture

```
Browser
  └── http://SERVER_IP:9999
        └── Nginx (Docker)
              ├── /        → React SPA (Vite build)
              └── /api/*   → Node.js Backend :4000 (Docker)
                              ├── SQLite Database
                              ├── Knowledge Files (Docker volume)
                              └── Ollama API → host:11434

EVA Voice Agent (Python, runs on host)
  └── Microphone → Whisper STT → Intent Detection
        ├── boardroom → EVA API /boardroom/query
        ├── idea      → EVA API /ideas
        ├── research  → DuckDuckGo → Ollama → EVA API /knowledge
        └── brief     → EVA API /brief/today → espeak TTS
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Recharts |
| Backend | Node.js 20 + Express + better-sqlite3 |
| Database | SQLite (WAL mode, persistent volume) |
| AI Engine | Ollama — llama3.1, qwen3, gemma (fully offline) |
| Voice STT | OpenAI Whisper (tiny model, runs locally) |
| Voice TTS | espeak (offline) |
| Research | DuckDuckGo Search API (no key needed) |
| Container | Docker + Docker Compose |
| Proxy | Nginx |

---

## Troubleshooting

**Save failed / Failed to fetch**
```bash
docker logs eva-backend --tail 20
docker compose up -d --build backend
```

**Port 9999 already in use**
```bash
docker stop $(docker ps -q --filter publish=9999) 2>/dev/null
docker compose up -d
```

**AI queries fail**
```bash
# Check Ollama is running
ollama list
curl http://localhost:11434/api/tags

# Check model name in .env matches exactly
cat ~/eva-aria/.env
```

**git pull fails with divergent branches**
```bash
cd ~/eva-aria
git fetch origin && git reset --hard origin/main
./deploy.sh
```

**docker compose warns about network/volume**
```bash
docker network create eva-network 2>/dev/null || true
docker volume create eva_persistent_data 2>/dev/null || true
docker compose up -d
```

---

## Project Structure

```
EVA/
├── backend/
│   ├── server.js          # Express API (projects, tasks, ideas, knowledge, boardroom)
│   ├── ai.js              # Ollama + Claude AI provider
│   ├── db.js              # SQLite schema and init
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Boardroom.jsx     # Voice dashboard, source selector, file manager
│   │   │   ├── Dashboard.jsx     # Daily brief, stats
│   │   │   ├── Projects.jsx      # Project management
│   │   │   ├── Content.jsx       # Content queue
│   │   │   └── Pages.jsx         # Tasks, Ideas, Knowledge, Insights, Settings
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # Navigation + AI toggle button
│   │   │   └── Toast.jsx         # Notifications
│   │   ├── App.jsx               # Router — Boardroom is landing page
│   │   └── index.css             # EVA design system (dark/light)
│   ├── nginx.conf
│   ├── package.json
│   └── Dockerfile
├── voice/
│   ├── eva_voice.py       # Voice agent (Whisper STT, intent detection, TTS)
│   ├── setup.sh           # Voice agent installer
│   └── README.md          # Voice agent docs
├── docker-compose.yml
├── deploy.sh              # One-command deploy script
├── .env.example
└── README.md
```

---

## License

MIT — use it, fork it, ship it.

---

<div align="center">

Built by [Sunny Rabius Sunny](https://github.com/sunnyrabiussunny)

*Self-hosted · Offline-first · Your data, your server*

</div>
