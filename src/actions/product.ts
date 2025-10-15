"use server";

import { productSchema } from "@/lib/schemas";
import { File } from "@/actions/file";

import type { ActionResponse } from "@/lib/config";
import type { Drawing, Product } from "@/lib/schemas";

import { createDrawing } from "./drawing";

const file = new File({
  name: "products",
  dataSchema: productSchema,
  uniqueFields: [],
});

export async function createProduct(
  product: Omit<Product, "id" | "drawings">,
  drawings: Omit<Drawing, "id">[]
): Promise<ActionResponse<Product>> {
  const drawingsIds: Drawing["id"][] = [];

  for (const drawing of drawings) {
    const res = await createDrawing(drawing);

    if (!res.ok) return { ok: false, status: res.status };

    drawingsIds.push(res.data.id);
  }

  return file.insert({ ...product, drawings: drawingsIds });
}

export async function getProduct(id: number): Promise<ActionResponse<Product>> {
  return file.select(id);
}

export async function getAllProducts(): Promise<ActionResponse<Product[]>> {
  return file.getAll();
}

export async function updateProduct(
  data: Product
): Promise<ActionResponse<Product>> {
  return file.update(data.id, data);
}

export async function deleteProduct(
  id: number
): Promise<ActionResponse<Product>> {
  return file.delete(id);
}
