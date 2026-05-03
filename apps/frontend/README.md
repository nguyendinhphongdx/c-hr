# C-HR Frontend

Next.js 16 web app cho **C-HR** (C-OpenAI Human Resource) — SaaS HRM. Thuộc monorepo C-HR ([root README](../../README.md)).

> **Cho AI agents** (Claude Code, Cursor, Aider, …): đọc [CLAUDE.md](CLAUDE.md) trước. Có MCP server tại [mcp/docs-server](mcp/docs-server) phơi bày `docs_list` / `docs_search` / `docs_read` qua stdio. Đăng ký trong [.mcp.json](.mcp.json).

## What's included

- App Router structure trong `src/app`
- Landing page, auth routes `(auth)`, dashboard routes `(dashboard)` được middleware bảo vệ, settings pages
- Typed axios API client với cookie-based refresh handling, retry interceptor
- TanStack Query provider + React Query Devtools (dev)
- Theme provider light / dark / system
- shadcn/ui components dùng Radix Nova registry style
- SEO: site metadata, sitemap, robots, manifest, JSON-LD helpers
- Strict TypeScript, ESLint, path alias `@/*`

## Getting Started

Khuyên chạy qua root C-HR (workspace pnpm):

```bash
# Từ root
pnpm install
./scripts/dev.sh dev frontend       # next dev ở :3000
```

Hoặc thủ công trong thư mục này:

```bash
cp .env.example .env.local
pnpm install                         # nên cài ở root để workspace link đúng
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000). FE expect BE chạy ở `http://localhost:8000/api/v1` (xem `NEXT_PUBLIC_API_URL`).

## Setup checklist (trước khi vào tính năng HR)

1. Sửa `src/lib/seo/site.ts` — đổi tên app, URL, mô tả thành C-HR
2. Sao chép `.env.example` → `.env.local`, đảm bảo `NEXT_PUBLIC_API_URL` trỏ vào BE C-HR (`:8000/api/v1`)
3. Thay assets ở `public/` + `src/app/favicon.ico` thành brand C-HR
4. API contract cho `auth` ở `src/features/auth/types/` + `src/features/auth/services/authService.ts` — xác nhận khớp BE
5. `pnpm check` xanh trước khi commit

Phần còn lại (employees, departments, attendance, leave, payroll) sẽ tạo theo recipe `add-feature.md` trong giai đoạn plan tính năng.

## Scripts

```bash
pnpm dev        # dev server
pnpm build      # production build
pnpm start      # production server
pnpm lint
pnpm typecheck
pnpm check      # lint + typecheck
```

## Project structure

```text
src/app                  Route groups, metadata routes, root layout
src/components/icons     Brand icons — 1 file / icon, re-exported
src/components/layout    Header, sidebar, AuthGuard, theme toggle
src/components/providers App-level providers
src/components/ui        shadcn/ui components — DO NOT edit by hand
src/features             Feature modules: landing, auth, dashboard, settings (HRM features sẽ thêm vào đây)
src/hooks                Shared React hooks
src/lib/api              axios client + endpoints
src/lib/seo              site config, metadata, sitemap, JSON-LD
src/lib/types            Shared TypeScript types
src/middleware.ts        Edge auth gate
```

## Notes

- App dùng Next.js 16 docs ở `node_modules/next/dist/docs` làm source of truth — không tin trí nhớ training data, đọc tại chỗ khi không chắc.
- Conventions chi tiết: [CLAUDE.md](CLAUDE.md) + [docs/boilerplate/conventions.md](docs/boilerplate/conventions.md).
- HRM domain doc: [docs/project/domain.md](docs/project/domain.md).
