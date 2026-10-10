import {
  INITIAL_CATEGORIES,
  INITIAL_WAREHOUSES,
  INITIAL_SUPPLIERS,
  INITIAL_PRODUCTS,
  INITIAL_MOVEMENTS,
  INITIAL_ACTIVITIES
} from '../../data/initialData';
import { AuditService } from '../audit/auditService';

const DB_KEYS = {
  PRODUCTS: 'nexus_erp_products',
  CATEGORIES: 'nexus_erp_categories',
  WAREHOUSES: 'nexus_erp_warehouses',
  SUPPLIERS: 'nexus_erp_suppliers',
  MOVEMENTS: 'nexus_erp_movements',
  ACTIVITIES: 'nexus_erp_activities',
  CUSTOMERS: 'it_hub_erp_customers',
  EMPLOYEES: 'it_hub_erp_employees'
};

const INITIAL_CUSTOMERS = [
  { id: 'cust-1', name: 'Alexander Wright', company: 'Quantum Aerospace Dynamics', email: 'a.wright@quantumaero.com', phone: '+1 (650) 555-9120', status: 'Active Customer', totalSpend: 285400.00 },
  { id: 'cust-2', name: 'Beatriz Silva', company: 'BioSynthetix Laboratories', email: 'b.silva@biosynthetix.io', phone: '+1 (617) 555-8314', status: 'Active Customer', totalSpend: 142000.00 },
  { id: 'cust-3', name: 'Chen Wei', company: 'Pacific Autonomous Transit', email: 'chen.wei@pat-transit.sg', phone: '+65 6789 0123', status: 'Prospect', totalSpend: 0.00 }
];

const INITIAL_EMPLOYEES = [
  { id: 'emp-1', employeeCode: 'EMP-1001', fullName: 'Sarah Jenkins', department: 'Logistics & Supply Chain', designation: 'Central Hub Director', email: 's.jenkins@nexus-erp.corp', phone: '+1 (214) 555-0192', baseSalary: 125000.00, status: 'Active' },
  { id: 'emp-2', employeeCode: 'EMP-1002', Marcus: 'Marcus Vance', fullName: 'Marcus Vance', department: 'Warehouse Operations', designation: 'Site Supervisor', email: 'm.vance@nexus-erp.corp', phone: '+1 (973) 555-0841', baseSalary: 88000.00, status: 'Active' },
  { id: 'emp-3', employeeCode: 'EMP-1003', fullName: 'Elena Rostova', department: 'Procurement & Logistics', designation: 'Logistics Specialist', email: 'e.rostova@nexus-erp.corp', phone: '+1 (562) 555-4412', baseSalary: 92000.00, status: 'Active' }
];

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function write(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`DB Write failure [${key}]:`, err);
  }
}

export const DbAdapter = {
  init() {
    if (!localStorage.getItem(DB_KEYS.PRODUCTS)) write(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    if (!localStorage.getItem(DB_KEYS.CATEGORIES)) write(DB_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    if (!localStorage.getItem(DB_KEYS.WAREHOUSES)) write(DB_KEYS.WAREHOUSES, INITIAL_WAREHOUSES);
    if (!localStorage.getItem(DB_KEYS.SUPPLIERS)) write(DB_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    if (!localStorage.getItem(DB_KEYS.MOVEMENTS)) write(DB_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
    if (!localStorage.getItem(DB_KEYS.ACTIVITIES)) write(DB_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    if (!localStorage.getItem(DB_KEYS.CUSTOMERS)) write(DB_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    if (!localStorage.getItem(DB_KEYS.EMPLOYEES)) write(DB_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
  },

  resetAll() {
    write(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS);
    write(DB_KEYS.CATEGORIES, INITIAL_CATEGORIES);
    write(DB_KEYS.WAREHOUSES, INITIAL_WAREHOUSES);
    write(DB_KEYS.SUPPLIERS, INITIAL_SUPPLIERS);
    write(DB_KEYS.MOVEMENTS, INITIAL_MOVEMENTS);
    write(DB_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
    write(DB_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    write(DB_KEYS.EMPLOYEES, INITIAL_EMPLOYEES);
    AuditService.log({ action: 'SYSTEM_RESET', entityType: 'SYSTEM', entityId: 'ALL', operator: 'Administrator', details: 'Factory demo reset invoked' });
  },

  // Products
  getProducts() { return read(DB_KEYS.PRODUCTS, INITIAL_PRODUCTS); },
  setProducts(prods) { write(DB_KEYS.PRODUCTS, prods); },

  // Movements
  getMovements() { return read(DB_KEYS.MOVEMENTS, INITIAL_MOVEMENTS); },
  setMovements(movs) { write(DB_KEYS.MOVEMENTS, movs); },

  // Warehouses
  getWarehouses() { return read(DB_KEYS.WAREHOUSES, INITIAL_WAREHOUSES); },
  setWarehouses(whs) { write(DB_KEYS.WAREHOUSES, whs); },

  // Suppliers
  getSuppliers() { return read(DB_KEYS.SUPPLIERS, INITIAL_SUPPLIERS); },

  // Categories
  getCategories() { return read(DB_KEYS.CATEGORIES, INITIAL_CATEGORIES); },

  // Activities
  getActivities() { return read(DB_KEYS.ACTIVITIES, INITIAL_ACTIVITIES); },
  setActivities(acts) { write(DB_KEYS.ACTIVITIES, acts); },

  // Customers (CRM)
  getCustomers() { return read(DB_KEYS.CUSTOMERS, INITIAL_CUSTOMERS); },
  setCustomers(custs) { write(DB_KEYS.CUSTOMERS, custs); },

  // Employees (HR)
  getEmployees() { return read(DB_KEYS.EMPLOYEES, INITIAL_EMPLOYEES); },
  setEmployees(emps) { write(DB_KEYS.EMPLOYEES, emps); }
};
