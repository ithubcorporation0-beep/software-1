export function formatCurrency(amount, currency = 'PKR') {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rs 0.00';
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(isoString, includeTime = false) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  
  if (includeTime) {
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function calculateGrossMargin(cost, price) {
  const c = parseFloat(cost) || 0;
  const p = parseFloat(price) || 0;
  if (p <= 0) return 0;
  return Math.round(((p - c) / p) * 100);
}
