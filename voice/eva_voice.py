#!/usr/bin/env python3
"""
EVA Voice Agent
Handles: Hands-free Boardroom, Voice-to-Idea, Research Agent, Daily Brief
"""

import os
import sys
import json
import time
import datetime
import threading
import tempfile
import requests
import subprocess
from pathlib import Path

# ── Config ────────────────────────────────────────────────
EVA_API       = os.environ.get("EVA_API", "http://localhost:4000/api")
OLLAMA_URL    = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL  = os.environ.get("OLLAMA_MODEL", "llama3.1:latest")
WAKE_WORD     = os.environ.get("WAKE_WORD", "hey eva")
BRIEF_HOUR    = int(os.environ.get("BRIEF_HOUR", "7"))   # 7am daily brief
LOG_FILE      = Path.home() / "eva-voice" / "logs" / "eva-voice.log"
RECORD_SEC    = int(os.environ.get("RECORD_SEC", "6"))   # seconds to record after wake word

LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

# ── Ollama call ───────────────────────────────────────────
def ask_ollama(system, user, max_tokens=800):
    try:
        r = requests.post(f"{OLLAMA_URL}/api/chat", json={
            "model": OLLAMA_MODEL,
            "stream": False,
            "messages": [
                {"role": "system",  "content": system},
                {"role": "user",    "content": user},
            ],
            "options": {"temperature": 0.3, "num_predict": max_tokens},
        }, timeout=120)
        r.raise_for_status()
        return r.json()["message"]["content"].strip()
    except Exception as e:
        log(f"Ollama error: {e}")
        return None

def ask_ollama_json(system, user):
    raw = ask_ollama(system + "\n\nRespond ONLY with valid JSON. No markdown.", user)
    if not raw:
        return None
    import re
    match = re.search(r'\{[\s\S]*\}|\[[\s\S]*\]', raw.replace("```json","").replace("```","").strip())
    if match:
        try:
            return json.loads(match.group())
        except:
            pass
    return {"raw": raw}

# ── EVA API calls ─────────────────────────────────────────
def eva_post(path, data):
    try:
        r = requests.post(f"{EVA_API}{path}", json=data, timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log(f"EVA API error {path}: {e}")
        return None

def eva_get(path):
    try:
        r = requests.get(f"{EVA_API}{path}", timeout=30)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log(f"EVA API error {path}: {e}")
        return None

# ── Speech recognition ────────────────────────────────────
def record_audio(seconds=6, samplerate=16000):
    """Record audio from microphone, return numpy array"""
    try:
        import sounddevice as sd
        import numpy as np
        log(f"Recording {seconds}s...")
        audio = sd.rec(int(seconds * samplerate), samplerate=samplerate,
                       channels=1, dtype="float32")
        sd.wait()
        return audio.flatten(), samplerate
    except Exception as e:
        log(f"Record error: {e}")
        return None, None

def transcribe_audio(audio, samplerate):
    """Transcribe audio using Whisper"""
    try:
        import whisper
        import numpy as np

        # Save to temp wav file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            tmpfile = f.name

        import scipy.io.wavfile as wav
        wav.write(tmpfile, samplerate, (audio * 32767).astype("int16"))

        model = transcribe_audio._model
        result = model.transcribe(tmpfile, language="en", fp16=False)
        os.unlink(tmpfile)
        return result["text"].strip().lower()
    except Exception as e:
        log(f"Transcribe error: {e}")
        return ""

# Load Whisper model once
def load_whisper():
    try:
        import whisper
        log("Loading Whisper tiny model...")
        transcribe_audio._model = whisper.load_model("tiny")
        log("Whisper ready")
        return True
    except Exception as e:
        log(f"Whisper load error: {e}")
        return False

# ── Intent detection ──────────────────────────────────────
def detect_intent(text):
    """Detect what the user wants to do"""
    t = text.lower()

    # Remove wake word
    for w in ["hey eva", "eva"]:
        if t.startswith(w):
            t = t[len(w):].strip(", ")

    # Intent patterns
    if any(k in t for k in ["new idea", "idea", "capture idea", "save idea"]):
        return "idea", t
    if any(k in t for k in ["research", "analyze", "analyse", "find out", "look up", "competitor"]):
        return "research", t
    if any(k in t for k in ["brief", "morning brief", "daily brief", "what's today", "whats today"]):
        return "brief", t
    if any(k in t for k in ["boardroom", "dashboard", "report", "show me", "revenue", "pipeline",
                              "performance", "kpi", "scorecard", "budget"]):
        return "boardroom", t

    return "boardroom", t  # default

# ── Feature 1: Hands-free Boardroom ──────────────────────
def handle_boardroom(query):
    log(f"Boardroom query: {query}")
    result = eva_post("/boardroom/query", {
        "question": query,
        "model": OLLAMA_MODEL,
        "transcripts": [],
        "selectedKBFileIds": [],
    })
    if result and result.get("title"):
        speak(f"Generating report: {result['title']}. {result.get('insight','')[:200]}")
        log(f"Boardroom report generated: {result['title']}")
    else:
        speak("I could not generate a report right now.")

# ── Feature 2: Voice-to-Idea ──────────────────────────────
def handle_idea(text):
    # Extract idea title from speech
    system = "Extract the idea from the user's speech. Return JSON: {\"title\": \"short title\", \"body\": \"details if any\", \"category\": \"general\"}"
    result = ask_ollama_json(system, f"Speech: {text}")
    if not result or "raw" in result:
        # Fallback: use text directly
        title = text.replace("new idea", "").replace("idea", "").strip()
        result = {"title": title, "body": "", "category": "general"}

    r = eva_post("/ideas", result)
    if r:
        speak(f"Idea saved: {result['title']}")
        log(f"Idea saved: {result['title']}")
    else:
        speak("Could not save the idea.")

# ── Feature 3: Hermes Research Agent ─────────────────────
def handle_research(query):
    log(f"Research query: {query}")
    speak(f"Researching: {query}. This will take a moment.")

    # Search with DuckDuckGo
    results_text = ""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
            for r in results:
                results_text += f"Title: {r.get('title','')}\n"
                results_text += f"Summary: {r.get('body','')}\n\n"
        log(f"Found {len(results)} search results")
    except Exception as e:
        log(f"Search error: {e}")
        results_text = f"Search failed: {e}. Generating based on knowledge."

    # Summarize with Ollama
    system = """You are a business research analyst. Analyze the search results and create a concise research report.
Return JSON: {"title": "Research: Topic", "content": "detailed analysis in markdown", "tags": ["tag1", "tag2"], "source": "web research"}"""

    result = ask_ollama_json(system, f"Research query: {query}\n\nSearch results:\n{results_text}")

    if result and result.get("title"):
        r = eva_post("/knowledge", result)
        if r:
            speak(f"Research complete. Saved to knowledge base: {result['title']}")
            log(f"Research saved: {result['title']}")
        else:
            speak("Research done but could not save to EVA.")
    else:
        speak("Research failed. Check logs.")

# ── Feature 4: Daily Brief Agent ─────────────────────────
def handle_daily_brief():
    log("Generating daily brief...")
    speak("Good morning. Generating your daily brief.")

    result = eva_get("/brief/today?refresh=1")
    if result and result.get("greeting"):
        brief = result
        msg = f"{brief.get('greeting', 'Good morning')}. "
        msg += f"Today's focus: {brief.get('focus', '')}. "
        priorities = brief.get("priorities", [])
        if priorities:
            msg += f"Your top priorities are: {', '.join(priorities[:3])}. "
        warnings = brief.get("warnings", [])
        if warnings:
            msg += f"Attention needed: {warnings[0]}."
        speak(msg)
        log(f"Daily brief delivered: {msg[:100]}")
    else:
        speak("Could not generate brief. Check EVA backend.")

# ── Text-to-Speech ────────────────────────────────────────
def speak(text):
    """Speak text using espeak or pyttsx3"""
    log(f"SPEAK: {text}")
    try:
        # Try espeak first (fast, no dependencies)
        subprocess.run(
            ["espeak", "-v", "en", "-s", "150", "-a", "80", text],
            capture_output=True, timeout=30
        )
    except FileNotFoundError:
        try:
            # Try festival
            subprocess.run(
                ["festival", "--tts"],
                input=text.encode(), capture_output=True, timeout=30
            )
        except FileNotFoundError:
            log("No TTS engine found. Install: sudo apt install espeak")

# ── Wake word listener ────────────────────────────────────
def listen_for_wake_word():
    """Continuously listen for wake word"""
    log(f"Listening for wake word: '{WAKE_WORD}'")
    speak("EVA voice agent ready. Say Hey EVA to activate.")

    while True:
        try:
            # Record 3 second chunks to detect wake word
            audio, sr = record_audio(seconds=3)
            if audio is None:
                time.sleep(1)
                continue

            text = transcribe_audio(audio, sr)
            if not text:
                continue

            log(f"Heard: {text}")

            if WAKE_WORD in text.lower() or "hey eva" in text.lower():
                speak("Yes, I am listening.")
                log("Wake word detected!")

                # Record the actual command
                audio2, sr2 = record_audio(seconds=RECORD_SEC)
                if audio2 is None:
                    continue

                command = transcribe_audio(audio2, sr2)
                if not command:
                    speak("I did not catch that. Please try again.")
                    continue

                log(f"Command: {command}")
                process_command(command)

        except KeyboardInterrupt:
            log("Stopping voice agent...")
            break
        except Exception as e:
            log(f"Listen error: {e}")
            time.sleep(2)

def process_command(text):
    """Route command to correct handler"""
    intent, cleaned = detect_intent(text)
    log(f"Intent: {intent} | Text: {cleaned}")

    if intent == "idea":
        handle_idea(cleaned)
    elif intent == "research":
        handle_research(cleaned)
    elif intent == "brief":
        handle_daily_brief()
    elif intent == "boardroom":
        handle_boardroom(cleaned)
    else:
        handle_boardroom(cleaned)

# ── Daily brief scheduler ─────────────────────────────────
def brief_scheduler():
    """Run daily brief at configured hour"""
    last_brief_date = None
    while True:
        now = datetime.datetime.now()
        if now.hour == BRIEF_HOUR and now.date() != last_brief_date:
            log(f"Scheduled daily brief at {now}")
            handle_daily_brief()
            last_brief_date = now.date()
        time.sleep(60)

# ── CLI commands ──────────────────────────────────────────
def run_cli(args):
    if len(args) < 2:
        print_help()
        return

    cmd = args[1]

    if cmd == "start":
        log("Starting EVA Voice Agent...")
        if not load_whisper():
            print("Failed to load Whisper. Check installation.")
            sys.exit(1)
        # Start brief scheduler in background
        t = threading.Thread(target=brief_scheduler, daemon=True)
        t.start()
        # Start listening
        listen_for_wake_word()

    elif cmd == "boardroom":
        query = " ".join(args[2:]) if len(args) > 2 else input("Query: ")
        handle_boardroom(query)

    elif cmd == "idea":
        text = " ".join(args[2:]) if len(args) > 2 else input("Idea: ")
        handle_idea(text)

    elif cmd == "research":
        query = " ".join(args[2:]) if len(args) > 2 else input("Research topic: ")
        handle_research(query)

    elif cmd == "brief":
        handle_daily_brief()

    elif cmd == "speak":
        text = " ".join(args[2:]) if len(args) > 2 else input("Text: ")
        speak(text)

    elif cmd == "test":
        log("Testing EVA connection...")
        r = eva_get("/health")
        if r:
            log("EVA backend: OK")
        else:
            log("EVA backend: FAILED - is EVA running?")

        log("Testing Ollama connection...")
        result = ask_ollama("You are a test.", "Say OK")
        if result:
            log(f"Ollama: OK - {result[:50]}")
        else:
            log("Ollama: FAILED")

    else:
        print_help()

def print_help():
    print("""
EVA Voice Agent — Commands:

  eva-voice start              Start voice agent (wake word mode)
  eva-voice boardroom <query>  Generate boardroom report
  eva-voice idea <text>        Save idea to EVA
  eva-voice research <topic>   Research topic and save to knowledge base
  eva-voice brief              Generate and read daily brief
  eva-voice speak <text>       Test text-to-speech
  eva-voice test               Test EVA and Ollama connections

Environment variables:
  EVA_API       EVA backend URL (default: http://localhost:4000/api)
  OLLAMA_URL    Ollama URL (default: http://localhost:11434)
  OLLAMA_MODEL  Model name (default: llama3.1:latest)
  WAKE_WORD     Wake word (default: hey eva)
  BRIEF_HOUR    Hour for daily brief (default: 7)
  RECORD_SEC    Seconds to record command (default: 6)
""")

if __name__ == "__main__":
    run_cli(sys.argv)
