#!/usr/bin/env bash
set -euo pipefail

# Deploy the latest code change on the server. Run from anywhere.
# See documentation/DEPLOYMENT.md ("Redeploy / update").

cd ~/projects/td.danbock.net

git pull
docker build -t td.danbock.net .
docker stop td.danbock.net || true
docker rm td.danbock.net || true

"$(dirname "$0")/docker-run.sh"
