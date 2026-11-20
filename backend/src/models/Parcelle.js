const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { PARCEL_STATUSES } = require('../constants/parcelleStatus');
const User = require('./User');

const Parcelle = sequelize.define('Parcelle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  numero_identification_cadastrale: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  localisation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type_zone: {
    type: DataTypes.ENUM('URBAIN', 'AGRICOLE', 'INDUSTRIEL'),
    allowNull: false,
  },
  superficie: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  // Géométrie réelle PostGIS (et non un simple JSON) : permet d'utiliser
  // ST_IsValid / ST_Area / ST_Intersects côté base, comme l'exige le cahier
  // des charges (contrôle géospatial automatique). SRID 4326 = coordonnées
  // GPS WGS84, cohérent avec geospatialService et le composant carte.
  polygon: {
    type: DataTypes.GEOMETRY('POLYGON', 4326),
    allowNull: false,
  },
  sha256: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  titre_plan_storage_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  titre_plan_original_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  titre_plan_mime_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  titre_plan_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  proprietaire_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  statut: {
    type: DataTypes.ENUM(...PARCEL_STATUSES),
    allowNull: false,
    defaultValue: 'BROUILLON',
  },
}, {
  tableName: 'parcelles',
  timestamps: true,
  underscored: true,
});

Parcelle.belongsTo(User, { foreignKey: 'proprietaire_id', as: 'proprietaire' });

module.exports = Parcelle;
