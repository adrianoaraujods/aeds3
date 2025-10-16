"use client";

import * as React from "react";
import Link from "next/link";

import { revalidateLogic } from "@tanstack/react-form";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";
import z from "zod";

import { useAppForm } from "@/hooks/use-app-form";
import { useData } from "@/hooks/use-data";
import { drawingSchema, productSchema, UNITS } from "@/lib/schemas";
import { createDrawing, getDrawing, updateDrawing } from "@/actions/drawing";
import { createProduct, deleteProduct, updateProduct } from "@/actions/product";
import { DEAFULT_DRAWING, DrawingSelect } from "@/components/layout/drawing";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  EllipsisIcon,
  EyeIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import type { Drawing, Product } from "@/lib/schemas";

const formProductSchema = productSchema.extend({
  id: z.number(),
  drawings: z.array(drawingSchema.extend({ id: z.number() })),
});

export type FormProduct = z.infer<typeof formProductSchema>;

type ProductFormProps = {
  initialValues: FormProduct;
  type: "create" | "edit";
  canEdit?: boolean;
  setCanEdit?: React.Dispatch<React.SetStateAction<boolean>>;
};

export const DEFAULT_PRODUCT: FormProduct = {
  id: 0,
  code: "",
  description: "",
  drawings: [],
  unit: "UN",
};

function ProductForm({
  initialValues,
  type,
  canEdit,
  setCanEdit,
}: ProductFormProps) {
  const { setData } = useData();
  const [selectedDrawing, setSelectedDrawing] =
    React.useState<Drawing>(DEAFULT_DRAWING);

  const form = useAppForm({
    defaultValues: initialValues,
    validationLogic: revalidateLogic({ modeAfterSubmission: "blur" }),
    validators: { onDynamic: formProductSchema },
    onSubmit: async ({ value }) => {
      const drawingsIds: Drawing["id"][] = [];

      const uniqueDrawings = [
        ...new Set(value.drawings.map(({ number }) => number)),
      ];

      if (uniqueDrawings.length !== value.drawings.length) {
        toast.error("Existem desenhos com número repetidos.");
        return;
      }

      for (let i = 0; i < value.drawings.length; i++) {
        const drawing = value.drawings[i];

        if (drawing.id === 0) {
          const res = await createDrawing(drawing);

          if (!res.ok) {
            switch (res.status) {
              case 409:
                toast.error(
                  `Já existe um desenho com esse número: '${drawing.number}'`
                );
                break;
              default:
                toast.error(
                  `Houve algum problem ao salvar o desenho: '${drawing.number}'`
                );
            }

            return;
          }

          drawingsIds.push(res.data.id);

          setData((prev) => ({
            ...prev,
            drawings: [...prev.drawings, res.data],
          }));

          form.fieldInfo.drawings.instance!.replaceValue(i, res.data);
        } else {
          const res = await getDrawing(drawing.id);

          if (!res.ok) {
            toast.error(
              `Houve algum problem ao atualizar o desenho: '${drawing.number}'`
            );
            return;
          }

          if (
            drawing.number !== res.data.number ||
            drawing.url !== res.data.url
          ) {
            const res = await updateDrawing(drawing);

            if (!res.ok) {
              toast.error(
                `Houve algum problem ao atualizar o desenho: '${drawing.number}'`
              );
              return;
            }

            setData((prev) => {
              const drawings = [...prev.drawings];

              for (let i = 0; i < drawings.length; i++) {
                if (drawings[i].id === res.data.id) {
                  drawings[i] = res.data;
                  break;
                }
              }

              return { ...prev, drawings };
            });

            form.fieldInfo.drawings.instance!.replaceValue(i, res.data);
          }

          drawingsIds.push(res.data.id);
        }
      }

      const product: Product = {
        ...value,
        drawings: drawingsIds,
      };

      if (type === "create") {
        handleCreate(product);
        form.reset();
      } else {
        handleEdit(product);
      }

      setSelectedDrawing(DEAFULT_DRAWING);
    },
  });

  async function handleCreate(product: Omit<Product, "id">) {
    const res = await createProduct(product);

    if (res.ok) {
      setData((prev) => ({
        ...prev,
        products: [...prev.products, res.data],
      }));

      toast.success("Produto criado com sucesso!", {
        action: (
          <Button className="ml-auto" variant="outline" asChild>
            <Link href={`/produtos/${res.data.id}`}>Abrir</Link>
          </Button>
        ),
      });

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o produto. Confira os dados do produto."
        );
        break;
      case 409:
        toast.warning("Esse produto já existe.");
        break;
      default:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o produto, tente novamente."
        );
        break;
    }
  }

  async function handleEdit(product: Product) {
    const res = await updateProduct(product);

    if (res.ok) {
      setData((prev) => {
        const products = [...prev.products];

        for (let i = 0; i < products.length; i++) {
          if (products[i].id === res.data.id) {
            products[i] = res.data;
            break;
          }
        }

        return { ...prev, products };
      });

      if (setCanEdit) {
        setCanEdit(false);
      }

      toast.success("Produto modificado com sucesso!");

      return;
    }

    switch (res.status) {
      case 400:
        toast.warning(
          "Não foi possível salvar o produto. Confira os dados do produto."
        );
        break;
      case 404:
        toast.warning("Esse produto não foi encontrado.");
        break;
      case 409:
        toast.warning("Já existe algum produto com esses dados.");
        break;
      default:
        toast.error(
          "Erro interno do servidor. Não foi possível salvar o produto.",
          {
            action: (
              <Button onClick={() => handleEdit(product)}>
                Tente novamente
              </Button>
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
                  disabled={!canEdit}
                />

                <Button
                  className="size-8 rounded-full"
                  size="icon"
                  type="button"
                  onClick={() => field.pushValue(selectedDrawing)}
                  disabled={!canEdit}
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
                    {field.state.value.map((_, i) => (
                      <li
                        className="grid grid-cols-[1fr_1fr_36px] gap-2"
                        key={i}
                      >
                        <form.AppField
                          name={`drawings[${i}].number`}
                          children={(subfield) => (
                            <subfield.TextField disabled={!canEdit} />
                          )}
                        />

                        <form.AppField
                          name={`drawings[${i}].url`}
                          children={(subfield) => (
                            <subfield.TextField disabled={!canEdit} />
                          )}
                        />

                        <Button
                          className="rounded-full"
                          variant="destructive"
                          size="icon"
                          type="button"
                          onClick={() => field.removeValue(i)}
                          disabled={!canEdit}
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

function ProductTable() {
  const { data } = useData();

  const table = useReactTable<Product>({
    columns: [
      { accessorKey: "code", header: "Código" },
      { accessorKey: "description", header: "Descrição" },
      { accessorKey: "unit", header: "U.D.M." },
      {
        accessorKey: "drawings",
        header: "Desenhos",
        cell: ({ row }) => (
          <ProductTableDrawingsCell drawingsIds={row.original.drawings} />
        ),
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

function ProductTableRowMenu({ product }: { product: Product }) {
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

function ProductTableDrawingsCell({
  drawingsIds,
}: {
  drawingsIds: Drawing["id"][];
}) {
  const { data } = useData();

  const drawings = React.useMemo(() => {
    const targets = new Set(drawingsIds);
    const drawings: Drawing[] = [];

    for (const drawing of data.drawings) {
      if (targets.has(drawing.id)) {
        drawings.push(drawing);
        targets.delete(drawing.id);

        if (targets.size === 0) break;
      }
    }

    if (targets.size !== 0) {
      toast.warning(
        `Falha ao carregar os desenhos com ids: ${[...targets].join(", ")}`
      );
    }

    return drawings;
  }, [data, drawingsIds]);

  return (
    <span>
      {drawings.map(({ id, number, url }, i) => (
        <React.Fragment key={id}>
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
}

export { ProductForm, ProductTable };
