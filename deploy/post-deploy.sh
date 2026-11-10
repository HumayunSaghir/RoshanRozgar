#!/bin/bash
# Called by poll-deploy.sh after the new code is checked out. Usage: post-deploy.sh <old-commit> <new-commit>
set -e
cd /opt/rr
OLD="${1:-none}"
NEW="${2:-HEAD}"

if [ "$OLD" = "none" ] || ! git cat-file -e "$OLD" 2>/dev/null; then
  CHANGED="backend/ frontend/"
else
  CHANGED=$(git diff --name-only "$OLD" "$NEW")
fi

BACKEND=0
FRONTEND=0
echo "$CHANGED" | grep -q '^backend/' && BACKEND=1
echo "$CHANGED" | grep -q '^frontend/' && FRONTEND=1
[ "$CHANGED" = "backend/ frontend/" ] && BACKEND=1 && FRONTEND=1

if [ "$BACKEND" = 1 ]; then
  (cd backend && npm ci --omit=dev)
fi
if [ "$FRONTEND" = 1 ]; then
  (cd frontend && npm ci && NODE_OPTIONS=--max-old-space-size=1536 npm run build && npm prune --omit=dev)
fi

chown -R rr:rr /opt/rr/backend /opt/rr/frontend
[ "$BACKEND" = 1 ] && systemctl restart rr-api
[ "$FRONTEND" = 1 ] && systemctl restart rr-web
exit 0
