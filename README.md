<div align="center">

<img src="https://img.shields.io/badge/E.V.A.-Executive%20Virtual%20Assistant-00f5d4?style=for-the-badge&labelColor=060c14" alt="EVA"/>

# E.V.A. — Executive Virtual Assistant

**Self-hosted AI boardroom intelligence system. Powered by Ollama. Runs entirely on your own server.**

[![License: MIT](https://img.shields.io/badge/License-MIT-6c63ff.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-00bbf9.svg)](docker-compose.yml)
[![Ollama](https://img.shields.io/badge/AI-Ollama%20Offline-00f5d4.svg)](https://ollama.com)
[![Port](https://img.shields.io/badge/Port-9999-f59e0b.svg)](http://localhost:9999)

*Ask a question out loud. Get a live boardroom dashboard in seconds. No cloud. No subscription. Your data stays yours.*

[Quick Install](#one-command-install) · [Features](#features) · [Demo Data](#demo-data) · [Update](#update) · [Tech Stack](#tech-stack)

</div>

---

## What is E.V.A.?

E.V.A. is a self-hosted executive assistant that turns your company documents into live boardroom intelligence. Upload your financial reports, business plans, meeting transcripts, and due diligence files — then ask questions in plain English (or by voice) and get real-time dashboards, KPI analysis, and AI-powered insights — all running locally on your own server using Ollama.

No OpenAI. No cloud APIs required. No data leaves your server.

---

## Features

### Boardroom Intelligence (Landing Page)
- **Voice-activated queries** — speak your question, get a live report
- **Animated AI avatar** — visual states: Standby / Listening / Processing / Reporting
- **Real KPI extraction** — numbers pulled from your actual uploaded documents, not hardcoded
- **Source selector** — choose exactly which files to use for each query
- **Live charts** — Revenue Trend, Sales Pipeline, Dept Budgets, Cash Flow, KPI Radar
- **Session log** — full history of every CEO query and EVA response

### Knowledge Base
- Upload company files permanently to your server (PDF, Excel, Word, CSV, Markdown, JSON)
- Drag-and-drop `.md` file import directly in browser
- Files survive container restarts and updates (Docker named volume)
- Manage all files from inside the app — view, delete, add
- All files automatically available to boardroom queries

### Idea Vault
- Capture ideas instantly with title, body, and category
- Drag-and-drop `.md` import as ideas
- AI expansion via Ollama — turns a rough idea into a full concept with first action step
- Categories: product, content, business, research, personal, imported

### Content Queue
- AI-generated posts for LinkedIn, Twitter, Newsletter
- Auto-fills queue from your ideas and knowledge base
- Status pipeline: Draft → Ready → Published

### Projects and Tasks
- Full project management: status, priority, progress tracking, deadlines
- AI project health analysis — score, next actions, risks, opportunities
- Task board with priority sorting across all projects

### AI Insights
- Proactive analysis of your projects, tasks, content, and ideas
- Powered entirely by Ollama — no internet required

### Background AI Toggle
- One-click stop/start for all background AI tasks from the sidebar
- Stops auto-brief generation and content autofill
- Manual boardroom queries still work when background AI is off
- Useful for saving RAM on lower-spec servers

---

## Demo Data

Download [`acme-robotics-demo-data.md`](acme-robotics-demo-data.md) and upload it to the Knowledge Base inside EVA. Then try asking:

> *"Show me the revenue performance this year"*
> *"What does our sales pipeline look like?"*
> *"Give me the executive scorecard"*
> *"What are our key risks?"*
> *"What is our cash runway?"*

EVA will extract real numbers from the file and generate live dashboards with actual KPIs labelled by source.

---

## One-Command Install

### Ubuntu / Debian (Recommended)

**Step 1 — Install Ollama and pull models**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1
ollama pull qwen3:0.6b-q4_K_M
```

**Step 2 — Install Docker (if not already installed)**
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER && newgrp docker
```

**Step 3 — Deploy EVA**
```bash
git clone https://github.com/sunnyrabiussunny/EVA.git eva-aria
cd eva-aria
cp .env.example .env
chmod +x deploy.sh
./deploy.sh
```

Open in browser: **http://YOUR_SERVER_IP:9999**

---

### Windows (WSL2)

**Step 1 — Enable WSL2 and install Ubuntu**
```powershell
# Run in PowerShell as Administrator
wsl --install
# Restart your PC, then open Ubuntu from Start Menu
```

**Step 2 — Inside Ubuntu (WSL2), install Docker**
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo service docker start
```

**Step 3 — Install Ollama for Windows**

Download and install from: https://ollama.com/download/windows

Then open PowerShell:
```powershell
ollama pull llama3.1
ollama pull qwen3:0.6b-q4_K_M
```

**Step 4 — Deploy EVA inside WSL2**
```bash
git clone https://github.com/sunnyrabiussunny/EVA.git eva-aria
cd eva-aria
cp .env.example .env
# Edit .env — change OLLAMA_URL to your Windows IP
# Run: cat /etc/resolv.conf | grep nameserver
nano .env
chmod +x deploy.sh
./deploy.sh
```

Open in browser: **http://localhost:9999**

---

### macOS

**Step 1 — Install prerequisites**
```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Ollama
brew install ollama
ollama serve &
ollama pull llama3.1
ollama pull qwen3:0.6b-q4_K_M

# Install Docker Desktop from https://www.docker.com/products/docker-desktop/
```

**Step 2 — Deploy EVA**
```bash
git clone https://github.com/sunnyrabiussunny/EVA.git eva-aria
cd eva-aria
cp .env.example .env
chmod +x deploy.sh
./deploy.sh
```

Open in browser: **http://localhost:9999**

---

## Update to Latest Version

One command — your data is safe:

```bash
cd ~/eva-aria
docker compose down
git pull origin main
./deploy.sh
```

Your knowledge base files and SQLite database are stored in a Docker named volume (`eva_persistent_data`) and are **never deleted** during updates.

---

## Data and Backups

All persistent data lives in a Docker named volume:

```
eva_persistent_data/
├── aios.db                  # SQLite database (all projects, tasks, ideas, content)
└── knowledge-files/         # Your uploaded company documents
```

**Back up your data:**
```bash
docker run --rm \
  -v eva_persistent_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/eva-backup-$(date +%Y%m%d).tar.gz /data

echo "Backup saved to eva-backup-$(date +%Y%m%d).tar.gz"
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
# Start EVA
docker compose up -d

# Stop EVA
docker compose down

# View live logs
docker logs -f eva-backend
docker logs -f eva-frontend

# Rebuild after a code change
docker compose up -d --build

# Restart backend only (faster)
docker compose up -d --build backend

# Check container status
docker ps | grep eva

# Stop background AI operations only (via API)
curl -X POST http://localhost:4000/api/ai/toggle \
  -H "Content-Type: application/json" \
  -d '{"running": false}'
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure before deploying.

| Variable | Default | Description |
|---|---|---|
| `AI_PROVIDER` | `ollama` | `ollama` for offline · `claude` for Anthropic API |
| `OLLAMA_MODEL` | `llama3.1:latest` | Model name — must match `ollama list` output |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama endpoint from inside Docker container |
| `ANTHROPIC_API_KEY` | *(blank)* | Optional — only needed if `AI_PROVIDER=claude` |
| `DATA_DIR` | `/app/data` | Where DB and knowledge files are stored in container |

**For WSL2 on Windows**, replace `OLLAMA_URL` with your Windows host IP:
```bash
# Find your Windows IP from inside WSL2
cat /etc/resolv.conf | grep nameserver
# Then set in .env:
OLLAMA_URL=http://172.x.x.x:11434
```

---

## Ollama Model Guide

| Model | Size | Speed | Best For |
|---|---|---|---|
| `llama3.1:latest` | 4.9 GB | Medium | Deep document analysis, boardroom reports |
| `qwen3:0.6b-q4_K_M` | 522 MB | Very fast | Quick queries, low RAM servers |
| `gemma4:e4b` | 9.6 GB | Slow | Most accurate, high-RAM servers |

Switch models anytime from the **Boardroom → Configure** panel inside EVA without restarting.

---

## Architecture

```
Browser
  └── http://SERVER_IP:9999
        └── Nginx (Docker)
              ├── / → React SPA (Vite build)
              └── /api/* → Node.js Backend :4000 (Docker)
                              ├── SQLite Database
                              ├── Knowledge Files (Docker volume)
                              └── Ollama API → host:11434
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Recharts |
| Backend | Node.js 20 + Express + better-sqlite3 |
| Database | SQLite (via better-sqlite3, WAL mode) |
| AI Engine | Ollama — llama3.1, qwen3, gemma (fully offline) |
| File Storage | Docker named volume (persistent across updates) |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx (serves frontend + routes API calls) |

---

## Troubleshooting

**EVA loads but AI queries fail**
```bash
# Check Ollama is running
ollama list
curl http://localhost:11434/api/tags

# Check backend logs
docker logs eva-backend --tail 30

# Make sure model name in .env matches ollama list exactly
cat ~/eva-aria/.env
```

**Port 9999 already in use**
```bash
sudo lsof -i :9999
docker stop $(docker ps -q --filter publish=9999)
docker compose up -d
```

**Knowledge files not persisting after update**
```bash
# Check volume exists
docker volume inspect eva_persistent_data

# If missing, recreate
docker volume create eva_persistent_data
docker compose up -d
```

**Save failed / Failed to fetch errors**
```bash
# Backend is likely not running
docker ps | grep eva-backend
docker logs eva-backend --tail 20
docker compose up -d --build backend
```

---

## License

MIT — use it, fork it, ship it.

---

<div align="center">

Built by [Sunny Rabius Sunny](https://github.com/sunnyrabiussunny)

*Self-hosted · Offline-first · Your data, your server*

</div>
