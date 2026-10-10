/**
 * @file Integration tests for RBAC Permissions Matrix
 */

import { RbacService, PERMISSIONS } from '../../src/lib/permissions/rbac';
import { ROLES } from '../../src/types';

export function runRbacIntegrationTests() {
  const results = [];

  // Super Admin can do everything
  const adminCanDelete = RbacService.hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.INVENTORY_DELETE);
  results.push({
    test: 'SUPER_ADMIN has INVENTORY_DELETE permission',
    passed: adminCanDelete === true
  });

  // Operations Staff cannot delete products or adjust audits
  const opsCanDelete = RbacService.hasPermission(ROLES.OPERATIONS_STAFF, PERMISSIONS.INVENTORY_DELETE);
  results.push({
    test: 'OPERATIONS_STAFF cannot delete products',
    passed: opsCanDelete === false
  });

  // Operations Staff CAN record stock movements
  const opsCanMove = RbacService.hasPermission(ROLES.OPERATIONS_STAFF, PERMISSIONS.INVENTORY_MOVE);
  results.push({
    test: 'OPERATIONS_STAFF can record stock movements',
    passed: opsCanMove === true
  });

  // Finance Manager can access finance and payroll
  const finCanPayroll = RbacService.hasPermission(ROLES.FINANCE_MANAGER, PERMISSIONS.PAYROLL_MANAGE);
  results.push({
    test: 'FINANCE_MANAGER can manage payroll',
    passed: finCanPayroll === true
  });

  return results;
}
