@echo off
echo =======================================
echo  Inventory System - Windows EXE Builder
echo =======================================

echo [1/5] Building Next.js Standalone Application...
call npm run build

echo [2/5] Cleaning old Electron build files...
if exist electron\next-server rmdir /s /q electron\next-server
mkdir electron\next-server

echo [2.5/5] Cleaning duplicate build files and local uploads from Next.js standalone...
if exist .next\standalone\electron rmdir /s /q .next\standalone\electron
if exist .next\standalone\dist rmdir /s /q .next\standalone\dist
if exist .next\standalone\Archive rmdir /s /q .next\standalone\Archive
if exist .next\standalone\uploads rmdir /s /q .next\standalone\uploads
if exist .next\standalone\public\uploads rmdir /s /q .next\standalone\public\uploads
if exist .next\standalone\scratch rmdir /s /q .next\standalone\scratch
if exist .next\standalone\tests rmdir /s /q .next\standalone\tests
if exist .next\standalone\inventory.db del /f /q .next\standalone\inventory.db
if exist .next\standalone\database.sqlite del /f /q .next\standalone\database.sqlite

echo [3/5] Copying standalone server files...
xcopy /E /I /Q /Y .next\standalone electron\next-server
xcopy /E /I /Q /Y .next\static electron\next-server\.next\static
xcopy /E /I /Q /Y public electron\next-server\public
if exist .env.local copy /Y .env.local electron\next-server\.env.local

echo [3.8/5] Removing runtime user files from server staging...
if exist electron\next-server\uploads rmdir /s /q electron\next-server\uploads
if exist electron\next-server\public\uploads rmdir /s /q electron\next-server\public\uploads
if exist electron\next-server\scratch rmdir /s /q electron\next-server\scratch
if exist electron\next-server\tests rmdir /s /q electron\next-server\tests
if exist electron\next-server\inventory.db del /f /q electron\next-server\inventory.db
if exist electron\next-server\database.sqlite del /f /q electron\next-server\database.sqlite

echo [3.9/5] Patching Next.js runtime dependencies...
xcopy /E /I /Q /Y node_modules\next electron\next-server\node_modules\next

echo [4/5] Installing Electron dependencies...
cd electron
call npm install

echo [4.5/5] Injecting correct Electron SQLite binaries into Next.js standalone...
powershell -Command "if (Test-Path 'next-server\node_modules\better-sqlite3') { Copy-Item -Path 'next-server\node_modules\better-sqlite3' -Destination 'next-server\node_modules\better-sqlite3-90e2652d1716b047' -Recurse -Force }"
powershell -Command "$goodNode = 'node_modules\better-sqlite3\build\Release\better_sqlite3.node'; Get-ChildItem -Path 'next-server' -Filter 'better-sqlite3*' -Recurse -Directory | ForEach-Object { $targetDir = Join-Path $_.FullName 'build\Release'; New-Item -ItemType Directory -Force -Path $targetDir | Out-Null; Copy-Item -Path $goodNode -Destination (Join-Path $targetDir 'better_sqlite3.node') -Force }"

echo [5/5] Packaging Windows Executable with electron-builder...
call npm run build -- %*

echo =======================================
echo  Build Complete! 
echo  Installer is located at: electron/dist/
echo =======================================
cd ..
