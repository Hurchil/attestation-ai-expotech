const crypto = require('crypto');

/**
 * Génère un code secret unique de format IA-XXXX
 * @param {number} length - Longueur du code sans préfixe
 * @returns {string} Code formaté
 */
const generateSecretCode = (length = 6) => {
  // Générer une chaîne aléatoire
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans caractères ambigus (O,0,I,1)
  let result = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return `IA-${result}`;
};

/**
 * Vérifie le format du code
 * @param {string} code 
 * @returns {boolean}
 */
const isValidCodeFormat = (code) => {
  const regex = /^IA-[A-Z2-9]{6}$/;
  return regex.test(code);
};

module.exports = {
  generateSecretCode,
  isValidCodeFormat
};