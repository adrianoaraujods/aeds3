import z from "zod";

import { drawingSchema } from "./drawing";

export type Unit = (typeof UNITS)[number];
export const UNITS = ["UN", "PÇ", "PR"] as const;

export type Product = z.infer<typeof productSchema>;
export const productSchema = z.object({
  id: z.int32().positive(), // primary key
  code: z.string().min(1, "Esse campo deve ser preenchido."),
  description: z.string().min(1, "Esse campo deve ser preenchido."),
  unit: z.enum([...UNITS], "Unidade de medida inválida."),

  drawings: z.array(drawingSchema.shape.id), // foreign key from Drawing
});

export type ProductData = z.infer<typeof productDataSchema>;
export const productDataSchema = productSchema.extend({
  id: z.number(),
  drawings: z.array(drawingSchema.extend({ id: z.number() })),
});

export const DEFAULT_PRODUCT: ProductData = {
  id: 0,
  code: "",
  description: "",
  drawings: [],
  unit: "UN",
};
