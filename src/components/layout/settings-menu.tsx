"use client";

import * as React from "react";

import { useTheme } from "next-themes";
import { toast } from "sonner";

import { createBackup, loadBackup } from "@/actions/backup";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SettingsIcon } from "lucide-react";

import type { Theme } from "@/lib/config";

export function SettingsMenu({
  children,
  asChild = true,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger>) {
  const { theme: currentTheme, setTheme } = useTheme();

  const themes: {
    [key in Theme]: string;
  } = {
    dark: "Escuro",
    light: "Claro",
    system: "Sistema",
  };

  async function handleCreateBackup(type: Parameters<typeof createBackup>[0]) {
    const creatingBackup = await createBackup(type);

    if (creatingBackup.ok) {
      toast.success("Backup criado com sucesso!");
    } else {
      toast.error(creatingBackup.message || "Não foi possível criar o backup.");
    }
  }

  async function handleLoadBackup() {
    const loadingBackup = await loadBackup();

    if (loadingBackup.ok) {
      toast.success("Backup carregado com sucesso!");
    } else {
      toast.error(
        loadingBackup.message || "Não foi possível carregar o backup."
      );
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger {...props} asChild={asChild}>
        <Button size="icon" variant="ghost">
          {children || <SettingsIcon />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Backup</DropdownMenuSubTrigger>

          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={async () => handleCreateBackup("lzw")}>
                Criar backup com LWZ
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={async () => handleCreateBackup("huffman")}
              >
                Criar backup com Huffman
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => handleLoadBackup()}>
                Carregar Último Backup
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Alterar tema</DropdownMenuSubTrigger>

          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {Object.keys(themes).map((theme) => (
                <DropdownMenuCheckboxItem
                  key={theme}
                  checked={theme === currentTheme}
                  onCheckedChange={() => setTheme(theme)}
                >
                  {themes[theme as Theme]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
