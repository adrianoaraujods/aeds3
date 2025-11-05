import { getAllClients } from "@/actions/client";
import { getAllDrawings } from "@/actions/drawing";
import { getAllOrders } from "@/actions/order";
import { getAllProducts } from "@/actions/product";

import type { ActionResponse } from "@/lib/config";
import type { Client } from "@/schemas/client";
import type { Drawing } from "@/schemas/drawing";
import type { Order } from "@/schemas/order";
import type { ProductData } from "@/schemas/product";

type Data = {
  clients: Client[];
  drawings: Drawing[];
  products: ProductData[];
  // quotes: Quote[];
  orders: Order[];
  // invoices: Invoice[];
};

async function loadData(): Promise<ActionResponse<Data, Data>> {
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

export { loadData, type Data };
