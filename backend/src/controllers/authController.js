const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { secret, expiresIn } = require('../config/jwt');

// Inscription (Réservée exclusivement au rôle PROMOTEUR)
exports.register = async (req, res) => {
  try {
    const nom = typeof req.body.nom === 'string' ? req.body.nom.trim() : '';
    const prenom = typeof req.body.prenom === 'string' ? req.body.prenom.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    if (!nom || !prenom || !email || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Adresse e-mail invalide.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      nom,
      prenom,
      email,
      password: hashedPassword,
      role: 'PROMOTEUR',
    });

    return res.status(201).json({
      message: 'Inscription réussie.',
      user: {
        id: newUser.id,
        nom: newUser.nom,
        prenom: newUser.prenom,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }
    console.error("Erreur lors de l'inscription :", error);
    return res.status(500).json({ error: "Erreur interne du serveur." });
  }
};

// Connexion
exports.login = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;

    if (!email || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};