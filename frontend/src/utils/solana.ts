import { Linking } from 'react-native';

export const getSolscanUrl = (txHash: string): string => {
  return `https://solscan.io/tx/${txHash}`;
};

export const openSolscanUrl = async (txHash: string): Promise<void> => {
  const url = getSolscanUrl(txHash);
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      console.error('Cannot open URL:', url);
    }
  } catch (error) {
    console.error('Error opening URL:', error);
  }
}; 