import { ClsServiceManager } from 'nestjs-cls';

import type { RequestContextData } from './request-context.service';

/**
 * Run `fn` inside a synthetic ALS context with the given user data.
 *
 * Use for code that runs OUTSIDE an HTTP request — cron jobs, queue
 * workers, EventEmitter listeners spawned via `setTimeout`/`setImmediate`,
 * CLI commands. Inside `fn`, services that read from `RequestContextService`
 * see the supplied values. See ADR 0007.
 *
 * Example (background email worker):
 *
 * ```ts
 * eventEmitter.on('request.leave.approved', async ({ id, organizationId }) => {
 *   await runInRequestContext({ userId: 'system', organizationId }, async () => {
 *     await this.requestService.findOne(id);     // reads ctx normally
 *     await this.mailService.sendApproval(id);
 *   });
 * });
 * ```
 */
export async function runInRequestContext<T>(
  data: RequestContextData,
  fn: () => Promise<T>,
): Promise<T> {
  const cls = ClsServiceManager.getClsService();
  return cls.run(async () => {
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) cls.set(key, value);
    });
    return fn();
  });
}
