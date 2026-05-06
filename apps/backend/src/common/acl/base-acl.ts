import { ForbiddenException } from '@nestjs/common';

import { RequestContextService } from '@/common/context';

/**
 * Default permission flags every entity exposes. Subclasses widen this
 * via the second generic param (e.g. `canApprove`, `canViewSalary`).
 */
export interface AclView {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export type AclAction = keyof AclView;

/**
 * Per-entity ACL base. Per ADR 0003 (no permission engine) — explicit
 * if/else gathered by entity, no decorator/registry magic.
 *
 * Constructor takes only the object. `ctx` is read via the static
 * `RequestContextService.current()` accessor (CLS-backed) so subclass
 * methods stay lean. Predicates are typically sync because role data is
 * baked into ctx at auth time (`appAdminCodes`); the signature still
 * accepts `Promise<boolean>` for the rare ACL that needs an extra DB
 * lookup (delegate it explicitly to a service the subclass injects).
 *
 * Extend `AclView` via the second type param to add custom flags:
 *
 *   interface RequestView extends AclView { canApprove: boolean }
 *   class RequestAcl extends BaseAcl<Request, RequestView> { ... }
 */
export abstract class BaseAcl<T, V extends AclView = AclView> {
  constructor(protected readonly obj: T) {}

  protected get ctx(): RequestContextService {
    return RequestContextService.current();
  }

  abstract canView(): Promise<boolean> | boolean;
  abstract canEdit(): Promise<boolean> | boolean;
  abstract canDelete(): Promise<boolean> | boolean;

  private _view?: Promise<V>;
  getAcl(): Promise<V> {
    return (this._view ??= (async () => {
      const [canView, canEdit, canDelete] = await Promise.all([
        this.canView(),
        this.canEdit(),
        this.canDelete(),
      ]);
      return { canView, canEdit, canDelete } as V;
    })());
  }

  async require(action: AclAction): Promise<void> {
    const allowed =
      action === 'canView'
        ? await this.canView()
        : action === 'canEdit'
          ? await this.canEdit()
          : await this.canDelete();
    if (!allowed) throw new ForbiddenException(`Not allowed: ${action}`);
  }
}
