/**
 * Formats a number as a currency string according to Colombian standards:
 * - Thousands separator: . (dot)
 * - Decimal separator: , (comma) - although user requested NO decimals.
 * - Minimum/Maximum fraction digits: 0
 * 
 * Example: 1000000 -> "1.000.000"
 */
export const formatCurrency = (value: number | string): string => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numericValue)) return '0';

  return new Intl.NumberFormat('es-CO', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
};

/**
 * Formats a numerical ID into a standardized order string: PED-0001
 */
export const formatOrderId = (id: number | string | null | undefined): string => {
  if (id === null || id === undefined) return 'N/A';
  const numericId = typeof id === 'string' ? parseInt(id) : id;
  return `PED-${numericId.toString().padStart(4, '0')}`;
};
