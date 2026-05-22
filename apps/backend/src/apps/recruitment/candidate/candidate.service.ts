import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { requireAppAdmin } from '@/common/auth/access';
import { RequestContextService } from '@/common/context';
import { PrismaService } from '@libs/database/prisma.service';

import { CandidateAcl } from './candidate.acl';
import { CandidateRepository } from './candidate.repository';
import {
  CreateCandidateDto,
  ListCandidatesDto,
  UpdateCandidateDto,
} from './dto';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class CandidateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: CandidateRepository,
    private readonly ctx: RequestContextService,
  ) {}

  async list(query: ListCandidatesDto) {
    const orgId = this.ctx.requireOrg();
    await requireAppAdmin(this.ctx, 'RECRUITMENT', orgId, this.prisma);

    const where: Prisma.CandidateWhereInput = {};
    if (query.source) where.source = query.source;
    if (query.q) {
      where.OR = [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    return this.repo.findManyByOrg(orgId, where);
  }

  async findOne(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Candidate not found');
    const acl = new CandidateAcl(row);
    await acl.require('canView');
    return { ...row, view: await acl.getAcl() };
  }

  async create(dto: CreateCandidateDto) {
    const orgId = this.ctx.requireOrg();
    const callerId = this.ctx.requireUserId();
    await requireAppAdmin(this.ctx, 'RECRUITMENT', orgId, this.prisma);

    const email = normalizeEmail(dto.email);
    const existing = await this.repo.findByEmailByOrg(orgId, email);
    if (existing) {
      throw new ConflictException(
        `Candidate already exists with email ${email}`,
      );
    }

    const created = await this.prisma.candidate.create({
      data: {
        organizationId: orgId,
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone ?? null,
        headline: dto.headline ?? null,
        location: dto.location ?? null,
        linkedinUrl: dto.linkedinUrl ?? null,
        source: dto.source ?? 'MANUAL',
        createdById: callerId,
      },
    });
    const full = await this.repo.findByIdByOrg(orgId, created.id);
    if (!full) throw new NotFoundException('Candidate vanished after create');
    return full;
  }

  async update(id: string, dto: UpdateCandidateDto) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Candidate not found');
    await new CandidateAcl(row).require('canEdit');

    const data: Prisma.CandidateUncheckedUpdateInput = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.headline !== undefined) data.headline = dto.headline;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.linkedinUrl !== undefined) data.linkedinUrl = dto.linkedinUrl;
    if (dto.source !== undefined) data.source = dto.source;

    await this.repo.update(id, data);
    const updated = await this.repo.findByIdByOrg(orgId, id);
    if (!updated) throw new BadRequestException('Candidate vanished');
    return { ...updated, view: await new CandidateAcl(updated).getAcl() };
  }

  async softDelete(id: string) {
    const orgId = this.ctx.requireOrg();
    const row = await this.repo.findByIdByOrg(orgId, id);
    if (!row) throw new NotFoundException('Candidate not found');
    await new CandidateAcl(row).require('canDelete');
    await this.repo.softDelete(id);
    return { id, success: true as const };
  }

  /**
   * Internal helper used by ApplicationService (apply flow) + webhook
   * handlers (inbound from job boards). Idempotent by email — returns
   * existing candidate if email already on file.
   */
  async findOrCreateByEmail(
    organizationId: string,
    createdById: string,
    input: CreateCandidateDto,
  ) {
    const email = normalizeEmail(input.email);
    const existing = await this.repo.findByEmailByOrg(organizationId, email);
    if (existing) return existing;

    const created = await this.prisma.candidate.create({
      data: {
        organizationId,
        fullName: input.fullName.trim(),
        email,
        phone: input.phone ?? null,
        headline: input.headline ?? null,
        location: input.location ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        source: input.source ?? 'MANUAL',
        createdById,
      },
    });
    const full = await this.repo.findByIdByOrg(organizationId, created.id);
    if (!full) {
      throw new NotFoundException('Candidate vanished after upsert');
    }
    return full;
  }
}
