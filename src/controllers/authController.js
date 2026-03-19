const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username et password requis' 
      });
    }

    // Chercher l'admin
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({ 
        message: 'Identifiants invalides' 
      });
    }

    // Vérifier le mot de passe
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Identifiants invalides' 
      });
    }

    // Générer token
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      expiresIn: process.env.JWT_EXPIRE
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Erreur serveur' 
    });
  }
};

const verifyToken = (req, res) => {
  res.json({ 
    valid: true, 
    adminId: req.adminId 
  });
};

module.exports = {
  login,
  verifyToken
};