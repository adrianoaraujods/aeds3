import z from "zod";

import { clientSchema } from "@/schemas/client";
import { DEFAULT_PRODUCT, productDataSchema } from "@/schemas/product";

export type State = (typeof ORDER_STATES)[number];
export const ORDER_STATES = [
  "Completo",
  "Atrasado",
  "Andamento",
  "Cancelado",
] as const;

export type Order = z.infer<typeof orderSchema>;
export const orderSchema = z.object({
  number: z
    .string()
    .min(1, "Esse campo deve ser preenchido.")
    .max(10, "O número deve ter no máximo 10 caracteres."), // primary key
  date: z.date("Data inválida."),
  total: z.number(), // sum of all items price times the amount
  state: z.enum([...ORDER_STATES]),
  clientId: clientSchema.shape.id.positive("Selecione um cliente."), // foreign key from Client
});

export type OrderItem = z.infer<typeof orderItemSchema>;
export const orderItemSchema = z.object({
  id: z.uint32(), // primary key
  item: z.string().min(1, "Esse campo deve ser preenchido."),
  deliver: z.date("Data inválida."),
  price: z.bigint().positive("Preço inválido."), // bigint due encryption
  amount: z.number().positive("Quantidade inválida."),

  productId: z.uint32(), // foreign key from Product
  orderNumber: orderSchema.shape.number, // foreign key from Order
});

export type OrderItemData = z.infer<typeof orderItemDataSchema>;
export const orderItemDataSchema = orderItemSchema
  .omit({ productId: true, orderNumber: true })
  .extend({
    id: z.int32(),
    product: productDataSchema,
    price: z.number().positive("Preço inválido."),
  });

export const DEFAULT_ORDER_ITEM: OrderItemData = {
  id: 0,
  amount: 0,
  deliver: new Date(),
  item: "",
  price: 0,
  product: DEFAULT_PRODUCT,
};

export type OrderData = z.infer<typeof orderDataSchema>;
export const orderDataSchema = orderSchema.extend({
  items: z
    .array(orderItemDataSchema)
    .min(1, "Um pedido deve ter ao menos 1 item"),
});

export const DEFAULT_ORDER: OrderData = {
  state: "Andamento",
  total: 0,
  date: new Date(),
  items: [],
  number: "",
  clientId: 0,
};
