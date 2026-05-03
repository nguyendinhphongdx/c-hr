# C-HR refactor plan

**Project**: C-HR (C-OpenAI Human Resource) — SaaS quản lý nhân sự cho doanh nghiệp.
**Stack**: Next.js 16 (frontend) + NestJS 10 (backend) + Postgres 16 + Redis 7, monorepo theo pattern reference [`ai-agent-builder`](../../Code/AI/VibeCode/ai-agent-builder).

Refactor 3 phase, làm tuần tự. Không động vào tính năng HR cho đến khi xong cả 3 phase.

---

## Phase 1 — Root scaffolding (combine 2 boilerplate ra ngoài)

Mục tiêu: thêm lớp orchestration ở root, **không sửa code** trong [apps/backend](apps/backend/) và [apps/frontend](apps/frontend/).

- [ ] 1.1 — `services/postgres/docker-compose.yml` + `services/redis/docker-compose.yml` (mỗi service start độc lập được, theo pattern reference)
- [ ] 1.2 — Root `docker-compose.yml` (postgres + redis + backend + frontend) + `docker-compose.dev.yml` (override hot-reload)
- [ ] 1.3 — `scripts/dev.sh` CLI: `start infra | dev backend | dev frontend | migrate | logs | stop | status`
- [ ] 1.4 — Root config: `.env.example`, `.gitignore`, `pnpm-workspace.yaml`, `.mcp.json` (merge `backend-docs` + `frontend-docs` MCP servers)
- [ ] 1.5 — Root docs navigation: `CLAUDE.md` (hub trỏ xuống 2 app), `AGENTS.md`, `README.md`

## Phase 2 — Identity refactor (boilerplate → C-HR)

Mục tiêu: đổi 2 app từ "generic GitHub Template" → "C-HR backend/frontend cụ thể". **Giữ nguyên** Hard rules, Layout cheat sheet, Common commands, conventions — chỉ thay phần wording identity + fill domain.

- [ ] 2.1 — Backend identity:
  - `package.json` name → `@c-hr/backend`, description HRM
  - `.env.example`: `PORT=8000` (fix conflict với FE), `DATABASE_URL=...c_hr`, drop wording chung
  - `Dockerfile`: `EXPOSE 8000`
  - `README.md` + `CLAUDE.md`: bỏ "Goal: a boilerplate consumed via GitHub Template", thay bằng C-HR backend
- [ ] 2.2 — Frontend identity:
  - `package.json` name → `@c-hr/frontend`, description HRM
  - `README.md` + `CLAUDE.md`: bỏ wording "generic SaaS boilerplate"
  - `pnpm-workspace.yaml` ở FE → xóa, dồn lên root
- [ ] 2.3 — `docs/project/*` ở 2 app: viết domain HRM thật trong `domain.md` và `runbook.md` (employees, departments, positions, attendance, leave, payroll). `docs/project/decisions/0001-template.md` giữ nguyên template ADR.

## Phase 3 — Hygiene + smoke test

- [ ] 3.1 — `git init` ở root + commit "chore: initial C-HR monorepo scaffold"
- [ ] 3.2 — `pnpm install` ở root (workspace) — verify cả 2 app install được
- [ ] 3.3 — Smoke test: `pnpm --filter @c-hr/backend build` clean, `pnpm --filter @c-hr/frontend typecheck` clean
- [ ] 3.4 — Smoke test: `./scripts/dev.sh start infra` → postgres + redis up healthy → `pnpm --filter @c-hr/backend prisma:migrate` chạy được

## Sau phase 3

Sit down plan tính năng HRM. Thứ tự đề xuất:
1. **Auth + multi-tenant** (organization/company entity, user thuộc org)
2. **Employees** (CRUD + profile)
3. **Departments + Positions** (org structure)
4. **Attendance** (chấm công)
5. **Leave** (đơn nghỉ phép, approval workflow)
6. **Payroll** (lương, công thức, bảng lương tháng)

Không khởi động phase này cho đến khi user xác nhận ưu tiên.
