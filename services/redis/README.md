# services/redis

Standalone Redis 7 dev container với AOF persistence.

```bash
cd services/redis
docker compose up -d
docker compose logs -f
docker compose down       # stop, giữ data
docker compose down -v    # stop + xóa volume
```

Default port `6379` (override `REDIS_PORT`). Network `c-hr` (chia sẻ với postgres + backend).
