const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { PARCEL_STATUSES } = require('../constants/parcelleStatus');
const User = require('./User');

const Validation = sequelize.define('Validation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  parcel_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'validations_parcel_id_unique',
  },
  parcelle_snapshot: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  statut: {
    type: DataTypes.ENUM(...PARCEL_STATUSES),
    allowNull: false,
    defaultValue: 'SOUMISE',
  },
  acteur_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: User,
      key: 'id',
    },
  },
  commentaire: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fabric_tx_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'validations',
  timestamps: true,
  underscored: true,
});

// Associations
Validation.belongsTo(User, { foreignKey: 'acteur_id', as: 'acteur' });

module.exports = Validation;