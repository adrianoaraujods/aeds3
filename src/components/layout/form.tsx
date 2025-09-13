import * as React from "react";

import { useFieldContext } from "@/hooks/use-app-form";
import { cn, formatCNPJ, formatCPF, formatPhone } from "@/lib/utils";
import { Text } from "@/components/typography/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { LucideIcon } from "lucide-react";

type FieldProps = {
  containerProps?: React.ComponentProps<"div">;
  labelProps?: React.ComponentProps<typeof Label>;
  label: string;
};

type TextFieldProps = FieldProps &
  Omit<React.ComponentProps<typeof Input>, "children">;

function TextField({
  containerProps,
  labelProps,
  label,
  ...props
}: TextFieldProps) {
  const field = useFieldContext<string | number>();

  return (
    <div
      className={cn("grid gap-2", containerProps?.className)}
      {...containerProps}
    >
      <Label htmlFor={props.id || field.name} {...labelProps}>
        {labelProps?.children || label}
      </Label>

      <Input
        id={props.id || field.name}
        value={field.state.value}
        onChange={(e) =>
          field.handleChange(
            props.type === "number" ? Number(e.target.value) : e.target.value
          )
        }
        {...props}
      />
    </div>
  );
}

type SelectOption = { value: string; title: string; icon?: LucideIcon };

type SelectFieldProps = FieldProps &
  React.ComponentProps<typeof SelectValue> & {
    selectProps?: React.ComponentProps<typeof Select>;
    triggerProps?: React.ComponentProps<typeof SelectTrigger>;
    itemsProps?: React.ComponentProps<typeof SelectItem>;
    options: SelectOption[];
  };

function SelectField({
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
      <Label htmlFor={props.id || field.name} {...labelProps}>
        {labelProps?.children || label}
      </Label>

      <Select
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
        {...selectProps}
      >
        <SelectTrigger
          className={cn("w-full", triggerProps?.className)}
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
    </div>
  );
}

function DocumentNumberField({
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
      <Label htmlFor={props.id || field.name} {...labelProps}>
        {labelProps?.children || label}
      </Label>

      <Input
        id={props.id || field.name}
        value={displayValue}
        onChange={handleInputChange}
        type="text"
        {...props}
      />
    </div>
  );
}

function PhoneField({
  containerProps,
  labelProps,
  label,
  ...props
}: Omit<TextFieldProps, "type">) {
  const field = useFieldContext<string>();

  const [displayValue, setDisplayValue] = React.useState(
    formatPhone(field.state.value)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = e.target.value.replace(/\D/g, "");

    if (sanitizedValue.length <= 11) {
      field.handleChange(sanitizedValue);
      setDisplayValue(formatPhone(sanitizedValue));
    }
  };

  return (
    <div
      className={cn("grid gap-2", containerProps?.className)}
      {...containerProps}
    >
      <Label htmlFor={props.id || field.name} {...labelProps}>
        {label}
      </Label>

      <Input
        id={props.id || field.name}
        onChange={handleInputChange}
        value={displayValue}
        type="tel"
        {...props}
      />
    </div>
  );
}

export {
  TextField,
  SelectField,
  DocumentNumberField,
  PhoneField,
  type SelectOption,
};
