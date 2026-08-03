@echo off
cd /d "%~dp0"
echo.
echo Your local network addresses:
ipconfig | findstr /i "IPv4"
echo.
echo On your phone, open http://YOUR-IP:8080
echo Keep this window open.
echo.
python -m http.server 8080 --bind 0.0.0.0
if errorlevel 1 py -m http.server 8080 --bind 0.0.0.0
pause
