const { config } = require('dotenv');
const { dirname, join } = require('path');

// Load environment variables from .env file
config({ path: join(__dirname, '../.env') });

module.exports = process.env; 