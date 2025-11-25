"use server";

import { createDrawing, deleteDrawing } from "@/actions/drawing";
import { getProductOrders } from "@/actions/order-item";
import {
  createProductDrawing,
  getProductDrawings,
  removeAllProductDrawings,
} from "@/actions/product-drawing";
import { RecordFile } from "@/actions/record-file";
import { productDataSchema, productSchema } from "@/schemas/product";

import type { ActionResponse, ErrorCode } from "@/lib/config";
import type { Drawing } from "@/schemas/drawing";
import type { Product, ProductData } from "@/schemas/product";

const file = new RecordFile({
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
  if (!parser.success)
    return {
      ok: false,
      status: 400,
      message: "Dados inválidos! Verifique os dados do produto.",
      data: createdDrawings,
    };

  for (const drawing of drawings) {
    if (!drawing.isNew) continue;

    const creatingDrawing = await createDrawing(drawing);

    if (!creatingDrawing.ok) {
      return {
        ok: false,
        status: creatingDrawing.status,
        message:
          "Houve algum erro ao criar algum desenho! Pode ser que algum desenho já tenha sido criado.",
        data: createdDrawings,
      };
    }

    const newDrawing = creatingDrawing.data;

    createdDrawings.push(newDrawing);
  }

  const creatingProduct = file.insert(product);

  if (!creatingProduct.ok) {
    return {
      ok: false,
      status: creatingProduct.status,
      message: "Houve algum erro ao criar o produto!",
      data: createdDrawings,
    };
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

    if (unreverted) {
      return {
        ok: false,
        status: 509,
        message:
          "Houve algum erro ao criar o produto! O produto foi parcialmente criado, isso pode gerar inconsistências.",
        data: createdDrawings,
      };
    }

    return {
      ok: false,
      status: failedStatus,
      message: "Houve algum erro ao criar o produto!",
      data: createdDrawings,
    };
  }

  return {
    ok: true,
    status: 201,
    message: "Produto criado com sucesso!",
    data: { ...creatingProduct.data, drawings },
  };
}

export async function getProduct(id: number): Promise<ActionResponse<Product>> {
  return file.findBy("id", id);
}

export async function getProductData(
  id: number
): Promise<ActionResponse<ProductData>> {
  const findingProduct = file.findBy("id", id);

  if (!findingProduct.ok)
    return {
      ok: false,
      status: findingProduct.status,
      message: "Produto não encontrado!",
    };

  const retrievingDrawings = await getProductDrawings(findingProduct.data.id);

  if (!retrievingDrawings.ok)
    return {
      ok: false,
      status: 509,
      message:
        "Produto não encontrado! Pode ser que existam dados corrompidos.",
    };

  return {
    ok: true,
    status: 200,
    message: "Produto recuperado com sucesso!",
    data: { ...findingProduct.data, drawings: retrievingDrawings.data },
  };
}

export async function getAllProducts(): Promise<
  ActionResponse<ProductData[], ProductData[]>
> {
  const products: ProductData[] = [];

  const retrievingProducts = file.getAll();

  if (!retrievingProducts.ok) {
    return {
      ok: false,
      status: retrievingProducts.status,
      message: "Houve algum erro ao carregar os produtos!",
      data: products,
    };
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
    return {
      ok: false,
      status: failedStatus,
      message: "Houve algum erro ao carregar algum desenho dos produtos!",
      data: products,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Produtos carregados com sucesso!",
    data: products,
  };
}

export async function updateProduct(
  data: ProductData
): Promise<ActionResponse<ProductData, Drawing[]>> {
  const { drawings, ...product } = data;

  const createdDrawings: Drawing[] = [];

  const parser = productDataSchema.safeParse(data);
  if (!parser.success)
    return {
      ok: false,
      status: 400,
      message: "Dados inválidos! Verifique os dados do produto.",
      data: createdDrawings,
    };

  const retrievingOldDrawings = await getProductDrawings(product.id);
  if (!retrievingOldDrawings.ok) {
    return {
      ok: false,
      status: retrievingOldDrawings.status,
      message: "Houve algum erro ao carregar os desenhos do produto.",
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
        message:
          "Houve algum erro ao criar um desenho do produto! Pode ser que outros desenhos tenham sido criados.",
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
        return {
          ok: false,
          status: 509,
          message:
            "Houve algum erro ao modificar o produto! Pode ser que alguns desenhos tenha sido adicionados.",
          data: createdDrawings,
        };
      }

      return {
        ok: false,
        status: creatingRelation.status,
        message:
          "Houve algum erro ao modificar o produto! Nenhuma alteração foi feita.",
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
      message: "Houve algum erro ao modificar o produto!",
      data: createdDrawings,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "Produto criado com sucesso!",
    data: { ...updatingProduct.data, drawings },
  };
}

export async function deleteProduct(
  id: number
): Promise<ActionResponse<Product>> {
  const retrievingOrderItems = await getProductOrders(id);

  if (!retrievingOrderItems.ok) {
    return {
      ok: false,
      status: retrievingOrderItems.status,
      message:
        "Houve algum erro ao procurar pedidos com esse produto. Nenhuma alteração foi feita.",
    };
  }

  if (retrievingOrderItems.data.length) {
    return {
      ok: false,
      status: 409,
      message: "Não é permitido excluir um produto que está em algum pedido.",
    };
  }

  const removingDrawings = await removeAllProductDrawings(id);

  if (!removingDrawings.ok) {
    return {
      ok: false,
      status: removingDrawings.status,
      message: "Houve algum erro ao remover algum desenho do produto.",
    };
  }

  const deletingProduct = file.delete(id);

  if (!deletingProduct.ok)
    return {
      ok: false,
      status: deletingProduct.status,
      message: "Houve algum erro ao excluír o produto.",
    };

  return {
    ok: true,
    status: 200,
    message: "Produto excluído com sucesso!",
    data: deletingProduct.data,
  };
}

export async function reindexProductsFile() {
  return file.reindex();
}
