import z from "zod";

export type Drawing = z.infer<typeof drawingSchema>;
export const drawingSchema = z.object({
  id: z.int32().positive(), // primary key
  number: z.string().min(1, "Esse campo deve ser preenchido."),
  url: z.string().optional(),
});

export type DrawingData = z.infer<typeof drawingDataSchema>;
export const drawingDataSchema = drawingSchema.extend({ id: z.number() });

export const DEAFULT_DRAWING: DrawingData = { id: 0, number: "" };
