const dotenv = require('dotenv');
const { join } = require('path');
const axios = require('axios');

// Load environment variables - use __dirname (CommonJS)
dotenv.config({ path: join(__dirname, '../../.env') });

// Use a default API URL if environment variable is not set
const API_URL = 'http://localhost:8080';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

async function testPriceHistory() {
  const address = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
  const type = "5m";
  const timeFrom = 1741155659;
  const timeTo = 1741242059;
  const addressType = "token";

  try {
    console.log('🔍 Testing getPriceHistory with parameters:');
    console.log({
      baseURL: API_URL,
      address,
      type,
      timeFrom,
      timeTo,
      addressType
    });

    const response = await apiClient.get('/api/price/history', {
      params: {
        address,
        type,
        time_from: timeFrom,
        time_to: timeTo,
        address_type: addressType
      }
    });

    console.log('\n✅ Price history data received:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Error testing price history:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testPriceHistory(); 
