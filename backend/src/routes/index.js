const express = require('express');
const authRoutes = require('./authRoutes');
const parcelleRoutes = require('./parcelleRoutes');
const validationRoutes = require('./validationRoutes');
const parcelleController = require('../controllers/parcelleController');

// Backend unique (monolithe) : toutes les routes sont montées ensemble,
// il n'y a plus de serviceRole ('cadastre-notaire' vs 'promoteur').
function createRoutes() {
  const router = express.Router();

  router.use('/auth', authRoutes);
  router.use('/parcelles', parcelleRoutes);
  router.use('/validations', validationRoutes);
  router.get('/blockchain/proof/:reference', parcelleController.getBlockchainProof);

  return router;
}

module.exports = createRoutes;
