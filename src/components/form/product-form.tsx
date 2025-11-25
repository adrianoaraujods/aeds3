"use client";

import * as React from "react";
import Link from "next/link";

import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";

import { useAppForm } from "@/hooks/use-app-form";
import { createProduct, updateProduct } from "@/actions/product";
import { DrawingSelect } from "@/components/form/drawing-select";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";
import { DEAFULT_DRAWING } from "@/schemas/drawing";
import { productDataSchema, UNITS } from "@/schemas/product";

import { PlusIcon, XIcon } from "lucide-react";

import type { DrawingData } from "@/schemas/drawing";
import type { ProductData } from "@/schemas/product";

type ProductFormProps = {
  initialValues: ProductData;
  type: "create" | "edit";
  canEdit?: boolean;
  setCanEdit?: React.Dispatch<React.SetStateAction<boolean>>;
};

export function ProductForm({
  initialValues,
  type,
  canEdit,
  setCanEdit,
}: ProductFormProps) {
  const [selectedDrawing, setSelectedDrawing] =
    React.useState<DrawingData>(DEAFULT_DRAWING);

  const form = useAppForm({
    defaultValues: initialValues,
    validationLogic: revalidateLogic({ mode: "blur" }),
    validators: { onDynamic: productDataSchema },
    onSubmit: async ({ value }) => {
      const uniqueDrawings = [
        ...new Set(value.drawings.map(({ number }) => number)),
      ];

      if (uniqueDrawings.length !== value.drawings.length) {
        toast.error("Existem desenhos com número repetidos.");
        return;
      }

      if (type === "create") {
        handleCreate(value);
      } else {
        handleEdit(value);
      }

      setSelectedDrawing(DEAFULT_DRAWING);
    },
  });

  async function handleCreate(product: ProductData) {
    const creatingProduct = await createProduct(product);

    if (creatingProduct.ok) {
      const createdProduct = creatingProduct.data;

      toast.success(creatingProduct.message, {
        action: (
          <Button className="ml-auto" variant="outline" asChild>
            <Link href={`/produtos/${createdProduct.id}`}>Abrir</Link>
          </Button>
        ),
      });

      form.reset();
      return;
    }

    // if the product was not created and the some drawings were
    const createdDrawings = creatingProduct.data;

    for (let i = 0, j = 0; i < createdDrawings.length; i++) {
      while (!product.drawings[j].isNew) j++;

      form.fieldInfo.drawings.instance!.replaceValue(j, {
        ...createdDrawings[i],
        isNew: false,
      });
    }

    if (creatingProduct.status < 500) {
      toast.warning(creatingProduct.message);
      return;
    }

    toast.error(creatingProduct.message, {
      action: (
        <Button onClick={() => handleCreate(product)}>Tente novamente</Button>
      ),
    });
  }

  async function handleEdit(product: ProductData) {
    const updatingProduct = await updateProduct(product);

    if (updatingProduct.ok) {
      toast.success(updatingProduct.message);

      if (setCanEdit) setCanEdit(false);
      return;
    }

    if (updatingProduct.status < 500) {
      toast.warning(updatingProduct.message);
      return;
    }

    toast.error(updatingProduct.message, {
      action: (
        <Button onClick={() => handleEdit(product)}>Tente novamente</Button>
      ),
    });
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="grid gap-4 lg:grid-cols-[auto_auto_auto]">
        <form.AppField
          name="code"
          children={(field) => (
            <field.TextField
              label="Código"
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="description"
          children={(field) => (
            <field.TextField
              label="Descrição"
              disabled={canEdit === false}
              required
            />
          )}
        />

        <form.AppField
          name="unit"
          children={(field) => (
            <field.SelectField
              label="Unidade de Medida"
              options={UNITS.map((unit) => ({ value: unit, title: unit }))}
              triggerProps={{ disabled: canEdit === false }}
            />
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Heading element="span" className="mb-2 border-b">
          Desenhos
        </Heading>

        <form.AppField
          name="drawings"
          children={(field) => (
            <>
              <div className="mb-4 flex items-center gap-4">
                <DrawingSelect
                  drawing={selectedDrawing}
                  setDrawing={setSelectedDrawing}
                  disabled={canEdit === false}
                />

                <Button
                  className="size-8 rounded-full"
                  size="icon"
                  type="button"
                  onClick={() => field.pushValue(selectedDrawing)}
                  disabled={canEdit === false}
                >
                  <PlusIcon />
                </Button>
              </div>

              {field.state.value.length > 0 && (
                <div className="flex flex-col">
                  <header className="grid grid-cols-[1fr_1fr_36px] gap-2">
                    <Text>Número</Text>
                    <Text>URL</Text>
                  </header>

                  <ul className="flex flex-col gap-2">
                    {field.state.value.map(({ isNew }, i) => (
                      <li
                        className="grid grid-cols-[1fr_1fr_36px] gap-2"
                        key={i}
                      >
                        <form.AppField
                          name={`drawings[${i}].number`}
                          children={(subfield) => (
                            <subfield.TextField
                              disabled={!isNew || canEdit === false}
                            />
                          )}
                        />

                        <form.AppField
                          name={`drawings[${i}].url`}
                          children={(subfield) => (
                            <subfield.TextField
                              disabled={!isNew || canEdit === false}
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
              setSelectedDrawing(DEAFULT_DRAWING);

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
