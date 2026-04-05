@echo off
echo Starting AI Chatbot Backend...
cd /d %~dp0backend
uvicorn main:app --reload --port 8000
