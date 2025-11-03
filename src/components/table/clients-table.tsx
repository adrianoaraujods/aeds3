"use client";

import * as React from "react";
import Link from "next/link";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";

import { useData } from "@/hooks/use-data";
import { formatCNPJ, formatCPF } from "@/lib/utils";
import { deleteClient } from "@/actions/client";
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

import type { Client } from "@/schemas/client";

export function ClientsTable() {
  const { data } = useData();

  const table = useReactTable<Client>({
    columns: [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "socialName", header: "Razão Social" },
      {
        accessorKey: "document",
        header: "CPNJ / CPF",
        cell: ({ getValue }) => {
          const value: string = getValue();

          return (
            <span className="font-mono">
              {value.length === 14 ? formatCNPJ(value) : formatCPF(value)}
            </span>
          );
        },
      },
      {
        accessorKey: "registration",
        header: "Inscrição Estadual",
        cell: ({ getValue }) => <span className="font-mono">{getValue()}</span>,
      },
      {
        accessorKey: "payment",
        header: "Condições de Pagamento",
        cell: ({ getValue }) => `${getValue()} dias`,
      },
      {
        accessorKey: "more",
        header: "",
        cell: ({ row }) => <ClientTableRowMenu client={row.original} />,
      },
    ],
    data: data.clients,
    getCoreRowModel: getCoreRowModel(),
  });

  return <DataTable table={table} />;
}

function ClientTableRowMenu({ client }: { client: Client }) {
  const { setData } = useData();

  async function handleDelete() {
    const res = await deleteClient(client.id);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        clients: prev.clients.filter(({ id }) => id !== client.id),
      }));

      toast.success("Cliente deletado com sucesso!");
      return;
    }

    switch (res.status) {
      case 409:
        toast.warning(
          "Não é possível excluir um cliente com outros registros."
        );
        break;
      case 500:
        toast.error(
          "Erro interno do servidor. Não foi possível excluir o cliente, tente novamente."
        );
        break;
      default:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível excluir o cliente."
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
              <Link href={`/clientes/${client.id}`}>
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
            Isso irá excluir permanentemente esse cliente.
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
