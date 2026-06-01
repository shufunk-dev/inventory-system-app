@echo off
echo Starting Inventory System Development Servers...

REM Try to use Windows Terminal (wt.exe) to open tabs. 
REM If it fails, fallback to opening separate command windows.
wt -d "%~dp0\web" cmd /k "npm run dev" ; nt -d "%~dp0\mobile" cmd /k "npm start"

if %ERRORLEVEL% NEQ 0 (
    echo Windows Terminal not found. Falling back to separate windows...
    start "Web Dashboard" cmd /k "cd web && npm run dev"
    start "Mobile App" cmd /k "cd mobile && npm start"
)
