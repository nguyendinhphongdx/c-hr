import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsUUID,
} from 'class-validator';

const csvToArray = ({ value }: { value: unknown }): string[] | undefined => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value !== 'string' || !value) return undefined;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Range query — both bounds inclusive on the day, but stored as ISO
 * datetimes so service can clamp inside `[from, to)` for the SQL match.
 */
export class ListEventsDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  /**
   * "mine"      → events I own or am invited to (default for non-admin)
   * "invited"   → events I'm an attendee of (excluding owned)
   * "all"       → org-wide (HRM appadmin only)
   */
  @IsOptional()
  @IsIn(['mine', 'invited', 'all'])
  scope?: 'mine' | 'invited' | 'all';

  /** Filter by specific User ids (e.g. to render a colleague's calendar). */
  @IsOptional()
  @Transform(csvToArray)
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

  /** Filter by resource id — used by the "Phòng họp" tab to render a
   *  single room's calendar. Mutually exclusive with userIds in the
   *  service (resource scope wins). */
  @IsOptional()
  @IsUUID('4')
  resourceId?: string;
}
