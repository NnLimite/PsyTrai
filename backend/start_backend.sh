#!/bin/bash
cd /mnt/c/Users/vadim/Desktop/PsyTrai/backend
source venv/bin/activate
export CHROMA_TELEMETRY_IMPL=none
export OLLAMA_HOST=localhost:11434
python main.py
