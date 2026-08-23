@echo off
rem Extra local launchers now share the one MAX path.
cd /d "%~dp0"
call "%~dp0run.bat" %*
