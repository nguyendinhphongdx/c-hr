---
title: C-HR refactor plan
description: 3-phase refactor để gộp 2 boilerplate ban đầu thành 1 monorepo C-HR có doc/MCP thống nhất.
tags: [project, plan, refactor, c-hr]
---

# C-HR refactor plan

**Project**: C-HR (C-OpenAI Human Resource) — SaaS quản lý nhân sự cho doanh nghiệp.
**Stack**: Next.js 16 (frontend) + NestJS 10 (backend) + Postgres 16 + Redis 7, monorepo.

Refactor 4 phase, làm tuần tự. Tính năng HRM được track riêng trong [features.md](features.md).

---

## Phase 1 — Root scaffolding (combine 2 boilerplate ra ngoài)

Mục tiêu: thêm lớp orchestration ở root, **không sửa code** trong [apps/backend](../../apps/backend/) và [apps/frontend](../../apps/frontend/).

- [x] 1.1 — `services/postgres/docker-compose.yml` + `services/redis/docker-compose.yml` (mỗi service start độc lập được).
- [x] 1.2 — Root `docker-compose.yml` (postgres + redis + backend) + `docker-compose.dev.yml` (override BE hot-reload). FE chạy native, không trong compose.
- [x] 1.3 — `scripts/dev.sh` CLI: `start infra | dev backend | dev frontend | migrate | logs | stop | status`.
- [x] 1.4 — Root config: `.env.example`, `.gitignore`, `pnpm-workspace.yaml`, `.mcp.json` (1 server `c-hr-docs`).
- [x] 1.5 — Root docs navigation: `CLAUDE.md` (hub), `AGENTS.md`, `README.md`.

## Phase 2 — Identity refactor (boilerplate → C-HR)

Mục tiêu: đổi 2 app từ "generic GitHub Template" → "C-HR backend/frontend cụ thể".

- [x] 2.1 — Backend identity: `package.json` name `@c-hr/backend`, `.env.example` `PORT=8000` + `DATABASE_URL=...c_hr`, `Dockerfile EXPOSE 8000`, `README.md` + `CLAUDE.md` bỏ wording boilerplate.
- [x] 2.2 — Frontend identity: `package.json` name `@c-hr/frontend`, `README.md` + `CLAUDE.md` bỏ wording boilerplate, `pnpm-workspace.yaml` của FE xóa (dồn lên root).
- [x] 2.3 — Project domain: viết HRM domain thật trong `domain.md` (BE) + `domain.md` (FE), runbook + deployment skeleton, ADR 0001..0005 chốt kiến trúc.

## Phase 3 — Hygiene + smoke test

- [x] 3.1 — `git init` ở root + commit "chore: initial C-HR monorepo scaffold".
- [x] 3.2 — `pnpm install` ở root (workspace) — verify cả 2 app install được.
- [x] 3.3 — Smoke test: `pnpm --filter @c-hr/backend build` clean, `pnpm --filter @c-hr/frontend typecheck` clean.
- [x] 3.4 — Smoke test: `./scripts/dev.sh start infra` → postgres + redis up healthy → `pnpm --filter @c-hr/backend prisma:migrate` chạy được.

## Phase 4 — Docs + MCP unification

Mục tiêu: gỡ duplicate `docs/` + `mcp/` + `.claude/` ở 2 app, gộp ra root làm single source of truth.

- [x] 4.1 — Tạo `docs/` ở root: `docs/{domain.md, runbook.md, deployment.md}`, `docs/decisions/` (5 ADR), `docs/plans/` (refactor + features), `docs/backend/` (NestJS-specific), `docs/frontend/` (Next.js-specific + UX domain.md riêng).
- [x] 4.2 — Tạo `mcp/docs-server/` ở root, đổi tên server `boilerplate-docs` → `c-hr-docs`. Update scope enum (`root|app|overview|backend|frontend|decision|plan`).
- [x] 4.3 — Tạo `scripts/build-docs-index.js` + `scripts/hooks/post-edit-docs.js` ở root. Indexer scan thêm `apps/<name>/CLAUDE.md` + root `README.md`.
- [x] 4.4 — Tạo `.claude/` ở root: settings.json (merge BE+FE permissions, deny destructive ops), agents/ (1 `code-reviewer` chung + `module-scaffolder` BE + `page-scaffolder` FE).
- [x] 4.5 — Update root `.mcp.json` (1 server), root `package.json` (`docs:index` + `mcp:start`), strip same scripts khỏi 2 app `package.json`.
- [x] 4.6 — Rewrite root `CLAUDE.md` / `AGENTS.md` / `README.md` + 2 app `CLAUDE.md` / `AGENTS.md` / `README.md` để trỏ về `docs/` mới.
- [x] 4.7 — Xoá legacy artifact: `apps/{backend,frontend}/{docs,mcp,.claude,.mcp.json}`, `apps/{backend,frontend}/scripts/{build-docs-index.js,hooks/}`.
- [x] 4.8 — Smoke test: `pnpm docs:index` clean, `docs/index.json` regenerated với entry mới.

## Sau Phase 4

Tiến vào [features.md](features.md) — Foundation (Feature 0) và các feature HRM.
