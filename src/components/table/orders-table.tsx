"use client";

import * as React from "react";
import Link from "next/link";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";

import { useData } from "@/hooks/use-data";
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
import { Client } from "@/schemas/client";
import { Order } from "@/schemas/order";

import { EllipsisIcon, EyeIcon, Trash2Icon } from "lucide-react";

export function OrdersTable() {
  const { data } = useData();

  const table = useReactTable<Order>({
    columns: [
      { accessorKey: "number", header: "Número" },
      {
        accessorKey: "clientId",
        header: "Cliente",
        cell: ({ row }) => (
          <OrderTableClientCell clientId={row.original.clientId} />
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
    data: data.orders,
    getCoreRowModel: getCoreRowModel(),
  });

  return <DataTable table={table} />;
}

function OrderTableRowMenu({ order }: { order: Order }) {
  const { setData } = useData();

  async function handleDelete() {
    const res = await deleteOrder(order.number);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        orders: prev.orders.filter(({ number }) => number !== order.number),
      }));

      toast.success("Pedido deletado com sucesso!");
      return;
    }

    switch (res.status) {
      case 409:
        toast.warning("Não é possível excluir um pedido com outros registros.");
        break;
      case 500:
        toast.error(
          "Erro interno do servidor. Não foi possível excluir o pedido, tente novamente."
        );
        break;
      default:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível excluir o pedido."
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

function OrderTableClientCell({ clientId }: { clientId: Client["id"] }) {
  const { data } = useData();

  const client = React.useMemo(() => {
    const client = data.clients.find(({ id }) => id === clientId);

    if (!client) {
      toast.warning(`Falha ao carregar o cliente de id: ${clientId}`);
    }

    return client;
  }, [data, clientId]);

  return (
    <Link href={`clientes/${clientId}`} target="_blank">
      {!client ? clientId : client.name}
    </Link>
  );
}
