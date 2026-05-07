import { BadRequestException, Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PreferenceScope } from '@prisma/client';
import { IsString } from 'class-validator';

import { RequestContextService } from '@/common/context';
import { JwtAuthGuard } from '@/common/guards';

import { PREF_REGISTRY } from './preference.registry';
import { PreferenceService } from './preference.service';

class SetPreferenceDto {
  @IsString()
  key!: string;

  /** Validated by registry zod schema in the service. */
  value!: unknown;
}

@ApiTags('preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('preferences')
export class PreferenceController {
  constructor(
    private readonly service: PreferenceService,
    private readonly ctx: RequestContextService,
  ) {}

  /** Bulk read of the actor's USER-scope preferences. */
  @Get()
  async list() {
    const userId = this.ctx.requireUserId();
    return this.service.getAll(PreferenceScope.USER, userId);
  }

  /**
   * Self-USER-scope only — refuse keys that the registry says belong to
   * a different scope (those need an admin-flow endpoint, deferred).
   */
  @Patch()
  async set(@Body() dto: SetPreferenceDto) {
    const userId = this.ctx.requireUserId();
    const def = PREF_REGISTRY[dto.key as keyof typeof PREF_REGISTRY];
    if (!def) {
      throw new BadRequestException(`Unknown preference key "${dto.key}"`);
    }
    if (def.scope !== PreferenceScope.USER) {
      throw new BadRequestException(`Preference "${dto.key}" is not user-scoped`);
    }
    await this.service.set(PreferenceScope.USER, userId, dto.key, dto.value);
    return { ok: true };
  }
}
