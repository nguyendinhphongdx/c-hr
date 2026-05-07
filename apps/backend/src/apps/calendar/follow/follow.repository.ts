import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@libs/database/prisma.service';

const FOLLOWED_INCLUDE = {
  followed: {
    select: {
      id: true,
      code: true,
      title: true,
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  },
} as const;

const FOLLOWER_INCLUDE = {
  follower: {
    select: {
      id: true,
      code: true,
      title: true,
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  },
} as const;

@Injectable()
export class FollowRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Rows where I'm the follower — "who I'm watching". */
  findFollowingByFollower(followerId: string) {
    return this.prisma.calendarFollow.findMany({
      where: { followerId },
      orderBy: { createdAt: 'desc' },
      include: FOLLOWED_INCLUDE,
    });
  }

  /** Rows where I'm followed — "who can see my calendar". */
  findFollowersOfFollowed(followedId: string) {
    return this.prisma.calendarFollow.findMany({
      where: { followedId },
      orderBy: { createdAt: 'desc' },
      include: FOLLOWER_INCLUDE,
    });
  }

  findById(id: string) {
    return this.prisma.calendarFollow.findUnique({ where: { id } });
  }

  findByPair(followerId: string, followedId: string) {
    return this.prisma.calendarFollow.findUnique({
      where: { followerId_followedId: { followerId, followedId } },
      include: FOLLOWED_INCLUDE,
    });
  }

  create(data: Prisma.CalendarFollowUncheckedCreateInput) {
    return this.prisma.calendarFollow.create({
      data,
      include: FOLLOWED_INCLUDE,
    });
  }

  delete(id: string) {
    return this.prisma.calendarFollow.delete({ where: { id } });
  }
}
