// Contrôles géospatiaux PostGIS pour les parcelles (cahier des charges §4 et §7).
// Module de Mame Ndiaya Gaye (Géospatial), adapté ici pour tourner dans le
// backend unique : colonne `polygon` (et non `geometrie`), table `parcelles`
// déjà définie par le modèle Sequelize de Carla, chevauchement limité aux
// parcelles déjà CERTIFIEE (c'est la règle du cahier, pas « toutes »).
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Vérifie que la géométrie d'une parcelle est topologiquement valide
 * (pas d'auto-intersection, anneau bien fermé, etc.) avant sauvegarde.
 */
async function estGeometrieValide(geoJsonPolygon) {
  const [result] = await sequelize.query(
    `SELECT ST_IsValid(ST_GeomFromGeoJSON(:geojson)) AS valide,
            ST_IsValidReason(ST_GeomFromGeoJSON(:geojson)) AS raison`,
    {
      replacements: { geojson: JSON.stringify(geoJsonPolygon) },
      type: QueryTypes.SELECT,
    }
  );
  return { valide: result.valide, raison: result.raison };
}

/**
 * Calcule la surface d'une parcelle en m².
 * ST_Area sur une géométrie géographique (::geography) donne un résultat
 * en mètres carrés même avec des coordonnées GPS (SRID 4326).
 */
async function calculerSurface(geoJsonPolygon) {
  const [result] = await sequelize.query(
    `SELECT ST_Area(ST_GeomFromGeoJSON(:geojson)::geography) AS surface_m2`,
    {
      replacements: { geojson: JSON.stringify(geoJsonPolygon) },
      type: QueryTypes.SELECT,
    }
  );
  return Number(result.surface_m2);
}

/**
 * Parcelles existantes qui chevauchent (ST_Intersects) la géométrie donnée.
 * Cahier des charges §7 : seul le chevauchement avec une parcelle déjà
 * CERTIFIEE doit bloquer la soumission (une parcelle encore en cours
 * d'instruction peut légitimement se superposer, par ex. deux brouillons
 * concurrents que le Cadastre tranchera).
 */
async function trouverParcellesChevauchantes(geoJsonPolygon, excludeId = null) {
  const whereExclude = excludeId ? 'AND id != :excludeId' : '';

  return sequelize.query(
    `SELECT id, reference
     FROM parcelles
     WHERE statut = 'CERTIFIEE'
       AND ST_Intersects(polygon, ST_GeomFromGeoJSON(:geojson))
     ${whereExclude}`,
    {
      replacements: {
        geojson: JSON.stringify(geoJsonPolygon),
        excludeId,
      },
      type: QueryTypes.SELECT,
    }
  );
}

/**
 * Pipeline complet de validation appelé avant la création d'une parcelle :
 * validité géométrique -> chevauchement -> surface calculée par PostGIS.
 * Lève une erreur avec `statusCode` et `code` exploitables par le contrôleur.
 */
async function validerEtEnrichirParcelle(geoJsonPolygon, excludeId = null) {
  const { valide, raison } = await estGeometrieValide(geoJsonPolygon);
  if (!valide) {
    const erreur = new Error(`Géométrie invalide : ${raison}`);
    erreur.code = 'GEOMETRIE_INVALIDE';
    erreur.statusCode = 400;
    throw erreur;
  }

  const chevauchements = await trouverParcellesChevauchantes(geoJsonPolygon, excludeId);
  if (chevauchements.length > 0) {
    const erreur = new Error(
      `Cette géométrie chevauche ${chevauchements.length} parcelle(s) déjà certifiée(s).`
    );
    erreur.code = 'CHEVAUCHEMENT_DETECTE';
    erreur.statusCode = 409;
    erreur.parcelles = chevauchements;
    throw erreur;
  }

  const surfaceM2 = await calculerSurface(geoJsonPolygon);
  return { surfaceM2 };
}

module.exports = {
  estGeometrieValide,
  calculerSurface,
  trouverParcellesChevauchantes,
  validerEtEnrichirParcelle,
};
