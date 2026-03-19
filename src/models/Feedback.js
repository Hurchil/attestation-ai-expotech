const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  participant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Participant',
    required: true
  },
  nom: {
    type: String,
    required: true,
    trim: true
  },
  prenom: {
    type: String,
    required: true,
    trim: true
  },
  telephone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  note: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  commentaire: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  code_utilise: {
    type: String,
    required: true,
    index: true
  },
  date_telechargement: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour éviter qu'un même code soit utilisé plusieurs fois
feedbackSchema.index({ participant: 1 }, { unique: true });

module.exports = mongoose.model('Feedback', feedbackSchema);