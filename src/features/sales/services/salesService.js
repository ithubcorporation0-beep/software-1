import { AuditService } from '../../../lib/audit/auditService';

const SALES_STORAGE_KEY = 'it_hub_erp_sales_orders';

const INITIAL_SALES_ORDERS = [
  {
    id: 'SO-2026-10928',
    customerName: 'Quantum Aerospace Dynamics',
    customerId: 'cust-1',
    date: '2026-10-10T09:14:00Z',
    items: [
      { sku: 'ELEC-GPU-H100', name: 'Neural Accelerator Core H100', qty: 4, unitPrice: 5850.00 }
    ],
    totalAmount: 23400.00,
    status: 'Dispatched',
    paymentStatus: 'Paid'
  },
  {
    id: 'SO-2026-10892',
    customerName: 'BioSynthetix Laboratories',
    customerId: 'cust-2',
    date: '2026-10-09T14:10:00Z',
    items: [
      { sku: 'MATL-TI-BAR-50', name: 'Titanium Grade 5 Extruded Rod (50mm)', qty: 15, unitPrice: 295.00 }
    ],
    totalAmount: 4425.00,
    status: 'Fulfilled',
    paymentStatus: 'Paid'
  },
  {
    id: 'SO-2026-10935',
    customerName: 'Pacific Autonomous Transit',
    customerId: 'cust-3',
    date: '2026-10-08T11:20:00Z',
    items: [
      { sku: 'OPTC-LIDAR-4K', name: 'Solid-State LiDAR Scanner 4K', qty: 2, unitPrice: 1890.00 }
    ],
    totalAmount: 3780.00,
    status: 'Confirmed',
    paymentStatus: 'Pending'
  }
];

export const SalesService = {
  getOrders() {
    try {
      const raw = localStorage.getItem(SALES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : INITIAL_SALES_ORDERS;
    } catch (_) {
      return INITIAL_SALES_ORDERS;
    }
  },

  createOrder(orderData, operator = 'Admin') {
    const orders = this.getOrders();
    const newOrder = {
      ...orderData,
      id: `SO-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      date: new Date().toISOString()
    };
    const updated = [newOrder, ...orders];
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updated));
    AuditService.log({
      action: 'SALES_ORDER_CREATED',
      entityType: 'SALES',
      entityId: newOrder.id,
      operator,
      details: `Generated Sales Order ${newOrder.id} for ${newOrder.customerName}`
    });
    return newOrder;
  },

  updateStatus(orderId, status, operator = 'Admin') {
    const orders = this.getOrders();
    const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
    localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updated));
    AuditService.log({
      action: 'SALES_ORDER_STATUS',
      entityType: 'SALES',
      entityId: orderId,
      operator,
      details: `Order status set to ${status}`
    });
    return updated;
  }
};
