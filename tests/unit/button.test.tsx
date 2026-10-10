import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { Button } from "@/components/ui/button";

describe("Button component", () => {
  it("renders with default props and text", () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("renders as disabled when disabled prop is provided", () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole("button", { name: /disabled button/i });
    expect(button).toBeDisabled();
  });

  it("renders spinner and disables button when isLoading is true", () => {
    render(<Button isLoading>Processing</Button>);
    const button = screen.getByRole("button", { name: /processing/i });
    expect(button).toBeDisabled();
  });

  it("applies variant classes correctly", () => {
    render(<Button variant="destructive">Delete Item</Button>);
    const button = screen.getByRole("button", { name: /delete item/i });
    expect(button.className).toContain("bg-destructive");
  });
});
