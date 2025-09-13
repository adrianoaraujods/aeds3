import * as React from "react";

import { loadData } from "@/actions/data";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DataProvider } from "@/components/layout/data-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataProvider initialData={loadData()}>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset>
          <main>{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </DataProvider>
  );
}
