"use client";

import * as React from "react";

import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { email } from "zod";

import { useAppForm } from "@/hooks/use-app-form";
import { useData } from "@/hooks/use-data";
import { CURRENCIES } from "@/lib/schemas";
import { createClient, deleteClient, updateClient } from "@/actions/client";
import { SelectOption } from "@/components/layout/form";
import { DataTable } from "@/components/table/data-table";
import { Heading } from "@/components/typography/heading";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react";

import type { Client, Currency } from "@/lib/schemas";

const currencies: { [currency in Currency]: Omit<SelectOption, "value"> } = {
  BRL: { title: "Real" },
  USD: { title: "Dólar" },
};

type ClientDialogProps = {
  initialValues: Client;
  trigger: React.ReactNode;
  type: "create" | "edit";
};

function ClientDialog({ initialValues, type, trigger }: ClientDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const { setData } = useData();

  const form = useAppForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      if (type === "create") {
        handleCreate(value);
      } else {
        handleEdit(value);
      }
    },
  });

  async function handleCreate(client: Omit<Client, "id">) {
    const res = await createClient(client);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        clients: [...prev.clients, res.data],
      }));

      setIsOpen(false);
      toast.success("Cliente criado com sucesso!");

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o cliente. Confira os dados do cliente."
        );
        break;
      case 409:
        toast.warning("Esse cliente já existe do cliente.");
        break;
      case 509:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível salvar o cliente."
        );
        break;
      default:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o cliente, tente novamente."
        );
        break;
    }
  }

  async function handleEdit(client: Client) {
    const res = await updateClient(client);

    if (res.ok) {
      setData((prev) => {
        const clients = [...prev.clients];

        for (let i = 0; i < clients.length; i++) {
          if (clients[i].id === initialValues.id) {
            clients[i] = res.data;
            break;
          }
        }

        return { ...prev, clients };
      });

      setIsOpen(false);
      toast.success("Cliente editado com sucesso!");

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o cliente. Confira os dados do cliente."
        );
        break;
      case 404:
        toast.warning("Esse cliente não foi encontrado.");
        break;
      case 409:
        toast.warning("Já existe algum cliente com esses dados.");
        break;
      case 509:
        toast.error(
          "Existem dados corrompidos no Banco de Dados. Não foi possível salvar o cliente."
        );
        break;
      default:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o cliente, tente novamente."
        );
        break;
    }
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {trigger}

        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>
              {type === "create"
                ? "Adicionar Cliente"
                : `Editar ${initialValues.name}`}
            </DialogTitle>

            <DialogDescription>
              Preencha os campos abaixo com os dados do cliente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <form.AppField
              name="name"
              validators={{
                onSubmit: ({ value }) => {
                  if (value.length < 1) {
                    return "Campo obrigatório";
                  }
                },
              }}
              children={(field) => <field.TextField label="Nome" required />}
            />

            <form.AppField
              name="socialName"
              validators={{
                onSubmit: ({ value }) => {
                  if (value.length < 1) {
                    return "Campo obrigatório";
                  }
                },
              }}
              children={(field) => (
                <field.TextField label="Razão Social" required />
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField
                name="document"
                validators={{
                  onSubmit: ({ value }) => {
                    if (value.length < 9) {
                      return "CPF inválido";
                    } else if (value.length > 11 && value.length < 14) {
                      return "CPNJ inválido";
                    }
                  },
                }}
                children={(field) => (
                  <field.DocumentNumberField
                    label="CPNJ / CPF"
                    placeholder="00.000.000/0000-00"
                    required
                  />
                )}
              />

              <form.AppField
                name="registration"
                validators={{
                  onSubmit: ({ value }) => {
                    if (value.length < 9 || value.length > 13) {
                      return "Instrição estadual inválida";
                    }
                  },
                }}
                children={(field) => (
                  <field.TextField label="Inscrição Estadual" required />
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField
                name="email"
                validators={{
                  onSubmit: ({ value }) => {
                    const parser = email().safeParse(value);

                    if (!parser.success) {
                      return "Email inválido";
                    }
                  },
                }}
                children={(field) => (
                  <field.TextField
                    label="E-mail"
                    type="email"
                    placeholder="contato@empresa.com"
                    required
                  />
                )}
              />

              <form.AppField
                name="cellphone"
                validators={{
                  onSubmit: ({ value }) => {
                    if (value.length < 8) {
                      return "Telefon inválido";
                    }
                  },
                }}
                children={(field) => (
                  <field.PhoneField
                    label="Telefone"
                    placeholder="(31) 3000-0000"
                    required
                  />
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <form.AppField
                name="payment"
                validators={{
                  onSubmit: ({ value }) => {
                    if (value < 0 || value > 255) {
                      return "Condição de pagamento inválida";
                    }
                  },
                }}
                children={(field) => (
                  <field.TextField
                    label="Condições de Pagamento"
                    placeholder="30"
                    type="number"
                    min={0}
                    max={255}
                    required
                  />
                )}
              />

              <form.AppField
                name="currency"
                children={(field) => (
                  <field.SelectField
                    label="Moeda"
                    defaultValue={CURRENCIES[0]}
                    options={Object.keys(currencies).map((currency) => ({
                      value: currency,
                      title: currencies[currency as Currency].title,
                    }))}
                  />
                )}
              />
            </div>

            <div>
              <Heading element="span" className="mb-2 border-b">
                Endereço
              </Heading>

              <div className="grid grid-cols-4 gap-2">
                <form.AppField
                  name="address.country"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (value.length < 1) {
                        return "Campo obrigatório";
                      }
                    },
                  }}
                  children={(field) => (
                    <field.TextField label="País" required />
                  )}
                />

                <form.AppField
                  name="address.state"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (value.length < 1) {
                        return "Campo obrigatório";
                      }
                    },
                  }}
                  children={(field) => (
                    <field.TextField label="Estado" required />
                  )}
                />

                <form.AppField
                  name="address.city"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (value.length < 1) {
                        return "Campo obrigatório";
                      }
                    },
                  }}
                  children={(field) => (
                    <field.TextField label="Cidade" required />
                  )}
                />

                <form.AppField
                  name="address.street"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (value.length < 1) {
                        return "Campo obrigatório";
                      }
                    },
                  }}
                  children={(field) => (
                    <field.TextField label="Logradouro" required />
                  )}
                />

                <form.AppField
                  name="address.number"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (value.length < 1) {
                        return "Campo obrigatório";
                      }
                    },
                  }}
                  children={(field) => (
                    <field.TextField label="Número" required />
                  )}
                />

                <form.AppField
                  name="address.district"
                  children={(field) => (
                    <field.TextField label="Bairro" required />
                  )}
                />

                <form.AppField
                  name="address.complement"
                  children={(field) => (
                    <field.TextField label="Complemento" required />
                  )}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                form.handleSubmit();
              }}
            >
              Salvar
            </Button>

            <Button
              onClick={(e) => {
                e.preventDefault();
                setIsOpen(false);
                form.reset();
              }}
              variant="outline"
              type="reset"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

function ClientTable() {
  const { data } = useData();

  const table = useReactTable<Client>({
    columns: [
      { accessorKey: "name", header: "Nome" },
      { accessorKey: "socialName", header: "Razão Social" },
      { accessorKey: "document", header: "CPNJ / CPF" },
      { accessorKey: "registration", header: "Inscrição Estadual" },
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
    <ClientDialog
      initialValues={client}
      type="edit"
      trigger={
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <EllipsisIcon className="size-5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DialogTrigger asChild>
                  <DropdownMenuItem>
                    <PencilIcon />

                    <Text>Editar</Text>
                  </DropdownMenuItem>
                </DialogTrigger>

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
                Essa ação não pode ser desfeita. Isso irá remover
                permanentemente esse cliente e todos os seus pedidos e cotações
                associados.
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
      }
    />
  );
}

export { ClientDialog, ClientTable };
