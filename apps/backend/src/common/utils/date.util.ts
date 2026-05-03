/**
 * Parse "YYYY-MM-DD" or full ISO into Date. Date-only -> start of day UTC.
 */
export function parseDate(dateStr: string): Date {
  if (!dateStr) throw new Error('Date string is required');
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Date-only -> end of day UTC.
 */
export function parseDateEndOfDay(dateStr: string): Date {
  if (!dateStr) throw new Error('Date string is required');
  if (dateStr.includes('T')) return new Date(dateStr);
  return new Date(`${dateStr}T23:59:59.999Z`);
}

export function isValidDateString(dateStr: string): boolean {
  if (!dateStr) return false;
  return !isNaN(new Date(dateStr).getTime());
}
