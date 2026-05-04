---
title: C-HR frontend documentation
description: Next.js-specific architecture, conventions, recipes, reference + UX domain for the C-HR frontend.
tags: [overview, frontend, nextjs, c-hr]
---

# C-HR frontend documentation

Next.js-specific patterns cho [apps/frontend](../../apps/frontend/) (App Router, RSC vs Client, design tokens, auth flow, recipes) **plus** UX domain (route map, persona).

HRM business model (entity, invariant) sống ở [../domain.md](../domain.md). FE-specific UX/UI domain (route map, screens, persona) sống ngay đây ở [domain.md](domain.md).

## Contents

| Doc | Read when |
| --- | --- |
| [domain.md](domain.md) | You need persona, route map, feature → folder mapping |
| [architecture.md](architecture.md) | You want to understand layers, RSC, the request lifecycle |
| [conventions.md](conventions.md) | You're about to write code and need naming/file rules |
| [recipes/add-feature.md](recipes/add-feature.md) | You're adding a feature module |
| [recipes/add-page.md](recipes/add-page.md) | You're adding a route + view |
| [recipes/auth-flow.md](recipes/auth-flow.md) | You're touching authentication |
| [recipes/theming.md](recipes/theming.md) | You're customising design tokens or animations |
| [recipes/icons.md](recipes/icons.md) | You're adding a brand icon or picking an icon library |
| [reference/env-vars.md](reference/env-vars.md) | You need to know what an env var does |
| [reference/ui-tokens.md](reference/ui-tokens.md) | You need to know what's in `globals.css` |

## Related

- [../domain.md](../domain.md) — HRM business model (entity, invariant, glossary) — chung cho cả BE+FE
- [../decisions/](../decisions/) — ADRs
- [../plans/features.md](../plans/features.md) — feature queue
