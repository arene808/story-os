@echo off
REM Start PostgreSQL for Story OS
REM Run from project root or double-click directly
set PGCTL=E:\Large-scale softwares\PostgreSQL\17\pgsql\bin\pg_ctl.exe
set DATADIR=%~dp0..\pgdata

echo Starting PostgreSQL from: %DATADIR%
"%PGCTL%" start -D "%DATADIR%" -l "%DATADIR%\log.txt"
if %ERRORLEVEL% EQU 0 (
    echo PostgreSQL started on port 5432
) else (
    echo PostgreSQL may already be running
)
pause
