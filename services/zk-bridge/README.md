# services/zk-bridge — placeholder

> **Trạng thái**: chưa implement. Spec đầy đủ ở [docs/plans/zk-bridge.md](../../docs/plans/zk-bridge.md).

Service này sẽ là **bridge** poll device ZKTeco qua TCP (`node-zklib`) và đẩy event sang C-HR backend qua HTTPS — chạy ở LAN văn phòng khách hàng, **không** chạy chung với backend cloud.

## Tóm tắt scope (xem spec để chi tiết)

- Local web UI ở `http://localhost:7000` để admin nhập config (CHR API + token + ZK device IP) — không cần sửa file env tay
- Single-user auth: tạo admin local lần đầu start, không có signup sau
- SQLite local cho config + offline event queue + cycle audit
- LAN device scan: auto-discover IP ZKTeco trong subnet
- Auto-start on boot: 1 toggle UI install systemd / Windows Service / launchd

## Vì sao folder này tồn tại trước khi code

Giữ slot trong monorepo để khi cần bắt tay làm:

1. Workspace structure đã có chỗ — không tranh luận đặt ở đâu.
2. Doc `docs/plans/zk-bridge.md` đã chốt scope, contract, pre-req, layout.
3. Khi clone repo và `ls services/`, dev thấy ngay slot này tồn tại nhưng chưa code → biết là post-MVP.

## Khi nào bắt đầu

Theo trigger trong [docs/plans/zk-bridge.md § "Khi nào bắt đầu"](../../docs/plans/zk-bridge.md#khi-nào-bắt-đầu): F1–F5 đóng + có khách hàng thật cần tích hợp device. Trước đó **không** code.

## Deploy tách rời

Khi implement, service này có installer + (optional) docker-compose.yml riêng. Root `docker-compose.yml` của C-HR backend **không** include service này — bridge cài trên máy của khách hàng, không trên hạ tầng cloud của C-HR.
