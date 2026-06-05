@echo off

powershell -ExecutionPolicy Bypass -File "%~dp0deploy-hostinger.ps1" %*

pause

