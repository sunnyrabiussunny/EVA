# EVA — Executive Virtual Assistant

> AI-assisted executive computing assistant that proactively prepares tasks, context, files, and workflows — before you ask.

**Self-hosted. Private. Runs on your own server.**

Port: **3737**

---

## Features

| Module | What it does |
|---|---|
| 📋 **Projects** | Track with progress, deadlines, priorities — AI analyzes health & next actions |
| ✅ **Tasks** | Kanban board: Todo → In Progress → Done |
| 🧠 **AI Insights** | EVA scans all your data and proactively flags risks, opportunities, missing actions |
| ✍️ **Content Queue** | Generate LinkedIn / Facebook / X posts across 13 writing angles |
| 💡 **Idea Vault** | Capture ideas fast, AI expands them into detailed concepts |
| 📚 **Knowledge Base** | Searchable store for notes, research, documents |
| 📅 **Today's Brief** | Morning AI summary: priorities, warnings, content ready |
| ⚙️ **Settings** | Configure AI provider, name, voice, preferences |

---

## AI Provider Options

EVA works with **Claude API** or local **Ollama** — auto-detects what's available.

| Provider | Cost | Quality | Privacy |
|---|---|---|---|
| Claude API | Free tier tokens (very small usage) | Best | Cloud |
| Ollama (local) | Free forever | Good | 100% local |
| None | Free | No AI features | Local |

---

## Install

### Ubuntu / Raspberry Pi / Linux
```bash
git clone https://github.com/sunnyrabiussunny/EVA.git
cd EVA
bash install.sh
```

### macOS
```bash
git clone https://github.com/sunnyrabiussunny/EVA.git
cd EVA
bash install.sh
```

### Windows
```batch
git clone https://github.com/sunnyrabiussunny/EVA.git
cd EVA
install.bat
```

Open: **http://localhost:3737**

---

## Set up AI

Edit `.env` (auto-created on first install):

**Option A — Claude API (recommended):**
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```
Get free key: [console.anthropic.com](https://console.anthropic.com)

**Option B — Ollama (100% free, local):**
```bash
# Install from https://ollama.com
ollama pull llama3
# EVA auto-detects it — no config needed
```

After adding key:
```bash
docker compose restart
```

---

## Deploy on Ubuntu NAS / Server

```bash
# First time
git clone https://github.com/sunnyrabiussunny/EVA.git
cd EVA
bash install.sh

# Every update
cd ~/EVA
git fetch origin
git reset --hard origin/main
docker compose down
docker compose build --no-cache backend frontend
docker compose up -d
```

EVA runs on port **3737** and auto-starts on reboot (systemd service installed automatically).

---

## Push updates to GitHub

```bash
cd ~/path/to/EVA
git add .
git commit -m "v2: describe your changes"
git push origin main --force
```

---

## Manage

```bash
docker compose up -d        # start
docker compose down         # stop
docker compose restart      # restart
docker compose logs -f      # live logs
docker compose build --no-cache backend frontend && docker compose up -d  # rebuild after changes
```

Linux systemd:
```bash
sudo systemctl start eva
sudo systemctl stop eva
sudo systemctl status eva
```

---

## Data

All data in `./data/eva.db` (SQLite). To back up: copy this file anywhere.

```
data/
  eva.db    ← all projects, tasks, content, ideas, knowledge
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| AI | Claude API / Ollama (auto-detect) |
| Container | Docker + Docker Compose |
| Proxy | Nginx |

---

## Roadmap (v2)
- [ ] Auto content scheduling per platform
- [ ] Weekly AI executive report
- [ ] Market analysis agent
- [ ] Drag-and-drop dashboard widgets
- [ ] Ollama model picker in UI

---

Built by [Sunny Rabius Sunny](https://github.com/sunnyrabiussunny) · MIT License
