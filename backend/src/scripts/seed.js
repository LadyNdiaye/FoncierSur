const bcrypt = require('bcryptjs');
const { connectDB, sequelize } = require('../config/db');
const User = require('../models/User');

const seedDatabase = async () => {
  try {
    const defaultPassword = process.env.SEED_PASSWORD;
    if (typeof defaultPassword !== 'string' || defaultPassword.length < 12) {
      throw new Error('SEED_PASSWORD doit être défini et contenir au moins 12 caractères.');
    }

    await connectDB();
    await sequelize.sync();

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const users = [
      { nom: 'Diatta', prenom: 'Carla', email: 'promoteur@fonciersur.sn', role: 'PROMOTEUR' },
      { nom: 'Cadastre', prenom: 'Agent', email: 'cadastre@fonciersur.sn', role: 'CADASTRE' },
      { nom: 'Notaire', prenom: 'Maitre', email: 'notaire@fonciersur.sn', role: 'NOTAIRE' },
    ];

    for (const userData of users) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: {
          nom: userData.nom,
          prenom: userData.prenom,
          password: hashedPassword,
          role: userData.role,
        },
      });

      if (!created) {
        await user.update({
          nom: userData.nom,
          prenom: userData.prenom,
          password: hashedPassword,
          role: userData.role,
        });
        console.log(`[SEED] Utilisateur ${userData.role} mis à jour : ${userData.email}`);
      } else {
        console.log(`[SEED] Utilisateur ${userData.role} créé : ${userData.email}`);
      }
    }

    console.log('Peuplement (Seed) de la base de données terminé avec succès !');
  } catch (error) {
    console.error('Erreur lors du seed :', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  void seedDatabase();
}

module.exports = seedDatabase;