import * as React from "react";
import Link from "next/link";

import { toast } from "sonner";

import { getAllProducts } from "@/actions/product";
import { ProductsTable } from "@/components/table/products-table";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";

import { PlusCircleIcon } from "lucide-react";

import type { ProductData } from "@/schemas/product";

export default async function ProductsPage() {
  const retrievingProducts = await getAllProducts();

  if (!retrievingProducts.ok) {
    toast.error(retrievingProducts.message);
  }

  const products: ProductData[] = retrievingProducts.data;

  return (
    <>
      <header className="mb-2 flex justify-between border-b">
        <Heading element="h1" className="mb-0">
          Produtos
        </Heading>

        <Button variant="outline" asChild>
          <Link href="/produtos/novo">
            <PlusCircleIcon />

            <Text>Adicionar</Text>
          </Link>
        </Button>
      </header>

      <ProductsTable products={products} />
    </>
  );
}
