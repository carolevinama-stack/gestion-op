import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { styles } from '../utils/styles';

// ==================== CONFIGURATION DES RÔLES ====================
const ROLES = {
  ADMIN: { label: 'Administrateur', color: '#C43E3E', bg: '#ffebee', icon: 'A', description: 'Accès total + gestion utilisateurs + paramètres' },
  OPERATEUR: { label: 'Opérateur', color: '#C5961F', bg: '#fff3e0', icon: 'O', description: 'Saisie, modification, bordereaux, rapports, bénéficiaires' },
  CONSULTATION: { label: 'Consultation', color: '#616161', bg: '#f5f5f5', icon: 'C', description: 'Lecture seule — voir sans modifier' }
};

const PageAdmin = () => {
  const { user, userProfile } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Formulaire création
  const [createForm, setCreateForm] = useState({
    email: '', nom: '', role: 'OPERATEUR', password: ''
  });

  // Charger les utilisateurs
  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('nom')));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  // Afficher un message temporaire
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Générer un mot de passe temporaire
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    return pass;
  };

  // ==================== CRÉER UN UTILISATEUR ====================
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.nom || !createForm.password) {
      alert('Veuillez remplir tous les champs'); return;
    }
    if (createForm.password.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères'); return;
    }

    setSaving(true);
    try {
      // Créer une app Firebase secondaire pour ne pas déconnecter l'admin
      const currentApp = getApp();
      const config = currentApp.options;
      
      let secondaryApp;
      try {
        secondaryApp = initializeApp(config, 'secondary_' + Date.now());
      } catch (e) {
        secondaryApp = getApp('secondary_' + Date.now());
      }
      
      const secondaryAuth = getAuth(secondaryApp);
      
      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, createForm.email.trim(), createForm.password
      );
      
      // Créer le profil dans Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: createForm.email.trim().toLowerCase(),
        nom: createForm.nom.trim(),
        role: createForm.role,
        actif: true,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });

      // Nettoyer l'app secondaire
      try { await deleteApp(secondaryApp); } catch (e) {}

      // Envoyer automatiquement un email de réinitialisation
      try {
        const mainAuth = getAuth();
        await sendPasswordResetEmail(mainAuth, createForm.email.trim().toLowerCase());
        showMessage(`${createForm.nom} créé ! Un email de réinitialisation a été envoyé à ${createForm.email}.`);
      } catch (e) {
        showMessage(`${createForm.nom} créé, mais l'email n'a pas pu être envoyé. Utilisez "Réinitialiser" pour réessayer.`, 'warning');
      }
      setShowCreateModal(false);
      setCreateForm({ email: '', nom: '', role: 'OPERATEUR', password: '' });
      await loadUsers();
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      if (error.code === 'auth/email-already-in-use') {
        alert('Cet email est déjà utilisé');
      } else if (error.code === 'auth/invalid-email') {
        alert('Email invalide');
      } else {
        alert('Erreur: ' + error.message);
      }
    }
    setSaving(false);
  };

  // ==================== MODIFIER LE RÔLE ====================
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { 
        role: newRole, 
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid 
      });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showMessage('Rôle mis à jour');
      setShowEditModal(null);
    } catch (error) {
      console.error('Erreur mise à jour rôle:', error);
      alert('Erreur: ' + error.message);
    }
  };

  // ==================== ACTIVER / DÉSACTIVER ====================
  const handleToggleActive = async (userDoc) => {
    if (userDoc.uid === user.uid) {
      alert('Vous ne pouvez pas vous désactiver vous-même'); return;
    }
    const newActif = !userDoc.actif;
    const confirm = window.confirm(
      newActif 
        ? `Réactiver le compte de ${userDoc.nom} ?`
        : `Désactiver le compte de ${userDoc.nom} ? Il ne pourra plus se connecter.`
    );
    if (!confirm) return;

    try {
      await updateDoc(doc(db, 'users', userDoc.id), { 
        actif: newActif,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      });
      setUsers(users.map(u => u.id === userDoc.id ? { ...u, actif: newActif } : u));
      showMessage(newActif ? 'Compte réactivé' : 'Compte désactivé');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  // ==================== RÉINITIALISER MOT DE PASSE ====================
  const handleResetPassword = async (userDoc) => {
    const confirm = window.confirm(
      `Envoyer un email de réinitialisation de mot de passe à ${userDoc.email} ?`
    );
    if (!confirm) return;

    try {
      const mainAuth = getAuth();
      await sendPasswordResetEmail(mainAuth, userDoc.email);
      showMessage(`Email de réinitialisation envoyé à ${userDoc.email}`);
    } catch (error) {
      console.error('Erreur réinitialisation:', error);
      alert('Erreur: ' + error.message);
    }
  };

  // ==================== SUPPRIMER UTILISATEUR ====================
  const handleDeleteUser = async (userDoc) => {
    if (userDoc.uid === user.uid) {
      alert('Vous ne pouvez pas supprimer votre propre compte'); return;
    }
    const confirm = window.confirm(
      `Supprimer définitivement le compte de ${userDoc.nom} (${userDoc.email}) ?\n\nCette action est irréversible. Le profil sera supprimé mais le compte Firebase Auth restera (il pourra être nettoyé dans la console Firebase).`
    );
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, 'users', userDoc.id));
      setUsers(users.filter(u => u.id !== userDoc.id));
      showMessage('Utilisateur supprimé');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  // ==================== RENDU ====================
  if (userProfile?.role !== 'ADMIN') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        
        <h2>Accès refusé</h2>
        <p style={{ color: '#6c757d' }}>Seuls les administrateurs peuvent accéder à cette page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#3B6B8A', margin: 0 }}>
            Gestion des Utilisateurs
          </h1>
          <p style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>
            {users.filter(u => u.actif !== false).length} utilisateur(s) actif(s) sur {users.length}
          </p>
        </div>
        <button 
          onClick={() => {
            setCreateForm({ email: '', nom: '', role: 'OPERATEUR', password: generateTempPassword() });
            setShowCreateModal(true);
          }}
          style={{ ...styles.button, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          Nouvel utilisateur
        </button>
      </div>

      {/* Message de notification */}
      {message && (
        <div style={{ 
          padding: 14, 
          background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
          borderRadius: 10, 
          color: message.type === 'success' ? '#2e7d32' : '#C43E3E',
          fontSize: 14, 
          marginBottom: 20,
          border: `1px solid ${message.type === 'success' ? '#a5d6a7' : '#ef9a9a'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Légende des rôles */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {Object.entries(ROLES).map(([key, role]) => (
          <div key={key} style={{ 
            display: 'flex', alignItems: 'center', gap: 6, 
            padding: '6px 12px', borderRadius: 20,
            background: role.bg, fontSize: 12, color: role.color
          }}>
            <span>{role.icon}</span>
            <span style={{ fontWeight: 600 }}>{role.label}</span>
            <span style={{ opacity: 0.7 }}>— {role.description}</span>
          </div>
        ))}
      </div>

      {/* Liste des utilisateurs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 14, color: '#888' }}>Chargement...</div>
          <p>Chargement...</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6c757d' }}>UTILISATEUR</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6c757d' }}>EMAIL</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6c757d' }}>RÔLE</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6c757d' }}>STATUT</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6c757d' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const role = ROLES[u.role] || ROLES.CONSULTATION;
                const isCurrentUser = u.uid === user.uid;
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid #eee', opacity: u.actif === false ? 0.5 : 1 }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ 
                          width: 36, height: 36, borderRadius: '50%', 
                          background: role.bg, color: role.color,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 700
                        }}>
                          {u.nom ? u.nom[0].toUpperCase() : '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {u.nom || 'Sans nom'}
                            {isCurrentUser && <span style={{ fontSize: 10, color: '#6c757d', marginLeft: 8 }}>(vous)</span>}
                          </div>
                          <div style={{ fontSize: 11, color: '#6c757d' }}>
                            Créé le {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#333' }}>{u.email}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: role.bg, color: role.color
                      }}>
                        {role.icon} {role.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                        background: u.actif === false ? '#ffebee' : '#e8f5e9',
                        color: u.actif === false ? '#C43E3E' : '#2e7d32'
                      }}>
                        {u.actif === false ? 'Inactif' : 'Actif'}
                      </span>
                      {u.mustChangePassword && (
                        <div style={{ fontSize: 10, color: '#C5961F', marginTop: 4 }}>Doit changer son MDP</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => setShowEditModal(u)}
                          style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11 }}
                          title="Modifier le rôle"
                        >
                          Rôle
                        </button>
                        <button 
                          onClick={() => handleResetPassword(u)}
                          style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11 }}
                          title="Réinitialiser le mot de passe"
                        >
                          MDP
                        </button>
                        <button 
                          onClick={() => handleToggleActive(u)}
                          style={{ padding: '5px 10px', border: '1px solid #ddd', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 11 }}
                          title={u.actif === false ? 'Réactiver' : 'Désactiver'}
                        >
                          {u.actif === false ? '●' : '●'}
                        </button>
                        {!isCurrentUser && (
                          <button 
                            onClick={() => handleDeleteUser(u)}
                            style={{ padding: '5px 10px', border: '1px solid #ffcdd2', borderRadius: 6, background: '#fff5f5', cursor: 'pointer', fontSize: 11, color: '#C43E3E' }}
                            title="Supprimer"
                          >
                            Suppr
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#6c757d' }}>
                    Aucun utilisateur. Commencez par créer votre premier utilisateur.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== MODAL CRÉATION ==================== */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 30, width: 450, maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              Nouvel utilisateur
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Nom complet *</label>
                <input
                  type="text"
                  value={createForm.nom}
                  onChange={(e) => setCreateForm({ ...createForm, nom: e.target.value })}
                  placeholder="Ex: Marie KOUADIO"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="marie.kouadio@projet.ci"
                  style={styles.input}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>Rôle *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(ROLES).map(([key, role]) => (
                    <label key={key} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 10, cursor: 'pointer',
                      border: createForm.role === key ? `2px solid ${role.color}` : '2px solid #eee',
                      background: createForm.role === key ? role.bg : 'white',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="role"
                        value={key}
                        checked={createForm.role === key}
                        onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                        style={{ display: 'none' }}
                      />
                      <span style={{ fontSize: 18 }}>{role.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: role.color }}>{role.label}</div>
                        <div style={{ fontSize: 11, color: '#6c757d' }}>{role.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#333' }}>
                  Mot de passe temporaire *
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    style={{ ...styles.input, flex: 1, fontFamily: 'monospace', fontSize: 16, letterSpacing: 1 }}
                  />
                  <button 
                    onClick={() => setCreateForm({ ...createForm, password: generateTempPassword() })}
                    style={{ padding: '8px 14px', border: '1px solid #ddd', borderRadius: 8, background: '#f8f9fa', cursor: 'pointer', fontSize: 13 }}
                    title="Générer un nouveau mot de passe"
                  >
                    Générer
                  </button>
                </div>
                <p style={{ fontSize: 11, color: '#C5961F', marginTop: 6 }}>
                  Notez ce mot de passe et communiquez-le à l'utilisateur. Il devra le changer à sa première connexion.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button 
                onClick={handleCreateUser}
                disabled={saving}
                style={{ ...styles.button, padding: '10px 20px', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL MODIFICATION RÔLE ==================== */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 30, width: 420 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Modifier le rôle
            </h2>
            <p style={{ color: '#6c757d', fontSize: 13, marginBottom: 20 }}>
              {showEditModal.nom} ({showEditModal.email})
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(ROLES).map(([key, role]) => (
                <button
                  key={key}
                  onClick={() => handleUpdateRole(showEditModal.id, key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: showEditModal.role === key ? `2px solid ${role.color}` : '2px solid #eee',
                    background: showEditModal.role === key ? role.bg : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: 20 }}>{role.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: role.color }}>{role.label}</div>
                    <div style={{ fontSize: 11, color: '#6c757d' }}>{role.description}</div>
                  </div>
                  {showEditModal.role === key && (
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: role.color }}>✓ Actuel</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button 
                onClick={() => setShowEditModal(null)}
                style={{ padding: '10px 20px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageAdmin;
