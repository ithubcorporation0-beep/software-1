import * as React from "react";
import { ErpShell } from "@/components/layout/erp-shell";

export default function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErpShell>{children}</ErpShell>;
}
