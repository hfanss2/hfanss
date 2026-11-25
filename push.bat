@echo off
cd /d "%~dp0"
git add -A
git commit -m "update posts %date% %time%" || echo No changes to commit
git push origin deploy
pause
