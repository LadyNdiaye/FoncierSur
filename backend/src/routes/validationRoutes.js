const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validationController');
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/roles');

// Plus de POST '/' public : la soumission au Cadastre est déclenchée
// automatiquement par parcelleController.createParcelle (appel direct,
// en process), il n'y a donc plus de route manuelle de création.

// Routes CADASTRE (protégées : token valide + rôle CADASTRE)
router.get('/cadastre', verifyToken, checkRole(['CADASTRE']), validationController.getCadastreList);
router.get('/cadastre/historique', verifyToken, checkRole(['CADASTRE']), validationController.getCadastreHistorique);
router.get('/cadastre/:id', verifyToken, checkRole(['CADASTRE']), validationController.getCadastreDetail);
router.post('/cadastre/:id', verifyToken, checkRole(['CADASTRE']), validationController.validateByCadastre);

// Routes NOTAIRE
router.get('/notaire', verifyToken, checkRole(['NOTAIRE']), validationController.getNotaireList);
router.get('/notaire/historique', verifyToken, checkRole(['NOTAIRE']), validationController.getNotaireHistorique);
router.get('/notaire/:id', verifyToken, checkRole(['NOTAIRE']), validationController.getNotaireDetail);
router.post('/notaire/:id', verifyToken, checkRole(['NOTAIRE']), validationController.certifyByNotaire);

module.exports = router;
