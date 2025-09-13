import {
  BoxesIcon,
  Building2Icon,
  ClipboardListIcon,
  ClipboardPenLineIcon,
  FileTextIcon,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

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

type SuccessCode = 200 | 201 | 204 | 209;
type ErrorCode = 400 | 404 | 409 | 500 | 509;
type ResponseCode = SuccessCode | ErrorCode;

type Response<TData> = {
  ok: boolean;
  status?: ResponseCode;
  data?: TData;
  message?: string;
};

interface SuccessResponse<TData> extends Response<TData> {
  ok: true;
  status?: SuccessCode;
  data: TData;
  message?: string;
}

interface ErrorResponse<TData> extends Response<TData> {
  ok: false;
  status: ErrorCode;
  data?: TData;
  message?: string;
}

type ActionResponse<TData = void> =
  | SuccessResponse<TData>
  | ErrorResponse<TData>;

const NAVIGATION: Navigation = [
  {
    title: "Páginas",
    items: [
      { title: "Pedidos", url: "/pedidos", icon: ClipboardListIcon },
      { title: "Cotações", url: "/cotacoes", icon: ClipboardPenLineIcon },
      { title: "Notas Fiscais", url: "/notas-fiscais", icon: FileTextIcon },
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
