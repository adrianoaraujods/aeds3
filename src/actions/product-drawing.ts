"use server";

import { getDrawing } from "@/actions/drawing";
import { File } from "@/actions/file";
import { Drawing } from "@/schemas/drawing";
import { productDrawingSchema } from "@/schemas/product-drawing";

import type { ActionResponse, ErrorCode } from "@/lib/config";
import type { Product } from "@/schemas/product";
import type { ProductDrawing } from "@/schemas/product-drawing";

const file = new File({
  name: "product-drawings",
  schema: productDrawingSchema,
  primaryKey: "id",
  indexedFields: ["productId", "drawingNumber"],
});

export async function createProductDrawing(
  productId: ProductDrawing["productId"],
  drawingNumber: ProductDrawing["drawingNumber"]
): Promise<ActionResponse<ProductDrawing>> {
  return file.insert({ productId, drawingNumber });
}

export async function getProductDrawings(
  productId: Product["id"]
): Promise<ActionResponse<Drawing[], Drawing[]>> {
  const drawings: Drawing[] = [];

  const retrievingProduct = file.select("productId", productId);

  if (!retrievingProduct.ok) {
    return { ok: false, status: retrievingProduct.status, data: drawings };
  }

  const product = retrievingProduct.data;

  let failedStatus: ErrorCode | undefined;

  for (const { drawingNumber } of product) {
    const retrievingDrawing = await getDrawing(drawingNumber);

    if (!retrievingDrawing.ok) {
      failedStatus = retrievingDrawing.status;
    } else {
      drawings.push(retrievingDrawing.data);
    }
  }

  if (failedStatus !== undefined) {
    return { ok: false, status: failedStatus, data: drawings };
  }

  return { ok: true, data: drawings };
}

export async function removeProductDrawing(
  productId: Product["id"],
  drawingNumber: Drawing["number"]
): Promise<ActionResponse> {
  const res = file.select("productId", productId);

  if (!res.ok) return { ok: false, status: res.status };

  const productDrawing = res.data.find(
    (productDrawing) => productDrawing.drawingNumber === drawingNumber
  );

  if (!productDrawing) return { ok: false, status: 404 };

  file.delete(productDrawing.id);

  return { ok: true, data: undefined };
}

export async function removeAllProductDrawings(
  productId: Product["id"]
): Promise<ActionResponse> {
  const retrievingRelations = file.select("productId", productId);

  if (!retrievingRelations.ok)
    return { ok: false, status: retrievingRelations.status };

  const relations = retrievingRelations.data;

  let failedStatus: ErrorCode | undefined;

  for (const { id } of relations) {
    const deletingRelation = file.delete(id);

    if (!deletingRelation.ok) {
      failedStatus = deletingRelation.status;
    }
  }

  if (failedStatus) {
    return { ok: false, status: failedStatus };
  }

  return { ok: true, data: undefined };
}
