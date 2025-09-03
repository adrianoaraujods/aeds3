"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAVIGATION } from "@/lib/config";
import { cn } from "@/lib/utils";
import Logo from "@/components/icons/logo";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { Heading } from "@/components/typography/heading";
import { Text } from "@/components/typography/text";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

function AppSidebar() {
  const { open } = useSidebar();
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Button variant="ghost" asChild>
          <Link href="/">
            <Logo className="size-6" />

            <Heading size="2xl" className="mr-auto" hidden={!open}>
              Lafaiete
            </Heading>
          </Link>
        </Button>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        {NAVIGATION.map(({ title, items }) => (
          <SidebarGroup key={title}>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map(({ title, url, icon: Icon }) => (
                  <SidebarMenuItem key={title}>
                    <SidebarMenuButton
                      isActive={pathname.includes(url)}
                      tooltip={title}
                      asChild
                    >
                      <Link href={url}>
                        <Icon />

                        <Text>{title}</Text>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem
            className={cn(
              "flex flex-row justify-between",
              !open && "flex-col-reverse"
            )}
          >
            <SidebarMenuButton
              className="w-fit"
              tooltip={open ? "Colapsar barra" : "Expandir barra"}
              asChild
            >
              <SidebarTrigger />
            </SidebarMenuButton>

            <SidebarMenuButton
              className="w-fit"
              tooltip="Configurações"
              asChild
            >
              <SettingsMenu />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export { AppSidebar };
