const express = require('express');
const {
  verifyCode,
  downloadAttestation,
  getFeedbackStats  // NOUVEAU (optionnel)
} = require('../controllers/publicController');
const { 
  validateCode, 
  validateCodeBody,
  validateFeedback  // NOUVEAU
} = require('../middleware/validationMiddleware');

const router = express.Router();

// Route pour vérifier un code (inchangée)
router.post('/verify-code', validateCodeBody, verifyCode);

// MODIFIÉ: Passage de GET à POST avec validation des feedbacks
router.post(
  '/attestation', 
  validateCodeBody,     // Valide que le code est présent et bien formaté
  validateFeedback,      // Valide toutes les données du feedback
  downloadAttestation
);

// NOUVEAU (optionnel) - Route admin pour voir les stats
// À protéger si besoin
router.get('/feedback-stats', getFeedbackStats);

module.exports = router;