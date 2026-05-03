---
title: Agent instructions (root)
description: Pointer cho non-Claude AI coding agents. Đọc CLAUDE.md ở root rồi xuống CLAUDE.md của app phù hợp.
tags: [overview, agents, c-hr]
---

# Agent instructions — C-HR

Project này dùng [CLAUDE.md](CLAUDE.md) làm file chỉ dẫn chính. Quy ước áp dụng cho **mọi** AI agent (Cursor, Aider, Continue, Copilot Chat, …).

## Đọc theo phạm vi

- Cross-cutting / orchestration / docker → [CLAUDE.md](CLAUDE.md) (root)
- Backend (NestJS) → [apps/backend/CLAUDE.md](apps/backend/CLAUDE.md)
- Frontend (Next.js) → [apps/frontend/CLAUDE.md](apps/frontend/CLAUDE.md)

Không trộn quy ước giữa hai app — mỗi bên có Hard rules riêng và phải tôn trọng độc lập.

## MCP docs servers

[.mcp.json](.mcp.json) đăng ký:
- `backend-docs` — index ở [apps/backend/docs](apps/backend/docs/)
- `frontend-docs` — index ở [apps/frontend/docs](apps/frontend/docs/)

Dùng `docs_list`, `docs_search`, `docs_read` thay vì grep filesystem.

## Heads-up: Next.js 16 + React 19

Frontend dùng Next.js 16 + React 19. Có breaking changes so với các bản trước — không tin trí nhớ training data, đọc `apps/frontend/docs/boilerplate/` hoặc dùng MCP tool trước khi viết code.
