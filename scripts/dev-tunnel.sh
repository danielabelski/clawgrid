#!/usr/bin/env bash
# Forward OpenClaw gateways to localhost via hub-server's autossh tunnel endpoints.
# Keep running in a terminal while using the control panel locally.
#
#   localhost:4000  →  hub-server:18789  →  vm-openclaw gateway (Command)
#   localhost:4001  →  hub-server:18790  →  vm-tasks gateway    (Supply)
#   localhost:4002  →  hub-server:18791  →  vm-voice gateway    (Voice)
#
# SSH management (logs, crons, memory) uses a jump-host connection internally
# — no extra ports needed.

KEY="$HOME/.ssh/openclaw_panel"

if [ ! -f "$KEY" ]; then
  echo "Panel key missing: $KEY"
  echo "Run setup once: ssh-keygen -t ed25519 -f ~/.ssh/openclaw_panel -N ''"
  exit 1
fi

echo "Connecting to OpenClaw fleet via hub-server..."
echo "  localhost:4000 → COMMAND (2026.5.26)"
echo "  localhost:4001 → SUPPLY  (2026.5.26)"
echo "  localhost:4002 → VOICE   (2026.5.26)"
echo ""
echo "Press Ctrl+C to close."

ssh -N \
  -i "$KEY" \
  -o StrictHostKeyChecking=no \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -L 4000:localhost:18789 \
  -L 4001:localhost:18790 \
  -L 4002:localhost:18791 \
  openclaw@bastion.example.com
