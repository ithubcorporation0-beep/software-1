import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Sidebar navigation shell", () => {
  it("renders workspace branding and main PRD navigation items", () => {
    render(<Sidebar />);
    expect(screen.getByText("IT-HUB ERP")).toBeInTheDocument();
    expect(screen.getByText("Global Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("CRM")).toBeInTheDocument();
    expect(screen.getByText("Sales and invoicing")).toBeInTheDocument();
    expect(screen.getByText("Finance and expenses")).toBeInTheDocument();
    expect(screen.getByText("HR and attendance")).toBeInTheDocument();
    expect(screen.getByText("Payroll")).toBeInTheDocument();
    expect(screen.getByText("Projects and tasks")).toBeInTheDocument();
    expect(screen.getByText("Inventory and purchasing")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Company settings")).toBeInTheDocument();
  });

  it("supports collapse and expand toggle", () => {
    render(<Sidebar />);
    const toggleBtn = screen.getByRole("button", { name: /collapse sidebar/i });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });
});
