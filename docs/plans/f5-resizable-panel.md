---
title: F5 — Resizable master-detail panel cho /requests
description: Drag-to-resize giữa list trái và preview phải. Fix type mismatch react-resizable-panels.
tags: [plan, requests, ui, polish]
---

# F5 — Resizable panel

**Trạng thái**: 📋 small polish. Defer ghi nhận trong [features.md F5 defers](features.md#defers-f52--future).
**Trigger**: UX — list dài + preview wide đôi khi muốn user kéo phân chia. ~½ ngày.
**Blocked-by**: F5 ✅ done.

## Vấn đề hiện tại

`RequestListView` dùng 2-column grid CSS static (md:`grid-cols-[1fr_2fr]` hoặc tương tự). Trước đây thử `react-resizable-panels` nhưng type mismatch với version installed.

## Fix

### Option A — Update `react-resizable-panels` (recommended)

```bash
pnpm --filter @c-hr/frontend add react-resizable-panels@latest
```

Refactor `RequestListView.tsx`:

```tsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

<PanelGroup direction="horizontal" autoSaveId="requests-layout">
  <Panel defaultSize={35} minSize={25} maxSize={50}>
    <RequestList ... />
  </Panel>
  <PanelResizeHandle className="w-1 bg-border hover:bg-accent transition" />
  <Panel defaultSize={65} minSize={50}>
    <RequestPreview ... />
  </Panel>
</PanelGroup>
```

`autoSaveId` persist size vào localStorage — user kéo lần sau giữ nguyên.

### Option B — Bỏ qua nếu lib bug

Custom hook `useResizable` ~30 LOC: track `sizeLeft` state, mousedown handle → mousemove update, persist localStorage. Không lib mới.

## Done-when

- FE check xanh.
- Drag handle giữa 2 panel → resize smooth.
- Reload → giữ size cũ.
- Mobile (< md) → fallback stack vertical, no handle.

## Smoke

- [ ] `/requests` mở → 2 panel default 35/65.
- [ ] Drag handle sang phải → list rộng ra, preview hẹp lại.
- [ ] Reload → size giữ nguyên.
- [ ] Resize quá min/max → clamp.

## Defers

- **Vertical resize** trong preview (giữa form + comment timeline) — defer.
- **Collapse panel** (click handle → ẩn list) — defer.
