const jwt = require('jsonwebtoken');
const { secret } = require('../config/jwt');

const verifyToken = (req, res, next) => {
  const authHeader = req.get('authorization');
  const match = typeof authHeader === 'string' ? authHeader.match(/^Bearer\s+([^\s]+)$/i) : null;
  const token = match?.[1];

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    if (!secret) {
      return res.status(503).json({ error: "Le service d'authentification n'est pas configuré." });
    }
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

module.exports = verifyToken;