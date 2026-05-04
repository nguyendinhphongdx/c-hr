import { Injectable, NotFoundException } from '@nestjs/common';

import { RequestGroupRepository } from './request-group.repository';

@Injectable()
export class RequestGroupService {
  constructor(private readonly repo: RequestGroupRepository) {}

  list() {
    return this.repo.findManyActive();
  }

  async findById(id: string) {
    const g = await this.repo.findById(id);
    if (!g) throw new NotFoundException('Request group not found');
    return g;
  }

  async findByCode(code: string) {
    const g = await this.repo.findByCode(code);
    if (!g) throw new NotFoundException(`Request group "${code}" not found`);
    return g;
  }
}
