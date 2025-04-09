@echo off
setlocal

echo.
echo === Creating required folders ===
mkdir input
mkdir output
mkdir thumbnails
mkdir meta
mkdir views
mkdir assets

echo.
echo === Setup complete ===
echo Project folder: %CD%
pause
endlocal
