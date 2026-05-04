"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { FieldDefinition, FieldsSchema } from "../types";

interface DynamicFormProps {
  schema: FieldsSchema;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  disabled?: boolean;
}

/**
 * Renders a form from `RequestGroup.fieldsSchema` (per ADR 0006). One
 * `<DynamicField>` per `FieldDefinition`. Validation lives on BE; FE
 * does only the basic HTML required + maxLength.
 */
export function DynamicForm({
  schema,
  value,
  onChange,
  disabled,
}: DynamicFormProps) {
  const setField = (key: string, v: unknown) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="space-y-4">
      {schema.fields.map((field) => (
        <DynamicField
          key={field.key}
          field={field}
          value={value[field.key]}
          onChange={(v) => setField(field.key, v)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldDefinition;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled?: boolean;
}) {
  const id = `field-${field.key}`;
  const stringValue = value === undefined || value === null ? "" : String(value);

  const renderInput = () => {
    switch (field.type) {
      case "textarea":
        return (
          <Textarea
            id={id}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            maxLength={field.maxLength}
            required={field.required}
            disabled={disabled}
            rows={3}
          />
        );
      case "enum":
        return (
          <Select
            value={stringValue || undefined}
            onValueChange={(v) => onChange(v)}
            disabled={disabled}
          >
            <SelectTrigger id={id}>
              <SelectValue placeholder="Chọn..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "number":
        return (
          <Input
            id={id}
            type="number"
            value={stringValue}
            min={field.min}
            max={field.max}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
            required={field.required}
            disabled={disabled}
          />
        );
      case "date":
        return (
          <Input
            id={id}
            type="date"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            disabled={disabled}
          />
        );
      case "time":
        return (
          <Input
            id={id}
            type="time"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            disabled={disabled}
          />
        );
      case "datetime":
        return (
          <Input
            id={id}
            type="datetime-local"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            disabled={disabled}
          />
        );
      case "text":
      default:
        return (
          <Input
            id={id}
            type="text"
            value={stringValue}
            maxLength={field.maxLength}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required && <span className="ml-1 text-rose-600">*</span>}
      </Label>
      {renderInput()}
      {field.helperText && (
        <p className="text-xs text-muted-foreground">{field.helperText}</p>
      )}
    </div>
  );
}
