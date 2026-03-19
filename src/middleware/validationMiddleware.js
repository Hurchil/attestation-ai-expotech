// Ajouter ces nouvelles fonctions de validation

const validateFeedback = (req, res, next) => {
  const { nom, prenom, telephone, note, email, commentaire } = req.body;

  // Validation nom
  if (!nom || typeof nom !== 'string' || nom.trim().length < 2) {
    return res.status(400).json({ 
      message: 'Nom invalide (minimum 2 caractères)' 
    });
  }

  // Validation prénom
  if (!prenom || typeof prenom !== 'string' || prenom.trim().length < 2) {
    return res.status(400).json({ 
      message: 'Prénom invalide (minimum 2 caractères)' 
    });
  }

  // Validation téléphone (format simple)
  if (!telephone || typeof telephone !== 'string' || telephone.trim().length < 8) {
    return res.status(400).json({ 
      message: 'Numéro de téléphone invalide (minimum 8 chiffres)' 
    });
  }

  // Validation note
  if (!note || typeof note !== 'number' || note < 1 || note > 5) {
    return res.status(400).json({ 
      message: 'Note invalide (doit être entre 1 et 5)' 
    });
  }

  // Validation email (optionnel mais doit être valide si fourni)
  if (email && email.trim() !== '') {
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Format d\'email invalide' 
      });
    }
  }

  // Validation commentaire (optionnel)
  if (commentaire && commentaire.length > 1000) {
    return res.status(400).json({ 
      message: 'Commentaire trop long (maximum 1000 caractères)' 
    });
  }

  // Nettoyer les données
  req.body.nom = nom.trim();
  req.body.prenom = prenom.trim();
  req.body.telephone = telephone.trim();
  req.body.email = email ? email.trim() : undefined;
  req.body.commentaire = commentaire ? commentaire.trim() : undefined;
  
  next();
};

// Garder les validateurs existants
const validateParticipant = (req, res, next) => {
  const { nom } = req.body;
  
  if (!nom || typeof nom !== 'string' || nom.trim().length < 2) {
    return res.status(400).json({ 
      message: 'Nom invalide (minimum 2 caractères)' 
    });
  }
  
  if (nom.length > 100) {
    return res.status(400).json({ 
      message: 'Nom trop long (maximum 100 caractères)' 
    });
  }
  
  req.body.nom = nom.trim();
  next();
};

const validateCode = (req, res, next) => {
  const { code } = req.params;
  
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Code invalide' });
  }
  
  const codeRegex = /^IA-[A-Z2-9]{6}$/;
  if (!codeRegex.test(code)) {
    return res.status(400).json({ message: 'Format de code invalide' });
  }
  
  next();
};

// Nouveau validateur pour le code dans le body
const validateCodeBody = (req, res, next) => {
  const { code } = req.body;
  
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Code requis' });
  }
  
  const codeRegex = /^IA-[A-Z2-9]{6}$/;
  if (!codeRegex.test(code)) {
    return res.status(400).json({ message: 'Format de code invalide' });
  }
  
  next();
};

module.exports = {
  validateParticipant,
  validateCode,
  validateCodeBody,
  validateFeedback  // NOUVEAU
};