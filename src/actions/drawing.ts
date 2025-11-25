"use server";

import { RecordFile } from "@/actions/record-file";
import { drawingSchema } from "@/schemas/drawing";

import type { ActionResponse } from "@/lib/config";
import type { Drawing } from "@/schemas/drawing";

const file = new RecordFile({
  name: "drawings",
  schema: drawingSchema,
  primaryKey: "number",
});

export async function createDrawing(
  data: Drawing
): Promise<ActionResponse<Drawing>> {
  return file.insert(data);
}

export async function getDrawing(
  number: Drawing["number"]
): Promise<ActionResponse<Drawing>> {
  return file.findBy("number", number);
}

export async function getAllDrawings(): Promise<ActionResponse<Drawing[]>> {
  return file.getAll();
}

export async function updateDrawing(
  data: Drawing
): Promise<ActionResponse<Drawing>> {
  return file.update(data);
}

export async function deleteDrawing(
  number: Drawing["number"]
): Promise<ActionResponse<Drawing>> {
  return file.delete(number);
}

export async function reindexDrawingsFile() {
  return file.reindex();
}
