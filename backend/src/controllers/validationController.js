// Contrôleur Validation (Cadastre + Notaire) — architecture monolithe.
// Base : Carla Diatta (Backend Core). Différence clé avec la version
// « microservices » : après une décision Cadastre/Notaire, le statut de la
// Parcelle est mis à jour directement dans la même transaction (même base,
// même process) au lieu de repasser par un appel HTTP et une table de
// synchronisation (ValidationStatusSync, supprimée).
const { sequelize } = require('../config/db');
const Parcelle = require('../models/Parcelle');
const User = require('../models/User');
const Validation = require('../models/Validation');
const blockchainService = require('../services/blockchainService');

function validationResponse(validation, parcelle) {
  return {
    id: validation.id,
    parcelId: validation.parcel_id,
    statut: validation.statut,
    commentaire: validation.commentaire,
    fabricTxId: validation.fabric_tx_id,
    parcelle: parcelle ? {
      reference: parcelle.reference,
      localisation: parcelle.localisation,
      type: parcelle.type_zone,
      superficie: parcelle.superficie,
      nicad: parcelle.numero_identification_cadastrale,
      sha256: parcelle.sha256,
    } : validation.parcelle_snapshot,
    created_at: validation.createdAt,
    updated_at: validation.updatedAt,
  };
}

// Appelée en interne par parcelleController juste après la création d'une
// parcelle : plus d'appel réseau, c'est un appel de fonction direct.
async function createValidationForParcel(parcelId, parcelSnapshot) {
  return Validation.create({
    parcel_id: parcelId,
    parcelle_snapshot: parcelSnapshot,
    statut: 'SOUMISE',
  });
}
exports.createValidationForParcel = createValidationForParcel;

exports.getCadastreList = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: 'SOUMISE' },
      order: [['createdAt', 'ASC']],
    });
    return res.status(200).json(validations.map((v) => validationResponse(v)));
  } catch (error) {
    console.error('Erreur getCadastreList :', error);
    return res.status(500).json({ error: 'Impossible de charger les dossiers à instruire.' });
  }
};

exports.getCadastreHistorique = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: ['VALIDE_CADASTRE', 'REJETE_CADASTRE'] },
      order: [['updatedAt', 'DESC']],
    });
    return res.status(200).json(validations.map((v) => validationResponse(v)));
  } catch (error) {
    console.error('Erreur getCadastreHistorique :', error);
    return res.status(500).json({ error: "Impossible de charger l'historique." });
  }
};

exports.getCadastreDetail = async (req, res) => {
  try {
    const validation = await Validation.findByPk(req.params.id);
    if (!validation) return res.status(404).json({ error: 'Dossier introuvable.' });

    const parcelle = await Parcelle.findByPk(validation.parcel_id, {
      include: [{ model: User, as: 'proprietaire', attributes: ['nom', 'prenom'] }],
    });

    return res.status(200).json({
      reference: parcelle?.reference,
      type: parcelle?.type_zone,
      nicad: parcelle?.numero_identification_cadastrale,
      localisation: parcelle?.localisation,
      proprio_nom: parcelle?.proprietaire
        ? `${parcelle.proprietaire.prenom} ${parcelle.proprietaire.nom}`.trim()
        : undefined,
      superficie: parcelle?.superficie,
      polygon: parcelle?.polygon,
      sha256: parcelle?.sha256,
      statut: validation.statut,
    });
  } catch (error) {
    console.error('Erreur getCadastreDetail :', error);
    return res.status(500).json({ error: 'Impossible de charger ce dossier.' });
  }
};

exports.validateByCadastre = async (req, res) => {
  const { decision, motif } = req.body;
  if (decision === 'REJETE' && !motif?.trim()) {
    return res.status(400).json({ error: 'Le motif est obligatoire en cas de rejet.' });
  }
  const newStatus = decision === 'APPROUVE' ? 'VALIDE_CADASTRE' : 'REJETE_CADASTRE';

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const validation = await Validation.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!validation) {
        const error = new Error('Dossier introuvable.');
        error.statusCode = 404;
        throw error;
      }
      if (validation.statut !== 'SOUMISE') {
        const error = new Error('Ce dossier a déjà été instruit par le Cadastre.');
        error.statusCode = 409;
        throw error;
      }

      const parcel = await Parcelle.findByPk(validation.parcel_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!parcel) {
        const error = new Error('Parcelle associée introuvable.');
        error.statusCode = 404;
        throw error;
      }

      // Inscription de la décision sur Hyperledger Fabric (Org Cadastre).
      const { txId } = await blockchainService.validateByCadastre(
        parcel.id,
        req.user.id,
        newStatus,
        motif?.trim() || null,
      );

      validation.statut = newStatus;
      validation.commentaire = motif?.trim() || null;
      validation.fabric_tx_id = txId;
      await validation.save({ transaction });

      parcel.statut = newStatus;
      await parcel.save({ transaction });

      return { validation, parcel };
    });

    return res.status(200).json(validationResponse(result.validation, result.parcel));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('Erreur validateByCadastre :', error);
    return res.status(502).json({ error: "La décision n'a pas pu être inscrite sur la blockchain. Rien n'a été modifié." });
  }
};

exports.getNotaireList = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: 'VALIDE_CADASTRE' },
      order: [['updatedAt', 'ASC']],
    });
    return res.status(200).json(validations.map((v) => validationResponse(v)));
  } catch (error) {
    console.error('Erreur getNotaireList :', error);
    return res.status(500).json({ error: 'Impossible de charger les dossiers à certifier.' });
  }
};

exports.getNotaireHistorique = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: ['CERTIFIEE', 'REJETE_NOTAIRE'] },
      order: [['updatedAt', 'DESC']],
    });
    return res.status(200).json(validations.map((v) => validationResponse(v)));
  } catch (error) {
    console.error('Erreur getNotaireHistorique :', error);
    return res.status(500).json({ error: "Impossible de charger l'historique." });
  }
};

exports.getNotaireDetail = exports.getCadastreDetail;

exports.certifyByNotaire = async (req, res) => {
  const { decision, motif } = req.body;
  if (decision === 'REJETE' && !motif?.trim()) {
    return res.status(400).json({ error: 'Le motif est obligatoire en cas de rejet.' });
  }
  const newStatus = decision === 'APPROUVE' ? 'CERTIFIEE' : 'REJETE_NOTAIRE';

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const validation = await Validation.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!validation) {
        const error = new Error('Dossier introuvable.');
        error.statusCode = 404;
        throw error;
      }
      if (validation.statut !== 'VALIDE_CADASTRE') {
        const error = new Error("Ce dossier n'est pas en attente de certification notariale.");
        error.statusCode = 409;
        throw error;
      }

      const parcel = await Parcelle.findByPk(validation.parcel_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!parcel) {
        const error = new Error('Parcelle associée introuvable.');
        error.statusCode = 404;
        throw error;
      }

      const { txId } = await blockchainService.certifyByNotaire(
        parcel.id,
        req.user.id,
        motif?.trim() || null,
      );

      validation.statut = newStatus;
      validation.commentaire = motif?.trim() || null;
      validation.fabric_tx_id = txId;
      await validation.save({ transaction });

      parcel.statut = newStatus;
      await parcel.save({ transaction });

      return { validation, parcel };
    });

    return res.status(200).json(validationResponse(result.validation, result.parcel));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error('Erreur certifyByNotaire :', error);
    return res.status(502).json({ error: "La décision n'a pas pu être inscrite sur la blockchain. Rien n'a été modifié." });
  }
};
