const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const fontkit = require('@pdf-lib/fontkit');

class PDFGeneratorService {
  constructor() {
    this.templatePath = path.join(__dirname, '../../templates/attestation-template.pdf');
    this.fontPath = path.join(__dirname, '../../fonts/Cookie-Regular.ttf');
    this.templateCache = null;
  }

  /**
   * Formate le nom pour l'affichage: NOM Prénom
   * @param {string} nom - Nom de famille
   * @param {string} prenom - Prénom
   * @returns {string} Nom formaté pour l'attestation
   */
  formatNomComplet(nom, prenom) {
    // Nettoyer et formater chaque partie
    const formatPartie = (texte) => {
      return texte
        .trim()
        .toLowerCase()
        .split('-')
        .map(partie => partie.charAt(0).toUpperCase() + partie.slice(1))
        .join('-');
    };

    const nomFormate = formatPartie(nom);
    const prenomFormate = formatPartie(prenom);

    // Ordre: NOM Prénom
    return `${nomFormate} ${prenomFormate}`;
  }

  /**
   * Charge le template PDF en cache
   */
  async loadTemplate() {
    if (this.templateCache) {
      return this.templateCache;
    }

    try {
      const templateBytes = await fs.readFile(this.templatePath);
      this.templateCache = await PDFDocument.load(templateBytes);
      return this.templateCache;
    } catch (error) {
      console.error('Erreur chargement template:', error);
      throw new Error('Impossible de charger le template');
    }
  }

  /**
   * Génère l'attestation avec le nom du participant (NOM Prénom)
   * @param {string} nom - Nom de famille
   * @param {string} prenom - Prénom
   * @returns {Promise<Buffer>} PDF généré
   */
  async generateAttestation(nom, prenom) {
    try {
      // Formater le nom complet dans l'ordre NOM Prénom
      const nomComplet = this.formatNomComplet(nom, prenom);
      console.log(`✓ Génération attestation pour: "${nomComplet}"`);

      // Charger le template
      const templateBytes = await fs.readFile(this.templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);

      // Enregistrer fontkit pour les polices custom
      pdfDoc.registerFontkit(fontkit);

      // Récupérer la première page
      const page = pdfDoc.getPage(0);
      const { width } = page.getSize();

      // Charger la police Great Vibes
      const fontBytes = await fs.readFile(this.fontPath);
      const greatVibesFont = await pdfDoc.embedFont(fontBytes);

      // Paramètres du texte
      const fontSize = 75;
      const textColor = rgb(162 / 255, 104 / 255, 0); // #A26800
      const y = 313; // Position verticale calibrée

      // Calculer la largeur du texte
      const textWidth = greatVibesFont.widthOfTextAtSize(nomComplet, fontSize);
      
      // Centrer horizontalement
      const x = (width - textWidth) / 2;

      // Ajouter le texte
      page.drawText(nomComplet, {
        x: x,
        y: y,
        size: fontSize,
        font: greatVibesFont,
        color: textColor,
      });

      // Sauvegarder le PDF
      const pdfBytes = await pdfDoc.save();
      
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      throw new Error(`Erreur lors de la génération du PDF: ${error.message}`);
    }
  }
}

// Export d'une instance unique
module.exports = new PDFGeneratorService();