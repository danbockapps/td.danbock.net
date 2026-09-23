# Docker build cache management

**Date:** September 23, 2026

Background: see `docker-disk-usage.md` for the incident where the VPS root
filesystem filled up due to unbounded Docker build-cache growth from repeated
`yarn install --frozen-lockfile` layers.

## Changes made

1. **`Dockerfile`** now mounts a persistent BuildKit cache for yarn's package
   cache during `yarn install`, so dependency downloads are reused across
   builds without creating a new multi-GB layer every time the lockfile
   changes:

   ```dockerfile
   RUN --mount=type=cache,target=/usr/local/share/.cache/yarn \
     yarn install --frozen-lockfile
   ```

## Server-side changes still needed (apply manually on the VPS)

2. **Cap BuildKit's build-cache size** so it garbage-collects automatically
   instead of growing unbounded. Add to `/etc/docker/daemon.json` on the VPS:

   ```json
   {
     "builder": {
       "gc": {
         "enabled": true,
         "defaultKeepStorage": "10GB"
       }
     }
   }
   ```

   Then restart Docker: `sudo systemctl restart docker`.

3. **Scheduled prune as a backstop** (weekly cron), since GC policy alone can
   lag behind fast-growing caches. Prune only build cache, not images:

   ```
   docker builder prune --filter until=336h -f
   ```

4. **Monitor disk usage** on the VPS with a simple threshold alert so this is
   caught before the disk fills again.
