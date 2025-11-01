"use client";

import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { toast } from "sonner";

import { getDrawing } from "@/actions/drawing";
import { getProduct } from "@/actions/product";
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

import type { FormProduct } from "@/components/form/product-form";

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number(React.use(params).id);

  const [isLoading, setIsLoading] = React.useState(true);
  const [product, setProject] = React.useState<FormProduct | null>(null);
  const [canEdit, setCanEdit] = React.useState(false);

  React.useEffect(() => {
    getProduct(id).then(async (res) => {
      if (res.ok) {
        const drawingsIds = res.data.drawings;
        const product: FormProduct = { ...res.data, drawings: [] };

        for (const drawingId of drawingsIds) {
          const res = await getDrawing(drawingId);

          if (!res.ok) continue;

          product.drawings.push(res.data);
        }

        if (product.drawings.length !== drawingsIds.length) {
          toast.warning("Falha ao carregar algum desenhos!");
        }

        setProject(product);
      } else {
        switch (res.status) {
          case 404:
            notFound();
          default:
            toast.error("Erro ao carregar o produto.");
        }
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
