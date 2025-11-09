"use client";

import * as React from "react";
import Link from "next/link";

import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";

import { useAppForm } from "@/hooks/use-app-form";
import { useData } from "@/hooks/use-data";
import { createOrder, updateOrder } from "@/actions/order";
import { ClientSelect } from "@/components/form/client-select";
import { ProductSelect } from "@/components/form/product-select";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DEFAULT_ORDER_ITEM, orderDataSchema } from "@/schemas/order";
import { DEFAULT_PRODUCT } from "@/schemas/product";

import { PlusIcon, XIcon } from "lucide-react";

import type { OrderData } from "@/schemas/order";
import type { ProductData } from "@/schemas/product";

type OrderFormProps = {
  initialValues: OrderData;
  type: "create" | "edit";
  canEdit?: boolean;
  setCanEdit?: React.Dispatch<React.SetStateAction<boolean>>;
};

export function OrderForm({
  initialValues,
  type,
  canEdit,
  setCanEdit,
}: OrderFormProps) {
  const { setData } = useData();

  const [selectedProduct, setSelectedProduct] =
    React.useState<ProductData>(DEFAULT_PRODUCT);

  const form = useAppForm({
    defaultValues: initialValues,
    validationLogic: revalidateLogic({ mode: "blur" }),
    validators: { onDynamic: orderDataSchema },
    onSubmitInvalid: ({ formApi }) => {
      console.log(formApi.getAllErrors());
    },
    onSubmit: async ({ value }) => {
      if (type === "create") {
        handleCreate(value);
      } else {
        handleEdit(value);
      }

      return;
    },
  });

  async function handleCreate(order: OrderData) {
    const res = await createOrder(order);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        orders: [...prev.orders, res.data],
      }));

      toast.success("Pedido criado com sucesso!", {
        action: (
          <Button className="ml-auto" variant="outline" asChild>
            <Link href={`/pedidos/${res.data.number}`}>Abrir</Link>
          </Button>
        ),
      });

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o pedido. Confira os dados do pedido."
        );
        break;
      case 409:
        toast.warning("Esse pedido já existe.");
        break;
      default:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o pedido, tente novamente."
        );
        break;
    }
  }

  async function handleEdit(order: OrderData) {
    const res = await updateOrder(order);

    if (res.ok) {
      setData((prev) => {
        const orders = [...prev.orders];

        for (let i = 0; i < orders.length; i++) {
          if (orders[i].number === res.data.number) {
            orders[i] = res.data;
            break;
          }
        }

        return { ...prev, orders };
      });

      if (setCanEdit) {
        setCanEdit(false);
      }

      toast.success("Pedido modificado com sucesso!");

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o pedido. Confira os dados do pedido."
        );
        break;
      case 404:
        toast.warning("Esse pedido não foi encontrado.");
        break;
      case 409:
        toast.warning("Já existe algum pedido com esses dados.");
        break;
      default:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o pedido.",
          {
            action: (
              <Button onClick={() => handleEdit(order)}>Tente novamente</Button>
            ),
          }
        );
        break;
    }
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <form.AppField
          name="number"
          children={(field) => (
            <field.TextField
              label="Número"
              disabled={type === "edit"}
              required
            />
          )}
        />

        <form.AppField
          name="date"
          children={(field) => (
            <field.DateField
              label="Data"
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="clientId"
          children={(field) => (
            <div className="grid gap-2">
              <Label
                className="data-[error=true]:text-destructive line-clamp-1 text-nowrap text-ellipsis"
                data-error={field.state.meta.errors.length > 0}
              >
                Cliente
              </Label>

              <ClientSelect
                className="w-full"
                clientId={field.state.value}
                setClientId={field.setValue}
                disabled={canEdit === false}
              />

              <Text size="sm" variant="destructive">
                {field.state.meta.errors.length > 0 &&
                  field.state.meta.errors.map((error, i) => (
                    <em role="alert" key={i}>
                      {error!.message}
                    </em>
                  ))}
              </Text>
            </div>
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Heading element="span" className="mb-2 border-b">
          Items
        </Heading>

        <form.AppField
          name="items"
          children={(field) => (
            <>
              <div className="mb-4 flex items-center gap-4">
                <Label>Produto:</Label>

                <ProductSelect
                  product={selectedProduct}
                  setProduct={setSelectedProduct}
                  disabled={canEdit === false}
                />

                <Button
                  className="size-8 rounded-full"
                  size="icon"
                  type="button"
                  onClick={() =>
                    field.pushValue({
                      ...DEFAULT_ORDER_ITEM,
                      product: selectedProduct,
                    })
                  }
                  disabled={canEdit === false || selectedProduct.id === 0}
                >
                  <PlusIcon />
                </Button>
              </div>

              {field.state.value.length > 0 && (
                <div className="flex flex-col">
                  <header className="grid grid-cols-[1fr_1fr_3fr_1fr_1fr_36px] gap-2">
                    <Text>Item</Text>
                    <Text>Código</Text>
                    <Text>Descrição</Text>
                    <Text>Preço</Text>
                    <Text>Quantidade</Text>
                  </header>

                  <ul className="flex flex-col gap-2">
                    {field.state.value.map((_, i) => (
                      <li
                        className="grid grid-cols-[1fr_1fr_3fr_1fr_1fr_36px] gap-2"
                        key={i}
                      >
                        <form.AppField
                          name={`items[${i}].item`}
                          children={(subfield) => (
                            <subfield.TextField disabled={canEdit === false} />
                          )}
                        />

                        <form.AppField
                          name={`items[${i}].product.code`}
                          children={(subfield) => (
                            <subfield.TextField disabled />
                          )}
                        />

                        <form.AppField
                          name={`items[${i}].product.description`}
                          children={(subfield) => (
                            <subfield.TextField disabled />
                          )}
                        />

                        <form.AppField
                          name={`items[${i}].price`}
                          children={(subfield) => (
                            <subfield.NumberField
                              disabled={canEdit === false}
                            />
                          )}
                        />

                        <form.AppField
                          name={`items[${i}].amount`}
                          children={(subfield) => (
                            <subfield.NumberField
                              disabled={canEdit === false}
                            />
                          )}
                        />

                        <Button
                          className="rounded-full"
                          variant="destructive"
                          size="icon"
                          type="button"
                          onClick={() => field.removeValue(i)}
                          disabled={canEdit === false}
                        >
                          <XIcon />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Text size="sm" variant="destructive">
                {field.state.meta.errors.length > 0 &&
                  field.state.meta.errors.map((error, i) => (
                    <em role="alert" key={i}>
                      {error!.message}
                    </em>
                  ))}
              </Text>
            </>
          )}
        />
      </div>

      {(type === "create" || canEdit) && (
        <footer className="flex flex-row-reverse gap-2">
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
              form.reset();

              if (setCanEdit) {
                setCanEdit(false);
              }
            }}
            variant="outline"
            type="reset"
          >
            Cancelar
          </Button>
        </footer>
      )}
    </form>
  );
}
