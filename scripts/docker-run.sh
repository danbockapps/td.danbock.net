#!/usr/bin/env bash
set -euo pipefail

# Start the app container. Assumes the image is already built and any old
# container of the same name has been stopped/removed.

docker run -d \
  -p 3001:3001 \
  -v /var/lib/td.danbock.net:/app/data \
  --log-driver journald \
  --env-file /home/dan/projects/td.danbock.net/.env.production \
  --name td.danbock.net \
  td.danbock.net
