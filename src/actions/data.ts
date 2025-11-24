import { getAllClients, reindexClientsFile } from "@/actions/client";
import { getAllDrawings, reindexDrawingsFile } from "@/actions/drawing";
import { getAllOrders, reindexOrdersFile } from "@/actions/order";
import { reindexOrderItemsFile } from "@/actions/order-item";
import { getAllProducts, reindexProductsFile } from "@/actions/product";
import { reindexProductDrawingsFile } from "@/actions/product-drawing";

import type { ActionResponse, ErrorCode } from "@/lib/config";
import type { Client } from "@/schemas/client";
import type { Drawing } from "@/schemas/drawing";
import type { Order } from "@/schemas/order";
import type { ProductData } from "@/schemas/product";

export type Data = {
  clients: Client[];
  drawings: Drawing[];
  products: ProductData[];
  // quotes: Quote[];
  orders: Order[];
  // invoices: Invoice[];
};

export async function loadData(): Promise<ActionResponse<Data, Data>> {
  let serverError = false; // 500

  const { clients, drawings, products, orders } = await Promise.allSettled([
    getAllClients(),
    getAllDrawings(),
    getAllProducts(),
    getAllOrders(),
  ]).then((results) => {
    const [clientsResult, drawingsResult, productsResult, ordersResult] =
      results;

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.status === 500) {
          serverError = true;
        }
      }
    }

    const data: Data = {
      clients:
        clientsResult.status === "rejected"
          ? []
          : clientsResult.value.data || [],
      drawings:
        drawingsResult.status === "rejected"
          ? []
          : drawingsResult.value.data || [],
      products:
        productsResult.status === "rejected"
          ? []
          : productsResult.value.data || [],
      orders:
        ordersResult.status === "rejected" ? [] : ordersResult.value.data || [],
    };

    return data;
  });

  const data: Data = {
    clients,
    drawings,
    products,
    orders,
  };

  if (serverError) {
    return { ok: false, status: 500, data };
  }

  return { ok: true, status: 200, data };
}

export async function reindexAllDataFiles(): Promise<ActionResponse> {
  const status = await Promise.allSettled([
    reindexClientsFile(),
    reindexDrawingsFile(),
    reindexOrdersFile(),
    reindexProductsFile(),
    reindexOrderItemsFile(),
    reindexProductDrawingsFile(),
  ]).then((responses) => {
    let hasRejected = false;
    let failedStatus: ErrorCode | undefined;

    for (const response of responses) {
      if (response.status === "rejected") {
        hasRejected = true;
        continue;
      }

      if (!response.value.ok) {
        failedStatus = response.value.status;
        continue;
      }
    }

    if (hasRejected) return 500;
    if (failedStatus !== undefined) return failedStatus;

    return 200;
  });

  if (status !== 200) return { ok: false, status };

  return { ok: true, data: undefined };
}
