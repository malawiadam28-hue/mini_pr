const API = 'https://670ed5b73e7151861655eaa3.mockapi.io/Stagiaire';
const API_DEMANDES = 'https://670ed5b73e7151861655eaa3.mockapi.io/Demandes';

let loginAttempts = 0;
let currentUser = null;

const COLORS = [
  { value: 'maroon',       label: 'Maroon'       },
  { value: 'navy',         label: 'Navy'          },
  { value: 'teal',         label: 'Teal'          },
  { value: 'darkslategray',label: 'Gris ardoise'  },
  { value: 'indigo',       label: 'Indigo'        },
  { value: 'darkgreen',    label: 'Vert foncé'    },
  { value: 'darkred',      label: 'Rouge foncé'   },
  { value: 'steelblue',    label: 'Bleu acier'    },
  { value: 'saddlebrown',  label: 'Marron selle'  },
  { value: 'darkolivegreen',label:'Olive foncé'   },
];

const MENU_ADMIN = [
  { page: 'accueil',           label: 'Accueil',            icon: 'fa-home'         },
  { page: 'profil',            label: 'Mon Profil',         icon: 'fa-user'         },
  { page: 'couleur',           label: 'Modifier Couleur',   icon: 'fa-palette'      },
  { page: 'liste-utilisateurs',label: 'Liste Utilisateurs', icon: 'fa-users'        },
  { page: 'ajouter-utilisateur',label:'Ajouter Utilisateur',icon: 'fa-user-plus'    },
  { page: 'demandes',          label: 'Demandes',           icon: 'fa-inbox'        },
];

const MENU_VISITEUR = [
  { page: 'accueil',  label: 'Accueil',          icon: 'fa-home'    },
  { page: 'profil',   label: 'Mon Profil',       icon: 'fa-user'    },
  { page: 'couleur',  label: 'Modifier Couleur', icon: 'fa-palette' },
  { page: 'demandes', label: 'Mes Demandes',     icon: 'fa-inbox'   },
];

function $(id) { return document.getElementById(id); }

function toast(msg, type = 'info') {
  let container = $('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function showPage(id) {
  ['page-login', 'page-create', 'page-layout'].forEach(p => {
    const el = $(p);
    if (el) el.classList.add('hidden');
  });
  const target = $(id);
  if (target) target.classList.remove('hidden');
}

function getUser() {
  const raw = sessionStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

function saveUser(u) {
  sessionStorage.setItem('user', JSON.stringify(u));
  currentUser = u;
}

function applyBgColor() {
  const u = getUser();
  if (u && u.couleur) {
    document.body.style.setProperty('--bg-page', u.couleur + '1a');
    document.querySelectorAll('#sidebar, #main-footer').forEach(el => {
      if (el) el.dataset.colorized = '1';
    });
  }
}

function buildMenu() {
  const u = getUser();
  if (!u) return;
  const menu = u.admin === true || u.admin === 'true' ? MENU_ADMIN : MENU_VISITEUR;

  const navList    = $('nav-list');
  const sideList   = $('sidebar-list');
  navList.innerHTML = '';
  sideList.innerHTML = '';

  menu.forEach(item => {
    const liNav = document.createElement('li');
    liNav.innerHTML = `<a href="#" data-page="${item.page}"><i class="fas ${item.icon}"></i> ${item.label}</a>`;
    navList.appendChild(liNav);

    const liSide = document.createElement('li');
    liSide.innerHTML = `<a href="#" data-page="${item.page}"><i class="fas ${item.icon}"></i> ${item.label}</a>`;
    sideList.appendChild(liSide);
  });

  document.querySelectorAll('[data-page]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const page = a.dataset.page;
      navigate(page);
    });
  });
}

function setActiveMenu(page) {
  document.querySelectorAll('[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
}

function navigate(page, params = {}) {
  setActiveMenu(page);
  const content = $('content-section');
  content.innerHTML = '';

  switch (page) {
    case 'accueil':            renderAccueil(content); break;
    case 'profil':             renderProfil(content); break;
    case 'couleur':            renderCouleur(content); break;
    case 'liste-utilisateurs': renderListeUtilisateurs(content); break;
    case 'ajouter-utilisateur':renderAjouterUtilisateur(content); break;
    case 'demandes':           renderDemandes(content); break;
    case 'detail-utilisateur': renderDetailUtilisateur(content, params.id); break;
    case 'modifier-utilisateur': renderModifierUtilisateur(content, params.id); break;
    default:                   content.innerHTML = '<p>Page introuvable.</p>';
  }
}

/* ============================================================
   LOGIN
   ============================================================ */
function initLogin() {
  const saved = localStorage.getItem('remember');
  if (saved) {
    const { username, password } = JSON.parse(saved);
    $('login-username').value = username || '';
    $('login-password').value = password || '';
    $('remember-me').checked = true;
  }

  $('btn-login').addEventListener('click', handleLogin);
  $('go-create').addEventListener('click', e => { e.preventDefault(); showPage('page-create'); });
}

async function handleLogin() {
  const username = $('login-username').value.trim();
  const password = $('login-password').value.trim();
  const errList  = $('login-errors');
  errList.innerHTML = '';

  const errors = [];
  if (!username) errors.push('Le nom d\'utilisateur est obligatoire.');
  if (!password) errors.push('Le mot de passe est obligatoire.');
  if (errors.length) { renderErrors(errList, errors); return; }

  $('btn-login').disabled = true;
  $('btn-login').textContent = 'Connexion...';

  try {
    const res  = await fetch(API);
    const data = await res.json();
    const user = data.find(u => (u.pseudo === username || u.email === username) && u.MotDePasse === password);

    if (user) {
      if ($('remember-me').checked) {
        localStorage.setItem('remember', JSON.stringify({ username, password }));
      } else {
        localStorage.removeItem('remember');
      }
      loginAttempts = 0;
      saveUser(user);
      initLayout();
      showPage('page-layout');
    } else {
      loginAttempts++;
      if (loginAttempts >= 3) {
        $('btn-login').disabled = true;
        $('btn-login').textContent = 'Désactivé';
        renderErrors(errList, ['Trop de tentatives. Bouton désactivé.']);
      } else {
        $('btn-login').disabled = false;
        $('btn-login').textContent = 'LOGIN';
        renderErrors(errList, [`Identifiants incorrects. Tentative ${loginAttempts}/3`]);
      }
    }
  } catch {
    $('btn-login').disabled = loginAttempts >= 3;
    $('btn-login').textContent = loginAttempts >= 3 ? 'Désactivé' : 'LOGIN';
    renderErrors(errList, ['Erreur de connexion. Vérifiez votre réseau.']);
  }
}

function renderErrors(ul, errors) {
  ul.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
}

/* ============================================================
   CREATE ACCOUNT
   ============================================================ */
function initCreate() {
  $('go-login').addEventListener('click', e => { e.preventDefault(); showPage('page-login'); });
  $('btn-create').addEventListener('click', handleCreate);
}

async function handleCreate() {
  const fields = {
    nom:        $('ca-nom').value.trim(),
    prenom:     $('ca-prenom').value.trim(),
    age:        $('ca-age').value.trim(),
    pseudo:     $('ca-pseudo').value.trim(),
    email:      $('ca-email').value.trim(),
    Pays:       $('ca-pays').value.trim(),
    Devise:     $('ca-devise').value.trim(),
    couleur:    $('ca-couleur').value,
    avatar:     $('ca-avatar').value.trim(),
    photo:      $('ca-photo').value.trim(),
    admin:      $('ca-admin').value === 'true',
    MotDePasse: $('ca-password').value,
  };
  const confirm = $('ca-password2').value;
  const errList = $('create-errors');
  errList.innerHTML = '';

  const errors = [];
  Object.entries(fields).forEach(([k, v]) => {
    if (v === '' || v === null || v === undefined) errors.push(`Le champ "${k}" est obligatoire.`);
  });

  const pwReg = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (fields.MotDePasse && !pwReg.test(fields.MotDePasse)) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.');
  }
  if (fields.MotDePasse !== confirm) errors.push('Les mots de passe ne correspondent pas.');

  if (errors.length) { renderErrors(errList, errors); return; }

  $('btn-create').disabled = true;
  $('btn-create').textContent = 'Création...';

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      toast('Compte créé ! Vous pouvez vous connecter.', 'success');
      showPage('page-login');
    } else {
      throw new Error();
    }
  } catch {
    renderErrors(errList, ['Erreur lors de la création. Réessayez.']);
  } finally {
    $('btn-create').disabled = false;
    $('btn-create').textContent = 'Créer le compte';
  }
}

/* ============================================================
   LAYOUT INIT
   ============================================================ */
function initLayout() {
  const u = getUser();
  if (!u) return;

  $('header-name').textContent = `${u.prenom} ${u.nom}`;
  const av = $('header-avatar');
  av.src = u.avatar || '';
  av.onerror = () => { av.style.display = 'none'; };

  applyBgColor();
  buildMenu();

  $('btn-logout').addEventListener('click', () => {
    sessionStorage.clear();
    currentUser = null;
    document.body.style.removeProperty('--bg-page');
    loginAttempts = 0;
    $('btn-login').disabled = false;
    $('btn-login').textContent = 'LOGIN';
    $('login-errors').innerHTML = '';
    showPage('page-login');
  });

  navigate('accueil');
}

/* ============================================================
   PAGE: ACCUEIL
   ============================================================ */
function renderAccueil(container) {
  const u = getUser();
  container.innerHTML = `
    <div class="card">
      <div class="welcome-hero">
        <img src="${u.photo || u.avatar || ''}" class="big-avatar" alt="photo" onerror="this.src=''">
        <h2>Bienvenue, ${u.prenom} ${u.nom} !</h2>
        <p>${u.admin === true || u.admin === 'true' ? '👑 Administrateur' : '👤 Visiteur'} · ${u.email}</p>
        <div class="stat-row">
          <div class="stat-box">
            <div class="stat-num">${u.Pays || '—'}</div>
            <div class="stat-label">Pays</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">${u.Devise || '—'}</div>
            <div class="stat-label">Devise</div>
          </div>
          <div class="stat-box">
            <div class="stat-num">${u.age || '—'}</div>
            <div class="stat-label">Âge</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   PAGE: PROFIL
   ============================================================ */
function renderProfil(container) {
  const u = getUser();
  const isAdmin = u.admin === true || u.admin === 'true';
  const fields = [
    { label: 'Pseudo',   value: u.pseudo     },
    { label: 'Email',    value: u.email      },
    { label: 'Pays',     value: u.Pays       },
    { label: 'Devise',   value: u.Devise     },
    { label: 'Couleur',  value: u.couleur    },
    { label: 'Âge',      value: u.age        },
    { label: 'Rôle',     value: isAdmin ? 'Administrateur' : 'Visiteur' },
    { label: 'ID',       value: u.id         },
    { label: 'Avatar',   value: u.avatar     },
    { label: 'Photo',    value: u.photo      },
  ];

  container.innerHTML = `
    <h2 class="page-title">Mon Profil</h2>
    <div class="card">
      <div class="profile-header">
        <img src="${u.avatar || ''}" class="profile-photo" alt="avatar" onerror="this.style.display='none'">
        <div class="profile-info">
          <h2>${u.prenom} ${u.nom}</h2>
          <p>${isAdmin ? '👑 Administrateur' : '👤 Visiteur'}</p>
        </div>
      </div>
      <div class="profile-grid">
        ${fields.map(f => `
          <div class="profile-field">
            <div class="field-label">${f.label}</div>
            <div class="field-value">${f.value || '—'}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/* ============================================================
   PAGE: MODIFIER COULEUR
   ============================================================ */
function renderCouleur(container) {
  const u = getUser();
  const isAdmin = u.admin === true || u.admin === 'true';
  const age = parseInt(u.age, 10);

  if (!isAdmin && age < 15) {
    container.innerHTML = `
      <h2 class="page-title">Modifier la Couleur</h2>
      <div class="card">
        <div class="alert alert-warning">
          <i class="fas fa-lock"></i>
          Vous devez avoir au moins 15 ans pour modifier votre couleur.
        </div>
      </div>
    `;
    return;
  }

  const opts = COLORS.map(c =>
    `<option value="${c.value}" ${u.couleur === c.value ? 'selected' : ''}>${c.label}</option>`
  ).join('');

  container.innerHTML = `
    <h2 class="page-title">Modifier la Couleur</h2>
    <div class="card">
      <p style="color:var(--text-muted);margin-bottom:16px;">Couleur actuelle :</p>
      <div class="color-preview" id="color-preview" style="background:${u.couleur}"></div>
      <div class="inline-form">
        <select id="select-couleur">${opts}</select>
        <button class="btn btn-accent" id="btn-save-couleur">
          <i class="fas fa-save"></i> Valider
        </button>
      </div>
    </div>
  `;

  $('select-couleur').addEventListener('change', () => {
    $('color-preview').style.background = $('select-couleur').value;
  });

  $('btn-save-couleur').addEventListener('click', async () => {
    const newColor = $('select-couleur').value;
    $('btn-save-couleur').disabled = true;
    $('btn-save-couleur').textContent = 'Sauvegarde...';
    try {
      await fetch(`${API}/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...u, couleur: newColor }),
      });
      u.couleur = newColor;
      saveUser(u);
      applyBgColor();
      toast('Couleur mise à jour !', 'success');
    } catch {
      toast('Erreur lors de la mise à jour.', 'error');
    } finally {
      $('btn-save-couleur').disabled = false;
      $('btn-save-couleur').innerHTML = '<i class="fas fa-save"></i> Valider';
    }
  });
}

/* ============================================================
   PAGE: LISTE UTILISATEURS (admin)
   ============================================================ */
async function renderListeUtilisateurs(container) {
  container.innerHTML = `
    <h2 class="page-title">Liste des Utilisateurs</h2>
    <div class="card">
      <div class="loading"><div class="spinner"></div> Chargement...</div>
    </div>
  `;

  try {
    const res   = await fetch(API);
    const users = await res.json();

    const rows = users.map(u => `
      <tr>
        <td><img src="${u.avatar || ''}" alt="av" onerror="this.style.display='none'"></td>
        <td>${u.nom} ${u.prenom}</td>
        <td>${u.pseudo || '—'}</td>
        <td>${u.email || '—'}</td>
        <td>${u.Pays || '—'}</td>
        <td><span class="badge ${u.admin === true || u.admin === 'true' ? 'badge-info' : 'badge-warning'}">${u.admin === true || u.admin === 'true' ? 'Admin' : 'Visiteur'}</span></td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-outline" onclick="navigate('detail-utilisateur',{id:'${u.id}'})"><i class="fas fa-eye"></i></button>
          <button class="btn btn-sm btn-accent" onclick="navigate('modifier-utilisateur',{id:'${u.id}'})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <h2 class="page-title">Liste des Utilisateurs</h2>
      <div class="card">
        <div style="margin-bottom:16px;">
          <button class="btn btn-accent" onclick="navigate('ajouter-utilisateur')">
            <i class="fas fa-user-plus"></i> Ajouter
          </button>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Avatar</th><th>Nom</th><th>Pseudo</th><th>Email</th>
                <th>Pays</th><th>Rôle</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch {
    container.innerHTML = `
      <h2 class="page-title">Liste des Utilisateurs</h2>
      <div class="card"><div class="alert alert-danger">Erreur de chargement.</div></div>
    `;
  }
}

window.deleteUser = async function(id) {
  if (!confirm('Supprimer cet utilisateur ?')) return;
  try {
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    toast('Utilisateur supprimé.', 'success');
    navigate('liste-utilisateurs');
  } catch {
    toast('Erreur lors de la suppression.', 'error');
  }
};

/* ============================================================
   PAGE: DETAIL UTILISATEUR
   ============================================================ */
async function renderDetailUtilisateur(container, id) {
  container.innerHTML = `<div class="loading"><div class="spinner"></div> Chargement...</div>`;
  try {
    const res = await fetch(`${API}/${id}`);
    const u   = await res.json();
    const isAdmin = u.admin === true || u.admin === 'true';
    const fields = [
      { label: 'Pseudo',  value: u.pseudo  },
      { label: 'Email',   value: u.email   },
      { label: 'Pays',    value: u.Pays    },
      { label: 'Devise',  value: u.Devise  },
      { label: 'Couleur', value: u.couleur },
      { label: 'Âge',     value: u.age     },
      { label: 'Rôle',    value: isAdmin ? 'Administrateur' : 'Visiteur' },
    ];
    container.innerHTML = `
      <h2 class="page-title">Détail Utilisateur</h2>
      <div style="margin-bottom:12px;">
        <button class="btn btn-outline" onclick="navigate('liste-utilisateurs')">
          <i class="fas fa-arrow-left"></i> Retour
        </button>
      </div>
      <div class="card">
        <div class="profile-header">
          <img src="${u.avatar||''}" class="profile-photo" alt="av" onerror="this.style.display='none'">
          <div class="profile-info">
            <h2>${u.prenom} ${u.nom}</h2>
            <p>${isAdmin ? '👑 Admin' : '👤 Visiteur'}</p>
          </div>
        </div>
        <div class="profile-grid">
          ${fields.map(f => `
            <div class="profile-field">
              <div class="field-label">${f.label}</div>
              <div class="field-value">${f.value || '—'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch {
    container.innerHTML = `<div class="alert alert-danger">Erreur de chargement.</div>`;
  }
}

/* ============================================================
   PAGE: MODIFIER UTILISATEUR
   ============================================================ */
async function renderModifierUtilisateur(container, id) {
  container.innerHTML = `<div class="loading"><div class="spinner"></div> Chargement...</div>`;
  try {
    const res = await fetch(`${API}/${id}`);
    const u   = await res.json();
    const colorOpts = COLORS.map(c =>
      `<option value="${c.value}" ${u.couleur === c.value ? 'selected' : ''}>${c.label}</option>`
    ).join('');

    container.innerHTML = `
      <h2 class="page-title">Modifier Utilisateur</h2>
      <div style="margin-bottom:12px;">
        <button class="btn btn-outline" onclick="navigate('liste-utilisateurs')">
          <i class="fas fa-arrow-left"></i> Retour
        </button>
      </div>
      <div class="card">
        <div class="form-grid">
          <div class="form-group"><label>Nom</label><input id="eu-nom" value="${u.nom||''}"></div>
          <div class="form-group"><label>Prénom</label><input id="eu-prenom" value="${u.prenom||''}"></div>
          <div class="form-group"><label>Âge</label><input type="number" id="eu-age" value="${u.age||''}"></div>
          <div class="form-group"><label>Pseudo</label><input id="eu-pseudo" value="${u.pseudo||''}"></div>
          <div class="form-group"><label>Email</label><input type="email" id="eu-email" value="${u.email||''}"></div>
          <div class="form-group"><label>Pays</label><input id="eu-pays" value="${u.Pays||''}"></div>
          <div class="form-group"><label>Devise</label><input id="eu-devise" value="${u.Devise||''}"></div>
          <div class="form-group"><label>Couleur</label><select id="eu-couleur">${colorOpts}</select></div>
          <div class="form-group"><label>Admin</label>
            <select id="eu-admin">
              <option value="false" ${!u.admin || u.admin==='false' ? 'selected':''}>Non</option>
              <option value="true"  ${u.admin===true||u.admin==='true'  ? 'selected':''}>Oui</option>
            </select>
          </div>
          <div class="form-group full"><label>Avatar URL</label><input id="eu-avatar" value="${u.avatar||''}"></div>
          <div class="form-group full"><label>Photo URL</label><input id="eu-photo" value="${u.photo||''}"></div>
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;">
          <button class="btn btn-accent" id="btn-update-user"><i class="fas fa-save"></i> Sauvegarder</button>
          <button class="btn btn-outline" onclick="navigate('liste-utilisateurs')">Annuler</button>
        </div>
        <ul id="edit-errors" class="error-list"></ul>
      </div>
    `;

    $('btn-update-user').addEventListener('click', async () => {
      const updated = {
        ...u,
        nom:        $('eu-nom').value.trim(),
        prenom:     $('eu-prenom').value.trim(),
        age:        $('eu-age').value.trim(),
        pseudo:     $('eu-pseudo').value.trim(),
        email:      $('eu-email').value.trim(),
        Pays:       $('eu-pays').value.trim(),
        Devise:     $('eu-devise').value.trim(),
        couleur:    $('eu-couleur').value,
        admin:      $('eu-admin').value === 'true',
        avatar:     $('eu-avatar').value.trim(),
        photo:      $('eu-photo').value.trim(),
      };

      $('btn-update-user').disabled = true;
      try {
        await fetch(`${API}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        toast('Utilisateur mis à jour !', 'success');
        navigate('liste-utilisateurs');
      } catch {
        toast('Erreur lors de la mise à jour.', 'error');
        $('btn-update-user').disabled = false;
      }
    });
  } catch {
    container.innerHTML = `<div class="alert alert-danger">Erreur de chargement.</div>`;
  }
}

/* ============================================================
   PAGE: AJOUTER UTILISATEUR (admin)
   ============================================================ */
function renderAjouterUtilisateur(container) {
  const colorOpts = COLORS.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
  container.innerHTML = `
    <h2 class="page-title">Ajouter un Utilisateur</h2>
    <div class="card">
      <div class="form-grid">
        <div class="form-group"><label>Nom</label><input id="au-nom" placeholder="Nom"></div>
        <div class="form-group"><label>Prénom</label><input id="au-prenom" placeholder="Prénom"></div>
        <div class="form-group"><label>Âge</label><input type="number" id="au-age" placeholder="Âge"></div>
        <div class="form-group"><label>Pseudo</label><input id="au-pseudo" placeholder="Pseudo"></div>
        <div class="form-group"><label>Email</label><input type="email" id="au-email" placeholder="Email"></div>
        <div class="form-group"><label>Mot de passe</label><input type="password" id="au-mdp" placeholder="Mot de passe"></div>
        <div class="form-group"><label>Pays</label><input id="au-pays" placeholder="Pays"></div>
        <div class="form-group"><label>Devise</label><input id="au-devise" placeholder="Devise"></div>
        <div class="form-group"><label>Couleur</label><select id="au-couleur">${colorOpts}</select></div>
        <div class="form-group"><label>Admin</label>
          <select id="au-admin">
            <option value="false">Non</option>
            <option value="true">Oui</option>
          </select>
        </div>
        <div class="form-group full"><label>Avatar URL</label><input id="au-avatar" placeholder="https://..."></div>
        <div class="form-group full"><label>Photo URL</label><input id="au-photo" placeholder="https://..."></div>
      </div>
      <div style="margin-top:16px;display:flex;gap:10px;">
        <button class="btn btn-accent" id="btn-add-user"><i class="fas fa-user-plus"></i> Ajouter</button>
        <button class="btn btn-outline" onclick="navigate('liste-utilisateurs')">Annuler</button>
      </div>
      <ul id="add-errors" class="error-list"></ul>
    </div>
  `;

  $('btn-add-user').addEventListener('click', async () => {
    const vals = {
      nom:        $('au-nom').value.trim(),
      prenom:     $('au-prenom').value.trim(),
      age:        $('au-age').value.trim(),
      pseudo:     $('au-pseudo').value.trim(),
      email:      $('au-email').value.trim(),
      MotDePasse: $('au-mdp').value.trim(),
      Pays:       $('au-pays').value.trim(),
      Devise:     $('au-devise').value.trim(),
      couleur:    $('au-couleur').value,
      admin:      $('au-admin').value === 'true',
      avatar:     $('au-avatar').value.trim(),
      photo:      $('au-photo').value.trim(),
    };

    const errors = [];
    Object.entries(vals).forEach(([k, v]) => {
      if (v === '' || v === null || v === undefined) errors.push(`"${k}" est obligatoire.`);
    });

    if (errors.length) { renderErrors($('add-errors'), errors); return; }

    $('btn-add-user').disabled = true;
    try {
      await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals),
      });
      toast('Utilisateur ajouté !', 'success');
      navigate('liste-utilisateurs');
    } catch {
      toast('Erreur lors de l\'ajout.', 'error');
      $('btn-add-user').disabled = false;
    }
  });
}

/* ============================================================
   PAGE: DEMANDES
   ============================================================ */
let demandesLocal = JSON.parse(localStorage.getItem('demandes') || '[]');

function saveDemandesLocal() {
  localStorage.setItem('demandes', JSON.stringify(demandesLocal));
}

function renderDemandes(container) {
  const u = getUser();
  const isAdmin = u.admin === true || u.admin === 'true';

  if (isAdmin) {
    renderDemandesAdmin(container);
  } else {
    renderDemandesVisiteur(container, u);
  }
}

function renderDemandesVisiteur(container, u) {
  const myDemandes = demandesLocal.filter(d => d.userId === u.id);
  const currentTab = container.dataset.tab || 'all';

  const filtered = currentTab === 'all' ? myDemandes
    : myDemandes.filter(d => d.statut === currentTab);

  container.innerHTML = `
    <h2 class="page-title">Mes Demandes</h2>
    <div class="card" style="margin-bottom:16px;">
      <h3 style="margin-bottom:14px;">Nouvelle demande</h3>
      <div class="inline-form">
        <input id="d-titre" placeholder="Titre de la demande" />
        <textarea id="d-desc" placeholder="Description..." rows="3"></textarea>
        <button class="btn btn-accent" id="btn-add-demande"><i class="fas fa-plus"></i> Soumettre</button>
      </div>
    </div>
    <div class="card">
      <div class="demande-tabs">
        <button class="tab-btn ${currentTab==='all'?'active':''}" data-tab="all">Toutes</button>
        <button class="tab-btn ${currentTab==='en attente'?'active':''}" data-tab="en attente">En attente</button>
        <button class="tab-btn ${currentTab==='approuvée'?'active':''}" data-tab="approuvée">Approuvées</button>
        <button class="tab-btn ${currentTab==='rejetée'?'active':''}" data-tab="rejetée">Rejetées</button>
      </div>
      <div id="demandes-list">
        ${filtered.length === 0 ? '<p style="color:var(--text-muted)">Aucune demande.</p>' : ''}
        ${filtered.map(d => `
          <div class="demande-card" style="border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;">
              <div>
                <strong>${d.titre}</strong>
                <p style="color:var(--text-muted);font-size:0.88rem;margin-top:4px;">${d.description}</p>
              </div>
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
                <span class="badge ${d.statut==='en attente'?'badge-warning':d.statut==='approuvée'?'badge-success':'badge-danger'}">${d.statut}</span>
                ${d.statut === 'en attente' ? `<button class="btn btn-sm btn-danger" onclick="annulerDemande('${d.id}')"><i class="fas fa-times"></i> Annuler</button>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.dataset.tab = btn.dataset.tab;
      renderDemandesVisiteur(container, u);
    });
  });

  $('btn-add-demande').addEventListener('click', () => {
    const titre = $('d-titre').value.trim();
    const desc  = $('d-desc').value.trim();
    if (!titre || !desc) { toast('Titre et description obligatoires.', 'warning'); return; }
    const nd = { id: Date.now().toString(), userId: u.id, userNom: `${u.prenom} ${u.nom}`, titre, description: desc, statut: 'en attente' };
    demandesLocal.push(nd);
    saveDemandesLocal();
    toast('Demande soumise !', 'success');
    renderDemandesVisiteur(container, u);
  });
}

window.annulerDemande = function(id) {
  const idx = demandesLocal.findIndex(d => d.id === id);
  if (idx > -1 && demandesLocal[idx].statut === 'en attente') {
    demandesLocal.splice(idx, 1);
    saveDemandesLocal();
    toast('Demande annulée.', 'success');
    navigate('demandes');
  }
};

function renderDemandesAdmin(container) {
  const currentTab = container.dataset.tab || 'all';
  const filtered = currentTab === 'all' ? demandesLocal
    : demandesLocal.filter(d => d.statut === currentTab);

  container.innerHTML = `
    <h2 class="page-title">Gestion des Demandes</h2>
    <div class="card">
      <div class="demande-tabs">
        <button class="tab-btn ${currentTab==='all'?'active':''}" data-tab="all">Toutes (${demandesLocal.length})</button>
        <button class="tab-btn ${currentTab==='en attente'?'active':''}" data-tab="en attente">En attente (${demandesLocal.filter(d=>d.statut==='en attente').length})</button>
        <button class="tab-btn ${currentTab==='approuvée'?'active':''}" data-tab="approuvée">Approuvées (${demandesLocal.filter(d=>d.statut==='approuvée').length})</button>
        <button class="tab-btn ${currentTab==='rejetée'?'active':''}" data-tab="rejetée">Rejetées (${demandesLocal.filter(d=>d.statut==='rejetée').length})</button>
      </div>
      ${filtered.length === 0 ? '<p style="color:var(--text-muted)">Aucune demande.</p>' : ''}
      ${filtered.map(d => `
        <div style="border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;flex-wrap:wrap;">
            <div>
              <strong>${d.titre}</strong>
              <p style="font-size:0.82rem;color:var(--text-muted);margin:2px 0;">${d.userNom || '—'}</p>
              <p style="color:var(--text-muted);font-size:0.88rem;margin-top:4px;">${d.description}</p>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
              <span class="badge ${d.statut==='en attente'?'badge-warning':d.statut==='approuvée'?'badge-success':'badge-danger'}">${d.statut}</span>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-sm btn-success" onclick="changerStatut('${d.id}','approuvée')"><i class="fas fa-check"></i></button>
                <button class="btn btn-sm btn-danger"  onclick="changerStatut('${d.id}','rejetée')"><i class="fas fa-times"></i></button>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.dataset.tab = btn.dataset.tab;
      renderDemandesAdmin(container);
    });
  });
}

window.changerStatut = function(id, statut) {
  const d = demandesLocal.find(x => x.id === id);
  if (d) {
    d.statut = statut;
    saveDemandesLocal();
    toast(`Demande ${statut}.`, 'success');
    navigate('demandes');
  }
};

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  const user = getUser();
  if (user) {
    currentUser = user;
    initLayout();
    showPage('page-layout');
  } else {
    showPage('page-login');
  }
  initLogin();
  initCreate();
}

window.navigate = navigate;
document.addEventListener('DOMContentLoaded', boot);
