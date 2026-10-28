"use client";

import { ThemeProvider } from "next-themes";
import { DbSyncProvider } from "@/components/DbSyncProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <DbSyncProvider>{children}</DbSyncProvider>
    </ThemeProvider>
  );
}
