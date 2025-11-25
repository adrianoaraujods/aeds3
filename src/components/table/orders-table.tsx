"use client";

import * as React from "react";
import Link from "next/link";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";

import { formatDate, formatMoney } from "@/lib/utils";
import { deleteOrder } from "@/actions/order";
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

import type { ClientData } from "@/schemas/client";
import type { OrderData } from "@/schemas/order";

export function OrdersTable({ orders }: { orders: OrderData[] }) {
  const table = useReactTable<OrderData>({
    columns: [
      { accessorKey: "number", header: "Número" },
      {
        accessorKey: "clientId",
        header: "Cliente",
        cell: ({ row }) => (
          <OrderTableClientCell client={row.original.client} />
        ),
      },
      {
        accessorKey: "date",
        header: "Data",
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatMoney(row.original.total),
      },
      { accessorKey: "state", header: "Situação" },
      {
        accessorKey: "more",
        header: "",
        cell: ({ row }) => <OrderTableRowMenu order={row.original} />,
      },
    ],
    data: orders,
    getCoreRowModel: getCoreRowModel(),
  });

  return <DataTable table={table} />;
}

function OrderTableRowMenu({ order }: { order: OrderData }) {
  async function handleDelete() {
    const deletingOrder = await deleteOrder(order.number);

    if (deletingOrder.ok) {
      toast.success(deletingOrder.message);
      return;
    }

    if (deletingOrder.status < 500) {
      toast.warning(deletingOrder.message);
    }

    toast.error(deletingOrder.message);
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
              <Link href={`/pedidos/${order.number}`}>
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
            Isso irá excluir permanentemente esse pedido.
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

function OrderTableClientCell({ client }: { client: ClientData }) {
  return (
    <Link href={`clientes/${client.id}`} target="_blank">
      {client.name}
    </Link>
  );
}
