const express = require('express');
const {
  getParticipants,
  addParticipant,
  deleteParticipant,
  regenerateCode
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const { validateParticipant } = require('../middleware/validationMiddleware');

const router = express.Router();

// Toutes les routes admin sont protégées
router.use(authMiddleware);

router.get('/participants', getParticipants);
router.post('/participants', validateParticipant, addParticipant);
router.delete('/participants/:id', deleteParticipant);
router.post('/participants/:id/regenerate-code', regenerateCode);

module.exports = router;