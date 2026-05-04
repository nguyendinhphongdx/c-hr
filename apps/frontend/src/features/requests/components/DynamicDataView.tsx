import { format } from "date-fns";

import type { FieldsSchema } from "../types";

/**
 * Pretty-print a Request.data payload using its group's fieldsSchema —
 * each field as label/value row. Falls back to JSON.stringify for
 * unknown keys (data has more keys than schema, e.g. legacy).
 */
export function DynamicDataView({
  schema,
  data,
}: {
  schema: FieldsSchema;
  data: Record<string, unknown>;
}) {
  return (
    <dl className="space-y-3">
      {schema.fields.map((f) => {
        const v = data[f.key];
        return (
          <div key={f.key}>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {f.label}
            </dt>
            <dd className="mt-0.5 text-sm">{formatFieldValue(f.type, v, f)}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function formatFieldValue(
  type: string,
  value: unknown,
  field: { options?: { value: string; label: string }[] },
): string {
  if (value === undefined || value === null || value === "") return "—";
  if (type === "enum" && field.options) {
    const opt = field.options.find((o) => o.value === value);
    return opt?.label ?? String(value);
  }
  if (type === "date" && typeof value === "string") {
    try {
      return format(new Date(value), "dd/MM/yyyy");
    } catch {
      return value;
    }
  }
  if (type === "datetime" && typeof value === "string") {
    try {
      return format(new Date(value), "dd/MM/yyyy HH:mm");
    } catch {
      return value;
    }
  }
  return String(value);
}
