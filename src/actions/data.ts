import { getAllClients } from "@/actions/client";

import type { ActionResponse } from "@/lib/config";
import type { Client, Order, Product } from "@/lib/schemas";

type Data = {
  clients: Client[];
  // quotes: Quote[];
  // invoices: Invoice[];
  orders: Order[];
  products: Product[];
};

async function loadData(): Promise<ActionResponse<Data> & { data: Data }> {
  let corruptedData = false; // 209
  let serverError = false; // 500

  const [clients] = await Promise.allSettled([getAllClients()]).then(
    (results) =>
      results.map((result) => {
        if (result.status === "fulfilled") {
          if (result.value.status === 209) {
            corruptedData = true;
          } else if (result.value.status === 500) {
            serverError = true;
          }

          return result.value.data || [];
        }

        serverError = true;
        return [];
      })
  );

  const data: Data = {
    clients,
    orders: [],
    products: [],
  };

  if (corruptedData) {
    return { ok: false, status: 509, data };
  }

  if (serverError) {
    return { ok: false, status: 500, data };
  }

  return { ok: true, status: 200, data };
}

export { loadData, type Data };
