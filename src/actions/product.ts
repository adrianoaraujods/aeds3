"use server";

import { productSchema } from "@/lib/schemas";
import { File } from "@/actions/file";

import type { ActionResponse } from "@/lib/config";
import type { Product } from "@/lib/schemas";

const file = new File({
  name: "products",
  dataSchema: productSchema,
  uniqueFields: [],
});

export async function createProduct(
  data: Omit<Product, "id">
): Promise<ActionResponse<Product>> {
  return file.insert(data);
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
