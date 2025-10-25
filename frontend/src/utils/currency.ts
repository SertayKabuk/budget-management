/**
 * Format amount in Turkish Lira with Turkish locale formatting
 * Turkish format: 1.234,56 ₺
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format amount as a number with Turkish locale (without currency symbol)
 * Turkish format: 1.234,56
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
