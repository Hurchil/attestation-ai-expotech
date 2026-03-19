// Configuration
const API_BASE_URL = 'http://localhost:3000/api/public'; // À modifier pour la production
let currentStep = 1;
let verifiedCode = null;
let participantNom = null;

// DOM Elements
const elements = {
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    step3: document.getElementById('step3'),
    progressSteps: document.querySelectorAll('.progress-step'),
    codeForm: document.getElementById('codeForm'),
    infoForm: document.getElementById('infoForm'),
    codeInput: document.getElementById('code'),
    clearCode: document.getElementById('clearCode'),
    verifyBtn: document.getElementById('verifyCodeBtn'),
    submitBtn: document.getElementById('submitInfoBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingMessage: document.getElementById('loadingMessage'),
    participantName: document.getElementById('participantName'),
    verifiedCode: document.getElementById('verifiedCode'),
    downloadCode: document.getElementById('downloadCode'),
    downloadLink: document.getElementById('downloadLink'),
    ratingInputs: document.querySelectorAll('input[name="rating"]'),
    ratingText: document.getElementById('ratingText'),
    charCount: document.getElementById('charCount'),
    commentaire: document.getElementById('commentaire')
};

// Rating labels
const ratingLabels = {
    1: 'Excellent !',
    2: 'Très bien',
    3: 'Bien',
    4: 'Passable',
    5: 'Mauvais'
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateProgressBar(1);
    createParticles();
});

// Configuration des événements
function setupEventListeners() {
    // Code form
    elements.codeForm.addEventListener('submit', handleCodeVerification);
    
    // Code input formatting
    elements.codeInput.addEventListener('input', formatCodeInput);
    elements.codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCodeVerification(e);
    });
    
    // Clear code button
    elements.clearCode.addEventListener('click', () => {
        elements.codeInput.value = '';
        elements.codeInput.focus();
        elements.clearCode.style.display = 'none';
    });
    
    // Info form
    elements.infoForm.addEventListener('submit', handleAttestationDownload);
    
    // Real-time validation
    elements.nom?.addEventListener('input', () => validateField('nom'));
    elements.prenom?.addEventListener('input', () => validateField('prenom'));
    elements.telephone?.addEventListener('input', () => validateField('telephone'));
    elements.email?.addEventListener('input', () => validateField('email'));
    elements.commentaire?.addEventListener('input', updateCharCount);
    
    // Rating stars
    elements.ratingInputs.forEach(input => {
        input.addEventListener('change', updateRatingText);
    });
    
    // Input masks
    setupInputMasks();
}

// ==================== CODE VERIFICATION ====================

async function handleCodeVerification(e) {
    e.preventDefault();
    
    const code = elements.codeInput.value.trim().toUpperCase();
    
    // Validation du format
    const codeRegex = /^IA-[A-Z0-9]{6}$/;
    if (!codeRegex.test(code)) {
        showCodeError('Format invalide. Utilisez le format: IA-XXXXXX');
        return;
    }
    
    showLoading('Vérification du code...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/verify-code`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (response.ok && data.valid) {
            if (data.deja_utilise) {
                showCodeWarning(`Ce code a déjà été utilisé par ${data.nom}`);
            } else {
                handleValidCode(code, data.nom);
            }
        } else {
            showCodeError(data.message || 'Code invalide');
        }
    } catch (error) {
        showToast('Erreur de connexion au serveur', 'error');
        console.error('Verification error:', error);
    } finally {
        hideLoading();
    }
}

function handleValidCode(code, nom) {
    verifiedCode = code;
    participantNom = nom;
    
    elements.verifiedCode.value = code;
    elements.participantName.textContent = nom;
    
    // Afficher le message de succès
    const codeInfo = document.getElementById('codeInfo');
    const codeInfoMessage = document.getElementById('codeInfoMessage');
    codeInfo.className = 'code-info success';
    codeInfoMessage.innerHTML = `<i class="fas fa-check-circle"></i> Code valide ! Bienvenue ${nom}`;
    codeInfo.style.display = 'flex';
    
    // Passer à l'étape 2 après un délai
    setTimeout(() => {
        goToStep(2);
        // Pré-remplir le nom si possible
        const nameParts = nom.split(' ');
        if (nameParts.length > 1) {
            document.getElementById('prenom').value = nameParts[0];
            document.getElementById('nom').value = nameParts.slice(1).join(' ');
        }
    }, 1000);
}

// ==================== ATTESTATION DOWNLOAD ====================

async function handleAttestationDownload(e) {
    e.preventDefault();
    
    // Validation des champs
    if (!validateAllFields()) {
        showToast('Veuillez corriger les erreurs dans le formulaire', 'error');
        return;
    }
    
    // Récupération des données
    const formData = {
        code: verifiedCode,
        nom: document.getElementById('nom').value.trim(),
        prenom: document.getElementById('prenom').value.trim(),
        telephone: document.getElementById('telephone').value.trim(),
        note: parseInt(document.querySelector('input[name="rating"]:checked').value),
        email: document.getElementById('email').value.trim() || undefined,
        commentaire: document.getElementById('commentaire').value.trim() || undefined
    };
    
    showLoading('Génération de votre attestation...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/attestation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // Récupérer le blob PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Configurer le lien de téléchargement
            elements.downloadLink.href = url;
            elements.downloadLink.download = `attestation-${verifiedCode}.pdf`;
            elements.downloadCode.textContent = verifiedCode;
            
            // Passer à l'étape 3
            goToStep(3);
            showToast('Attestation générée avec succès !', 'success');
        } else {
            const error = await response.json();
            handleApiError(error);
        }
    } catch (error) {
        showToast('Erreur de connexion au serveur', 'error');
        console.error('Download error:', error);
    } finally {
        hideLoading();
    }
}

// ==================== VALIDATION ====================

function validateField(fieldName) {
    const field = document.getElementById(fieldName);
    const errorElement = document.getElementById(`${fieldName}Error`);
    
    if (!field || !errorElement) return true;
    
    let isValid = true;
    let errorMessage = '';
    
    switch(fieldName) {
        case 'nom':
        case 'prenom':
            if (field.value.length < 2) {
                isValid = false;
                errorMessage = 'Minimum 2 caractères';
            }
            break;
            
        case 'telephone':
            const phoneRegex = /^[0-9]{8,}$/;
            if (!phoneRegex.test(field.value.replace(/\s/g, ''))) {
                isValid = false;
                errorMessage = 'Minimum 8 chiffres';
            }
            break;
            
        case 'email':
            if (field.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(field.value)) {
                    isValid = false;
                    errorMessage = 'Email invalide';
                }
            }
            break;
    }
    
    // Mise à jour de l'UI
    field.classList.toggle('error', !isValid);
    errorElement.textContent = errorMessage;
    
    return isValid;
}

function validateAllFields() {
    const fields = ['nom', 'prenom', 'telephone', 'email'];
    let isValid = true;
    
    fields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    // Vérifier la note (toujours valide car par défaut 5)
    const rating = document.querySelector('input[name="rating"]:checked');
    if (!rating) {
        showToast('Veuillez donner une note', 'error');
        isValid = false;
    }
    
    return isValid;
}

// ==================== UTILS ====================

function formatCodeInput(e) {
    let value = e.target.value.toUpperCase();
    
    // Auto-formatage IA-
    if (value.length === 2 && !value.includes('-')) {
        value = 'IA-' + value.slice(2);
    }
    
    // Supprimer les caractères non autorisés
    value = value.replace(/[^IA\-A-Z0-9]/g, '');
    
    e.target.value = value;
}

function updateCharCount() {
    const count = elements.commentaire.value.length;
    elements.charCount.textContent = count;
    
    if (count > 1000) {
        elements.commentaire.classList.add('error');
        document.getElementById('commentaireError').textContent = 'Maximum 1000 caractères';
    } else {
        elements.commentaire.classList.remove('error');
        document.getElementById('commentaireError').textContent = '';
    }
}

function updateRatingText() {
    const rating = document.querySelector('input[name="rating"]:checked').value;
    elements.ratingText.textContent = ratingLabels[rating];
}

function setupInputMasks() {
    // Masque pour le téléphone
    const phoneInput = document.getElementById('telephone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
}

function showCodeError(message) {
    const codeInfo = document.getElementById('codeInfo');
    const codeInfoMessage = document.getElementById('codeInfoMessage');
    codeInfo.className = 'code-info error';
    codeInfoMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    codeInfo.style.display = 'flex';
    elements.codeInput.classList.add('error');
    
    setTimeout(() => {
        codeInfo.style.display = 'none';
        elements.codeInput.classList.remove('error');
    }, 3000);
}

function showCodeWarning(message) {
    const codeInfo = document.getElementById('codeInfo');
    const codeInfoMessage = document.getElementById('codeInfoMessage');
    codeInfo.className = 'code-info warning';
    codeInfoMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    codeInfo.style.display = 'flex';
}

function handleApiError(error) {
    let message = 'Erreur lors de la génération';
    
    if (error.message) {
        switch(error.message) {
            case 'Ce code a déjà été utilisé pour télécharger une attestation':
                message = 'Ce code a déjà été utilisé';
                break;
            case 'Nom invalide (minimum 2 caractères)':
                message = 'Nom invalide (minimum 2 caractères)';
                break;
            case 'Prénom invalide (minimum 2 caractères)':
                message = 'Prénom invalide (minimum 2 caractères)';
                break;
            case 'Numéro de téléphone invalide (minimum 8 chiffres)':
                message = 'Téléphone invalide (minimum 8 chiffres)';
                break;
            case 'Note invalide (doit être entre 1 et 5)':
                message = 'Note invalide (doit être entre 1 et 5)';
                break;
            case 'Format d\'email invalide':
                message = 'Format d\'email invalide';
                break;
            case 'Commentaire trop long (maximum 1000 caractères)':
                message = 'Commentaire trop long (max 1000 caractères)';
                break;
        }
    }
    
    showToast(message, 'error');
}

// ==================== NAVIGATION ====================

function goToStep(step) {
    currentStep = step;
    
    // Cacher toutes les étapes
    elements.step1.classList.remove('active');
    elements.step2.classList.remove('active');
    elements.step3.classList.remove('active');
    
    // Afficher l'étape correspondante
    document.getElementById(`step${step}`).classList.add('active');
    
    // Mettre à jour la barre de progression
    updateProgressBar(step);
    
    // Focus sur le premier champ si nécessaire
    if (step === 2) {
        setTimeout(() => document.getElementById('nom').focus(), 300);
    }
}

function updateProgressBar(step) {
    elements.progressSteps.forEach((stepEl, index) => {
        const stepNumber = index + 1;
        if (stepNumber <= step) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });
}

function resetToStart() {
    // Réinitialiser les formulaires
    elements.codeForm.reset();
    elements.infoForm.reset();
    document.getElementById('codeInfo').style.display = 'none';
    elements.codeInput.classList.remove('error');
    
    // Réinitialiser les variables
    verifiedCode = null;
    participantNom = null;
    
    // Revenir à l'étape 1
    goToStep(1);
}

// ==================== LOADING ====================

function showLoading(message = 'Traitement en cours...') {
    elements.loadingMessage.textContent = message;
    elements.loadingOverlay.classList.add('active');
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('active');
}

// ==================== TOAST ====================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type]}" style="font-size: 1.2rem;"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== PARTICLES ====================

function createParticles() {
    const particlesContainer = document.querySelector('.particles');
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 5 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = `rgba(102, 126, 234, ${Math.random() * 0.3})`;
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `float ${5 + Math.random() * 5}s ease-in-out infinite`;
        particle.style.animationDelay = Math.random() * 5 + 's';
        particlesContainer.appendChild(particle);
    }
}

// ==================== CLEANUP ====================

// Fermeture des toasts en cliquant
document.addEventListener('click', (e) => {
    if (e.target.closest('.toast')) {
        e.target.closest('.toast').remove();
    }
});