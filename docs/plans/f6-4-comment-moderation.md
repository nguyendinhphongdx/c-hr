---
title: F6.4 — Comment moderation (HRM appadmin xoá comment người khác)
description: Expose flag allowModeration đã có ở CommentService.softDelete qua endpoint + button UI cho HRM appadmin.
tags: [plan, collaboration, moderation, polish]
---

# F6.4 — Comment moderation

**Trạng thái**: 📋 chưa làm. Service đã sẵn flag, FE chưa expose.
**Trigger**: comment toxic/sensitive cần HR xoá. Ít gặp nhưng cần có.
**Blocked-by**: F6 ✅ done.

## BE deliverables

[`comment.service.softDelete`](../../apps/backend/src/apps/collaboration/comment/comment.service.ts) đã có signature `softDelete(id, userId, allowModeration?: boolean)`. Cần:

- [ ] Mở rộng `comment.controller.delete`:
  ```ts
  @Delete(':id')
  async delete(@Param('id') id, @CurrentUser() user) {
    const comment = await this.service.findById(id);
    const isAuthor = comment.userId === user.id;
    const canModerate = isHrmAppAdmin(user, comment.organizationId);
    if (!isAuthor && !canModerate) throw new ForbiddenException();
    await this.service.softDelete(id, user.id, !isAuthor);  // allowModeration=true if cross-author
    if (!isAuthor) {
      this.activities.log({
        action: 'comment.moderated',
        userId: user.id,
        objectType: comment.objectType,
        objectId: comment.objectId,
        metadata: { commentId: id, originalAuthorId: comment.userId },
      });
    }
  }
  ```
- [ ] Audit log: thêm action `COMMENT_MODERATE` (HR audit_logs, không phải activity).

## FE deliverables

- `components/CommentItem.tsx`:
  - Show "Xoá" button với 2 variant:
    - Author (trong 15 phút): "Xoá" thường.
    - HRM appadmin trên comment người khác: "Xoá (kiểm duyệt)" với icon shield + confirm dialog "Bạn đang xoá comment của người khác. Hành động sẽ ghi audit log."
- `useIsHrmAppAdmin()` hook đã có từ F1.
- Sau xoá, comment hiển thị placeholder `"[Đã xoá]"` (đã có v1) + `"(bị kiểm duyệt bởi HR)"` nếu cross-author.

## Smoke E2E

- [ ] User A comment.
- [ ] User A delete trong 15 phút → 200, placeholder.
- [ ] User B (non-HR) try delete A's comment → 403.
- [ ] User C (HRM appadmin) delete A's comment → 200, placeholder + activity `comment.moderated`, audit `COMMENT_MODERATE`.
- [ ] User A xem lại → thấy placeholder + "bị kiểm duyệt bởi HR" badge.

## Done-when

- BE build xanh, audit log entry đúng.
- FE button moderate chỉ hiện cho HRM appadmin.
- Placeholder hiển thị phân biệt 2 case (self-delete vs moderation).

## Defers

- **Restore deleted comment** — defer (audit log đủ recall content).
- **Moderate comment báo cáo** (user report → admin review) — defer.
- **Edit other's comment** — không làm. Moderation chỉ xoá.
