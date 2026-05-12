import type { ID, ISODate, Nullable } from "@/lib/types";

export interface Holiday {
  id: ID;
  organizationId: ID;
  /** ISO date (YYYY-MM-DD or full ISO string depending on serializer). */
  date: ISODate;
  name: string;
  isPaid: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  deletedAt: Nullable<ISODate>;
}

export interface ListHolidaysQuery {
  year?: number;
  /** YYYY-MM-DD inclusive. When set, overrides `year`. */
  from?: string;
  to?: string;
}

export interface CreateHolidayInput {
  /** YYYY-MM-DD. */
  date: string;
  name: string;
  isPaid?: boolean;
}

export interface UpdateHolidayInput {
  date?: string;
  name?: string;
  isPaid?: boolean;
}
