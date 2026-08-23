# EVA Voice Agent

4 voice-powered features for EVA — runs on the same Ubuntu server.

## Features

### 1. Hands-free Boardroom
Say "Hey EVA, show me revenue performance" → EVA generates live dashboard report.

### 2. Voice-to-Idea
Say "Hey EVA, new idea — Finnish market robot subscription model" → Saved to Idea Vault instantly.

### 3. Hermes Research Agent
Say "Hey EVA, research Keto Software competitor analysis" → Searches web, summarizes with Ollama, saves to Knowledge Base.

### 4. Daily Brief Agent
Every morning at 7am → EVA reads your daily brief out loud automatically.

---

## Install

```bash
cd ~/eva-voice
chmod +x setup.sh
./setup.sh
```

---

## Commands

```bash
source ~/eva-voice-env/bin/activate

# Test connections
~/eva-voice/eva-voice test

# Boardroom query (text)
~/eva-voice/eva-voice boardroom "show me revenue performance"

# Save idea (text)
~/eva-voice/eva-voice idea "Finnish market robot subscription model"

# Research topic
~/eva-voice/eva-voice research "Keto Software competitor analysis"

# Daily brief
~/eva-voice/eva-voice brief

# Wake word mode (voice)
~/eva-voice/eva-voice start
```

---

## Wake Word Mode

```bash
~/eva-voice/eva-voice start
```

Say **"Hey EVA"** → EVA responds "Yes, I am listening" → Speak your command → EVA acts.

Examples after wake word:
- "Show me the revenue performance"
- "New idea — expand to Swedish market"
- "Research OpenAI competitors in Europe"
- "Give me my daily brief"

---

## Auto-start on Boot

```bash
sudo cp /tmp/eva-voice.service /etc/systemd/system/
sudo systemctl enable eva-voice
sudo systemctl start eva-voice

# Check status
sudo systemctl status eva-voice

# View logs
tail -f ~/eva-voice/logs/eva-voice.log
```

---

## Config (environment variables)

| Variable | Default | Description |
|---|---|---|
| EVA_API | http://localhost:4000/api | EVA backend |
| OLLAMA_URL | http://localhost:11434 | Ollama |
| OLLAMA_MODEL | llama3.1:latest | Model |
| WAKE_WORD | hey eva | Wake word |
| BRIEF_HOUR | 7 | Daily brief hour (24h) |
| RECORD_SEC | 6 | Seconds to record command |

---

## Requirements

- EVA running on port 4000
- Ollama running with llama3.1:latest
- Microphone connected
- Ubuntu 24.04
