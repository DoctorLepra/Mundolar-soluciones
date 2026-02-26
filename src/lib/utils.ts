/**
 * Formats a number as a currency string according to Colombian standards:
 * - Thousands separator: . (dot)
 * - Decimal separator: , (comma) - although user requested NO decimals.
 * - Minimum/Maximum fraction digits: 0
 *
 * Example: 1000000 -> "1.000.000"
 */
export const formatCurrency = (value: number | string): string => {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numericValue)) return "0";

  return new Intl.NumberFormat("es-CO", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
};

/**
 * Formats a numerical ID into a standardized order string: PED-0001
 */
export const formatOrderId = (
  id: number | string | null | undefined,
): string => {
  if (id === null || id === undefined) return "N/A";
  const numericId = typeof id === "string" ? parseInt(id) : id;
  return `PED-${numericId.toString().padStart(4, "0")}`;
};

/**
 * Formats a numerical ID into a standardized quote string: COT-0001
 */
export const formatQuoteId = (
  id: number | string | null | undefined,
): string => {
  if (id === null || id === undefined) return "N/A";
  const numericId = typeof id === "string" ? parseInt(id) : id;
  return `COT-${numericId.toString().padStart(4, "0")}`;
};
/**
 * Formats a numerical ID into a standardized task string: TAR-0001
 */
export const formatTaskId = (
  id: number | string | null | undefined,
): string => {
  if (id === null || id === undefined) return "N/A";
  const numericId = typeof id === "string" ? parseInt(id) : id;
  return `TAR-${numericId.toString().padStart(4, "0")}`;
};

/**
 * Rounds a price according to Mundolar's business logic for IVA-included prices:
 * - If remainder is 0, return as is.
 * - If remainder <= 500, round to the nearest 500.
 * - Otherwise, round up to the nearest 1000.
 */
export const roundIvaPrice = (price: number): number => {
  const roundedBase = Math.round(price);
  const remainder = roundedBase % 1000;
  if (remainder === 0) return roundedBase;
  if (remainder <= 500) return Math.floor(roundedBase / 1000) * 1000 + 500;
  return Math.ceil(roundedBase / 1000) * 1000;
};
