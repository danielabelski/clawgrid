#!/usr/bin/env bash
# Opens SSH tunnels from your Mac to all three OpenClaw gateways via hub-server.
# Run this once before starting `npm run dev`, keep it running in a terminal.
#
# Tunnels created:
#   localhost:4000  →  vm-openclaw:18789  (Command gateway)
#   localhost:4001  →  vm-tasks:18789     (Supply gateway)
#   localhost:4002  →  vm-voice:18789     (Voice gateway)
#   localhost:2222  →  vm-openclaw:22     (Command SSH for management)
#   localhost:2223  →  vm-tasks:22        (Supply SSH for management)
#   localhost:2224  →  vm-voice:22        (Voice SSH for management)
#
# Prerequisites:
#   ssh-add ~/.ssh/id_ed25519   ← run this first to unlock your key

set -e

HUB="openclaw@bastion.example.com"
KEY="$HOME/.ssh/id_ed25519"

echo "🔑 Checking SSH agent..."
if ! ssh-add -l &>/dev/null; then
  echo "   No keys in agent. Run: ssh-add ~/.ssh/id_ed25519"
  echo "   Then re-run this script."
  exit 1
fi

echo "🌐 Opening tunnels to OpenClaw fleet via hub-server..."
echo "   4000 → vm-openclaw gateway (command)"
echo "   4001 → vm-tasks gateway    (supply)"
echo "   4002 → vm-voice gateway    (voice)"
echo "   2222 → vm-openclaw SSH"
echo "   2223 → vm-tasks SSH"
echo "   2224 → vm-voice SSH"
echo ""
echo "   Press Ctrl+C to close all tunnels."
echo ""

ssh -N \
  -i "$KEY" \
  -o StrictHostKeyChecking=no \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -L 4000:10.0.0.10:18789 \
  -L 4001:10.0.0.11:18789 \
  -L 4002:10.0.0.12:18789 \
  -L 2222:10.0.0.10:22 \
  -L 2223:10.0.0.11:22 \
  -L 2224:10.0.0.12:22 \
  "$HUB"
