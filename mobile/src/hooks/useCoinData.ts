import { useState, useEffect } from 'react';
import { coinService } from '../services/coinService';

export const useCoinData = () => {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCoins = async () => {
    try {
      setLoading(true);
      const data = await coinService.getTopMemeCoins();
      setCoins(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshCoins = () => {
    fetchCoins();
  };

  useEffect(() => {
    fetchCoins();
    
    // Set up periodic refresh
    const interval = setInterval(fetchCoins, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return { coins, loading, error, refreshCoins };
}; 