/**
 * Format a number to a human-readable string with K, M, B suffixes
 * @param {number} value - The number to format
 * @param {boolean} includeDollarSign - Whether to include $ sign (default: false)
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted string
 */
export const formatNumber = (value, includeDollarSign = false, decimals = 2) => {
  if (!value && value !== 0) return 'N/A';
  
  const prefix = includeDollarSign ? '$' : '';
  
  if (value >= 1e9) return `${prefix}${(value / 1e9).toFixed(decimals)}B`;
  if (value >= 1e6) return `${prefix}${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `${prefix}${(value / 1e3).toFixed(decimals)}K`;
  return `${prefix}${value.toFixed(decimals)}`;
};

/**
 * Format a price number with appropriate decimal places
 * @param {number} value - The price to format
 * @param {boolean} includeDollarSign - Whether to include $ sign (default: true)
 * @returns {string} Formatted price string
 */
export const formatPrice = (value, includeDollarSign = true) => {
  if (!value && value !== 0) return 'N/A';
  
  const prefix = includeDollarSign ? '$' : '';
  return `${prefix}${value.toFixed(6)}`;
};

/**
 * Format a percentage with appropriate sign and decimal places
 * @param {number} value - The percentage value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 2) => {
  if (!value && value !== 0) return 'N/A';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}; 