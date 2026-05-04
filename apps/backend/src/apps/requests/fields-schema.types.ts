/**
 * Shape of `RequestGroup.fieldsSchema` (Prisma JSON column).
 *
 * Kept simple on purpose — covers the field types HRM needs (text,
 * date, time, enum) without pulling in Ajv. Validation logic lives in
 * `request.validator.ts`.
 *
 * See docs/decisions/0006-universal-request-engine.md.
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'enum';

export interface EnumOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  helperText?: string;
  /// type=enum
  options?: EnumOption[];
  /// type=number
  min?: number;
  max?: number;
  /// type=text/textarea
  maxLength?: number;
}

export interface FieldsSchema {
  fields: FieldDefinition[];
}

export function isFieldsSchema(value: unknown): value is FieldsSchema {
  if (!value || typeof value !== 'object') return false;
  const fields = (value as { fields?: unknown }).fields;
  return Array.isArray(fields);
}
