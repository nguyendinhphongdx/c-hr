---
title: Agent instructions (root)
description: Pointer cho non-Claude AI coding agents. Đọc CLAUDE.md ở root rồi xuống docs/ + CLAUDE.md của app phù hợp.
tags: [overview, agents, c-hr]
---

# Agent instructions — C-HR

Project này dùng [CLAUDE.md](CLAUDE.md) làm file chỉ dẫn chính. Quy ước áp dụng cho **mọi** AI agent (Cursor, Aider, Continue, Copilot Chat, …).

## Đọc theo phạm vi

- Cross-cutting / orchestration / docker → [CLAUDE.md](CLAUDE.md) (root)
- HRM domain (entity + invariant) → [docs/domain.md](docs/domain.md)
- Frontend UX / route map → [docs/frontend/domain.md](docs/frontend/domain.md)
- Backend code → [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md) → [docs/backend/](docs/backend/README.md)
- Frontend code → [apps/frontend/CLAUDE.md](apps/frontend/CLAUDE.md) → [docs/frontend/](docs/frontend/README.md)
- ADR / decisions → [docs/decisions/](docs/decisions/)
- Plans đang chạy → [docs/plans/](docs/plans/)

Không trộn quy ước giữa hai app — mỗi bên có Hard rules riêng và phải tôn trọng độc lập.

## MCP docs server

[.mcp.json](.mcp.json) đăng ký 1 server `c-hr-docs` ([mcp/docs-server](mcp/docs-server/)) expose:

- Root `CLAUDE.md`, `AGENTS.md`, `README.md`
- Toàn bộ `docs/**`
- Per-app `apps/<name>/CLAUDE.md`

Dùng tools `docs_list`, `docs_search`, `docs_read` thay vì grep filesystem. Index `docs/index.json` được hook auto-rebuild khi có edit.

## Heads-up: Next.js 16 + React 19

Frontend dùng Next.js 16 + React 19. Có breaking changes so với các bản trước — không tin trí nhớ training data, đọc [docs/frontend/](docs/frontend/) hoặc dùng MCP tool trước khi viết code.
