import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function ErpShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f2f5] text-slate-900 antialiased font-sans">
      {/* Desktop Fixed Left Sidebar (Dark Charcoal QuickBooks Enterprise style) */}
      <Sidebar className="hidden md:flex" />

      {/* Main Desktop Window: Sticky Header + Scrollable Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#f0f2f5] p-2.5 sm:p-4 text-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
