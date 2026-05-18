import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole, Tag, TaskPriority, TaskStatus } from '@prisma/client';

import { ActivityService } from '@/apps/collaboration/activity/activity.service';
import { TagService } from '@/apps/collaboration/tag/tag.service';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { ProjectAcl, ProjectAclSubject } from '../project/project.acl';
import { ProjectRepository } from '../project/project.repository';

import { CreateTaskDto, ListTasksDto, ReorderTasksDto, UpdateTaskDto } from './dto';
import { TaskAcl, TaskAclSubject } from './task.acl';
import {
  TASK_DETAIL_INCLUDE_CONST,
  TASK_LIST_INCLUDE_CONST,
  TaskRepository,
} from './task.repository';

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

type TaskListRow = Prisma.TaskGetPayload<{ include: typeof TASK_LIST_INCLUDE_CONST }>;
type TaskDetailRow = Prisma.TaskGetPayload<{ include: typeof TASK_DETAIL_INCLUDE_CONST }>;
type ProjectFull = NonNullable<Awaited<ReturnType<ProjectRepository['findByIdByOrg']>>>;

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctx: RequestContextService,
    private readonly repo: TaskRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly tags: TagService,
    private readonly activities: ActivityService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // Reads
  // ──────────────────────────────────────────────────────────────────

  async list(query: ListTasksDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    const isHrmAdmin = this.ctx.isAppAdmin('HRM', orgId);

    let project: ProjectFull | null = null;
    if (query.projectId) {
      project = await this.projectRepo.findByIdByOrg(orgId, query.projectId);
      if (!project) throw new NotFoundException('Project not found');
      await this.buildProjectAcl(project).require('canView');
    } else {
      // Cross-project list — regular users may only see their own; HRM
      // admin may pass any assigneeId (or omit it).
      if (!isHrmAdmin) {
        if (!query.assigneeId || query.assigneeId !== callerId) {
          throw new ForbiddenException(
            'Cross-project list requires assigneeId=ctx.userId for non-admins',
          );
        }
      }
    }

    const where: Prisma.TaskWhereInput = {};
    if (query.projectId) where.projectId = query.projectId;
    if (query.sectionId) where.sectionId = query.sectionId;
    if (query.status) where.status = query.status;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { code: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.includeDone !== 'true') {
      where.status = where.status ?? { notIn: ['DONE', 'CANCELLED'] };
    }
    // Return root + subtasks so FE can group them. FE renders subtasks
    // nested under their parent when both are in the result set, else
    // standalone (useful for search hits on a subtask title).

    const rows = await this.repo.findManyByOrg(orgId, where);
    const taskIds = rows.map((r) => r.id);
    const tagsByTask = await this.loadTagsForTasks(orgId, taskIds);

    return rows.map((row) => this.shapeListRow(row, tagsByTask.get(row.id) ?? []));
  }

  async findOne(idOrCode: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.fetchByIdOrCode(orgId, idOrCode);
    if (!row) throw new NotFoundException('Task not found');

    const project = await this.projectRepo.findByIdByOrg(orgId, row.projectId);
    if (!project) throw new NotFoundException('Project not found');

    const acl = this.buildTaskAcl(row, project);
    await acl.require('canView');

    const tags = await this.tags.listForObject('Task', row.id);
    return {
      ...this.shapeDetailRow(row, tags),
      view: await acl.getAcl(),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Mutations
  // ──────────────────────────────────────────────────────────────────

  async create(dto: CreateTaskDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();

    const project = await this.projectRepo.findByIdByOrg(orgId, dto.projectId);
    if (!project) throw new NotFoundException('Project not found');

    const pAcl = this.buildProjectAcl(project);
    if (!pAcl.canEdit()) throw new ForbiddenException('Not allowed: canEdit on project');

    if (dto.sectionId) {
      const section = project.sections.find((s) => s.id === dto.sectionId);
      if (!section) {
        throw new BadRequestException('Section does not belong to project');
      }
    }

    if (dto.parentTaskId) {
      const parent = await this.prisma.task.findFirst({
        where: {
          id: dto.parentTaskId,
          organizationId: orgId,
          projectId: project.id,
          deletedAt: null,
        },
        select: { id: true, parentTaskId: true },
      });
      if (!parent) throw new BadRequestException('Parent task not found in project');
      if (parent.parentTaskId) {
        // Subtask depth = 1 (decision #4 in plans/work.md).
        throw new BadRequestException('Cannot nest subtasks deeper than 1 level');
      }
    }

    if (dto.assigneeId) {
      await this.assertAssigneeAllowed(project, dto.assigneeId);
    }

    const tagIds = dto.tagIds ?? [];

    const created = await this.prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id: project.id },
        data: { taskCounter: { increment: 1 } },
        select: { slug: true, taskCounter: true },
      });
      const code = `${updatedProject.slug}-${updatedProject.taskCounter}`;

      const task = await tx.task.create({
        data: {
          organizationId: orgId,
          projectId: project.id,
          sectionId: dto.sectionId ?? null,
          parentTaskId: dto.parentTaskId ?? null,
          code,
          title: dto.title,
          description: dto.description ?? null,
          status: dto.status ?? TaskStatus.TODO,
          priority: dto.priority ?? TaskPriority.MEDIUM,
          assigneeId: dto.assigneeId ?? null,
          reporterId: callerId,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          estimateMinutes: dto.estimateMinutes ?? null,
          order: await nextOrder(tx, project.id, dto.sectionId ?? null),
        },
        select: { id: true },
      });

      // Auto-watch: reporter + assignee (if different).
      const watcherIds = new Set<string>([callerId]);
      if (dto.assigneeId && dto.assigneeId !== callerId) {
        watcherIds.add(dto.assigneeId);
      }
      await tx.taskWatcher.createMany({
        data: Array.from(watcherIds).map((userId) => ({
          taskId: task.id,
          userId,
        })),
        skipDuplicates: true,
      });

      return task;
    });

    // Tags — out of tx; TagService doesn't accept tx client. ACL on the
    // newly-created task allows the caller (reporter) to edit.
    if (tagIds.length > 0) {
      await this.tags.bulkSetForObject({
        objectType: 'Task',
        objectId: created.id,
        tagIds,
      });
    }

    const detail = await this.repo.findByIdByOrg(orgId, created.id);
    if (!detail) throw new NotFoundException('Task disappeared after create');

    this.activities.log({
      organizationId: orgId,
      objectType: 'Task',
      objectId: detail.id,
      objectLabel: detail.title,
      action: 'task.created',
      userId: callerId,
    });

    const tags = await this.tags.listForObject('Task', detail.id);
    const acl = this.buildTaskAcl(detail, project);
    return {
      ...this.shapeDetailRow(detail, tags),
      view: await acl.getAcl(),
    };
  }

  async update(id: string, dto: UpdateTaskDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Task not found');

    const project = await this.projectRepo.findByIdByOrg(orgId, row.projectId);
    if (!project) throw new NotFoundException('Project not found');

    const acl = this.buildTaskAcl(row, project);
    await acl.require('canEdit');

    if (dto.sectionId !== undefined && dto.sectionId !== null) {
      const section = project.sections.find((s) => s.id === dto.sectionId);
      if (!section) {
        throw new BadRequestException('Section does not belong to project');
      }
    }

    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      await this.assertAssigneeAllowed(project, dto.assigneeId);
    }

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.sectionId !== undefined) data.sectionId = dto.sectionId;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.startDate !== undefined) {
      data.startDate = dto.startDate ? new Date(dto.startDate) : null;
    }
    if (dto.dueDate !== undefined) {
      data.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }
    if (dto.estimateMinutes !== undefined) {
      data.estimateMinutes = dto.estimateMinutes;
    }
    if (dto.actualMinutes !== undefined) {
      data.actualMinutes = dto.actualMinutes;
    }

    // Bidirectional sync between status and the 3 default sections so the
    // Board column (= section) and the status badge stay aligned without
    // the user having to update both. Custom sections (no name match)
    // break the link — accepted trade-off.
    const STATUS_TO_SECTION: Partial<Record<TaskStatus, string>> = {
      [TaskStatus.TODO]: 'Cần làm',
      [TaskStatus.IN_PROGRESS]: 'Đang làm',
      [TaskStatus.DONE]: 'Hoàn thành',
    };
    const SECTION_TO_STATUS: Record<string, TaskStatus> = {
      'Cần làm': TaskStatus.TODO,
      'Đang làm': TaskStatus.IN_PROGRESS,
      'Hoàn thành': TaskStatus.DONE,
    };
    // Status changed (or set) → auto-move card to matching default section.
    if (dto.status !== undefined && dto.sectionId === undefined) {
      const wantName = STATUS_TO_SECTION[dto.status];
      if (wantName) {
        const section = project.sections.find((s) => s.name === wantName);
        if (section && section.id !== row.sectionId) {
          data.sectionId = section.id;
        }
      }
    }
    // Section changed (drag-drop in Board) → auto-set status if section
    // name maps to a known status.
    if (
      dto.sectionId !== undefined &&
      dto.sectionId !== null &&
      dto.status === undefined
    ) {
      const section = project.sections.find((s) => s.id === dto.sectionId);
      const wantStatus = section ? SECTION_TO_STATUS[section.name] : null;
      if (wantStatus && wantStatus !== row.status) {
        data.status = wantStatus;
      }
    }

    await this.prisma.task.update({ where: { id }, data });

    // Auto-watch newly assigned user.
    if (dto.assigneeId !== undefined && dto.assigneeId && dto.assigneeId !== row.assigneeId) {
      await this.prisma.taskWatcher
        .create({ data: { taskId: id, userId: dto.assigneeId } })
        .catch((err) => {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return null;
          }
          throw err;
        });
    }

    if (dto.tagIds !== undefined) {
      await this.tags.bulkSetForObject({
        objectType: 'Task',
        objectId: id,
        tagIds: dto.tagIds,
      });
    }

    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new NotFoundException('Task disappeared after update');

    // Emit one activity per meaningful change. Read from `data` (not `dto`)
    // so sync-driven status changes (drag column → status follows) log too.
    if (data.status !== undefined && data.status !== row.status) {
      this.activities.log({
        organizationId: orgId,
        objectType: 'Task',
        objectId: id,
        objectLabel: updated.title,
        action: 'task.status_changed',
        userId: callerId,
        metadata: { from: row.status, to: data.status },
      });
    }
    if (dto.assigneeId !== undefined && dto.assigneeId !== row.assigneeId) {
      this.activities.log({
        organizationId: orgId,
        objectType: 'Task',
        objectId: id,
        objectLabel: updated.title,
        action: 'task.assigned',
        userId: callerId,
        metadata: { from: row.assigneeId, to: dto.assigneeId },
      });
    }
    if (dto.priority !== undefined && dto.priority !== row.priority) {
      this.activities.log({
        organizationId: orgId,
        objectType: 'Task',
        objectId: id,
        objectLabel: updated.title,
        action: 'task.priority_changed',
        userId: callerId,
        metadata: { from: row.priority, to: dto.priority },
      });
    }
    if (
      dto.dueDate !== undefined &&
      (dto.dueDate ?? null) !== (row.dueDate?.toISOString().slice(0, 10) ?? null)
    ) {
      this.activities.log({
        organizationId: orgId,
        objectType: 'Task',
        objectId: id,
        objectLabel: updated.title,
        action: 'task.due_date_changed',
        userId: callerId,
        metadata: { to: dto.dueDate },
      });
    }

    const tags = await this.tags.listForObject('Task', id);
    const aclNext = this.buildTaskAcl(updated, project);
    return {
      ...this.shapeDetailRow(updated, tags),
      view: await aclNext.getAcl(),
    };
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();

    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Task not found');

    const project = await this.projectRepo.findByIdByOrg(orgId, row.projectId);
    if (!project) throw new NotFoundException('Project not found');

    await this.buildTaskAcl(row, project).require('canDelete');

    await this.repo.softDelete(id);

    this.activities.log({
      organizationId: orgId,
      objectType: 'Task',
      objectId: id,
      objectLabel: row.title,
      action: 'task.deleted',
      userId: callerId,
    });

    return { id, success: true as const };
  }

  async reorder(projectId: string, sectionId: string, dto: ReorderTasksDto) {
    const orgId = this.ctx.requireOrg();
    const project = await this.projectRepo.findByIdByOrg(orgId, projectId);
    if (!project) throw new NotFoundException('Project not found');

    const pAcl = this.buildProjectAcl(project);
    if (!pAcl.canEdit()) throw new ForbiddenException('Not allowed: canEdit on project');

    const section = project.sections.find((s) => s.id === sectionId);
    if (!section) throw new BadRequestException('Section does not belong to project');

    if (new Set(dto.ids).size !== dto.ids.length) {
      throw new BadRequestException('ids must not contain duplicates');
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        id: { in: dto.ids },
        organizationId: orgId,
        projectId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (tasks.length !== dto.ids.length) {
      throw new BadRequestException('Some ids do not belong to this project');
    }

    await this.prisma.$transaction(
      dto.ids.map((id, idx) =>
        this.prisma.task.update({
          where: { id },
          data: { sectionId, order: (idx + 1) * 1000 },
        }),
      ),
    );

    return { success: true as const };
  }

  async watch(taskId: string) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    const row = await this.repo.findByIdByOrg(orgId, taskId);
    if (!row) throw new NotFoundException('Task not found');

    const project = await this.projectRepo.findByIdByOrg(orgId, row.projectId);
    if (!project) throw new NotFoundException('Project not found');

    await this.buildTaskAcl(row, project).require('canView');

    try {
      await this.prisma.taskWatcher.create({ data: { taskId, userId } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        // Already watching — idempotent.
        return { success: true as const };
      }
      throw err;
    }
    return { success: true as const };
  }

  async unwatch(taskId: string) {
    const orgId = this.ctx.requireOrg();
    const userId = this.ctx.requireUserId();

    const row = await this.repo.findByIdByOrg(orgId, taskId);
    if (!row) throw new NotFoundException('Task not found');

    await this.prisma.taskWatcher.deleteMany({ where: { taskId, userId } });
    return { success: true as const };
  }

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  private fetchByIdOrCode(orgId: string, idOrCode: string) {
    if (UUID_RE.test(idOrCode)) {
      return this.repo.findByIdByOrg(orgId, idOrCode);
    }
    return this.repo.findByCodeByOrg(orgId, idOrCode.toUpperCase());
  }

  private buildProjectAcl(project: ProjectFull): ProjectAcl {
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

  private buildTaskAcl(
    row: Pick<
      TaskDetailRow,
      'id' | 'organizationId' | 'projectId' | 'assigneeId' | 'reporterId' | 'deletedAt'
    > & { watchers?: { userId: string }[] },
    project: ProjectFull,
  ): TaskAcl {
    const memberRoles = new Map<string, ProjectRole>();
    for (const m of project.members) memberRoles.set(m.userId, m.role);
    const subject: TaskAclSubject = {
      id: row.id,
      organizationId: row.organizationId,
      projectId: row.projectId,
      assigneeId: row.assigneeId,
      reporterId: row.reporterId,
      deletedAt: row.deletedAt,
      _project: {
        ownerId: project.ownerId,
        visibility: project.visibility,
        _memberRoles: memberRoles,
      },
      _watcherUserIds: row.watchers?.map((w) => w.userId) ?? [],
    };
    return new TaskAcl(subject);
  }

  private async assertAssigneeAllowed(project: ProjectFull, assigneeId: string) {
    // Must belong to same org. Also encourage assignee to be a project
    // member — but we don't hard-block on the membership check yet (HR
    // workflows may assign a non-member task to surface "hey, please
    // join this project" prompts). Same-org is the firm bar.
    const user = await this.prisma.user.findFirst({
      where: { id: assigneeId, organizationId: project.organizationId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Assignee not in organization');
  }

  private async loadTagsForTasks(orgId: string, taskIds: string[]): Promise<Map<string, Tag[]>> {
    if (taskIds.length === 0) return new Map();
    const rows = await this.prisma.tagAssignment.findMany({
      where: {
        organizationId: orgId,
        objectType: 'Task',
        objectId: { in: taskIds },
      },
      include: { tag: true },
    });
    const map = new Map<string, Tag[]>();
    for (const r of rows) {
      if (r.tag.deletedAt) continue;
      const list = map.get(r.objectId) ?? [];
      list.push(r.tag);
      map.set(r.objectId, list);
    }
    return map;
  }

  private shapeListRow(row: TaskListRow, tags: Tag[]) {
    return { ...row, tags };
  }

  private shapeDetailRow(row: TaskDetailRow, tags: Tag[]) {
    return { ...row, tags };
  }
}

async function nextOrder(
  tx: Prisma.TransactionClient,
  projectId: string,
  sectionId: string | null,
): Promise<number> {
  const last = await tx.task.findFirst({
    where: { projectId, sectionId, deletedAt: null },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return (last?.order ?? 0) + 1000;
}
