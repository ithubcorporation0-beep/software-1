import * as React from "react";
import { cn } from "@/lib/utils";

export interface ContentLayoutProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function ContentLayout({
  children,
  className,
  fullWidth = false,
}: ContentLayoutProps) {
  return (
    <div
      className={cn(
        "flex-1 p-2 sm:p-3.5 lg:p-4 animate-in fade-in-50 duration-150 w-full",
        !fullWidth && "max-w-[1750px] mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}
