const { QueryTypes } = require('sequelize');
const { sequelize } = require('./db');
const { PARCEL_STATUSES } = require('../constants/parcelleStatus');

async function tableExists(tableName) {
  const [result] = await sequelize.query(
    'SELECT to_regclass(:tableName) AS table_name',
    {
      replacements: { tableName: `public.${tableName}` },
      type: QueryTypes.SELECT,
    },
  );
  return Boolean(result?.table_name);
}

async function enumExists(enumTypeName) {
  const [result] = await sequelize.query(
    'SELECT to_regtype(:enumTypeName) AS enum_type',
    {
      replacements: { enumTypeName: `public.${enumTypeName}` },
      type: QueryTypes.SELECT,
    },
  );
  return Boolean(result?.enum_type);
}

async function migrateStatusEnum(tableName, enumTypeName, defaultStatus) {
  if (!await tableExists(tableName)) return;

  const [statusColumn] = await sequelize.query(
    'SELECT udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = :schemaName AND table_name = :tableName AND column_name = :columnName',
    {
      replacements: { schemaName: 'public', tableName, columnName: 'statut' },
      type: QueryTypes.SELECT,
    },
  );

  if (!statusColumn) {
    await sequelize.query(`
      ALTER TABLE ${tableName}
      ADD COLUMN statut TEXT NOT NULL DEFAULT '${defaultStatus}';
    `);
  }

  let currentLabels;
  if (statusColumn?.udt_name === enumTypeName || await enumExists(enumTypeName)) {
    const [enumResult] = await sequelize.query(
      'SELECT array_agg(enumlabel ORDER BY enumsortorder) AS labels FROM pg_enum WHERE enumtypid = to_regtype(:enumTypeName)',
      {
        replacements: { enumTypeName: `public.${enumTypeName}` },
        type: QueryTypes.SELECT,
      },
    );
    currentLabels = enumResult?.labels;
  }

  if (JSON.stringify(currentLabels) === JSON.stringify(PARCEL_STATUSES)) return;

  await sequelize.query(`
    ALTER TABLE ${tableName} ALTER COLUMN statut DROP DEFAULT;
    ALTER TABLE ${tableName} ALTER COLUMN statut TYPE TEXT USING statut::text;
    UPDATE ${tableName}
    SET statut = CASE statut
      WHEN 'APPROUVE' THEN 'VALIDE_CADASTRE'
      WHEN 'REJETE' THEN 'REJETE_CADASTRE'
      WHEN 'CERTIFIE' THEN 'CERTIFIEE'
      ELSE statut
    END;
  `);
  if (await enumExists(`${enumTypeName}_next`)) {
    await sequelize.query(`DROP TYPE IF EXISTS ${enumTypeName}_next CASCADE;`);
  }
  if (await enumExists(enumTypeName)) {
    await sequelize.query(`DROP TYPE IF EXISTS ${enumTypeName} CASCADE;`);
  }
  await sequelize.query(`
    CREATE TYPE ${enumTypeName}_next AS ENUM (
      'BROUILLON',
      'SOUMISE',
      'VALIDE_CADASTRE',
      'REJETE_CADASTRE',
      'CERTIFIEE',
      'REJETE_NOTAIRE'
    );
  `);
  await sequelize.query(`
    ALTER TABLE ${tableName}
    ALTER COLUMN statut TYPE ${enumTypeName}_next
    USING statut::text::${enumTypeName}_next;
  `);
  await sequelize.query(`
    ALTER TYPE ${enumTypeName}_next RENAME TO ${enumTypeName};
    ALTER TABLE ${tableName} ALTER COLUMN statut SET DEFAULT '${defaultStatus}';
  `);
}

async function migrateValidationSchema() {
  if (await tableExists('validations')) {
    await sequelize.query(`
      ALTER TABLE validations
      ADD COLUMN IF NOT EXISTS parcelle_snapshot JSONB;
    `);
    await sequelize.query(`
      ALTER TABLE validations
      ADD COLUMN IF NOT EXISTS statut TEXT NOT NULL DEFAULT 'SOUMISE';
    `);
    await migrateStatusEnum('validations', 'enum_validations_statut', 'SOUMISE');

    const [constraint] = await sequelize.query(
      "SELECT 1 FROM pg_constraint WHERE conname = 'validations_parcel_id_unique' AND conrelid = 'public.validations'::regclass",
      { type: QueryTypes.SELECT },
    );
    if (!constraint) {
      const [duplicates] = await sequelize.query(`
        SELECT parcel_id
        FROM validations
        GROUP BY parcel_id
        HAVING COUNT(*) > 1
        LIMIT 1
      `, { type: QueryTypes.SELECT });

      if (duplicates) {
        throw new Error('Migration impossible : plusieurs validations existent pour une même parcelle.');
      }

      await sequelize.query(`
        ALTER TABLE validations
        ADD CONSTRAINT validations_parcel_id_unique UNIQUE (parcel_id);
      `);
    }
  }

  await migrateStatusEnum('parcelles', 'enum_parcelles_statut', 'BROUILLON');
}

module.exports = { migrateValidationSchema };
