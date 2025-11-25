import * as React from "react";

import { toast } from "sonner";

import { loadKeys } from "@/actions/keys";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Section } from "@/components/layout/section";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const loadingKeys = await loadKeys();

  if (loadingKeys.status !== 200) {
    if (loadingKeys.ok) {
      toast.success(loadingKeys.message);
    } else {
      toast.error(loadingKeys.message);
    }
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar />

        <SidebarInset className="overflow-x-hidden">
          <Section asChild>
            <main>{children}</main>
          </Section>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
