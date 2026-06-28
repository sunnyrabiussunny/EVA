@echo off
title EVA Installer

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  EVA — Executive Virtual Assistant   ║
echo  ║  Self-hosted · Private · AI-powered  ║
echo  ╚══════════════════════════════════════╝
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
  echo [!] Docker not found.
  echo     Install Docker Desktop: https://docker.com/products/docker-desktop
  pause & exit /b 1
)
echo [OK] Docker found

if not exist .env (
  echo [..] Creating .env...
  (
    echo ANTHROPIC_API_KEY=
    echo OLLAMA_URL=http://host.docker.internal:11434
    echo OLLAMA_MODEL=llama3
    echo AI_PROVIDER=auto
  ) > .env
  echo [OK] .env created — add your ANTHROPIC_API_KEY
)

if not exist data mkdir data

echo [..] Building and starting EVA...
docker compose down --remove-orphans 2>nul
docker compose up -d --build

echo.
echo  ╔══════════════════════════════════════╗
echo  ║  EVA is running!                     ║
echo  ║  Open: http://localhost:3737         ║
echo  ╚══════════════════════════════════════╝
echo.
echo  Add ANTHROPIC_API_KEY to .env then: docker compose restart
echo.
pause
