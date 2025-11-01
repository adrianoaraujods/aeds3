import { Label } from "@/components/ui/label";

export type FieldProps = {
  containerProps?: React.ComponentProps<"div">;
  labelProps?: React.ComponentProps<typeof Label>;
  label?: string;
};
