import z from "zod";

export type Drawing = z.infer<typeof drawingSchema>;
export const drawingSchema = z.object({
  number: z.string().min(1, "Esse campo deve ser preenchido."), // primary key
  url: z.string().optional(),
});

export type DrawingData = z.infer<typeof drawingDataSchema>;
export const drawingDataSchema = drawingSchema.extend({
  isNew: z.boolean().optional(),
});

export const DEAFULT_DRAWING: DrawingData = { number: "", isNew: true };
