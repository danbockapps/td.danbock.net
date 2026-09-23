Below is a report based only on the server information provided in this conversation and the captured Docker output. It contains observations and measurements, not recommendations or remediation steps.

# Gambit VPS — Disk Usage Report

**Date:** September 23, 2026

## 1. Filesystem

The VPS has a single primary root filesystem:

| Filesystem                          |   Size |   Used | Available | Usage |
| ----------------------------------- | -----: | -----: | --------: | ----: |
| `/dev/sda1` mounted at `/`          |  38 GB |  36 GB |     38 MB |  100% |
| `/dev/sda15` mounted at `/boot/efi` | 253 MB | 6.2 MB |    246 MB |    3% |

Other mounted filesystems are temporary filesystems:

| Filesystem |   Size |   Used | Available | Usage | Mount            |
| ---------- | -----: | -----: | --------: | ----: | ---------------- |
| tmpfs      | 192 MB | 1.4 MB |    191 MB |    1% | `/run`           |
| tmpfs      | 960 MB | 1.1 MB |    959 MB |    1% | `/dev/shm`       |
| tmpfs      |   5 MB |      0 |      5 MB |    0% | `/run/lock`      |
| tmpfs      | 192 MB |  12 KB |    192 MB |    1% | `/run/user/1000` |

At the time of the initial measurement, the root filesystem had only **38 MB available**.

After running `docker system prune`, approximately **24 GB was reclaimed**, leaving approximately **7.2 GB available** before the subsequent Next.js build.

## 2. Docker build cache

The Docker build-cache report shows **17.3 GB of build cache usage**.

The largest cache records are associated with:

```text
RUN yarn install --frozen-lockfile
```

Specifically:

|     Size | Created                 | Last used     | Description                      |
| -------: | ----------------------- | ------------- | -------------------------------- |
| 4.481 GB | Sep. 23, 2026 10:23 UTC | 7 minutes ago | `yarn install --frozen-lockfile` |
| 4.467 GB | Sep. 16, 2026 22:17 UTC | 5 days ago    | `yarn install --frozen-lockfile` |
| 4.403 GB | Sep. 10, 2026 23:10 UTC | 10 days ago   | `yarn install --frozen-lockfile` |

The first of these is marked reclaimable and has a usage count of 1. The second has a usage count of 2, and the third a usage count of 3.

These three cache records alone account for approximately **13.35 GB**.

## 3. Docker build stages

The Dockerfile used by the application contains four stages:

```text
base
deps
builder
runner
```

The dependency stage performs:

```text
apt-get update
apt-get install -y python3 make g++
yarn install --frozen-lockfile
```

The builder stage copies the resulting `node_modules` and runs the Next.js build.

The current build-cache records show the following sizes for relevant stages:

| Docker operation                                    |                             Cache size |
| --------------------------------------------------- | -------------------------------------: |
| `yarn install --frozen-lockfile`                    |                               4.481 GB |
| `COPY --from=deps /app/node_modules ./node_modules` |                               723.4 MB |
| `yarn build`                                        |                               140.8 MB |
| `apt-get ... python3 make g++ ...`                  | 292.8 MB in one historical cache entry |
| `.next/standalone` copied into runner               |                               70.87 MB |
| `docker-entrypoint.sh` chmod layer                  |                                   66 B |

The current `node_modules` copy layer is therefore approximately **723 MB**, substantially smaller than the **4.481 GB** `yarn install` cache record.

Historical `yarn build` cache records are approximately **260 MB** each, including records of 260.5 MB, 260.1 MB, and 259.7 MB.

## 4. Final Docker image

The Docker image for `td.danbock.net` was reported as approximately:

**1.05 GB**

This is substantially smaller than the total Docker build cache.

The build therefore does not result in a 4–5 GB production image. The multi-gigabyte figures are primarily associated with intermediate build-cache records, particularly the dependency-installation stage.

## 5. Disk-space change during the Next.js build

Immediately before a subsequent build of the small Next.js application, the VPS had approximately:

**7.2 GB free**

After the build, available space had fallen to:

**0.5 GB free**

The build therefore coincided with an approximately:

**6.7 GB reduction in available disk space.**

The Docker build-cache data shows a new **4.481 GB** cache record for `yarn install --frozen-lockfile`, created during that build.

There was also a new approximately **723 MB** `node_modules` copy layer and a **140.8 MB** `yarn build` layer associated with the same build.

## 6. Dockerfile

The relevant dependency/build structure is:

```text
base:
  node:26-slim
  npm install -g yarn

deps:
  install python3, make, g++
  copy package.json and yarn.lock
  yarn install --frozen-lockfile

builder:
  copy node_modules from deps
  copy application source
  create public and data directories
  yarn build

runner:
  copy .next/standalone
  copy node_modules from deps
  copy .next/static
  copy public
  copy drizzle
  copy migrate.mjs
  copy docker-entrypoint.sh
```

The production container uses:

```text
NODE_ENV=production
PORT=3001
HOSTNAME=0.0.0.0
```

and runs as the `nextjs` system user with UID 1001 and GID 1001.

## 7. Docker build context exclusions

The application's `.dockerignore` contains:

```text
.git
.next
node_modules
data
*.md
.env*
!.env.example
```

Thus the Docker build context explicitly excludes `.git`, `.next`, `node_modules`, `data`, Markdown files, and environment files other than `.env.example`.

## 8. Historical build-cache pattern

The cache contains repeated large `yarn install` records dating back at least to September 10:

- September 10: **4.403 GB**
- September 16: **4.467 GB**
- September 23: **4.481 GB**

There are also repeated `yarn build` cache records in the range of approximately **140–260 MB**.

A historical `COPY --from=deps /app/node_modules ./node_modules` cache record from June 14 is approximately **766.9 MB**.

## 9. Overall disk-space picture

The available data shows three distinct quantities:

| Component                                    | Approximate size |
| -------------------------------------------- | ---------------: |
| Root filesystem                              |            38 GB |
| Docker build cache                           |          17.3 GB |
| `td.danbock.net` final image                 |          1.05 GB |
| Individual recent `yarn install` cache layer |         4.481 GB |
| Individual recent `node_modules` copy layer  |           723 MB |
| Individual recent `yarn build` layer         |           141 MB |

The Docker build cache therefore represents a substantial portion of the VPS's 38 GB root filesystem. The largest individual cache records are generated by the `yarn install --frozen-lockfile` build step rather than by the final image or the Next.js compilation itself.

Available next action: Create a downloadable PDF file here in this chat containing the finalized decisions and immediate actions above
