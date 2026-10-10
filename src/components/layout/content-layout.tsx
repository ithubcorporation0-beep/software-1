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
        "flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in-50 duration-150",
        !fullWidth && "mx-auto max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  );
}
