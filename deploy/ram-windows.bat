@echo off
rem Sobe o backend do RAM e abre o rosto em modo quiosque (Windows).
rem Coloque um atalho para este arquivo em shell:startup para abrir ao ligar.

cd /d "%~dp0..\backend"
start "RAM backend" /min .venv\Scripts\python.exe -m ram

rem espera o backend responder
:wait
timeout /t 1 /nobreak >nul
curl -fs http://localhost:8000/api/info >nul 2>&1 || goto wait

start "" msedge --kiosk http://localhost:8000/face --edge-kiosk-type=fullscreen --no-first-run
