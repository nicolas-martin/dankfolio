import axios from 'axios';

const BIRDEYE_API_URL = 'https://birdeye-proxy.raydium.io/defi';

export const fetchOHLCVData = async (baseAddress, quoteAddress = 'So11111111111111111111111111111111111111112', timeframe = '1H') => {
  try {
    // Calculate timestamps for last 24 hours
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - (24 * 60 * 60);

    const response = await axios.get(`${BIRDEYE_API_URL}/ohlcv/base_quote`, {
      params: {
        base_address: baseAddress,
        quote_address: quoteAddress,
        type: timeframe,
        time_from: oneDayAgo,
        time_to: now
      },
      headers: {
        'accept': 'application/json'
      }
    });

    // Transform the data for the chart
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data.map(candle => ({
        timestamp: candle.t,
        value: candle.c, // Using closing price
        open: candle.o,
        high: candle.h,
        low: candle.l,
        close: candle.c,
        volume: candle.v,
        label: new Date(candle.t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching OHLCV data:', error);
    return [];
  }
};

export const getTimeframeParams = (timeframe) => {
  const now = Math.floor(Date.now() / 1000);
  switch (timeframe) {
    case '15m':
      return {
        type: '15M',
        time_from: now - (15 * 60 * 60), // Last 15 hours for 15m candles
      };
    case '1H':
      return {
        type: '1H',
        time_from: now - (24 * 60 * 60), // Last 24 hours
      };
    case '4H':
      return {
        type: '4H',
        time_from: now - (4 * 24 * 60 * 60), // Last 4 days
      };
    case '1D':
      return {
        type: '1D',
        time_from: now - (30 * 24 * 60 * 60), // Last 30 days
      };
    case '1W':
      return {
        type: '1W',
        time_from: now - (180 * 24 * 60 * 60), // Last 180 days
      };
    default:
      return {
        type: '1H',
        time_from: now - (24 * 60 * 60),
      };
  }
}; 