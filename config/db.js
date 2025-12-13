const { Pool } = require('pg');
require('dotenv').config();

// Determine if SSL is needed (for Render or other hosted databases)
const isProduction = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('render.com') ||
  process.env.DATABASE_URL.includes('amazonaws.com') ||
  process.env.NODE_ENV === 'production'
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? {
    rejectUnauthorized: false // Required for Render and many hosted databases
  } : false
});

module.exports = pool;