// Configuration
const API_BASE_URL = 'https://attestation-ai-expotech.vercel.app/api'; // À modifier selon votre configuration
let currentToken = localStorage.getItem('adminToken');
let currentPage = 1;
let itemsPerPage = 25;
let totalPages = 1;
let currentSearch = '';
let currentFilter = 'all';
let participants = [];
let confirmCallback = null;

// Vérifier l'authentification au chargement
document.addEventListener('DOMContentLoaded', () => {
    if (currentToken) {
        verifyToken();
    } else {
        showLoginPage();
    }
    setupEventListeners();
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Add participant form
    document.getElementById('addParticipantForm').addEventListener('submit', handleAddParticipant);
    
    // Search input with debounce
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = e.target.value;
            currentPage = 1;
            loadParticipants();
        }, 500);
    });
    
    // Items per page change
    document.getElementById('itemsPerPage').addEventListener('change', (e) => {
        itemsPerPage = parseInt(e.target.value);
        currentPage = 1;
        loadParticipants();
    });
    
    // Attestation filter change
    document.getElementById('attestationFilter').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        currentPage = 1;
        loadParticipants();
    });
}

// ==================== AUTHENTIFICATION ====================

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentToken = data.token;
            localStorage.setItem('adminToken', currentToken);
            document.getElementById('adminInfo').textContent = `Connecté en tant que ${username}`;
            showDashboard();
            loadParticipants();
            showToast('Connexion réussie', 'success');
        } else {
            showToast(data.message || 'Identifiants invalides', 'error');
        }
    } catch (error) {
        showToast('Erreur de connexion au serveur', 'error');
        console.error('Login error:', error);
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
    }
}

async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            showDashboard();
            loadParticipants();
        } else {
            handleTokenExpired();
        }
    } catch (error) {
        console.error('Token verification error:', error);
        handleTokenExpired();
    }
}

function handleTokenExpired() {
    localStorage.removeItem('adminToken');
    currentToken = null;
    showLoginPage();
    showToast('Session expirée, veuillez vous reconnecter', 'warning');
}

function logout() {
    localStorage.removeItem('adminToken');
    currentToken = null;
    showLoginPage();
    showToast('Déconnexion réussie', 'success');
}

// ==================== GESTION DES PARTICIPANTS ====================

async function loadParticipants() {
    try {
        showLoading(true);
        
        // Construction de l'URL avec les paramètres
        let url = `${API_BASE_URL}/admin/participants?page=${currentPage}&limit=${itemsPerPage}`;
        if (currentSearch) {
            url += `&search=${encodeURIComponent(currentSearch)}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        if (response.status === 401) {
            handleTokenExpired();
            return;
        }

        if (response.ok) {
            const data = await response.json();
            participants = data.participants || [];
            
            // Appliquer le filtre d'attestation côté client
            let filteredParticipants = participants;
            if (currentFilter !== 'all') {
                filteredParticipants = participants.filter(p => 
                    currentFilter === 'generated' ? p.attestation_generee : !p.attestation_generee
                );
            }
            
            totalPages = data.totalPages || 1;
            
            updateStats(data);
            displayParticipants(filteredParticipants);
            updatePagination();
        } else {
            showToast('Erreur lors du chargement des participants', 'error');
        }
    } catch (error) {
        showToast('Erreur de connexion au serveur', 'error');
        console.error('Load participants error:', error);
    } finally {
        showLoading(false);
    }
}

function displayParticipants(participantsToShow) {
    const tbody = document.getElementById('tableBody');
    
    if (!participantsToShow || participantsToShow.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem;">
                    <i class="fas fa-users-slash" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                    <p style="color: var(--text-secondary);">Aucun participant trouvé</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = participantsToShow.map(p => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-user-circle" style="color: var(--primary-color); font-size: 1.2rem;"></i>
                    <strong>${escapeHtml(p.nom)}</strong>
                </div>
            </td>
            <td>${p.email ? escapeHtml(p.email) : '<span style="color: var(--text-secondary);">Non renseigné</span>'}</td>
            <td>
                <span class="badge-code">
                    <i class="fas fa-key"></i>
                    ${p.code_secret}
                </span>
            </td>
            <td>
                <span class="badge ${p.attestation_generee ? 'badge-success' : 'badge-warning'}">
                    <i class="fas ${p.attestation_generee ? 'fa-check-circle' : 'fa-clock'}"></i>
                    ${p.attestation_generee ? 'Générée' : 'En attente'}
                </span>
            </td>
            <td>${formatDate(p.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="showRegenerateConfirm('${p._id}')" class="icon-btn" title="Régénérer le code">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button onclick="showDeleteConfirm('${p._id}', '${escapeHtml(p.nom)}')" class="icon-btn delete" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function handleAddParticipant(e) {
    e.preventDefault();
    
    const nom = document.getElementById('participantName').value.trim();
    const email = document.getElementById('participantEmail').value.trim();
    const submitBtn = document.getElementById('submitParticipant');
    
    if (nom.length < 2) {
        showToast('Le nom doit contenir au moins 2 caractères', 'error');
        return;
    }
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout en cours...';

    try {
        const body = { nom };
        if (email) {
            body.email = email;
        }

        const response = await fetch(`${API_BASE_URL}/admin/participants`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            showCodeModal(data.participant.code_secret);
            document.getElementById('addParticipantForm').reset();
            await loadParticipants();
            showToast('Participant ajouté avec succès', 'success');
        } else {
            showToast(data.message || 'Erreur lors de l\'ajout', 'error');
        }
    } catch (error) {
        showToast('Erreur de connexion au serveur', 'error');
        console.error('Add participant error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Ajouter le participant';
    }
}

async function regenerateCode(participantId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/participants/${participantId}/regenerate-code`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            showCodeModal(data.code_secret);
            await loadParticipants();
            showToast('Code régénéré avec succès', 'success');
        } else {
            showToast(data.message || 'Erreur lors de la régénération', 'error');
        }
    } catch (error) {
        showToast('Erreur de connexion au serveur', 'error');
        console.error('Regenerate code error:', error);
    }
    closeConfirmModal();
}

async function deleteParticipant(participantId) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/participants/${participantId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            await loadParticipants();
            showToast('Participant supprimé avec succès', 'success');
        } else {
            showToast(data.message || 'Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        showToast('Erreur de connexion au serveur', 'error');
        console.error('Delete participant error:', error);
    }
    closeConfirmModal();
}

// ==================== STATISTIQUES ====================

function updateStats(data) {
    document.getElementById('totalParticipants').textContent = data.total || 0;
    document.getElementById('totalCodes').textContent = data.total || 0;
    
    const attestationsGenerees = participants.filter(p => p.attestation_generee).length;
    document.getElementById('totalAttestations').textContent = attestationsGenerees;
}

// ==================== PAGINATION ====================

function updatePagination() {
    const pagination = document.getElementById('pagination');
    let html = '';

    // Bouton précédent
    html += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;

    // Pages
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span class="page-btn" style="background: transparent; cursor: default;">...</span>`;
        }
    }

    // Bouton suivant
    html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;

    pagination.innerHTML = html;
}

function changePage(page) {
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        loadParticipants();
        // Scroll vers le haut de la table
        document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth' });
    }
}

// ==================== MODALES ====================

function showCodeModal(code) {
    document.getElementById('generatedCode').textContent = code;
    document.getElementById('codeModal').classList.add('active');
}

function closeModal() {
    document.getElementById('codeModal').classList.remove('active');
}

function showRegenerateConfirm(participantId) {
    document.getElementById('confirmTitle').textContent = 'Régénérer le code';
    document.getElementById('confirmMessage').textContent = 'Voulez-vous régénérer le code secret ? Cette action est irréversible.';
    document.getElementById('confirmActionBtn').className = 'btn btn-warning';
    document.getElementById('confirmActionBtn').innerHTML = '<i class="fas fa-sync-alt"></i> Régénérer';
    
    confirmCallback = () => regenerateCode(participantId);
    
    document.getElementById('confirmModal').classList.add('active');
}

function showDeleteConfirm(participantId, participantName) {
    document.getElementById('confirmTitle').textContent = 'Supprimer le participant';
    document.getElementById('confirmMessage').textContent = `Êtes-vous sûr de vouloir supprimer ${participantName} ? Cette action est irréversible.`;
    document.getElementById('confirmActionBtn').className = 'btn btn-danger';
    document.getElementById('confirmActionBtn').innerHTML = '<i class="fas fa-trash"></i> Supprimer';
    
    confirmCallback = () => deleteParticipant(participantId);
    
    document.getElementById('confirmModal').classList.add('active');
}

function closeConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    confirmCallback = null;
}

// Action de confirmation
document.getElementById('confirmActionBtn').addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback();
    }
});

// ==================== UTILITAIRES ====================

function showLoginPage() {
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('dashboard').classList.remove('active');
}

function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
}

function showLoading(show) {
    const tbody = document.getElementById('tableBody');
    if (show && participants.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    <div class="loader"></div>
                    <p>Chargement des participants...</p>
                </td>
            </tr>
        `;
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyCode() {
    const code = document.getElementById('generatedCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Code copié dans le presse-papiers', 'success');
    }).catch(() => {
        showToast('Erreur lors de la copie', 'error');
    });
}

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
        <div style="display: flex; align-items: center; gap: 0.75rem;">
            <i class="fas fa-${icons[type] || 'info-circle'}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Fermer les modales en cliquant à l'extérieur
window.onclick = function(event) {
    const codeModal = document.getElementById('codeModal');
    const confirmModal = document.getElementById('confirmModal');
    
    if (event.target === codeModal) {
        closeModal();
    }
    if (event.target === confirmModal) {
        closeConfirmModal();
    }
}

// Vérifier la santé de l'API au démarrage
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
            showToast('L\'API ne répond pas correctement', 'warning');
        }
    } catch (error) {
        showToast('Impossible de contacter l\'API', 'error');
    }
}

checkHealth();