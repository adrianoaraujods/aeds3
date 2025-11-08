import z from "zod";

import { drawingSchema } from "@/schemas/drawing";
import { productSchema } from "@/schemas/product";

export type ProductDrawing = z.infer<typeof productDrawingSchema>;
export const productDrawingSchema = z.object({
  id: z.uint32(), // primary key
  productId: productSchema.shape.id, // foreign key from product
  drawingNumber: drawingSchema.shape.number, // foreign key from drawing
});
