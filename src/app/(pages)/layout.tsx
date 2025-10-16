import * as React from "react";

import { Toaster } from "sonner";

import { loadData } from "@/actions/data";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DataProvider } from "@/components/layout/data-provider";
import { Section } from "@/components/layout/section";
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

        <SidebarInset className="overflow-x-hidden">
          <Section asChild>
            <main>{children}</main>
          </Section>
        </SidebarInset>
      </SidebarProvider>

      <Toaster position="top-center" richColors />
    </DataProvider>
  );
}
