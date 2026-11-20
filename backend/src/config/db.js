const path = require('path');
const { Sequelize } = require('sequelize');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = new Sequelize(
  process.env.DB_NAME || 'fonciersur',
  process.env.DB_USER || 'fonciersur_dev',
  process.env.DB_PASSWORD || null,
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
  }
);

const connectDB = async () => {
  if (!process.env.DB_PASSWORD?.trim()) {
    throw new Error(
      'DB_PASSWORD est absent ou vide. Configurez les accès PostgreSQL dans le fichier .env local.'
    );
  }

  await sequelize.authenticate();
};

module.exports = { sequelize, connectDB };