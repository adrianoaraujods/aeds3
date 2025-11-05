"use client";

import * as React from "react";
import Link from "next/link";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";

import { useData } from "@/hooks/use-data";
import { deleteProduct } from "@/actions/product";
import { DataTable } from "@/components/table/data-table";
import { Text } from "@/components/typography/text";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EllipsisIcon, EyeIcon, Trash2Icon } from "lucide-react";

import type { ProductData } from "@/schemas/product";

export function ProductsTable() {
  const { data } = useData();

  const table = useReactTable<ProductData>({
    columns: [
      { accessorKey: "code", header: "Código" },
      { accessorKey: "description", header: "Descrição" },
      { accessorKey: "unit", header: "U.D.M." },
      {
        accessorKey: "drawings",
        header: "Desenhos",
        cell: ({ row }) => {
          const drawings = row.original.drawings;

          return (
            <span>
              {drawings.map(({ number, url }, i) => (
                <React.Fragment key={number}>
                  {!url ? (
                    number
                  ) : (
                    <Link href={url} target="_blank">
                      {number}
                    </Link>
                  )}
                  {i < drawings.length - 1 && ", "}
                </React.Fragment>
              ))}
            </span>
          );
        },
      },
      {
        accessorKey: "more",
        header: "",
        cell: ({ row }) => <ProductTableRowMenu product={row.original} />,
      },
    ],
    data: data.products,
    getCoreRowModel: getCoreRowModel(),
  });

  return <DataTable table={table} />;
}

function ProductTableRowMenu({ product }: { product: ProductData }) {
  const { setData } = useData();

  async function handleDelete() {
    const res = await deleteProduct(product.id);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        products: prev.products.filter(({ id }) => id !== product.id),
      }));

      toast.success("Produto deletado com sucesso!");
      return;
    }

    switch (res.status) {
      case 409:
        toast.warning(
          "Não é possível excluir um produto com outros registros."
        );
        break;
      case 500:
        toast.error(
          "Erro interno do servidor. Não foi possível excluir o produto, tente novamente."
        );
        break;
      default:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível excluir o produto."
        );
    }
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline">
            <EllipsisIcon className="size-5" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={`/produtos/${product.id}`}>
                <EyeIcon />

                <Text>Ver</Text>
              </Link>
            </DropdownMenuItem>

            <AlertDialogTrigger asChild>
              <DropdownMenuItem variant="destructive">
                <Trash2Icon />

                <Text>Deletar</Text>
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
            Isso irá excluir permanentemente esse produto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" asChild>
            <AlertDialogAction onClick={() => handleDelete()}>
              Excluir
            </AlertDialogAction>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
