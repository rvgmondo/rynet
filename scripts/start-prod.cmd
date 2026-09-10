@echo off
REM Production server on 3200.
REM
REM Same vendored Node 22 as dev.cmd, and a port of its own so it never fights the dev
REM server another session may already have on 3000. Verification runs against this, because
REM a dev-mode measurement of first paint is a measurement of the compiler.
setlocal
set "PROJ=%~dp0.."
set "PATH=%PROJ%\vendor\node;%PATH%"
cd /d "%PROJ%"
call npx cross-env NODE_OPTIONS=--no-deprecation next start -p 3210
