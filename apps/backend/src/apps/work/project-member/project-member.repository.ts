import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const MEMBER_INCLUDE = {
  user: { select: { id: true, name: true, email: true, avatar: true } },
} as const satisfies Prisma.ProjectMemberInclude;

@Injectable()
export class ProjectMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  findManyByProject(projectId: string) {
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: MEMBER_INCLUDE,
      orderBy: { joinedAt: 'asc' },
    });
  }

  findOne(projectId: string, userId: string) {
    return this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: MEMBER_INCLUDE,
    });
  }

  create(data: Prisma.ProjectMemberUncheckedCreateInput) {
    return this.prisma.projectMember.create({
      data,
      include: MEMBER_INCLUDE,
    });
  }

  updateRole(
    projectId: string,
    userId: string,
    role: Prisma.ProjectMemberUncheckedUpdateInput['role'],
  ) {
    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { role },
      include: MEMBER_INCLUDE,
    });
  }

  remove(projectId: string, userId: string) {
    return this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  countOwners(projectId: string) {
    return this.prisma.projectMember.count({
      where: { projectId, role: 'OWNER' },
    });
  }
}

export const PROJECT_MEMBER_INCLUDE = MEMBER_INCLUDE;
