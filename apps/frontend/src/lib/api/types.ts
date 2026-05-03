// Envelope/response types for the API layer.
// Domain types (User, Post, …) live in src/features/<name>/types — this file
// only describes the SHAPE the backend speaks, not the shape of business data.

import type { Pagination } from "@/lib/types";

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiList<T> {
  data: T[];
  pagination: Pagination;
}

export type ApiResponse<T> = ApiSuccess<T> | { error: ApiError };

export function isApiError<T>(res: ApiResponse<T>): res is { error: ApiError } {
  return "error" in res;
}
