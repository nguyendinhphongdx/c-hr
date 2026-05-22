import { ApiProperty } from '@nestjs/swagger';
import { JobBoard } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class PushJobDto {
  @ApiProperty({ enum: JobBoard })
  @IsEnum(JobBoard)
  board!: JobBoard;
}
