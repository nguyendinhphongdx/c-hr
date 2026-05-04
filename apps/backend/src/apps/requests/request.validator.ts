/**
 * Tiny validator for `Request.data` against a `RequestGroup.fieldsSchema`.
 * Returns null if valid, else the first error message (i18n later).
 *
 * Self-built per ADR 0006 — Ajv overkill for the field types we need.
 */
import { FieldDefinition, FieldsSchema } from './fields-schema.types';

export function validateRequestData(
  schema: FieldsSchema,
  data: Record<string, unknown>,
): string | null {
  for (const f of schema.fields) {
    const v = data[f.key];

    const empty = v === undefined || v === null || v === '';
    if (empty) {
      if (f.required) return `Trường "${f.label}" là bắt buộc`;
      continue;
    }

    const err = validateValue(f, v);
    if (err) return err;
  }
  return null;
}

function validateValue(f: FieldDefinition, v: unknown): string | null {
  switch (f.type) {
    case 'text':
    case 'textarea': {
      if (typeof v !== 'string') return `"${f.label}" phải là chuỗi`;
      if (f.maxLength && v.length > f.maxLength) {
        return `"${f.label}" không quá ${f.maxLength} ký tự`;
      }
      return null;
    }
    case 'number': {
      if (typeof v !== 'number' || Number.isNaN(v)) {
        return `"${f.label}" phải là số`;
      }
      if (f.min !== undefined && v < f.min) {
        return `"${f.label}" phải >= ${f.min}`;
      }
      if (f.max !== undefined && v > f.max) {
        return `"${f.label}" phải <= ${f.max}`;
      }
      return null;
    }
    case 'date': {
      if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return `"${f.label}" phải có format YYYY-MM-DD`;
      }
      if (Number.isNaN(Date.parse(v))) return `"${f.label}" không hợp lệ`;
      return null;
    }
    case 'time': {
      if (typeof v !== 'string' || !/^\d{2}:\d{2}(:\d{2})?$/.test(v)) {
        return `"${f.label}" phải có format HH:MM`;
      }
      return null;
    }
    case 'datetime': {
      if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) {
        return `"${f.label}" phải là ISO datetime`;
      }
      return null;
    }
    case 'enum': {
      if (typeof v !== 'string') return `"${f.label}" không hợp lệ`;
      if (f.options && !f.options.some((o) => o.value === v)) {
        return `"${f.label}" phải là một trong: ${f.options.map((o) => o.value).join(', ')}`;
      }
      return null;
    }
  }
  return null;
}
