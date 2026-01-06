#!/bin/bash
# Portal Startup Script
# Save your API keys here or export them before running

# Set your OpenAI API Key (REQUIRED)
export OPENAI_API_KEY="${OPENAI_API_KEY:-your-openai-key-here}"

# Set your ElevenLabs API Key (OPTIONAL - for audio generation)
export ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY:-your-elevenlabs-key-here}"

# Set the port (default: 4000)
export PORT="${PORT:-4000}"

# Navigate to project directory
cd ~/projects/portal/RaspberryZero2_Portal

# Start the server
echo "Starting Raspberry Pi Portal on port $PORT..."
echo "OpenAI API Key: ${OPENAI_API_KEY:0:10}..."
if [ -n "$ELEVENLABS_API_KEY" ] && [ "$ELEVENLABS_API_KEY" != "your-elevenlabs-key-here" ]; then
    echo "ElevenLabs: Enabled"
else
    echo "ElevenLabs: Disabled (audio narration won't work)"
fi

node --max-old-space-size=300 dist/raspberry-zero2-portal/server/server.mjs
