import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { isAppAdmin } from '@/common/auth/access';
import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';
import { RequestUser } from '@/common/types';
import { PrismaService } from '@libs/database/prisma.service';

import { ChangePasswordDto, ListUsersDto, UpdateUserDto } from './dto';
import { UserService } from './user.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Tenant-scoped user list for the Employee form's user picker.
   * HRM appadmin only — exposes Org members' emails.
   */
  @Get()
  async list(@CurrentUser() user: RequestUser, @Query() query: ListUsersDto) {
    if (!user.organizationId) {
      throw new ForbiddenException('Current user is not attached to an organization');
    }
    const ok = await isAppAdmin(user, 'HRM', user.organizationId, this.prisma);
    if (!ok) throw new ForbiddenException('Need HRM appadmin or admin role');
    return this.userService.listForOrg(user.organizationId, query);
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.userService.findMeWithRelations(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateUserDto) {
    return this.userService.update(user.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('me/password')
  changeMyPassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.userService.changePassword(user.id, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }
}
