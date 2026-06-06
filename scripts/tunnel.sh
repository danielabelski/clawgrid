#!/bin/bash
# Opens direct tunnels from this Mac to each OpenClaw gateway (port 18789)
# through the bastion host using SSH ProxyJump.
#
# Prerequisites:
#   ssh-add ~/.ssh/openclaw_panel   (add key to agent once per session)
#
# Usage:
#   chmod +x scripts/tunnel.sh
#   ./scripts/tunnel.sh
#
# Keep this terminal open. Ctrl+C closes all tunnels.

BASTION="openclaw@4.196.121.72"
KEY="$HOME/.ssh/openclaw_panel"

# Add key to agent if not already loaded
ssh-add -l | grep -q openclaw || ssh-add "$KEY"

echo "Opening tunnels to OpenClaw gateways (port 18789 on each VM)..."
echo "  localhost:4000 → vm-openclaw (10.40.2.4)"
echo "  localhost:4001 → vm-tasks    (10.40.2.6)"
echo "  localhost:4002 → vm-voice    (10.40.2.7)"
echo ""
echo "Keep this terminal open. Ctrl+C to close all tunnels."
echo ""

# Trap Ctrl+C to kill all background tunnels cleanly
trap 'echo "Closing tunnels..."; kill $P1 $P2 $P3 2>/dev/null; exit 0' INT TERM

ssh -N -A -J "$BASTION" -L 4000:localhost:18789 openclaw@10.40.2.4 &
P1=$!

ssh -N -A -J "$BASTION" -L 4001:localhost:18789 openclaw@10.40.2.6 &
P2=$!

ssh -N -A -J "$BASTION" -L 4002:localhost:18789 openclaw@10.40.2.7 &
P3=$!

wait $P1 $P2 $P3
