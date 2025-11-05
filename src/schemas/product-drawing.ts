import z from "zod";

import { drawingSchema } from "@/schemas/drawing";
import { productSchema } from "@/schemas/product";

export type ProductDrawing = z.infer<typeof productDrawingSchema>;
export const productDrawingSchema = z.object({
  id: z.int32().positive(), // primary key
  productId: productSchema.shape.id, // foreign key from product
  drawingNumber: drawingSchema.shape.number, // foreign key from drawing
});
