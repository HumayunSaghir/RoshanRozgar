#!/bin/bash
# Runs every minute on the server (systemd timer rr-deploy.timer).
# When origin/main has a new commit it pulls it, rebuilds what changed and restarts the services.
set -u
cd /opt/rr || exit 1
exec 9>/var/lock/rr-deploy.lock
flock -n 9 || exit 0

git fetch -q origin main || { echo "git fetch failed"; exit 0; }
NEW=$(git rev-parse origin/main)
OLD=$(cat /opt/rr/.deployed 2>/dev/null || echo none)
[ "$NEW" = "$OLD" ] && exit 0
# A commit that already failed is not retried until a newer commit arrives.
[ "$NEW" = "$(cat /opt/rr/.failed 2>/dev/null || true)" ] && exit 0

echo "$(date -Is) deploying $NEW (was $OLD)"
git reset -q --hard origin/main
if bash /opt/rr/deploy/post-deploy.sh "$OLD" "$NEW"; then
  echo "$NEW" > /opt/rr/.deployed
  rm -f /opt/rr/.failed
  echo "$(date -Is) deployed $NEW"
else
  echo "$NEW" > /opt/rr/.failed
  echo "$(date -Is) DEPLOY FAILED for $NEW (previous build keeps running if it was not replaced)"
  exit 1
fi
