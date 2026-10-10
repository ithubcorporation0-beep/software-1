import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function ErpShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Fixed Left Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main Area: Sticky Header + Scrollable Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/10">
          {children}
        </main>
      </div>
    </div>
  );
}
