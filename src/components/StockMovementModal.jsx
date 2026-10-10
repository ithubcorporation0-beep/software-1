import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  X,
  Package,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export function StockMovementModal({
  isOpen,
  onClose,
  onSaveMovement,
  products,
  prefill = {}
}) {
  const [selectedProductId, setSelectedProductId] = useState(prefill.productId || products[0]?.id || '');
  const [type, setType] = useState(prefill.type || 'Stock In');
  const [quantity, setQuantity] = useState('1');
  const [reference, setReference] = useState('');
  const [operator, setOperator] = useState('Sarah Jenkins (Logistics Lead)');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (prefill.productId) setSelectedProductId(prefill.productId);
    if (prefill.type) setType(prefill.type);
    if (!prefill.productId && products.length > 0) {
      setSelectedProductId(products[0].id);
    }
    setQuantity('1');
    setReference(type === 'Stock In' ? `PO-${Math.floor(10000 + Math.random() * 90000)}` : `SO-${Math.floor(10000 + Math.random() * 90000)}`);
    setError('');
  }, [isOpen, prefill, products, type]);

  if (!isOpen) return null;

  const currentProduct = products.find(p => p.id === selectedProductId) || products[0];
  const qtyNum = parseInt(quantity, 10) || 0;

  // Calculate projected stock
  let projectedStock = currentProduct ? currentProduct.currentStock : 0;
  if (type === 'Stock In') {
    projectedStock += qtyNum;
  } else if (type === 'Stock Out') {
    projectedStock -= qtyNum;
  } else if (type === 'Audit Adjustment') {
    projectedStock += qtyNum;
  }

  const isInvalidOutbound = type === 'Stock Out' && qtyNum > (currentProduct ? currentProduct.currentStock : 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedProductId) {
      setError('Please select a valid product.');
      return;
    }
    if (qtyNum <= 0 && type !== 'Audit Adjustment') {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (isInvalidOutbound) {
      setError(`Cannot dispatch ${qtyNum} units. Current stock is only ${currentProduct.currentStock}.`);
      return;
    }

    try {
      onSaveMovement({
        productId: selectedProductId,
        type,
        quantity: qtyNum,
        reference: reference.trim() || `REF-${Date.now().toString().slice(-6)}`,
        operator,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error recording movement');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div className="modal-title">
            <ArrowLeftRight size={20} color="var(--accent-cyan)" />
            <span>Record Inventory Movement (In / Out)</span>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                background: 'var(--status-danger-dim)',
                color: 'var(--status-danger)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Movement Type Toggle */}
            <div className="form-group">
              <label className="form-label">Transaction Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setType('Stock In')}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: type === 'Stock In' ? '1px solid var(--status-success)' : '1px solid var(--border-medium)',
                    background: type === 'Stock In' ? 'var(--status-success-dim)' : 'var(--bg-surface)',
                    color: type === 'Stock In' ? 'var(--status-success)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowDownLeft size={16} />
                  <span>Stock In (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('Stock Out')}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: type === 'Stock Out' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-medium)',
                    background: type === 'Stock Out' ? 'var(--accent-cyan-dim)' : 'var(--bg-surface)',
                    color: type === 'Stock Out' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowUpRight size={16} />
                  <span>Stock Out (-)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('Audit Adjustment')}
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    border: type === 'Audit Adjustment' ? '1px solid var(--status-warning)' : '1px solid var(--border-medium)',
                    background: type === 'Audit Adjustment' ? 'var(--status-warning-dim)' : 'var(--bg-surface)',
                    color: type === 'Audit Adjustment' ? 'var(--status-warning)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Sliders size={16} />
                  <span>Audit (±)</span>
                </button>
              </div>
            </div>

            {/* Target Product Selection */}
            <div className="form-group">
              <label className="form-label">Select SKU / Product Item</label>
              <select
                id="movement-product-select"
                className="form-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{p.sku}] — In Stock: {p.currentStock} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Stock vs Projected Preview Card */}
            {currentProduct && (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CURRENT BALANCE</div>
                  <div className="font-mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                    {currentProduct.currentStock} {currentProduct.unit}
                  </div>
                </div>

                <div style={{ fontSize: '20px', color: 'var(--text-muted)' }}>➔</div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PROJECTED BALANCE</div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: projectedStock < 0 ? 'var(--status-danger)' :
                             projectedStock <= currentProduct.minThreshold ? 'var(--status-warning)' : 'var(--status-success)'
                    }}
                  >
                    {projectedStock} {currentProduct.unit}
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  <div>Min: {currentProduct.minThreshold}</div>
                  <div>Cap: {currentProduct.maxCapacity}</div>
                </div>
              </div>
            )}

            {/* Quantity & Reference */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Quantity to Transfer</label>
                <input
                  id="movement-quantity-input"
                  type="number"
                  min="1"
                  className="form-input font-mono"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reference ID (PO / SO / Job#)</label>
                <input
                  id="movement-reference-input"
                  type="text"
                  className="form-input font-mono"
                  placeholder="e.g. PO-88410"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </div>

            {/* Operator & Notes */}
            <div className="form-group">
              <label className="form-label">Operator / Specialist</label>
              <input
                type="text"
                className="form-input"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Transaction Notes & Delivery Details</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Reason for movement, shipment carrier, bill of lading, or inspection results..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              id="confirm-movement-btn"
              type="submit"
              className="btn btn-primary"
              disabled={isInvalidOutbound}
            >
              Confirm & Post Movement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
