// Contrôleur Parcelle — fusion du backend monolithe (cahier des charges) :
// - structure, transactions, détection de doublons et gestion fichier :
//   Carla Diatta (Backend Core)
// - contrôle géospatial réel (PostGIS) et hash du document déposé :
//   Mame Ndiaya Gaye (Géospatial), branchés ici à la place des anciens
//   calculs JS et du hash de métadonnées.
// Architecture monolithe : plus d'appel HTTP inter-services, la création
// d'une parcelle déclenche directement la validation côté Cadastre dans
// le même process / la même transaction logique.
const { createHash } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Parcelle = require('../models/Parcelle');
const User = require('../models/User');
const Validation = require('../models/Validation');
const { parcelDocumentDirectory } = require('../middleware/uploadParcelDocument');
const { parseParcelGeometry } = require('../utils/parcelGeometry');
const geospatialService = require('../services/geospatialService');
const documentService = require('../services/documentService');
const blockchainService = require('../services/blockchainService');
const { createValidationForParcel } = require('./validationController');

const validTypes = new Set(['URBAIN', 'AGRICOLE', 'INDUSTRIEL']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidDocumentSignature(file, header) {
  if (file.mimetype === 'application/pdf') return header.subarray(0, 5).toString() === '%PDF-';
  if (file.mimetype === 'image/png') {
    return header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (file.mimetype === 'image/jpeg') {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  return false;
}

async function removeUploadedFile(file) {
  if (!file) return;
  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Impossible de supprimer un fichier de parcelle :', error);
    }
  }
}

// `parseParcelGeometry` (utils, Carla) valide la forme de l'entrée (tableau
// de points ou GeoJSON) et renvoie des points [latitude, longitude]. On les
// reconvertit ici en GeoJSON Polygon [longitude, latitude], format attendu
// par PostGIS (ST_GeomFromGeoJSON) et par la colonne GEOMETRY du modèle.
function toGeoJsonPolygon(points) {
  const ring = points.map(([latitude, longitude]) => [longitude, latitude]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  return { type: 'Polygon', coordinates: [ring] };
}

function parcelResponse(parcel, extra = {}) {
  return {
    id: parcel.id,
    reference: parcel.reference,
    numeroIdentificationCadastrale: parcel.numero_identification_cadastrale,
    nicad: parcel.numero_identification_cadastrale,
    localisation: parcel.localisation,
    type: parcel.type_zone,
    superficie: parcel.superficie,
    polygon: parcel.polygon,
    sha256: parcel.sha256,
    statut: parcel.statut,
    hasDocument: Boolean(parcel.titre_plan_storage_name),
    titrePlanName: parcel.titre_plan_original_name,
    created_at: parcel.createdAt,
    updated_at: parcel.updatedAt,
    ...extra,
  };
}

exports.getPromoteurParcelles = async (req, res) => {
  try {
    const parcelles = await Parcelle.findAll({
      where: { proprietaire_id: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    const results = await Promise.all(parcelles.map(async (parcelle) => {
      const validation = await Validation.findOne({
        where: { parcel_id: parcelle.id },
        order: [['createdAt', 'DESC']],
      });
      return parcelResponse(parcelle, {
        motifRejet: validation?.statut?.startsWith('REJETE') ? validation.commentaire : undefined,
      });
    }));

    return res.status(200).json(results);
  } catch (error) {
    console.error('Erreur getPromoteurParcelles :', error);
    return res.status(500).json({ error: 'Impossible de charger les parcelles.' });
  }
};

exports.getPromoteurParcelleById = async (req, res) => {
  try {
    if (!uuidPattern.test(req.params.id)) {
      return res.status(404).json({ error: 'Parcelle introuvable.' });
    }

    const parcel = await Parcelle.findByPk(req.params.id, {
      include: [{ model: User, as: 'proprietaire', attributes: ['id', 'nom', 'prenom'] }],
    });
    if (
      !parcel ||
      (req.user.role === 'PROMOTEUR' && parcel.proprietaire_id !== req.user.id)
    ) {
      return res.status(404).json({ error: 'Parcelle introuvable.' });
    }

    return res.status(200).json(parcelResponse(parcel, {
      proprio_nom: parcel.proprietaire
        ? `${parcel.proprietaire.prenom} ${parcel.proprietaire.nom}`.trim()
        : undefined,
    }));
  } catch (error) {
    console.error('Erreur getPromoteurParcelleById :', error);
    return res.status(500).json({ error: 'Impossible de charger la parcelle.' });
  }
};

exports.createParcelle = async (req, res) => {
  const file = req.file;
  let filePersisted = false;

  try {
    if (file) {
      const fileHandle = await fs.open(file.path, 'r');
      const header = Buffer.alloc(8);
      try {
        await fileHandle.read(header, 0, header.length, 0);
      } finally {
        await fileHandle.close();
      }

      if (!isValidDocumentSignature(file, header)) {
        await removeUploadedFile(file);
        return res.status(400).json({ error: 'Le contenu du document ne correspond pas à son format.' });
      }
    }

    const reference = typeof req.body.reference === 'string' ? req.body.reference.trim() : '';
    const nicad = typeof req.body.numeroIdentificationCadastrale === 'string'
      ? req.body.numeroIdentificationCadastrale.trim()
      : '';
    const localisation = typeof req.body.localisation === 'string' ? req.body.localisation.trim() : '';
    const type = typeof req.body.type === 'string' ? req.body.type.trim().toUpperCase() : '';

    if (!reference || !nicad || !localisation || !type) {
      await removeUploadedFile(file);
      return res.status(400).json({ error: 'La référence, le numéro cadastral, la localisation et le type sont obligatoires.' });
    }

    if (!validTypes.has(type)) {
      await removeUploadedFile(file);
      return res.status(400).json({ error: 'Le type de zone doit être URBAIN, AGRICOLE ou INDUSTRIEL.' });
    }

    let parsedGeometry;
    try {
      parsedGeometry = parseParcelGeometry(req.body.polygon);
    } catch (error) {
      await removeUploadedFile(file);
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
    const geoJsonPolygon = toGeoJsonPolygon(parsedGeometry.points);

    // Contrôle géospatial réel (PostGIS) : géométrie valide, pas de
    // chevauchement avec une parcelle CERTIFIEE, surface calculée par
    // ST_Area — remplace l'ancien calcul approximatif en JavaScript.
    let surfaceM2;
    try {
      ({ surfaceM2 } = await geospatialService.validerEtEnrichirParcelle(geoJsonPolygon));
    } catch (error) {
      await removeUploadedFile(file);
      return res.status(error.statusCode || 400).json({ error: error.message, code: error.code, details: error.parcelles });
    }

    // Écart entre la superficie saisie et celle calculée par PostGIS
    // (cahier des charges : alerte si écart > 5 %, n'empêche pas l'envoi).
    const superficieSaisie = Number(req.body.superficieSaisie);
    let ecartSuperficie = null;
    if (Number.isFinite(superficieSaisie) && superficieSaisie > 0) {
      ecartSuperficie = Math.abs(superficieSaisie - surfaceM2) / superficieSaisie;
    }

    // Empreinte SHA-256 : celle du document déposé (intégrité documentaire,
    // cahier des charges), pas des métadonnées — c'est cette valeur qui doit
    // correspondre à celle inscrite sur la blockchain au moment de la
    // certification notariale.
    const sha256 = file
      ? await documentService.calculerHashFichier(file.path)
      : createHash('sha256').update(JSON.stringify({ reference, nicad, localisation, type, geoJsonPolygon })).digest('hex');

    const result = await sequelize.transaction(async (transaction) => {
      const byReference = await Parcelle.findOne({
        where: { reference, proprietaire_id: req.user.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const byNicad = await Parcelle.findOne({
        where: {
          numero_identification_cadastrale: nicad,
          proprietaire_id: req.user.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (byReference && byNicad && byReference.id !== byNicad.id) {
        const error = new Error('La référence et le numéro cadastral appartiennent à deux brouillons différents.');
        error.statusCode = 409;
        throw error;
      }

      const existingParcel = byReference || byNicad;
      if (existingParcel && !['BROUILLON', 'SOUMISE'].includes(existingParcel.statut)) {
        const error = new Error('Une parcelle déjà traitée ne peut pas être modifiée.');
        error.statusCode = 409;
        throw error;
      }
      if (existingParcel?.statut === 'SOUMISE') {
        return { parcel: existingParcel, created: false, fileSaved: false };
      }

      const parcelData = {
        reference,
        numero_identification_cadastrale: nicad,
        localisation,
        type_zone: type,
        superficie: surfaceM2.toFixed(2),
        polygon: geoJsonPolygon,
        sha256,
        ...(file ? {
          titre_plan_storage_name: file.filename,
          titre_plan_original_name: path.basename(file.originalname),
          titre_plan_mime_type: file.mimetype,
          titre_plan_size: file.size,
        } : {}),
      };

      if (existingParcel) {
        const previousStorageName = existingParcel.titre_plan_storage_name;
        await existingParcel.update(parcelData, { transaction });
        return {
          parcel: existingParcel,
          created: false,
          fileSaved: Boolean(file),
          previousStorageName,
        };
      }

      const parcel = await Parcelle.create({
        ...parcelData,
        proprietaire_id: req.user.id,
        statut: 'BROUILLON',
      }, { transaction });
      return { parcel, created: true, fileSaved: Boolean(file) };
    });

    filePersisted = result.fileSaved;
    if (
      result.fileSaved &&
      result.previousStorageName &&
      result.previousStorageName !== result.parcel.titre_plan_storage_name
    ) {
      await removeUploadedFile({
        path: path.join(parcelDocumentDirectory, result.previousStorageName),
      });
    }

    // Soumission automatique au Cadastre : appel direct, en process (plus
    // d'appel HTTP entre « services » puisque c'est un seul backend).
    const validation = await createValidationForParcel(result.parcel.id, parcelResponse(result.parcel));
    result.parcel.statut = 'SOUMISE';
    await result.parcel.save();

    // Inscription de la soumission sur Hyperledger Fabric (cahier :
    // SubmitParcel, Org1/Promoteur). La parcelle reste SOUMISE même si cette
    // écriture échoue : le Cadastre pourra réessayer via sa propre décision.
    try {
      const { txId } = await blockchainService.submitParcel(
        result.parcel.id,
        result.parcel.reference,
        sha256,
        req.user.id,
      );
      validation.fabric_tx_id = txId;
      await validation.save();
    } catch (error) {
      console.error('Échec de SubmitParcel sur la blockchain :', error);
    }

    return res.status(result.created ? 201 : 200).json(parcelResponse(result.parcel, { ecartSuperficie }));
  } catch (error) {
    if (!filePersisted) await removeUploadedFile(file);
    if (error.statusCode) return res.status(error.statusCode).json({
      error: error.statusCode >= 500
        ? `La parcelle reste enregistrée en brouillon, mais sa soumission au Cadastre a échoué : ${error.message}`
        : error.message,
    });
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Cette référence ou ce numéro cadastral est déjà utilisé.' });
    }
    console.error('Erreur createParcelle :', error);
    return res.status(500).json({ error: 'Impossible de créer la parcelle.' });
  }
};

exports.downloadParcelleDocument = async (req, res, next) => {
  try {
    if (!uuidPattern.test(req.params.id)) {
      return res.status(404).json({ error: 'Document introuvable.' });
    }

    const parcel = await Parcelle.findByPk(req.params.id);
    if (
      !parcel ||
      !parcel.titre_plan_storage_name ||
      (req.user.role === 'PROMOTEUR' && parcel.proprietaire_id !== req.user.id)
    ) {
      return res.status(404).json({ error: 'Document introuvable.' });
    }

    const filePath = path.join(parcelDocumentDirectory, parcel.titre_plan_storage_name);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.type(parcel.titre_plan_mime_type);
    return res.download(filePath, parcel.titre_plan_original_name, (error) => {
      if (error) next(error);
    });
  } catch (error) {
    return next(error);
  }
};

exports.getBlockchainProof = async (req, res) => {
  try {
    const searchValue = typeof req.params.reference === 'string' ? req.params.reference.trim() : '';
    const parcel = await Parcelle.findOne({
      where: {
        [Op.or]: [
          { reference: searchValue },
          { sha256: searchValue.toLowerCase() },
        ],
      },
    });
    if (!parcel) return res.status(404).json({ error: 'Aucune parcelle trouvée pour cette référence.' });

    const validation = await Validation.findOne({
      where: { parcel_id: parcel.id },
      order: [['updatedAt', 'DESC']],
    });
    const txId = validation?.fabric_tx_id || null;

    return res.status(200).json({
      reference: parcel.reference,
      statut: validation?.statut || parcel.statut,
      sha256: parcel.sha256,
      txId,
      timestamp: validation?.updatedAt || parcel.createdAt,
      verified: Boolean(txId),
    });
  } catch (error) {
    console.error('Erreur getBlockchainProof :', error);
    return res.status(500).json({ error: 'Impossible de vérifier cette preuve.' });
  }
};

// Écart entre la surface déclarée et la surface recalculée par PostGIS
// (écran Notaire : « superficie calculée »). NB: à ce stade la surface
// stockée sur la parcelle a déjà été calculée par ST_Area à la création ;
// ce point recalcule à partir de la géométrie stockée, pour détecter une
// éventuelle divergence si la géométrie a été modifiée depuis.

// Accepte soit l'id d'une Parcelle, soit l'id d'une Validation (l'Espace
// Notaire manipule l'id du dossier de validation, pas celui de la parcelle).
async function resolveParcelle(id) {
  let parcel = await Parcelle.findByPk(id);
  if (parcel) return parcel;
  const validation = await Validation.findByPk(id);
  if (!validation) return null;
  return Parcelle.findByPk(validation.parcel_id);
}

exports.getSuperficieCalculee = async (req, res) => {
  try {
    const parcel = await resolveParcelle(req.params.id);
    if (!parcel) return res.status(404).json({ error: 'Parcelle introuvable.' });

    const superficieCalculee = await geospatialService.calculerSurface(parcel.polygon);
    return res.status(200).json({ data: { superficieCalculee } });
  } catch (error) {
    console.error('Erreur getSuperficieCalculee :', error);
    return res.status(500).json({ error: 'Impossible de recalculer la superficie.' });
  }
};

// Preuve blockchain détaillée pour une parcelle (écran Notaire : historique
// Fabric + comparaison des empreintes). Contrairement à getBlockchainProof
// (recherche publique par référence), ce point exige d'être authentifié et
// renvoie l'historique complet du ledger, pas seulement la dernière
// transaction connue en base.
// NB pour Lady : la forme exacte des entrées de `history` dépend du
// chaincode (GetParcelHistory) — à vérifier une fois le réseau Fabric
// test-network lancé ; ce point renvoie l'historique brut sans supposer
// de champs au-delà de ceux déjà utilisés ailleurs dans blockchainService.
exports.getParcelleProof = async (req, res) => {
  try {
    const parcel = await resolveParcelle(req.params.id);
    if (!parcel) return res.status(404).json({ error: 'Parcelle introuvable.' });
    if (req.user.role === 'PROMOTEUR' && parcel.proprietaire_id !== req.user.id) {
      return res.status(404).json({ error: 'Parcelle introuvable.' });
    }

    const [history, hashIdentique] = await Promise.all([
      blockchainService.getParcelHistory(parcel.id, req.user.role),
      blockchainService.verifyDocument(parcel.id, parcel.sha256, req.user.role).catch(() => null),
    ]);

    return res.status(200).json({
      parcelId: parcel.id,
      reference: parcel.reference,
      statutBase: parcel.statut,
      hashBase: parcel.sha256,
      hashIdentique,
      history,
    });
  } catch (error) {
    console.error('Erreur getParcelleProof :', error);
    return res.status(502).json({ error: 'Impossible de lire la blockchain pour cette parcelle.' });
  }
};
