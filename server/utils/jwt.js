const jwt = require('jsonwebtoken');
require('dotenv').config();

let cachedJwtSecret = null;

function getJwtSecret() {
  if (cachedJwtSecret) return cachedJwtSecret;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable');
  }

  cachedJwtSecret = secret;
  return cachedJwtSecret;
}

function signAuthToken(payload, options = { expiresIn: '7d' }) {
  return jwt.sign(payload, getJwtSecret(), options);
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  getJwtSecret,
  signAuthToken,
  verifyAuthToken,
};
