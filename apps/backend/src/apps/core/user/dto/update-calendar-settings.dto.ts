import { EventVisibility } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** Calendar-specific subset of the self-update payload. */
export class UpdateCalendarSettingsDto {
  @IsEnum(EventVisibility)
  calendarDefaultVisibility!: EventVisibility;
}
