/**
 * @file Unit tests for Inventory & Stock Calculations
 */

import { calculateGrossMargin } from '../../src/lib/utils/formatters';
import { InventoryService } from '../../src/features/inventory/services/inventoryService';

export function runInventoryUnitTests() {
  const results = [];

  // Test 1: Gross Margin Calculation
  const margin = calculateGrossMargin(4200.00, 5850.00);
  results.push({
    test: 'calculateGrossMargin(4200, 5850) should be approx 28%',
    passed: margin === 28
  });

  // Test 2: Calculate Status Thresholds
  const statusOut = InventoryService.calculateStatus(0, 15);
  results.push({
    test: 'Stock level 0 should return "Out of Stock"',
    passed: statusOut === 'Out of Stock'
  });

  const statusCritical = InventoryService.calculateStatus(3, 15);
  results.push({
    test: 'Stock level 3 (<= 40% of 15) should return "Critical Low"',
    passed: statusCritical === 'Critical Low'
  });

  const statusNormal = InventoryService.calculateStatus(40, 15);
  results.push({
    test: 'Stock level 40 (> 15) should return "In Stock"',
    passed: statusNormal === 'In Stock'
  });

  return results;
}
