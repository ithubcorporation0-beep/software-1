import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storageService';
import { AuthService } from './lib/auth/authService';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { MovementsLedgerView } from './components/MovementsLedgerView';
import { LowStockView } from './components/LowStockView';
import { WarehousesView } from './components/WarehousesView';
import { SuppliersView } from './components/SuppliersView';
import { AnalyticsView } from './components/AnalyticsView';
import { ProductModal } from './components/ProductModal';
import { StockMovementModal } from './components/StockMovementModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ToastContainer } from './components/ToastContainer';

// Feature Views
import { CrmView } from './features/crm/components/CrmView';
import { SalesView } from './features/sales/components/SalesView';
import { FinanceView } from './features/finance/components/FinanceView';
import { HrView } from './features/hr/components/HrView';
import { PayrollView } from './features/payroll/components/PayrollView';
import { ProjectsView } from './features/projects/components/ProjectsView';
import { ReportsView } from './features/reports/components/ReportsView';

export function App() {
  // Main Data States
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activities, setActivities] = useState([]);

  // Auth & RBAC State
  const [currentUser, setCurrentUser] = useState(() => AuthService.getCurrentUser());

  // UI States
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('nexus_erp_theme') || 'dark');
  const [toasts, setToasts] = useState([]);

  // Modals States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementPrefill, setMovementPrefill] = useState({});

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    isDanger: true,
    confirmText: 'Confirm',
    onConfirm: () => {}
  });

  // Load and seed initial data
  const loadData = useCallback(() => {
    StorageService.init();
    setProducts(StorageService.getProducts());
    setMovements(StorageService.getMovements());
    setWarehouses(StorageService.getWarehouses());
    setSuppliers(StorageService.getSuppliers());
    setCategories(StorageService.getCategories());
    setActivities(StorageService.getActivities());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply Theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexus_erp_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Toast Notification System
  const addToast = (message, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Switch User Profile (RBAC simulation)
  const handleSwitchUser = (userId) => {
    const newUser = AuthService.switchUser(userId);
    setCurrentUser(newUser);
    addToast(`Switched user context to ${newUser.name} (${newUser.role})`, 'info');
  };

  // Keyboard Shortcuts (Ctrl+K for search, Escape to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) searchInput.focus();
      }

      if (e.key === 'Escape') {
        if (isProductModalOpen) setIsProductModalOpen(false);
        if (isMovementModalOpen) setIsMovementModalOpen(false);
        if (confirmDialog.isOpen) setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProductModalOpen, isMovementModalOpen, confirmDialog.isOpen]);

  // Handle Product Save (Create or Update)
  const handleSaveProduct = (productData) => {
    try {
      if (productToEdit) {
        const updated = StorageService.updateProduct(productToEdit.id, productData);
        if (updated) {
          addToast(`Updated SKU: ${updated.sku} (${updated.name})`, 'success');
        }
      } else {
        const created = StorageService.addProduct(productData);
        addToast(`Created SKU: ${created.sku} (${created.name})`, 'success');
      }
      loadData();
      setIsProductModalOpen(false);
      setProductToEdit(null);
    } catch (err) {
      addToast(err.message || 'Failed to save product', 'error');
    }
  };

  // Handle Product Deletion with Confirmation
  const handleDeleteProductPrompt = (productId) => {
    const target = products.find(p => p.id === productId);
    if (!target) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Remove Product SKU',
      message: `Are you sure you want to permanently remove SKU "${target.sku}" (${target.name}) from the catalog? This will not alter past transaction movement history.`,
      isDanger: true,
      confirmText: 'Delete SKU',
      onConfirm: () => {
        StorageService.deleteProduct(productId);
        loadData();
        addToast(`Removed SKU ${target.sku} from catalog`, 'success');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Handle Stock Movement Record (In, Out, Audit)
  const handleRecordStockMovement = (movementData) => {
    try {
      const result = StorageService.recordStockMovement({
        ...movementData,
        operator: currentUser?.name || 'Operations Specialist'
      });
      loadData();
      addToast(`Recorded ${movementData.type} (${Math.abs(movementData.quantity)} units) for ${result.product.sku}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to record movement', 'error');
      throw err;
    }
  };

  // Simulate Batch Restock Purchase Order
  const handleSimulateBatchPO = (items) => {
    const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    addToast(`Generated Restock Purchase Order [${poNumber}] for ${items.length} items. Sent to supplier queue.`, 'success');
    StorageService.logActivity(`Drafted Automated Restock Batch ${poNumber} for ${items.length} low-stock SKUs`, 'in');
    loadData();
  };

  // Reset to Demo Data
  const handleResetDemoDataPrompt = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset to Enterprise Demo Dataset',
      message: 'This will reset all inventory levels, warehouses, suppliers, and movement history back to the factory demo state. All custom edits will be replaced.',
      isDanger: false,
      confirmText: 'Reset Demo Data',
      onConfirm: () => {
        StorageService.resetToDemo();
        loadData();
        addToast('Restored enterprise demo dataset with 10 active SKUs and 4 warehouses', 'success');
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Export handlers
  const handleExportCSV = () => {
    StorageService.exportProductsCSV();
    addToast('Exported inventory catalog CSV', 'success');
  };

  const handleExportJSON = () => {
    StorageService.exportDataJSON();
    addToast('Downloaded database JSON backup', 'success');
  };

  const handleImportJSON = (jsonString) => {
    const ok = StorageService.importDataJSON(jsonString);
    if (ok) {
      loadData();
      addToast('Imported database dataset successfully', 'success');
    } else {
      addToast('Invalid JSON backup file format', 'error');
    }
  };

  // Filter products by warehouse
  const handleFilterByWarehouse = () => {
    setCurrentView('inventory');
    addToast('Filtered inventory for selected depot', 'info');
  };

  // Filter products by supplier
  const handleFilterBySupplier = () => {
    setCurrentView('inventory');
    addToast('Filtered catalog for selected supplier contracts', 'info');
  };

  // Computed alert badges
  const lowStockCount = products.filter(p => p.currentStock <= p.minThreshold).length;
  const criticalItems = products.filter(p => p.currentStock <= p.minThreshold);

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        currentUser={currentUser}
        lowStockCount={lowStockCount}
        totalProducts={products.length}
        onExportCSV={handleExportCSV}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          lowStockCount={lowStockCount}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenProductModal={(prod) => {
            setProductToEdit(prod);
            setIsProductModalOpen(true);
          }}
          onOpenMovementModal={() => {
            setMovementPrefill({});
            setIsMovementModalOpen(true);
          }}
          onResetData={handleResetDemoDataPrompt}
          criticalItems={criticalItems}
          currentUser={currentUser}
          onSwitchUser={handleSwitchUser}
        />

        <main className="content-container">
          {currentView === 'dashboard' && (
            <DashboardView
              products={products}
              movements={movements}
              activities={activities}
              categories={categories}
              onNavigate={setCurrentView}
              onOpenMovementModal={(prefill) => {
                setMovementPrefill(prefill || {});
                setIsMovementModalOpen(true);
              }}
              onOpenProductModal={(prod) => {
                setProductToEdit(prod);
                setIsProductModalOpen(true);
              }}
            />
          )}

          {currentView === 'inventory' && (
            <ProductsView
              products={products}
              categories={categories}
              warehouses={warehouses}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onOpenProductModal={(prod) => {
                setProductToEdit(prod);
                setIsProductModalOpen(true);
              }}
              onOpenMovementModal={(prefill) => {
                setMovementPrefill(prefill || {});
                setIsMovementModalOpen(true);
              }}
              onDeleteProduct={handleDeleteProductPrompt}
            />
          )}

          {currentView === 'movements' && (
            <MovementsLedgerView
              movements={movements}
              warehouses={warehouses}
              onOpenMovementModal={(prefill) => {
                setMovementPrefill(prefill || {});
                setIsMovementModalOpen(true);
              }}
            />
          )}

          {currentView === 'low-stock' && (
            <LowStockView
              products={products}
              suppliers={suppliers}
              warehouses={warehouses}
              onOpenMovementModal={(prefill) => {
                setMovementPrefill(prefill || {});
                setIsMovementModalOpen(true);
              }}
              onSimulatePO={handleSimulateBatchPO}
            />
          )}

          {currentView === 'warehouses' && (
            <WarehousesView
              warehouses={warehouses}
              products={products}
              onFilterByWarehouse={handleFilterByWarehouse}
            />
          )}

          {currentView === 'suppliers' && (
            <SuppliersView
              suppliers={suppliers}
              products={products}
              onFilterBySupplier={handleFilterBySupplier}
            />
          )}

          {currentView === 'crm' && (
            <CrmView onNotify={addToast} />
          )}

          {currentView === 'sales' && (
            <SalesView onNotify={addToast} />
          )}

          {currentView === 'finance' && (
            <FinanceView />
          )}

          {currentView === 'hr' && (
            <HrView onNotify={addToast} />
          )}

          {currentView === 'payroll' && (
            <PayrollView onNotify={addToast} />
          )}

          {currentView === 'projects' && (
            <ProjectsView />
          )}

          {currentView === 'reports' && (
            <ReportsView onNotify={addToast} />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView
              products={products}
              movements={movements}
              categories={categories}
            />
          )}
        </main>
      </div>

      {/* Product Creation & Editing Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setProductToEdit(null);
        }}
        onSave={handleSaveProduct}
        productToEdit={productToEdit}
        categories={categories}
        warehouses={warehouses}
        suppliers={suppliers}
      />

      {/* Stock Movement Modal */}
      <StockMovementModal
        isOpen={isMovementModalOpen}
        onClose={() => {
          setIsMovementModalOpen(false);
          setMovementPrefill({});
        }}
        onSaveMovement={handleRecordStockMovement}
        products={products}
        prefill={movementPrefill}
      />

      {/* Action Confirmation Modal */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDanger={confirmDialog.isDanger}
        confirmText={confirmDialog.confirmText}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification Tray */}
      <ToastContainer
        toasts={toasts}
        onCloseToast={removeToast}
      />
    </div>
  );
}

export default App;
