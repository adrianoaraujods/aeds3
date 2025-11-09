"use client";

import * as React from "react";
import Link from "next/link";

import { toast } from "sonner";

import { getProductData } from "@/actions/product";
import { ProductForm } from "@/components/form/product-form";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

import { LockOpenIcon } from "lucide-react";

import type { ProductData } from "@/schemas/product";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number(React.use(params).id);

  const [isLoading, setIsLoading] = React.useState(true);
  const [product, setProject] = React.useState<ProductData | null>(null);
  const [canEdit, setCanEdit] = React.useState(false);

  React.useEffect(() => {
    getProductData(id).then(async (res) => {
      if (res.ok) {
        setProject(res.data);
      } else {
        toast.error("Erro ao carregar o produto.");
      }

      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) return null;

  return (
    <>
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
                <BreadcrumbPage>
                  {!product ? "Não Encontrado" : product.description}
                </BreadcrumbPage>
              </Heading>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {product && !canEdit && (
          <Button onClick={() => setCanEdit(true)}>
            <Text>Habilitar Edição</Text>

            <LockOpenIcon />
          </Button>
        )}
      </header>

      {product && (
        <ProductForm
          initialValues={product}
          type="edit"
          canEdit={canEdit}
          setCanEdit={setCanEdit}
        />
      )}
    </>
  );
}
