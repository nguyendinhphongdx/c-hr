import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectRole, TaskStatus } from '@prisma/client';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { ProjectAcl, ProjectAclSubject } from '../project/project.acl';
import { ProjectRepository } from '../project/project.repository';

import { ProjectOverviewQueryDto } from './dto';

// ──────────────────────────────────────────────────────────────────
// Response shapes
// ──────────────────────────────────────────────────────────────────

export interface ProjectReportTotals {
  total: number;
  done: number;
  open: number;
  overdue: number;
  /** done / total, in [0..1]. 0 when total === 0. */
  completionRate: number;
  /** Average days from createdAt → updatedAt for DONE tasks. null if no DONE. */
  avgCycleTimeDays: number | null;
}

export interface BurndownPoint {
  date: string; // YYYY-MM-DD
  openCount: number;
}

export interface WorkloadAssigneeRow {
  /** null = "Chưa giao" bucket. */
  userId: string | null;
  name: string | null;
  avatar: string | null;
  counts: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
  };
}

export interface ProjectReportOverview {
  totals: ProjectReportTotals;
  burndown: BurndownPoint[];
  workload: WorkloadAssigneeRow[];
}

export interface OrgWorkTotals {
  activeProjects: number;
  openTasks: number;
  overdueTasks: number;
  /** Unique users across all project_members in org. */
  totalMembers: number;
}

export interface TopProjectRow {
  id: string;
  name: string;
  slug: string;
  openCount: number;
  updatedAt: string;
}

export interface WorkloadHeatmap {
  /** length 14, day-by-day YYYY-MM-DD starting at today. */
  days: string[];
  rows: Array<{
    userId: string;
    name: string | null;
    avatar: string | null;
    /** counts.length === days.length */
    counts: number[];
  }>;
}

export interface OrgWorkOverview {
  totals: OrgWorkTotals;
  topProjects: TopProjectRow[];
  workloadHeatmap: WorkloadHeatmap;
}

const MAX_BURNDOWN_DAYS = 30;
const HEATMAP_DAYS = 14;
const TOP_PROJECTS_LIMIT = 5;
const OPEN_STATUSES: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW];

@Injectable()
export class ProjectReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly projectRepo: ProjectRepository,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Per-project overview — KPI + burndown + workload by assignee
  // ──────────────────────────────────────────────────────────────────

  async projectOverview(
    projectId: string,
    query: ProjectOverviewQueryDto,
  ): Promise<ProjectReportOverview> {
    const orgId = this.ctx.requireOrg();
    const project = await this.projectRepo.findByIdByOrg(orgId, projectId);
    if (!project) throw new NotFoundException('Project not found');
    await this.buildProjectAcl(project).require('canView');

    // Period for burndown — clamp to last 30 days max and not before
    // project.createdAt. Both bounds are inclusive day-level (UTC).
    const todayUtc = startOfUtcDay(new Date());
    const explicitTo = query.to ? startOfUtcDay(new Date(`${query.to}T00:00:00Z`)) : todayUtc;
    const projectStart = startOfUtcDay(project.createdAt);
    const fallbackFrom = addDays(explicitTo, -(MAX_BURNDOWN_DAYS - 1));
    const explicitFrom = query.from
      ? startOfUtcDay(new Date(`${query.from}T00:00:00Z`))
      : maxDate(fallbackFrom, projectStart);
    const from = maxDate(explicitFrom, projectStart);
    const to = explicitTo < from ? from : explicitTo;

    // 1. Pull every non-deleted task for the project once. We need
    //    createdAt/updatedAt/status/dueDate for burndown + KPIs, and the
    //    assignee for the workload section.
    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId: orgId,
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        assigneeId: true,
        createdAt: true,
        updatedAt: true,
        dueDate: true,
      },
    });

    // 2. KPI totals.
    const totals = computeTotals(tasks, todayUtc);

    // 3. Burndown — heuristic over (createdAt, updatedAt, status). TODO:
    //    swap for Activity log "status_changed" history once Phase 7 wires
    //    a status_change timeline; current snapshot can't distinguish
    //    "edited after done" from "moved to done that day".
    const burndown = buildBurndown(tasks, from, to);

    // 4. Workload by assignee.
    const assigneeIds = Array.from(
      new Set(tasks.map((t) => t.assigneeId).filter((id): id is string => !!id)),
    );
    const users = assigneeIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: assigneeIds }, organizationId: orgId },
          select: { id: true, name: true, avatar: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const workload = buildWorkload(tasks, userById);

    return { totals, burndown, workload };
  }

  // ──────────────────────────────────────────────────────────────────
  // Org-wide overview — KPI + top projects + 14-day workload heatmap
  // ──────────────────────────────────────────────────────────────────

  async orgOverview(): Promise<OrgWorkOverview> {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'HRM', orgId, this.prisma);

    const todayUtc = startOfUtcDay(new Date());
    const horizon = addDays(todayUtc, HEATMAP_DAYS - 1);
    const horizonEnd = endOfUtcDay(horizon);

    const projectWhere: Prisma.ProjectWhereInput = {
      organizationId: orgId,
      deletedAt: null,
      archivedAt: null,
    };

    const [activeProjects, openTasks, overdueTasks, memberAgg, heatmapTasks, topProjectsRaw] =
      await Promise.all([
        this.prisma.project.count({
          where: { ...projectWhere, status: { not: 'DONE' } },
        }),
        this.prisma.task.count({
          where: {
            organizationId: orgId,
            deletedAt: null,
            status: { in: OPEN_STATUSES },
          },
        }),
        this.prisma.task.count({
          where: {
            organizationId: orgId,
            deletedAt: null,
            status: { in: OPEN_STATUSES },
            dueDate: { lt: todayUtc },
          },
        }),
        this.prisma.projectMember.findMany({
          where: { project: { organizationId: orgId, deletedAt: null } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        this.prisma.task.findMany({
          where: {
            organizationId: orgId,
            deletedAt: null,
            status: { in: OPEN_STATUSES },
            dueDate: { gte: todayUtc, lte: horizonEnd },
            assigneeId: { not: null },
          },
          select: { assigneeId: true, dueDate: true },
        }),
        this.prisma.project.findMany({
          where: projectWhere,
          select: {
            id: true,
            name: true,
            slug: true,
            updatedAt: true,
            _count: {
              select: {
                tasks: {
                  where: { deletedAt: null, status: { in: OPEN_STATUSES } },
                },
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          take: TOP_PROJECTS_LIMIT,
        }),
      ]);

    // Resolve user details for heatmap rows.
    const heatmapUserIds = Array.from(
      new Set(heatmapTasks.map((t) => t.assigneeId).filter((id): id is string => !!id)),
    );
    const users = heatmapUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: heatmapUserIds }, organizationId: orgId },
          select: { id: true, name: true, avatar: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const days: string[] = [];
    for (let i = 0; i < HEATMAP_DAYS; i++) {
      days.push(toDateKey(addDays(todayUtc, i)));
    }
    const dayIndex = new Map(days.map((d, i) => [d, i]));

    const buckets = new Map<string, number[]>();
    for (const t of heatmapTasks) {
      if (!t.assigneeId || !t.dueDate) continue;
      const key = toDateKey(t.dueDate);
      const idx = dayIndex.get(key);
      if (idx === undefined) continue;
      let row = buckets.get(t.assigneeId);
      if (!row) {
        row = new Array<number>(HEATMAP_DAYS).fill(0);
        buckets.set(t.assigneeId, row);
      }
      row[idx]++;
    }

    const rows = Array.from(buckets.entries())
      .map(([userId, counts]) => {
        const u = userById.get(userId);
        return {
          userId,
          name: u?.name ?? null,
          avatar: u?.avatar ?? null,
          counts,
        };
      })
      .sort((a, b) => sum(b.counts) - sum(a.counts));

    return {
      totals: {
        activeProjects,
        openTasks,
        overdueTasks,
        totalMembers: memberAgg.length,
      },
      topProjects: topProjectsRaw.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        openCount: p._count.tasks,
        updatedAt: p.updatedAt.toISOString(),
      })),
      workloadHeatmap: { days, rows },
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private buildProjectAcl(
    project: NonNullable<Awaited<ReturnType<ProjectRepository['findByIdByOrg']>>>,
  ): ProjectAcl {
    const memberRoles = new Map<string, ProjectRole>();
    for (const m of project.members) memberRoles.set(m.userId, m.role);
    const subject: ProjectAclSubject = {
      id: project.id,
      organizationId: project.organizationId,
      ownerId: project.ownerId,
      visibility: project.visibility,
      _memberRoles: memberRoles,
    };
    return new ProjectAcl(subject);
  }
}

// ──────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────

interface TaskShape {
  id: string;
  status: TaskStatus;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
}

function computeTotals(tasks: TaskShape[], todayUtc: Date): ProjectReportTotals {
  let done = 0;
  let open = 0;
  let overdue = 0;
  let cycleSumMs = 0;
  let cycleCount = 0;

  for (const t of tasks) {
    if (t.status === TaskStatus.DONE) {
      done++;
      cycleSumMs += t.updatedAt.getTime() - t.createdAt.getTime();
      cycleCount++;
    } else if (t.status !== TaskStatus.CANCELLED) {
      open++;
      if (t.dueDate && t.dueDate < todayUtc) overdue++;
    }
  }

  const total = tasks.length;
  const completionRate = total > 0 ? done / total : 0;
  const avgCycleTimeDays = cycleCount > 0 ? cycleSumMs / cycleCount / 86_400_000 : null;

  return { total, done, open, overdue, completionRate, avgCycleTimeDays };
}

/**
 * Heuristic burndown. For each day D in [from..to]:
 *   open(D) = count of tasks t where
 *     t.createdAt <= endOfDay(D) AND
 *     (t.updatedAt > endOfDay(D) OR t.status NOT IN (DONE, CANCELLED))
 *
 * This treats "updatedAt after D + status terminal" as the close event —
 * imperfect (any edit moves updatedAt), but cheap and good enough for v1.
 * TODO Phase 7: derive from Activity rows tagged `task.status_changed` so
 * the curve matches the true close timeline.
 */
function buildBurndown(tasks: TaskShape[], from: Date, to: Date): BurndownPoint[] {
  const out: BurndownPoint[] = [];
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
    const endOfDay = endOfUtcDay(d);
    let count = 0;
    for (const t of tasks) {
      if (t.createdAt > endOfDay) continue;
      const terminal = t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELLED;
      if (terminal && t.updatedAt <= endOfDay) continue;
      count++;
    }
    out.push({ date: toDateKey(d), openCount: count });
  }
  return out;
}

interface UserLite {
  id: string;
  name: string | null;
  avatar: string | null;
}

function buildWorkload(tasks: TaskShape[], userById: Map<string, UserLite>): WorkloadAssigneeRow[] {
  const map = new Map<string, WorkloadAssigneeRow>();
  for (const t of tasks) {
    const key = t.assigneeId ?? '__unassigned__';
    let row = map.get(key);
    if (!row) {
      if (t.assigneeId) {
        const u = userById.get(t.assigneeId);
        row = {
          userId: t.assigneeId,
          name: u?.name ?? null,
          avatar: u?.avatar ?? null,
          counts: { todo: 0, inProgress: 0, review: 0, done: 0 },
        };
      } else {
        row = {
          userId: null,
          name: null,
          avatar: null,
          counts: { todo: 0, inProgress: 0, review: 0, done: 0 },
        };
      }
      map.set(key, row);
    }
    switch (t.status) {
      case TaskStatus.TODO:
        row.counts.todo++;
        break;
      case TaskStatus.IN_PROGRESS:
        row.counts.inProgress++;
        break;
      case TaskStatus.REVIEW:
        row.counts.review++;
        break;
      case TaskStatus.DONE:
        row.counts.done++;
        break;
      // CANCELLED → ignored from workload view
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    const totalA = a.counts.todo + a.counts.inProgress + a.counts.review + a.counts.done;
    const totalB = b.counts.todo + b.counts.inProgress + b.counts.review + b.counts.done;
    return totalB - totalA;
  });
}

function sum(arr: number[]): number {
  let s = 0;
  for (const n of arr) s += n;
  return s;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function maxDate(a: Date, b: Date): Date {
  return a >= b ? a : b;
}

function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
