import * as React from "react";

import { useFieldContext } from "@/hooks/use-app-form";
import { cn, formatCNPJ, formatCPF } from "@/lib/utils";
import { Text } from "@/components/typography/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { FieldProps } from "@/components/form/field";

export type TextFieldProps = FieldProps &
  Omit<React.ComponentProps<typeof Input>, "children">;

export function DocumentNumberField({
  containerProps,
  labelProps,
  label,
  ...props
}: Omit<TextFieldProps, "type">) {
  const field = useFieldContext<string>();

  const [displayValue, setDisplayValue] = React.useState(
    field.state.value.length <= 11
      ? formatCPF(field.state.value)
      : formatCNPJ(field.state.value)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.replace(/\D/g, "");

    if (sanitizedValue.length <= 14) {
      field.handleChange(sanitizedValue);

      if (sanitizedValue.length <= 11) {
        setDisplayValue(formatCPF(sanitizedValue));
      } else {
        setDisplayValue(formatCNPJ(sanitizedValue));
      }
    }
  };

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

      <Input
        className={cn(
          "dark:data-[error=true]:bg-destructive/10 data-[error=true]:bg-destructive/10 dark:data-[error=true]:hover:bg-destructive/20 data-[error=true]:hover:bg-destructive/20",
          props.className
        )}
        data-error={field.state.meta.errors.length > 0}
        id={props.id || field.name}
        value={displayValue}
        onChange={handleInputChange}
        type="text"
        {...props}
      />

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
