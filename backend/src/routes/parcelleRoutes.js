const express = require('express');
const parcelleController = require('../controllers/parcelleController');
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/roles');
const { uploadParcelDocument } = require('../middleware/uploadParcelDocument');

const router = express.Router();

router.get('/', verifyToken, checkRole(['PROMOTEUR']), parcelleController.getPromoteurParcelles);
router.post(
  '/',
  verifyToken,
  checkRole(['PROMOTEUR']),
  uploadParcelDocument,
  parcelleController.createParcelle,
);
router.get(
  '/:id',
  verifyToken,
  checkRole(['PROMOTEUR', 'CADASTRE', 'NOTAIRE']),
  parcelleController.getPromoteurParcelleById,
);
// Plus de route PATCH /:id/statut : en architecture monolithe, le statut
// d'une parcelle n'est mis à jour que par validationController, en interne,
// dans la même transaction que la décision Cadastre/Notaire.
router.get(
  '/:id/document',
  verifyToken,
  checkRole(['PROMOTEUR', 'CADASTRE', 'NOTAIRE']),
  parcelleController.downloadParcelleDocument,
);
router.get(
  '/:id/controle-geo',
  verifyToken,
  checkRole(['PROMOTEUR', 'CADASTRE', 'NOTAIRE']),
  parcelleController.getSuperficieCalculee,
);
router.get(
  '/:id/preuve',
  verifyToken,
  checkRole(['PROMOTEUR', 'CADASTRE', 'NOTAIRE']),
  parcelleController.getParcelleProof,
);

module.exports = router;
