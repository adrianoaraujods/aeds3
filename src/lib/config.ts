import {
  BoxesIcon,
  Building2Icon,
  ClipboardListIcon,
  ClipboardPenLineIcon,
  FileTextIcon,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

export type Theme = (typeof THEMES)[number];
export const THEMES = ["light", "dark", "system"] as const;

export type NavigationLink = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type Navigation = {
  title: string;
  items: NavigationLink[];
}[];

export const NAVIGATION: Navigation = [
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
