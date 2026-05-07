import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsUUID } from 'class-validator';

const csvToArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value !== 'string' || !value) return undefined;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Free/busy lookup for the scheduling assistant — given a list of users
 * (by `User.id`, since Event.ownerId / EventAttendee.userId reference
 * User, not Employee) and a slot, return BUSY/FREE per user with the
 * conflicting events. Range capped at 7 days to prevent abuse.
 */
export class FreeBusyQueryDto {
  @Transform(csvToArray)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  userIds!: string[];

  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
