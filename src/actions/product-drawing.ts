"use server";

import { getDrawing } from "@/actions/drawing";
import { RecordFile } from "@/actions/record-file";
import { Drawing } from "@/schemas/drawing";
import { productDrawingSchema } from "@/schemas/product-drawing";

import type { ActionResponse, ErrorCode } from "@/lib/config";
import type { Product } from "@/schemas/product";
import type { ProductDrawing } from "@/schemas/product-drawing";

const file = new RecordFile({
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
    return {
      ok: false,
      status: retrievingProduct.status,
      message: "Houve algum erro ao carregar o produto!",
      data: drawings,
    };
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
    return {
      ok: false,
      status: failedStatus,
      message: "Houve algum erro ao carregar algum desenho!",
      data: drawings,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Desenhos carregados com sucesso!",
    data: drawings,
  };
}

export async function removeProductDrawing(
  productId: Product["id"],
  drawingNumber: Drawing["number"]
): Promise<ActionResponse> {
  const retrievingProduct = file.select("productId", productId);

  if (!retrievingProduct.ok)
    return {
      ok: false,
      status: retrievingProduct.status,
      message: "Houve algum erro ao carregar o produto!",
    };

  const productDrawing = retrievingProduct.data.find(
    (productDrawing) => productDrawing.drawingNumber === drawingNumber
  );

  if (!productDrawing)
    return { ok: false, status: 404, message: "Desenho não encontrado!" };

  file.delete(productDrawing.id);

  return {
    ok: true,
    status: 200,
    message: "O desenho foi removido do produto com sucesso!",
    data: undefined,
  };
}

export async function removeAllProductDrawings(
  productId: Product["id"]
): Promise<ActionResponse> {
  const retrievingDrawings = file.select("productId", productId);

  if (!retrievingDrawings.ok) {
    return {
      ok: false,
      status: retrievingDrawings.status,
      message: "Houve algum erro ao carregar os desenhos!",
    };
  }

  const drawings = retrievingDrawings.data;

  let failedStatus: ErrorCode | undefined;

  for (const { id } of drawings) {
    const deletingRelation = file.delete(id);

    if (!deletingRelation.ok) {
      failedStatus = deletingRelation.status;
    }
  }

  if (failedStatus) {
    return {
      ok: false,
      status: failedStatus,
      message:
        "Houve algum erro ao remover algum desenho! Alguns desenhos podem ter sido removidos.",
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Os desenhos foram removidos com sucesso!",
    data: undefined,
  };
}

export async function reindexProductDrawingsFile() {
  return file.reindex();
}
