import { ROLES } from '../../types';

export const PERMISSIONS = {
  // Inventory
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_EDIT: 'inventory:edit',
  INVENTORY_DELETE: 'inventory:delete',
  INVENTORY_MOVE: 'inventory:move',
  INVENTORY_AUDIT: 'inventory:audit',
  
  // Facilities
  WAREHOUSE_MANAGE: 'warehouse:manage',
  SUPPLIER_MANAGE: 'supplier:manage',

  // Sales & CRM
  CRM_MANAGE: 'crm:manage',
  SALES_MANAGE: 'sales:manage',

  // Finance
  FINANCE_VIEW: 'finance:view',
  FINANCE_MANAGE: 'finance:manage',

  // HR & Payroll
  HR_MANAGE: 'hr:manage',
  PAYROLL_MANAGE: 'payroll:manage',

  // System
  SYSTEM_RESET: 'system:reset',
  AUDIT_VIEW: 'audit:view'
};

const ROLE_PERMISSIONS_MAP = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),

  [ROLES.INVENTORY_MANAGER]: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_CREATE,
    PERMISSIONS.INVENTORY_EDIT,
    PERMISSIONS.INVENTORY_DELETE,
    PERMISSIONS.INVENTORY_MOVE,
    PERMISSIONS.INVENTORY_AUDIT,
    PERMISSIONS.WAREHOUSE_MANAGE,
    PERMISSIONS.SUPPLIER_MANAGE,
    PERMISSIONS.AUDIT_VIEW
  ],

  [ROLES.OPERATIONS_STAFF]: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_MOVE
  ],

  [ROLES.FINANCE_MANAGER]: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.PAYROLL_MANAGE,
    PERMISSIONS.SALES_MANAGE
  ],

  [ROLES.SALES_DIRECTOR]: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.CRM_MANAGE,
    PERMISSIONS.SALES_MANAGE
  ],

  [ROLES.HR_MANAGER]: [
    PERMISSIONS.HR_MANAGE,
    PERMISSIONS.PAYROLL_MANAGE
  ],

  [ROLES.VIEWER]: [
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.FINANCE_VIEW
  ]
};

export const RbacService = {
  hasPermission(role, permission) {
    if (!role) return false;
    const allowed = ROLE_PERMISSIONS_MAP[role] || [];
    return allowed.includes(permission);
  },

  canAccess(user, permission) {
    if (!user || !user.role) return false;
    return this.hasPermission(user.role, permission);
  }
};
