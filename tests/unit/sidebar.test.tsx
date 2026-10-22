import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Sidebar navigation shell", () => {
  it("renders workspace branding and main desktop accounting navigation sections", () => {
    render(<Sidebar />);
    expect(screen.getByText("IT-HUB ERP")).toBeInTheDocument();
    expect(screen.getByText("Enterprise Edition")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Customers Center")).toBeInTheDocument();
    expect(screen.getByText("Vendors & Bills")).toBeInTheDocument();
    expect(screen.getByText("General Ledger & COA")).toBeInTheDocument();
    expect(screen.getByText("Items & Inventory")).toBeInTheDocument();
    expect(screen.getByText("FBR Digital Invoicing")).toBeInTheDocument();
    expect(screen.getByText("Report Center")).toBeInTheDocument();
    expect(screen.getByText("Company & Users")).toBeInTheDocument();
  });

  it("supports collapse and expand toggle", () => {
    render(<Sidebar />);
    const toggleBtn = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });
});
