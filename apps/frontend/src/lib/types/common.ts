// Shared primitive types used across the whole app.
// Feature-local types live in src/features/<name>/types — keep this file lean.

export type ID = string;

export type ISODate = string;

export type Nullable<T> = T | null;

export type Maybe<T> = T | null | undefined;

export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
}

export type Theme = "light" | "dark" | "system";
