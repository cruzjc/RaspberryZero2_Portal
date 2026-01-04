@echo off
REM ==============================
REM SSH + key-based authentication setup notes
REM 1. On your PC: ssh-keygen -t ed25519 -C "win-host"
REM 2. Copy the key to Raspberry Pi:
REM    type %USERPROFILE%\.ssh\id_ed25519.pub | ssh JeanclydeCruz@192.168.4.12 "umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys"
REM 3. Test: ssh JeanclydeCruz@192.168.4.12
REM Once working, this script will connect and run codex automatically.
REM ==============================

ssh JeanclydeCruz@192.168.4.12