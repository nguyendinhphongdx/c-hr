---
title: Boilerplate documentation
description: Architecture, conventions, recipes, reference. Do not edit unless changing the architecture.
tags: [overview, boilerplate]
---

# Boilerplate documentation

> **Heads up**: this folder describes the **framework** patterns in this repo (NestJS layout, DI, auth flow, Prisma, …). It ships with the boilerplate and does not need updating per project.
>
> Project-specific docs (domain, runbook, deployment) live in [../project/](../project/README.md).
>
> Edit files here only when you actually change the underlying architecture or add a new convention.

## Contents

| Doc | Read when |
| --- | --- |
| [architecture.md](architecture.md) | You want to understand layers, DI, the request lifecycle |
| [conventions.md](conventions.md) | You're about to write code and need naming/file rules |
| [recipes/add-module.md](recipes/add-module.md) | You're adding a new feature module |
| [recipes/add-cli-command.md](recipes/add-cli-command.md) | You're adding a `pnpm cli <name>` command |
| [recipes/auth-and-cookies.md](recipes/auth-and-cookies.md) | You're touching authentication |
| [recipes/switch-database.md](recipes/switch-database.md) | You want to change DB engine |
| [recipes/storage-providers.md](recipes/storage-providers.md) | You're enabling S3 / GCS |
| [reference/env-vars.md](reference/env-vars.md) | You need to know what an env var does |
| [reference/globals.md](reference/globals.md) | You need to know what's injectable everywhere |
