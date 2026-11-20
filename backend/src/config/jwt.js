const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const secret = process.env.JWT_SECRET?.trim();
if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32)) {
  throw new Error('En production, JWT_SECRET doit contenir au moins 32 caractères aléatoires.');
}

module.exports = {
  secret,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};