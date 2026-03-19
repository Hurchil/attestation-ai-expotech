const Participant = require('../models/Participant');
const { generateSecretCode } = require('../utils/codeGenerator');

// Lister tous les participants
const getParticipants = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    
    let query = {};
    if (search) {
      query.nom = { $regex: search, $options: 'i' };
    }
    
    const participants = await Participant.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Participant.countDocuments(query);
    
    res.json({
      participants,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
    
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Ajouter un participant
const addParticipant = async (req, res) => {
  try {
    const { nom, email } = req.body;
    
    // Générer code unique
    let code_secret;
    let exists = true;
    
    while (exists) {
      code_secret = generateSecretCode();
      exists = await Participant.findOne({ code_secret });
    }
    
    const participant = new Participant({
      nom,
      code_secret,
      email
    });
    
    await participant.save();
    
    res.status(201).json({
      message: 'Participant ajouté',
      participant: {
        id: participant._id,
        nom: participant.nom,
        code_secret: participant.code_secret,
        email: participant.email,
        created_at: participant.createdAt
      }
    });
    
  } catch (error) {
    console.error('Add participant error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Email déjà utilisé' 
      });
    }
    
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un participant
const deleteParticipant = async (req, res) => {
  try {
    const { id } = req.params;
    
    const participant = await Participant.findByIdAndDelete(id);
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant non trouvé' });
    }
    
    res.json({ 
      message: 'Participant supprimé',
      participant 
    });
    
  } catch (error) {
    console.error('Delete participant error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Régénérer code
const regenerateCode = async (req, res) => {
  try {
    const { id } = req.params;
    
    let code_secret;
    let exists = true;
    
    while (exists) {
      code_secret = generateSecretCode();
      exists = await Participant.findOne({ code_secret });
    }
    
    const participant = await Participant.findByIdAndUpdate(
      id,
      { code_secret },
      { new: true }
    );
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant non trouvé' });
    }
    
    res.json({
      message: 'Code régénéré',
      code_secret: participant.code_secret
    });
    
  } catch (error) {
    console.error('Regenerate code error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getParticipants,
  addParticipant,
  deleteParticipant,
  regenerateCode
};