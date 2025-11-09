"use client";

import * as React from "react";

import { useFieldContext } from "@/hooks/use-app-form";
import { cn, formatDate, toDate } from "@/lib/utils";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { CalendarIcon } from "lucide-react";

import type { FieldProps } from "@/components/form/field";

type DateFieldProps = FieldProps &
  Omit<React.ComponentProps<typeof Input>, "children" | "type">;

export function DateField({
  containerProps,
  labelProps,
  label,
  ...props
}: DateFieldProps) {
  const field = useFieldContext<Date>();

  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState<Date>(field.state.value);
  const [displayValue, setDisplayValue] = React.useState(
    formatDate(field.state.value)
  );

  return (
    <div
      className={cn("grid gap-2", containerProps?.className)}
      {...containerProps}
    >
      {label && (
        <Label
          className={cn(
            "data-[error=true]:text-destructive line-clamp-1 text-nowrap text-ellipsis",
            labelProps?.className
          )}
          htmlFor={props.id || field.name}
          data-error={field.state.meta.errors.length > 0}
          {...labelProps}
        >
          {labelProps?.children || label}
        </Label>
      )}

      <div className="relative flex gap-2">
        <Input
          className={cn(
            "dark:data-[error=true]:bg-destructive/10 data-[error=true]:bg-destructive/10 dark:data-[error=true]:hover:bg-destructive/20 data-[error=true]:hover:bg-destructive/20",
            props.className
          )}
          data-error={field.state.meta.errors.length > 0}
          id={props.id || field.name}
          value={displayValue}
          onChange={(e) => {
            setDisplayValue(e.target.value);

            const date = toDate(e.target.value);
            if (date) field.handleChange(date);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
          {...props}
        />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date-picker"
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
            >
              <CalendarIcon />

              <span className="sr-only">Selecione a data</span>
            </Button>
          </PopoverTrigger>

          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              month={month}
              selected={field.state.value}
              onMonthChange={setMonth}
              captionLayout="dropdown"
              onSelect={(date) => {
                field.handleChange(date!);
                setDisplayValue(formatDate(date));
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Text size="sm" variant="destructive">
        {field.state.meta.errors.length > 0 &&
          field.state.meta.errors.map((error) => (
            <em role="alert" key={error.code}>
              {error.message}
            </em>
          ))}
      </Text>
    </div>
  );
}
