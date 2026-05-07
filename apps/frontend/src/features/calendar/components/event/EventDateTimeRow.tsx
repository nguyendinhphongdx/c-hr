"use client";

import {
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EventDateTimeRowProps<TForm extends FieldValues> {
  control: Control<TForm>;
  /** Names of the four bound form fields — generic so the caller's
   *  schema stays narrowly typed without forcing `Control<any>`. */
  startDateName: FieldPath<TForm>;
  startTimeName: FieldPath<TForm>;
  endDateName: FieldPath<TForm>;
  endTimeName: FieldPath<TForm>;
  /** When true, time inputs hide (start = day start, end = day end). */
  isAllDay: boolean;
  onAllDayChange: (next: boolean) => void;
}

/**
 * Two-row date+time block — `[date][time] → [date][time]` plus an
 * all-day checkbox that hides the time inputs. Stays form-agnostic
 * via generic `Control<TForm>` + field-path props.
 *
 * Caller's submit handler stitches the four strings back to a Date
 * (see `EventCreateDialog`).
 */
export function EventDateTimeRow<TForm extends FieldValues>({
  control,
  startDateName,
  startTimeName,
  endDateName,
  endTimeName,
  isAllDay,
  onAllDayChange,
}: EventDateTimeRowProps<TForm>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <FormField
          control={control}
          name={startDateName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bắt đầu</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isAllDay && (
          <FormField
            control={control}
            name={startTimeName}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="time" className="w-28" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <FormField
          control={control}
          name={endDateName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kết thúc</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isAllDay && (
          <FormField
            control={control}
            name={endTimeName}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input type="time" className="w-28" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
        <Checkbox
          checked={isAllDay}
          onCheckedChange={(v) => onAllDayChange(v === true)}
        />
        Cả ngày
      </Label>
    </div>
  );
}
