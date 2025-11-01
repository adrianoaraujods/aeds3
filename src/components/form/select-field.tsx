import { useFieldContext } from "@/hooks/use-app-form";
import { cn } from "@/lib/utils";
import { Text } from "@/components/typography/text";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { FieldProps } from "@/components/form/field";
import type { LucideIcon } from "lucide-react";

export type SelectOption = { value: string; title: string; icon?: LucideIcon };

type SelectFieldProps = FieldProps &
  React.ComponentProps<typeof SelectValue> & {
    selectProps?: React.ComponentProps<typeof Select>;
    triggerProps?: React.ComponentProps<typeof SelectTrigger>;
    itemsProps?: React.ComponentProps<typeof SelectItem>;
    options: SelectOption[];
  };

export function SelectField({
  containerProps,
  labelProps,
  selectProps,
  triggerProps,
  itemsProps,
  options,
  label,
  ...props
}: SelectFieldProps) {
  const field = useFieldContext<string>();

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

      <Select
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        {...selectProps}
      >
        <SelectTrigger
          className={cn(
            "dark:data-[error=true]:bg-destructive/10 data-[error=true]:bg-destructive/10 dark:data-[error=true]:hover:bg-destructive/20 data-[error=true]:hover:bg-destructive/20 w-full",
            triggerProps?.className
          )}
          data-error={field.state.meta.errors.length > 0}
          id={props.id || field.name}
          {...triggerProps}
        >
          <SelectValue {...props} />
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            {options.map(({ value, title, icon: Icon }) => (
              <SelectItem value={value} key={value} {...itemsProps}>
                {Icon && <Icon />}

                <Text>{title}</Text>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

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
