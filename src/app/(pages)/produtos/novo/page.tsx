import * as React from "react";
import Link from "next/link";

import { ProductForm } from "@/components/layout/product";
import { Section } from "@/components/layout/section";
import { Heading } from "@/components/typography/heading";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import type { ProductFormFields } from "@/components/layout/product";

const defaultProduct: ProductFormFields = {
  id: 0,
  code: "",
  description: "",
  drawings: [],
  unit: "UN",
};

export default function CreateProductPage() {
  return (
    <Section>
      <header className="mb-4 flex justify-between border-b">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Heading element="h1" className="mb-0" asChild>
                  <Link href="/produtos">Produtos</Link>
                </Heading>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <BreadcrumbSeparator className="[&>svg]:size-8" />

            <BreadcrumbItem>
              <Heading element="h1" className="mb-0" asChild>
                <BreadcrumbPage>Novo</BreadcrumbPage>
              </Heading>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <ProductForm initialValues={defaultProduct} type="create" />
    </Section>
  );
}
