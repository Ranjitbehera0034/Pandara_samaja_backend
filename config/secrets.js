// config/secrets.js — Centralized secret management with fail-fast on missing values
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  console.error('Please add JWT_SECRET to your .env file.');
  process.exit(1);
}

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  PORTAL_JWT_EXPIRES: process.env.PORTAL_JWT_EXPIRES || '7d',
};
