"use server";

import { createDrawing, deleteDrawing } from "@/actions/drawing";
import { File } from "@/actions/file";
import { getProductOrders } from "@/actions/order-item";
import {
  createProductDrawing,
  getProductDrawings,
  removeAllProductDrawings,
} from "@/actions/product-drawing";
import { productDataSchema, productSchema } from "@/schemas/product";

import type { ActionResponse, ErrorCode } from "@/lib/config";
import type { Drawing } from "@/schemas/drawing";
import type { Product, ProductData } from "@/schemas/product";

const file = new File({
  name: "products",
  schema: productSchema,
  primaryKey: "id",
});

export async function createProduct(
  data: ProductData
): Promise<ActionResponse<ProductData, Drawing[]>> {
  const { drawings, ...product } = data;

  const createdDrawings: Drawing[] = [];

  const parser = productDataSchema.safeParse(data);
  if (!parser.success) return { ok: false, status: 400, data: createdDrawings };

  for (const drawing of drawings) {
    if (!drawing.isNew) continue;

    const creatingDrawing = await createDrawing(drawing);

    if (!creatingDrawing.ok) {
      return {
        ok: false,
        status: creatingDrawing.status,
        data: createdDrawings,
      };
    }

    const newDrawing = creatingDrawing.data;

    createdDrawings.push(newDrawing);
  }

  const creatingProduct = file.insert(product);

  if (!creatingProduct.ok) {
    return { ok: false, status: creatingProduct.status, data: createdDrawings };
  }

  let failedStatus: ErrorCode | undefined;
  let unreverted = false;

  for (let i = 0; i < drawings.length; i++) {
    const creatingRelation = await createProductDrawing(
      creatingProduct.data.id,
      drawings[i].number
    );

    if (!creatingRelation.ok) {
      failedStatus = creatingRelation.status;

      if (drawings[i].isNew) {
        const deletingDrawing = await deleteDrawing(drawings[i].number);

        const index = createdDrawings.findIndex(
          ({ number }) => number === drawings[i].number
        );

        createdDrawings.splice(index, 1);

        if (!deletingDrawing.ok) {
          unreverted = true;
        }
      }
    } else {
      drawings[i].isNew = false;
    }
  }

  if (failedStatus !== undefined) {
    const uncreatingProduct = await deleteProduct(creatingProduct.data.id);

    if (!uncreatingProduct.ok) unreverted = true;

    return {
      ok: false,
      status: unreverted ? 509 : failedStatus,
      data: createdDrawings,
    };
  }

  return { ok: true, data: { ...creatingProduct.data, drawings } };
}

export async function getProduct(id: number): Promise<ActionResponse<Product>> {
  return file.findBy("id", id);
}

export async function getProductData(
  id: number
): Promise<ActionResponse<ProductData>> {
  const findingProduct = file.findBy("id", id);

  if (!findingProduct.ok) return { ok: false, status: findingProduct.status };

  const retrievingDrawings = await getProductDrawings(findingProduct.data.id);

  if (!retrievingDrawings.ok) return { ok: false, status: 509 };

  return {
    ok: true,
    data: { ...findingProduct.data, drawings: retrievingDrawings.data },
  };
}

export async function getAllProducts(): Promise<
  ActionResponse<ProductData[], ProductData[]>
> {
  const products: ProductData[] = [];

  const retrievingProducts = file.getAll();

  if (!retrievingProducts.ok) {
    return { ok: false, status: retrievingProducts.status, data: products };
  }

  let failedStatus: ErrorCode | undefined;

  for (const product of retrievingProducts.data) {
    const retrievingDrawings = await getProductDrawings(product.id);

    const drawings = retrievingDrawings.data;

    if (!retrievingDrawings.ok) {
      failedStatus = retrievingDrawings.status;
    }

    products.push({ ...product, drawings });
  }

  if (failedStatus) {
    return { ok: false, status: failedStatus, data: products };
  }

  return { ok: true, data: products };
}

export async function updateProduct(
  data: ProductData
): Promise<ActionResponse<ProductData, Drawing[]>> {
  const { drawings, ...product } = data;

  const createdDrawings: Drawing[] = [];

  const parser = productDataSchema.safeParse(data);
  if (!parser.success) return { ok: false, status: 400, data: createdDrawings };

  const retrievingOldDrawings = await getProductDrawings(product.id);
  if (!retrievingOldDrawings.ok) {
    return {
      ok: false,
      status: retrievingOldDrawings.status,
      data: createdDrawings,
    };
  }

  const oldDrawings = retrievingOldDrawings.data.map(({ number }) => number);

  for (let i = 0; i < drawings.length; i++) {
    const drawing = drawings[i];

    if (!drawing.isNew) continue;
    if (!oldDrawings.includes(drawing.number)) {
      drawings[i].isNew = false;
      continue;
    }

    const creatingDrawing = await createDrawing(drawing);

    if (!creatingDrawing.ok) {
      return {
        ok: false,
        status: creatingDrawing.status,
        data: createdDrawings,
      };
    }

    const creatingRelation = await createProductDrawing(
      product.id,
      creatingDrawing.data.number
    );

    if (!creatingRelation.ok) {
      const uncreatingDrawing = await deleteDrawing(
        creatingDrawing.data.number
      );

      if (!uncreatingDrawing.ok) {
        return { ok: false, status: 509, data: createdDrawings };
      }

      return {
        ok: false,
        status: creatingRelation.status,
        data: createdDrawings,
      };
    }

    createdDrawings.push(creatingDrawing.data);
  }

  const updatingProduct = file.update(product);

  if (!updatingProduct.ok) {
    return {
      ok: false,
      status: updatingProduct.status,
      data: createdDrawings,
    };
  }

  return { ok: true, data: { ...updatingProduct.data, drawings } };
}

export async function deleteProduct(
  id: number
): Promise<ActionResponse<Product>> {
  const retrievingOrderItems = await getProductOrders(id);

  if (!retrievingOrderItems.ok) {
    return { ok: false, status: retrievingOrderItems.status };
  }

  if (retrievingOrderItems.data.length) {
    return { ok: false, status: 409 };
  }

  const removingDrawings = await removeAllProductDrawings(id);

  if (!removingDrawings.ok) {
    return { ok: false, status: removingDrawings.status };
  }

  const deletingProduct = file.delete(id);

  if (!deletingProduct.ok) return { ok: false, status: deletingProduct.status };

  return { ok: true, data: deletingProduct.data };
}
