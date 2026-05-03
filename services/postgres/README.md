# services/postgres

Standalone Postgres 16 dev container. Start độc lập (không cần root compose):

```bash
cd services/postgres
docker compose up -d
docker compose logs -f
docker compose down       # stop, giữ data
docker compose down -v    # stop + xóa volume
```

## Config

Override qua env vars (đặt trong shell hoặc `.env` ở thư mục này):

| Var | Default |
|---|---|
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | `postgres` |
| `POSTGRES_DB` | `c_hr` |
| `POSTGRES_PORT` | `5432` |

`init/*.sql` chạy 1 lần lúc container init lần đầu (uuid-ossp, pgcrypto). Muốn re-run → `docker compose down -v` rồi up lại.

Network `c-hr` (external bridge) — backend ở root compose join cùng network để resolve hostname `postgres`.
