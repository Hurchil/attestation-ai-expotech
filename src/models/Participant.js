const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
    trim: true
  },
  code_secret: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  attestation_generee: {
    type: Boolean,
    default: false
  },
  date_telechargement: {
    type: Date
  }
}, {
  timestamps: true
});

// Index pour recherche rapide
participantSchema.index({ code_secret: 1 });
participantSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Participant', participantSchema);