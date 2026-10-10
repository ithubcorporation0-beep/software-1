import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { ComingSoonModule } from "@/components/shared/coming-soon-module";
import { Package } from "lucide-react";

describe("ComingSoonModule component", () => {
  it("renders module title and explicit later phase badge", () => {
    render(
      <ComingSoonModule
        moduleName="Inventory & Logistics"
        moduleCode="INV"
        targetPhase="Phase 2"
        icon={Package}
        description="Comprehensive SKU catalog and stock ledger."
        plannedFeatures={["Automated SKU Generator", "Multi-warehouse tracking"]}
      />
    );

    expect(screen.getByText("Inventory & Logistics")).toBeInTheDocument();
    expect(screen.getByText(/Coming in a later phase \(Phase 2\)/i)).toBeInTheDocument();
    expect(screen.getByText("Automated SKU Generator")).toBeInTheDocument();
    expect(screen.getByText("Multi-warehouse tracking")).toBeInTheDocument();
  });

  it("contains clear guidance that controls are not active", () => {
    render(
      <ComingSoonModule
        moduleName="CRM & Accounts"
        moduleCode="CRM"
        targetPhase="Phase 2"
        icon={Package}
        description="Customer directory."
        plannedFeatures={["Account pipeline"]}
      />
    );

    expect(
      screen.getByText(/interactive operational controls remain locked to prevent false or simulated state mutations/i)
    ).toBeInTheDocument();
  });
});
