@echo off
REM Dev server.
REM
REM Puts the project-local Node 22 in vendor\node ahead of anything on the machine, so
REM local, CI and the cPanel host all run the same major version. The machine has Node 26
REM installed globally, which is Current rather than LTS and is not what production runs.
setlocal
set "PROJ=%~dp0.."
set "PATH=%PROJ%\vendor\node;%PATH%"
cd /d "%PROJ%"
call npm run dev
