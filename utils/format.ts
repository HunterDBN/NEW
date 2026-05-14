export function formatPrice(price: number | string | null | undefined, currency = 'MYR'): string {
  if (price === null || price === undefined) return `${currency} --`;
  const num = Number(price);
  if (!isFinite(num)) return `${currency} --`;
  return `${currency} ${num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatVND(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return '₫--';
  const num = Number(price);
  if (!isFinite(num)) return '₫--';
  // Format with dots as thousands separator (Vietnamese style)
  const formatted = num.toLocaleString('vi-VN');
  return `₫${formatted}`;
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPct(pct: number | string | null | undefined): string {
  if (pct === null || pct === undefined) return '0.0%';
  const num = Number(pct);
  if (!isFinite(num)) return '0.0%';
  return `${Math.abs(num).toFixed(1)}%`;
}

export function safeNum(val: number | string | null | undefined, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return isFinite(n) ? n : fallback;
}
