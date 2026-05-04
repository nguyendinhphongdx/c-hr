import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators';
import { JwtAuthGuard } from '@/common/guards';
import { ParseUUIDPipe } from '@/common/pipes';
import { RequestUser } from '@/common/types';

import { ChangePasswordDto, UpdateUserDto } from './dto';
import { UserService } from './user.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

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
