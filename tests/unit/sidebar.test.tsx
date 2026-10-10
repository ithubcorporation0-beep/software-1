import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Sidebar navigation shell", () => {
  it("renders workspace branding and main navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("IT-HUB ERP")).toBeInTheDocument();
    expect(screen.getByText("Global Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Executive Radar")).toBeInTheDocument();
    expect(screen.getByText("Inventory & Stock")).toBeInTheDocument();
    expect(screen.getByText("CRM & Accounts")).toBeInTheDocument();
  });

  it("marks future modules with phase tags", () => {
    render(<Sidebar />);
    expect(screen.getAllByText("Phase 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Phase 3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Phase 4").length).toBeGreaterThan(0);
  });
});
