@echo off
setlocal

echo === [1/5] Downloading NVM for Windows installer ===
set NVM_URL=https://github.com/coreybutler/nvm-windows/releases/latest/download/nvm-setup.exe
set NVM_SETUP=%TEMP%\nvm-setup.exe

powershell -Command "Invoke-WebRequest -Uri %NVM_URL% -OutFile '%NVM_SETUP%'"
start /wait "" "%NVM_SETUP%"

echo.
echo === [2/5] Installing Node.js 20 via NVM ===
nvm install 20
nvm use 20

echo.
echo === [3/5] Creating required folders ===
mkdir input
mkdir output
mkdir thumbnails
mkdir meta
mkdir modules
mkdir public
mkdir views
mkdir assets

echo.
echo === [4/5] Installing Node.js dependencies ===
call npm install

echo.
echo === [5/5] Setup complete ===
echo Project folder: %CD%
pause
endlocal
