import { Injectable, NotImplementedException } from '@nestjs/common';
import { JobBoard } from '@prisma/client';

import { JobBoardAdapter } from './adapter.interface';
import { TalentVnAdapter } from './talent-vn/talent-vn.adapter';
import { TopCvAdapter } from './topcv/topcv.adapter';

/**
 * Central registry — `service.get(board)` returns the right adapter
 * or throws if a board is configured at the DB level but its adapter
 * isn't implemented yet (ITviec — pending public API).
 */
@Injectable()
export class AdapterRegistry {
  private readonly map: Partial<Record<JobBoard, JobBoardAdapter>>;

  constructor(
    private readonly talentVn: TalentVnAdapter,
    private readonly topCv: TopCvAdapter,
  ) {
    this.map = {
      TALENT_VN: this.talentVn,
      TOPCV: this.topCv,
    };
  }

  get(board: JobBoard): JobBoardAdapter {
    const adapter = this.map[board];
    if (!adapter) {
      throw new NotImplementedException(
        `Job board adapter for "${board}" is not implemented yet`,
      );
    }
    return adapter;
  }

  /** Returns boards that currently have a working adapter. */
  available(): JobBoard[] {
    return Object.keys(this.map) as JobBoard[];
  }
}
