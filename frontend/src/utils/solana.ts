export const getSolscanUrl = (txHash: string): string => {
  return `https://solscan.io/tx/${txHash}`;
};

export const openSolscanUrl = (txHash: string): void => {
  const url = getSolscanUrl(txHash);
  // Open URL in new tab
  window.open(url, '_blank');
}; 