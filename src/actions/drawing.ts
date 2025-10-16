"use server";

import { drawingSchema } from "@/lib/schemas";
import { File } from "@/actions/file";

import type { ActionResponse } from "@/lib/config";
import type { Drawing } from "@/lib/schemas";

const file = new File({
  name: "drawings",
  dataSchema: drawingSchema,
  uniqueFields: ["number"],
});

export async function createDrawing(
  data: Omit<Drawing, "id">
): Promise<ActionResponse<Drawing>> {
  return file.insert(data);
}

export async function getDrawing(id: number): Promise<ActionResponse<Drawing>> {
  return file.select(id);
}

export async function getAllDrawings(): Promise<ActionResponse<Drawing[]>> {
  return file.getAll();
}

export async function updateDrawing(
  data: Drawing
): Promise<ActionResponse<Drawing>> {
  return file.update(data.id, data);
}

export async function deleteDrawing(
  id: number
): Promise<ActionResponse<Drawing>> {
  return file.delete(id);
}
