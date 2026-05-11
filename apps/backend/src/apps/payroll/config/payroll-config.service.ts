import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { RequestContextService } from '@/common/context';

import { UpdateConfigDto } from './dto';
import { PayrollConfigRepository } from './payroll-config.repository';

/**
 * Default seed values for any Org missing a PayrollConfig. Based on VN
 * 2024 regulations — see docs/plans/features.md F9. HR can override per
 * year via PATCH /payroll/config.
 */
const VN_2024_DEFAULTS = {
  personalDeduction: 11_000_000,
  dependentDeduction: 4_400_000,
  regionMinWageJson: {
    REGION_I: 4_960_000,
    REGION_II: 4_410_000,
    REGION_III: 3_860_000,
    REGION_IV: 3_450_000,
  } as const,
  insuranceCapMultiplier: 20,
  bhxhRate: 8,
  bhytRate: 1.5,
  bhtnRate: 1,
  otRatesJson: {
    weekday: 1.5,
    weekend: 2.0,
    holiday: 3.0,
    night: 1.3,
  } as const,
  taxBracketsJson: [
    { upto: 5_000_000, rate: 0.05 },
    { upto: 10_000_000, rate: 0.1 },
    { upto: 18_000_000, rate: 0.15 },
    { upto: 32_000_000, rate: 0.2 },
    { upto: 52_000_000, rate: 0.25 },
    { upto: 80_000_000, rate: 0.3 },
    { upto: null, rate: 0.35 },
  ] as const,
};

@Injectable()
export class PayrollConfigService {
  constructor(
    private readonly ctx: RequestContextService,
    private readonly repo: PayrollConfigRepository,
  ) {}

  /**
   * Read config for `(org, year)`. Auto-creates with VN 2024 defaults
   * when missing — caller never has to bootstrap manually.
   */
  async get(year: number) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    const existing = await this.repo.findByOrgYear(orgId, year);
    if (existing) return existing;

    return this.repo.create({
      organizationId: orgId,
      year,
      personalDeduction: new Prisma.Decimal(VN_2024_DEFAULTS.personalDeduction),
      dependentDeduction: new Prisma.Decimal(VN_2024_DEFAULTS.dependentDeduction),
      regionMinWageJson: VN_2024_DEFAULTS.regionMinWageJson as unknown as Prisma.InputJsonValue,
      insuranceCapMultiplier: new Prisma.Decimal(VN_2024_DEFAULTS.insuranceCapMultiplier),
      bhxhRate: new Prisma.Decimal(VN_2024_DEFAULTS.bhxhRate),
      bhytRate: new Prisma.Decimal(VN_2024_DEFAULTS.bhytRate),
      bhtnRate: new Prisma.Decimal(VN_2024_DEFAULTS.bhtnRate),
      otRatesJson: VN_2024_DEFAULTS.otRatesJson as unknown as Prisma.InputJsonValue,
      taxBracketsJson: VN_2024_DEFAULTS.taxBracketsJson as unknown as Prisma.InputJsonValue,
    });
  }

  getCurrent() {
    return this.get(new Date().getFullYear());
  }

  async listAll() {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);
    return this.repo.findAllByOrg(orgId);
  }

  async update(year: number, dto: UpdateConfigDto) {
    const orgId = this.ctx.requireOrg();
    this.ctx.requireAppAdmin('HRM', orgId);

    // Ensure target row exists so PATCH semantics work even on a year
    // never visited before — `get()` handles auto-seed.
    const existing = await this.get(year);

    const data: Prisma.PayrollConfigUncheckedUpdateInput = {};
    if (dto.personalDeduction !== undefined) {
      data.personalDeduction = new Prisma.Decimal(dto.personalDeduction);
    }
    if (dto.dependentDeduction !== undefined) {
      data.dependentDeduction = new Prisma.Decimal(dto.dependentDeduction);
    }
    if (dto.regionMinWageJson !== undefined) {
      this.assertRegionMinWage(dto.regionMinWageJson);
      data.regionMinWageJson = dto.regionMinWageJson as unknown as Prisma.InputJsonValue;
    }
    if (dto.insuranceCapMultiplier !== undefined) {
      data.insuranceCapMultiplier = new Prisma.Decimal(dto.insuranceCapMultiplier);
    }
    if (dto.bhxhRate !== undefined) {
      this.assertPercent('bhxhRate', dto.bhxhRate);
      data.bhxhRate = new Prisma.Decimal(dto.bhxhRate);
    }
    if (dto.bhytRate !== undefined) {
      this.assertPercent('bhytRate', dto.bhytRate);
      data.bhytRate = new Prisma.Decimal(dto.bhytRate);
    }
    if (dto.bhtnRate !== undefined) {
      this.assertPercent('bhtnRate', dto.bhtnRate);
      data.bhtnRate = new Prisma.Decimal(dto.bhtnRate);
    }
    if (dto.otRatesJson !== undefined) {
      this.assertOtRates(dto.otRatesJson);
      data.otRatesJson = dto.otRatesJson as unknown as Prisma.InputJsonValue;
    }
    if (dto.taxBracketsJson !== undefined) {
      this.assertTaxBrackets(dto.taxBracketsJson);
      data.taxBracketsJson = dto.taxBracketsJson as unknown as Prisma.InputJsonValue;
    }

    return this.repo.update(existing.id, data);
  }

  // ──────────────────────────────────────────────────────────────────
  // Validation helpers (semantic checks beyond class-validator types).
  // ──────────────────────────────────────────────────────────────────

  private assertPercent(field: string, value: number) {
    if (value < 0 || value > 100) {
      throw new BadRequestException(`${field} must be between 0 and 100`);
    }
  }

  private assertRegionMinWage(
    json: { REGION_I: number; REGION_II: number; REGION_III: number; REGION_IV: number },
  ) {
    const regions = ['REGION_I', 'REGION_II', 'REGION_III', 'REGION_IV'] as const;
    for (const r of regions) {
      if (typeof json[r] !== 'number' || json[r] <= 0) {
        throw new BadRequestException(`regionMinWageJson.${r} must be a positive number`);
      }
    }
  }

  private assertOtRates(json: {
    weekday: number;
    weekend: number;
    holiday: number;
    night: number;
  }) {
    for (const key of ['weekday', 'weekend', 'holiday', 'night'] as const) {
      if (typeof json[key] !== 'number' || json[key] < 1) {
        throw new BadRequestException(`otRatesJson.${key} must be >= 1`);
      }
    }
  }

  private assertTaxBrackets(brackets: { upto?: number | null; rate: number }[]) {
    if (brackets.length === 0) {
      throw new BadRequestException('taxBracketsJson must have at least one bracket');
    }
    let prev = 0;
    let sawOpen = false;
    for (const [i, b] of brackets.entries()) {
      if (b.rate < 0 || b.rate > 1) {
        throw new BadRequestException(`taxBrackets[${i}].rate must be between 0 and 1`);
      }
      if (sawOpen) {
        throw new BadRequestException(
          `taxBrackets[${i}] follows an open-ended bracket — only the last entry may have upto=null`,
        );
      }
      if (b.upto == null) {
        sawOpen = true;
        continue;
      }
      if (b.upto <= prev) {
        throw new BadRequestException(
          `taxBrackets[${i}].upto (${b.upto}) must be greater than previous (${prev})`,
        );
      }
      prev = b.upto;
    }
  }
}
