import { BoxesIcon, Building2Icon, ClipboardListIcon } from "lucide-react";

import type { LucideIcon } from "lucide-react";

export const DATA_FOLDER_PATH = "./data/";

type Theme = (typeof THEMES)[number];
const THEMES = ["light", "dark", "system"] as const;

type NavigationLink = {
  title: string;
  url: string;
  icon: LucideIcon;
};

type Navigation = {
  title: string;
  items: NavigationLink[];
}[];

export type SuccessCode = 200 | 201 | 204 | 209;
export type ErrorCode = 400 | 404 | 409 | 500 | 509;

type SuccessResponse<TData> = {
  ok: true;
  status?: SuccessCode;
  data: TData;
  message?: string;
};

type ErrorResponse<TData = void> = {
  ok: false;
  status: ErrorCode;
  message?: string;
} & (TData extends void ? { data?: never } : { data: TData });

type ActionResponse<TSuccess = void, TError = void> =
  | SuccessResponse<TSuccess>
  | ErrorResponse<TError>;

const NAVIGATION: Navigation = [
  {
    title: "Páginas",
    items: [
      { title: "Pedidos", url: "/pedidos", icon: ClipboardListIcon },
      // { title: "Cotações", url: "/cotacoes", icon: ClipboardPenLineIcon },
      // { title: "Notas Fiscais", url: "/notas-fiscais", icon: FileTextIcon },
      { title: "Clientes", url: "/clientes", icon: Building2Icon },
      { title: "Produtos", url: "/produtos", icon: BoxesIcon },
    ],
  },
];

export {
  NAVIGATION,
  THEMES,
  type ActionResponse,
  type Navigation,
  type NavigationLink,
  type Theme,
};
