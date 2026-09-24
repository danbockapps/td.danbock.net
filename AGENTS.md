# td.danbock.net

Chess tournament management app (td = tournament director). Next.js (App Router) + Drizzle ORM + better-sqlite3, styled with Tailwind 4 + daisyUI.

- Package manager: **yarn only** (yarn.lock is committed; don't mix npm/pnpm)
- Dev server: `yarn dev` — runs on **port 3001**, not 3000
- Tests: `yarn test` (vitest); lint: `yarn lint`; format: `yarn format` (prettier runs via husky/lint-staged on commit — no semicolons, single quotes)
- Database: SQLite at `./data/td.sqlite` (override with `DATABASE_URL`). Schema in `db/`, migrations in `drizzle/`. Workflow: edit schema → `yarn db:generate` → `yarn db:migrate`. Never run migrations against a production database.
- Docs live in `docs/` (deployment, Docker, known issues)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
