#!/usr/bin/env bash
# C-HR dev CLI — wrap docker compose + pnpm workflows.
# Usage: ./scripts/dev.sh <command> [target]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# `start` → full stack (infra + backend container, FE container TBD).
# `start:dev` → infra-only; BE + FE run natively via `pnpm dev` for fast
#               file watching + easy debugging.
COMPOSE_BASE=(docker compose -f docker-compose.yml)
COMPOSE_DEV=(docker compose -f docker-compose.dev.yml)

usage() {
  cat <<EOF
C-HR dev CLI

Usage: ./scripts/dev.sh <command> [target]

Targets (start / start:dev / etc.): all | infra | backend | postgres | redis

Commands:
  start [target]      Start full-stack containers (default: all). Builds
                      apps/* images if missing.
  start:dev           Start infra (postgres + redis) only — for native
                      BE/FE dev. No target needed.
  stop  [target]      Stop containers (default: all)
  restart [target]    Restart containers
  logs  [target]      Tail logs (default: backend)
  status              docker compose ps
  build [target]      Rebuild image (default: backend)
  clean [target]      Stop + remove volumes (DESTRUCTIVE — drops DB)
  dev   <target>      Run native dev server: dev backend | dev frontend
  install             pnpm install at root (workspace)
  migrate             Run prisma migrations against running postgres
  seed                Run prisma seed
  prisma <args>       Pass-through prisma CLI in apps/backend
  shell <target>      Exec a bash shell in container

Examples:
  ./scripts/dev.sh start:dev          # postgres + redis only
  ./scripts/dev.sh dev backend        # native nest start --watch :8000
  ./scripts/dev.sh dev frontend       # native next dev :3000
  ./scripts/dev.sh start              # full stack in containers (prod-like)
  ./scripts/dev.sh migrate
EOF
}

cmd="${1:-help}"
target="${2:-}"

infra_services=(postgres redis)
all_compose_services=(postgres redis backend frontend)

resolve_services() {
  case "$1" in
    ""|all)      printf '%s\n' "${all_compose_services[@]}" ;;
    infra)       printf '%s\n' "${infra_services[@]}" ;;
    postgres|redis|backend|frontend) printf '%s\n' "$1" ;;
    *)           echo "Unknown target: $1" >&2; exit 2 ;;
  esac
}

case "$cmd" in
  help|-h|--help)
    usage
    ;;

  start)
    mapfile -t svcs < <(resolve_services "${target:-all}")
    "${COMPOSE_BASE[@]}" up -d "${svcs[@]}"
    "${COMPOSE_BASE[@]}" ps
    ;;

  start:dev)
    "${COMPOSE_DEV[@]}" up -d
    "${COMPOSE_DEV[@]}" ps
    ;;

  stop)
    if [[ -z "$target" || "$target" == "all" ]]; then
      "${COMPOSE_BASE[@]}" down
    else
      mapfile -t svcs < <(resolve_services "$target")
      "${COMPOSE_BASE[@]}" stop "${svcs[@]}"
    fi
    ;;

  restart)
    mapfile -t svcs < <(resolve_services "${target:-infra}")
    "${COMPOSE_BASE[@]}" restart "${svcs[@]}"
    ;;

  logs)
    svc="${target:-backend}"
    "${COMPOSE_BASE[@]}" logs -f "$svc"
    ;;

  status|ps)
    "${COMPOSE_BASE[@]}" ps
    ;;

  build)
    mapfile -t svcs < <(resolve_services "${target:-backend}")
    "${COMPOSE_BASE[@]}" build "${svcs[@]}"
    ;;

  clean)
    if [[ -z "$target" || "$target" == "all" ]]; then
      read -p "Xoá toàn bộ containers + volumes (mất DB). Tiếp tục? [y/N] " ans
      [[ "$ans" == "y" || "$ans" == "Y" ]] || exit 0
      "${COMPOSE_BASE[@]}" down -v
    else
      mapfile -t svcs < <(resolve_services "$target")
      "${COMPOSE_BASE[@]}" rm -sfv "${svcs[@]}"
    fi
    ;;

  dev)
    case "$target" in
      backend)
        cd apps/backend
        exec pnpm start:dev
        ;;
      frontend)
        cd apps/frontend
        exec pnpm dev
        ;;
      *)
        echo "dev cần target: backend | frontend" >&2
        exit 2
        ;;
    esac
    ;;

  install)
    pnpm install
    ;;

  migrate)
    cd apps/backend
    exec pnpm prisma:migrate
    ;;

  seed)
    cd apps/backend
    exec pnpm prisma:seed
    ;;

  prisma)
    shift
    cd apps/backend
    exec pnpm prisma "$@"
    ;;

  shell)
    svc="${target:-backend}"
    "${COMPOSE_BASE[@]}" exec "$svc" sh
    ;;

  *)
    echo "Unknown command: $cmd" >&2
    usage
    exit 2
    ;;
esac
