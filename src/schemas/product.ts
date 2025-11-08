import z from "zod";

import { drawingDataSchema } from "@/schemas/drawing";

export type Unit = (typeof UNITS)[number];
export const UNITS = ["UN", "PÇ", "PR"] as const;

export type Product = z.infer<typeof productSchema>;
export const productSchema = z.object({
  id: z.uint32(), // primary key
  code: z.string().min(1, "Esse campo deve ser preenchido."),
  description: z.string().min(1, "Esse campo deve ser preenchido."),
  unit: z.enum([...UNITS], "Unidade de medida inválida."),
});

export type ProductData = z.infer<typeof productDataSchema>;
export const productDataSchema = productSchema.extend({
  id: z.int32(),
  drawings: z.array(drawingDataSchema),
});

export const DEFAULT_PRODUCT: ProductData = {
  id: 0,
  code: "",
  description: "",
  drawings: [],
  unit: "UN",
};
