import { createProduct } from "@/actions/product";

import type { ProductData } from "@/schemas/product";

export async function createMockProducts() {
  for (const product of MOCK_PRODUCTS_DATA) {
    const res = await createProduct(product);

    if (!res.ok) {
      console.error("Dados do Produto: ", product);
    }

    console.log(res.message);
  }
}

export const MOCK_PRODUCTS_DATA: ProductData[] = [
  { id: 1, code: "3000153", description: "Bocal", drawings: [], unit: "UN" },
];
