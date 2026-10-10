import { describe, it, expect } from "vitest";
import { RbacService, PERMISSIONS } from "@/lib/permissions/rbac";
import { ROLES } from "@/types";

describe("RBAC Permissions Matrix", () => {
  it("grants SUPER_ADMIN unrestricted permission", () => {
    expect(RbacService.hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.INVENTORY_DELETE)).toBe(true);
    expect(RbacService.hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.PAYROLL_MANAGE)).toBe(true);
    expect(RbacService.hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.SYSTEM_RESET)).toBe(true);
  });

  it("restricts OPERATIONS_STAFF from destructive actions", () => {
    expect(RbacService.hasPermission(ROLES.OPERATIONS_STAFF, PERMISSIONS.INVENTORY_DELETE)).toBe(false);
    expect(RbacService.hasPermission(ROLES.OPERATIONS_STAFF, PERMISSIONS.SYSTEM_RESET)).toBe(false);
  });

  it("permits OPERATIONS_STAFF to record stock movements", () => {
    expect(RbacService.hasPermission(ROLES.OPERATIONS_STAFF, PERMISSIONS.INVENTORY_MOVE)).toBe(true);
  });

  it("permits FINANCE_MANAGER to access payroll and ledger", () => {
    expect(RbacService.hasPermission(ROLES.FINANCE_MANAGER, PERMISSIONS.PAYROLL_MANAGE)).toBe(true);
    expect(RbacService.hasPermission(ROLES.FINANCE_MANAGER, PERMISSIONS.FINANCE_MANAGE)).toBe(true);
  });
});
