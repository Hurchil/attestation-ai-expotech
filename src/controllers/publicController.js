const Participant = require('../models/Participant');
const Feedback = require('../models/Feedback');
const pdfGenerator = require('../services/pdfGenerator');

// Vérifier un code (inchangé)
const verifyCode = async (req, res) => {
  try {
    const { code } = req.body;
    
    const participant = await Participant.findOne({ code_secret: code });
    
    if (!participant) {
      return res.status(404).json({ 
        valid: false,
        message: 'Code invalide' 
      });
    }
    
    // Vérifier si le code a déjà été utilisé pour un feedback
    const existingFeedback = await Feedback.findOne({ 
      participant: participant._id 
    });
    
    res.json({
      valid: true,
      nom: participant.nom,
      deja_utilise: !!existingFeedback  // Indique si déjà téléchargé
    });
    
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Dans publicController.js, modifier la fonction downloadAttestation

const downloadAttestation = async (req, res) => {
  try {
    const { 
      code, 
      nom,          // Nom de famille
      prenom,       // Prénom
      telephone, 
      email, 
      note, 
      commentaire 
    } = req.body;

    // Vérifier que le code existe
    const participant = await Participant.findOne({ code_secret: code });
    
    if (!participant) {
      return res.status(404).json({ message: 'Code invalide' });
    }

    // Vérifier si ce participant n'a pas déjà donné son feedback
    const existingFeedback = await Feedback.findOne({ 
      participant: participant._id 
    });
    
    if (existingFeedback) {
      return res.status(400).json({ 
        message: 'Ce code a déjà été utilisé pour télécharger une attestation' 
      });
    }

    // Créer le feedback
    const feedback = new Feedback({
      participant: participant._id,
      nom,           // On garde la distinction nom/prénom
      prenom,
      telephone,
      email: email || undefined,
      note,
      commentaire: commentaire || undefined,
      code_utilise: code
    });

    await feedback.save();

    // IMPORTANT: Générer le PDF avec NOM et Prénom séparés
    const pdfBuffer = await pdfGenerator.generateAttestation(prenom, nom);
    
    // Mettre à jour le participant
    participant.attestation_generee = true;
    participant.date_telechargement = new Date();
    await participant.save();
    
    // Envoyer le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=attestation-${participant.code_secret}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Download attestation error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Cette attestation a déjà été téléchargée' 
      });
    }
    
    res.status(500).json({ message: 'Erreur lors de la génération du PDF' });
  }
};


// NOUVEAU: Obtenir les statistiques des feedbacks (optionnel, pour admin)
const getFeedbackStats = async (req, res) => {
  try {
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          note_moyenne: { $avg: '$note' },
          notes: {
            $push: '$note'
          }
        }
      }
    ]);

    const distribution = await Feedback.aggregate([
      {
        $group: {
          _id: '$note',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      total_feedbacks: stats[0]?.total || 0,
      note_moyenne: stats[0]?.note_moyenne?.toFixed(1) || 0,
      distribution: distribution.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  verifyCode,
  downloadAttestation,  // MODIFIÉ
  getFeedbackStats      // NOUVEAU (optionnel)
};