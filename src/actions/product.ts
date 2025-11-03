"use server";

import { File } from "@/actions/file";
import { Drawing } from "@/schemas/drawing";
import { productSchema } from "@/schemas/product";

import type { ActionResponse } from "@/lib/config";
import type { Product, ProductData } from "@/schemas/product";

import { getDrawing } from "./drawing";

const file = new File({
  name: "products",
  schema: productSchema,
  primaryKey: "id",
  uniqueFields: [],
});

export async function createProduct(
  data: Omit<Product, "id">
): Promise<ActionResponse<Product>> {
  return file.insert(data);
}

export async function getProduct(id: number): Promise<ActionResponse<Product>> {
  return file.select("id", id);
}

export async function getProductData(
  id: number
): Promise<ActionResponse<ProductData>> {
  const res = file.select("id", id);

  if (!res.ok) return { ok: false, status: res.status };

  const drawings: Drawing[] = [];

  for (const drawingId of res.data.drawings) {
    const res = await getDrawing(drawingId);

    if (!res.ok) return { ok: false, status: res.status };

    drawings.push(res.data);
  }

  return { ok: true, data: { ...res.data, drawings } };
}

export async function getAllProducts(): Promise<ActionResponse<Product[]>> {
  return file.getAll();
}

export async function updateProduct(
  data: Product
): Promise<ActionResponse<Product>> {
  return file.update(data);
}

export async function deleteProduct(
  id: number
): Promise<ActionResponse<Product>> {
  return file.delete(id);
}
