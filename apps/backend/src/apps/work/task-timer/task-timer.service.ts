import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole } from '@prisma/client';

import { ActivityService } from '@/apps/collaboration/activity/activity.service';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { ProjectRepository } from '../project/project.repository';
import { TaskAcl, TaskAclSubject } from '../task/task.acl';
import { TaskRepository } from '../task/task.repository';

import { ListTimersDto, StartTimerDto, StopTimerDto, SummaryTimersDto } from './dto';
import { TaskTimerAcl } from './task-timer.acl';
import { TaskTimerRepository } from './task-timer.repository';

type ProjectFull = NonNullable<Awaited<ReturnType<ProjectRepository['findByIdByOrg']>>>;
type TaskRow = NonNullable<Awaited<ReturnType<TaskRepository['findByIdByOrg']>>>;

/**
 * Manual time entry (typed minutes without start/stop) is intentionally
 * NOT supported in Phase 7 — it would let users backfill arbitrary hours
 * into payroll without audit. Phase 8 enhancement may add a separate
 * `POST /task-timers` endpoint that records a `manualEntry=true` flag.
 */
@Injectable()
export class TaskTimerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: TaskTimerRepository,
    private readonly tasks: TaskRepository,
    private readonly projects: ProjectRepository,
    private readonly activities: ActivityService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────────────────────────

  async start(dto: StartTimerDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();

    const { task, project } = await this.loadTaskAndProject(orgId, dto.taskId);
    await this.buildTaskAcl(task, project).require('canView');

    // Auto-stop any other running timer for this user — keep "1 running
    // timer per user" invariant. Same task → leave running, idempotent.
    const running = await this.repo.findRunningForUser(callerId);
    if (running && running.id !== null) {
      if (running.taskId === dto.taskId) {
        return running;
      }
      await this.applyStop(running.id, running.startedAt, running.taskId, orgId, callerId, null);
    }

    const created = await this.prisma.taskTimer.create({
      data: {
        taskId: dto.taskId,
        userId: callerId,
        startedAt: new Date(),
        note: dto.note ?? null,
      },
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'Task',
      objectId: dto.taskId,
      objectLabel: task.title,
      action: 'task.timer_started',
      userId: callerId,
      metadata: { timerId: created.id },
    });

    return this.repo.findById(created.id);
  }

  async stop(id: string, dto: StopTimerDto) {
    const orgId = this.ctx.requireOrg();

    const timer = await this.repo.findById(id);
    if (!timer) throw new NotFoundException('Timer not found');
    if (timer.task.organizationId !== orgId) {
      throw new NotFoundException('Timer not found');
    }

    const acl = new TaskTimerAcl({
      id: timer.id,
      taskId: timer.taskId,
      userId: timer.userId,
      stoppedAt: timer.stoppedAt,
      organizationId: timer.task.organizationId,
    });
    if (!acl.canStop()) {
      throw new ForbiddenException('Not allowed: canStop');
    }

    if (timer.stoppedAt) {
      // Idempotent — already stopped.
      return timer;
    }

    await this.applyStop(
      timer.id,
      timer.startedAt,
      timer.taskId,
      orgId,
      timer.userId,
      dto.note ?? null,
    );

    return this.repo.findById(timer.id);
  }

  // ──────────────────────────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────────────────────────

  /** Caller's running timer, or null. Used by the floating indicator. */
  async current() {
    const callerId = this.ctx.requireUserId();
    const timer = await this.repo.findRunningForUser(callerId);
    return timer ?? null;
  }

  async listForTask(taskId: string) {
    const orgId = this.ctx.requireOrg();
    const { task, project } = await this.loadTaskAndProject(orgId, taskId);
    await this.buildTaskAcl(task, project).require('canView');
    return this.repo.findManyForTask(taskId, 20);
  }

  /**
   * Generic list — filters by taskId / userId / from-to. Non-admin
   * callers must pass `userId === ctx.userId` (own timers only). Admin
   * may filter by any combination.
   */
  async list(query: ListTimersDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    const isAdmin = this.ctx.isAppAdmin('HRM', orgId);

    if (query.taskId) {
      const { task, project } = await this.loadTaskAndProject(orgId, query.taskId);
      await this.buildTaskAcl(task, project).require('canView');
    } else if (!isAdmin) {
      if (!query.userId || query.userId !== callerId) {
        throw new ForbiddenException(
          'Non-admin must pass userId=ctx.userId when taskId omitted',
        );
      }
    }

    const where: Prisma.TaskTimerWhereInput = {
      task: { organizationId: orgId },
    };
    if (query.taskId) where.taskId = query.taskId;
    if (query.userId) where.userId = query.userId;
    if (query.from || query.to) {
      where.startedAt = {};
      if (query.from) where.startedAt.gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) where.startedAt.lte = new Date(`${query.to}T23:59:59.999Z`);
    }

    return this.repo.findManyByFilter(where, 200);
  }

  /**
   * Aggregate minutes grouped by (userId, projectId) over the period.
   * Non-admin must pass `userId === ctx.userId`; admin may pass any.
   * Excludes still-running timers (minutes IS NULL).
   */
  async summaryByUser(query: SummaryTimersDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    const isAdmin = this.ctx.isAppAdmin('HRM', orgId);

    if (!isAdmin) {
      if (!query.userId || query.userId !== callerId) {
        throw new ForbiddenException(
          'Non-admin must pass userId=ctx.userId',
        );
      }
    }

    const from = new Date(`${query.from}T00:00:00.000Z`);
    const to = new Date(`${query.to}T23:59:59.999Z`);

    const where: Prisma.TaskTimerWhereInput = {
      task: { organizationId: orgId },
      startedAt: { gte: from, lte: to },
      minutes: { not: null },
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.projectId ? { task: { is: { projectId: query.projectId, organizationId: orgId } } } : {}),
    };

    const rows = await this.prisma.taskTimer.findMany({
      where,
      select: {
        userId: true,
        minutes: true,
        task: {
          select: {
            projectId: true,
            project: { select: { id: true, name: true, slug: true, color: true } },
          },
        },
      },
    });

    const acc = new Map<
      string,
      { userId: string; projectId: string; projectName: string; minutes: number }
    >();
    for (const r of rows) {
      const key = `${r.userId}|${r.task.projectId}`;
      const prev = acc.get(key);
      const min = r.minutes ?? 0;
      if (prev) {
        prev.minutes += min;
      } else {
        acc.set(key, {
          userId: r.userId,
          projectId: r.task.projectId,
          projectName: r.task.project?.name ?? '',
          minutes: min,
        });
      }
    }

    return Array.from(acc.values());
  }

  /**
   * Aggregate Work-time minutes per user over the period — fast path
   * used by TimesheetReportService. No ACL inside; caller (the report
   * service) already gates by HRM appadmin.
   */
  async totalMinutesByUserBulk(
    orgId: string,
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (userIds.length === 0) return out;

    const rows = await this.prisma.taskTimer.groupBy({
      by: ['userId'],
      where: {
        task: { organizationId: orgId },
        userId: { in: userIds },
        startedAt: { gte: from, lte: to },
        minutes: { not: null },
      },
      _sum: { minutes: true },
    });

    for (const r of rows) {
      out.set(r.userId, r._sum.minutes ?? 0);
    }
    return out;
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  /**
   * Atomically: stamp `stoppedAt + minutes` on the timer, increment the
   * parent task's `actualMinutes` by the same amount. Skip when minutes
   * <= 0 so a tiny accidental tap doesn't pollute the task total.
   */
  private async applyStop(
    timerId: string,
    startedAt: Date,
    taskId: string,
    orgId: string,
    userId: string,
    note: string | null,
  ): Promise<void> {
    const stoppedAt = new Date();
    const minutes = Math.max(
      0,
      Math.round((stoppedAt.getTime() - startedAt.getTime()) / 60_000),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.taskTimer.update({
        where: { id: timerId },
        data: {
          stoppedAt,
          minutes,
          ...(note !== null ? { note } : {}),
        },
      });
      if (minutes > 0) {
        await tx.task.update({
          where: { id: taskId },
          data: { actualMinutes: { increment: minutes } },
        });
      }
    });

    this.activities.log({
      organizationId: orgId,
      objectType: 'Task',
      objectId: taskId,
      action: 'task.timer_stopped',
      userId,
      metadata: { timerId, minutes },
    });
  }

  private async loadTaskAndProject(
    orgId: string,
    taskId: string,
  ): Promise<{ task: TaskRow; project: ProjectFull }> {
    const task = await this.tasks.findByIdByOrg(orgId, taskId);
    if (!task) throw new NotFoundException('Task not found');
    const project = await this.projects.findByIdByOrg(orgId, task.projectId);
    if (!project) throw new NotFoundException('Project not found');
    return { task, project };
  }

  private buildTaskAcl(task: TaskRow, project: ProjectFull): TaskAcl {
    const memberRoles = new Map<string, ProjectRole>();
    for (const m of project.members) memberRoles.set(m.userId, m.role);
    const subject: TaskAclSubject = {
      id: task.id,
      organizationId: task.organizationId,
      projectId: task.projectId,
      assigneeId: task.assigneeId,
      reporterId: task.reporterId,
      deletedAt: task.deletedAt,
      _project: {
        ownerId: project.ownerId,
        visibility: project.visibility,
        _memberRoles: memberRoles,
      },
      _watcherUserIds: task.watchers?.map((w) => w.userId) ?? [],
    };
    return new TaskAcl(subject);
  }
}
