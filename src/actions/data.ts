import type { Client, Order, Product } from "@/lib/schemas";

type Data = {
  clients: Client[];
  // quotes: Quote[];
  // invoices: Invoice[];
  orders: Order[];
  products: Product[];
};

async function loadData(): Promise<Data | null> {
  return null;
}

export { loadData, type Data };
