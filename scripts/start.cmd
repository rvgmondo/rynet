@echo off
REM Production server against a local build. Same Node as dev and as the host.
setlocal
set "PROJ=%~dp0.."
set "PATH=%PROJ%\vendor\node;%PATH%"
cd /d "%PROJ%"
call npm run start
