import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";

describe("Badge component", () => {
  it("renders with default styling", () => {
    render(<Badge>Default Badge</Badge>);
    expect(screen.getByText("Default Badge")).toBeInTheDocument();
  });

  it("renders success variant styling", () => {
    render(<Badge variant="success">Active</Badge>);
    const badge = screen.getByText("Active");
    expect(badge.className).toContain("text-emerald-700");
  });

  it("renders warning variant styling", () => {
    render(<Badge variant="warning">Pending</Badge>);
    const badge = screen.getByText("Pending");
    expect(badge.className).toContain("text-amber-700");
  });
});
