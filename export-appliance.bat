@echo off
setlocal

echo ==========================================
echo   Inventory System - Appliance Exporter
echo ==========================================
echo.
echo This script will copy your entire project to your USB drive.
echo It will automatically ignore the 'inventory.db' database and
echo any uploaded images to ensure a fresh "factory" install.
echo.
echo BONUS: It will also ignore the heavy 'node_modules' and '.next' 
echo build folders so the USB transfer takes 3 seconds instead of 
echo 10 minutes! (The Linux script reinstalls them anyway).
echo.

set /p usbDrive="Enter the drive letter of your USB drive (e.g., E, F, D): "

if "%usbDrive%"=="" (
    echo Error: No drive letter provided. Exiting...
    pause
    exit /b
)

set "targetPath=%usbDrive%:\inventory-system"

echo.
echo Preparing to copy project from:
echo   %~dp0
echo to:
echo   %targetPath%
echo.
pause

echo.
echo Copying files...
:: /E copies all subdirectories including empty ones
:: /XD excludes specific directories
:: /XF excludes specific files
robocopy "%~dp0." "%targetPath%" /E /XD "node_modules" ".next" "uploads" ".git" ".expo" /XF "inventory.db" "export-appliance.bat"

echo.
echo ==========================================
echo   Export Complete!
echo ==========================================
echo You can now safely eject drive %usbDrive%: and plug it into your Linux machine.
echo When you run appliance-setup.sh, the failsafe wipe prompt will still be there!
echo.
pause
