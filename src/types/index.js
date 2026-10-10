/**
 * @file IT-HUB ERP Core Domain Types and Data Contracts
 */

/**
 * @typedef {'SUPER_ADMIN' | 'FINANCE_MANAGER' | 'INVENTORY_MANAGER' | 'SALES_DIRECTOR' | 'HR_MANAGER' | 'OPERATIONS_STAFF' | 'VIEWER'} UserRole
 */

/**
 * @typedef {'In Stock' | 'Low Stock' | 'Critical Low' | 'Out of Stock'} ProductStockStatus
 */

/**
 * @typedef {'Stock In' | 'Stock Out' | 'Audit Adjustment'} StockMovementType
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} sku
 * @property {string} [barcode]
 * @property {string} name
 * @property {string} category
 * @property {string} warehouseId
 * @property {string} [binLocation]
 * @property {number} costPrice
 * @property {number} sellingPrice
 * @property {number} currentStock
 * @property {number} minThreshold
 * @property {number} maxCapacity
 * @property {string} unit
 * @property {string} [supplierId]
 * @property {string} [description]
 * @property {ProductStockStatus} status
 * @property {string} [lastRestocked]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} StockMovement
 * @property {string} id
 * @property {string} productId
 * @property {string} productName
 * @property {string} sku
 * @property {StockMovementType} type
 * @property {number} quantity
 * @property {string} warehouseId
 * @property {string} warehouseName
 * @property {string} reference
 * @property {string} operator
 * @property {string} [notes]
 * @property {string} timestamp
 */

/**
 * @typedef {Object} Warehouse
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} city
 * @property {number} capacity
 * @property {number} currentUsage
 * @property {string} manager
 * @property {string} email
 * @property {string} phone
 * @property {string} status
 */

/**
 * @typedef {Object} Supplier
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} category
 * @property {string} contactPerson
 * @property {string} email
 * @property {string} phone
 * @property {number} leadTimeDays
 * @property {number} rating
 * @property {string} status
 */

/**
 * @typedef {Object} Customer
 * @property {string} id
 * @property {string} name
 * @property {string} company
 * @property {string} email
 * @property {string} phone
 * @property {'Lead' | 'Prospect' | 'Active Customer' | 'Inactive'} status
 * @property {number} totalSpend
 */

/**
 * @typedef {Object} Employee
 * @property {string} id
 * @property {string} employeeCode
 * @property {string} fullName
 * @property {string} department
 * @property {string} designation
 * @property {string} email
 * @property {string} phone
 * @property {number} baseSalary
 * @property {'Active' | 'On Leave' | 'Terminated'} status
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  FINANCE_MANAGER: 'FINANCE_MANAGER',
  INVENTORY_MANAGER: 'INVENTORY_MANAGER',
  SALES_DIRECTOR: 'SALES_DIRECTOR',
  HR_MANAGER: 'HR_MANAGER',
  OPERATIONS_STAFF: 'OPERATIONS_STAFF',
  VIEWER: 'VIEWER'
};
