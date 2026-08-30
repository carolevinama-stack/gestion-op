import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, where, getCountFromServer } from 'firebase/firestore';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { styles } from '../utils/styles';
import PasswordModal from '../components/PasswordModal';

// ==================== CONFIGURATION DES RÔLES ====================
const ROLES = {
  ADMIN: { label: 'Administrateur', color: '#C43E3E', bg: '#ffebee', icon: 'A', description: 'Accès total + gestion utilisateurs + paramètres' },
  OPERATEUR: { label: 'Opérateur', color: '#C5961F', bg: '#fff3e0', icon: 'O', description: 'Saisie, modification, bordereaux, rapports, bénéficiaires' },
  CONSULTATION: { label: 'Consultation', color: '#616161', bg: '#f5f5f5', icon: 'C', description: 'Lecture seule — voir sans modifier' }
};

const ConfirmModal = ({ data, onCancel, onConfirm }) => {
  if (!data) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw' }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: data.danger ? '#C43E3E' : '#333' }}>{data.title}</h3>
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.5, marginBottom: 24, whiteSpace: 'pre-line' }}>{data.message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontWeight: 600, color: '#555' }}>Annuler</button>
          <button onClick={onConfirm} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: data.danger ? '#C43E3E' : '#2e7d32', color: 'white', cursor: 'pointer', fontWeight: 700 }}>Confirmer</button>
        </div>
      </div>
    </div>
  );
};

const PageAdmin = () => {
  const { user, userProfile, projet } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Utilisateur dont la suppression est en attente de confirmation par mot de passe
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const askConfirm = (title, message, danger = false) => new Promise((resolve) => {
    setConfirmData({ title, message, danger, resolve });
  });
  const closeConfirm = (result) => {
    if (confirmData?.resolve) confirmData.resolve(result);
    setConfirmData(null);
  };

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

  // Afficher un message temporaire. La minuterie est conservée puis annulée au
  // démontage (ou au message suivant) : sans cela, quitter la page dans les quatre
  // secondes déclenchait une mise à jour sur un composant qui n'existe plus.
  const messageTimer = useRef(null);
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(null), 4000);
  };
  useEffect(() => () => { if (messageTimer.current) clearTimeout(messageTimer.current); }, []);

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
      showMessage('Veuillez remplir tous les champs', 'error'); return;
    }
    if (createForm.password.length < 6) {
      showMessage('Le mot de passe doit contenir au moins 6 caractères', 'error'); return;
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
        showMessage('Cet email est déjà utilisé', 'error');
      } else if (error.code === 'auth/invalid-email') {
        showMessage('Email invalide', 'error');
      } else {
        showMessage('Erreur: ' + error.message, 'error');
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
      showMessage('Erreur: ' + error.message, 'error');
    }
  };

  // ==================== ACTIVER / DÉSACTIVER ====================
  const handleToggleActive = async (userDoc) => {
    if (userDoc.uid === user.uid) {
      showMessage('Vous ne pouvez pas vous désactiver vous-même', 'error'); return;
    }
    const newActif = !userDoc.actif;
    const confirm = await askConfirm(
      newActif ? 'Réactiver le compte' : 'Désactiver le compte',
      newActif
        ? `Réactiver le compte de ${userDoc.nom} ?`
        : `Désactiver le compte de ${userDoc.nom} ? Il ne pourra plus se connecter.`,
      !newActif
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
      showMessage('Erreur: ' + error.message, 'error');
    }
  };

  // ==================== RÉINITIALISER MOT DE PASSE ====================
  const handleResetPassword = async (userDoc) => {
    const confirm = await askConfirm(
      'Réinitialiser le mot de passe',
      `Envoyer un email de réinitialisation de mot de passe à ${userDoc.email} ?`
    );
    if (!confirm) return;

    try {
      const mainAuth = getAuth();
      await sendPasswordResetEmail(mainAuth, userDoc.email);
      showMessage(`Email de réinitialisation envoyé à ${userDoc.email}`);
    } catch (error) {
      console.error('Erreur réinitialisation:', error);
      showMessage('Erreur: ' + error.message, 'error');
    }
  };

  // ==================== SUPPRIMER UTILISATEUR ====================
  // Compte les opérations rattachées à un utilisateur. La lecture se fait directement
  // en base (et non depuis le contexte, qui ne garde en mémoire que l'exercice actif) :
  // un OP archivé d'une année passée doit lui aussi bloquer la suppression.
  const compterOperationsLiees = async (userDoc) => {
    const identites = [userDoc.nom, userDoc.email].filter(Boolean);
    if (identites.length === 0) return 0;
    const [crees, supprimes] = await Promise.all([
      getCountFromServer(query(collection(db, 'ops'), where('creePar', 'in', identites))),
      getCountFromServer(query(collection(db, 'ops'), where('supprimePar', 'in', identites))),
    ]);
    return crees.data().count + supprimes.data().count;
  };

  const handleDeleteUser = async (userDoc) => {
    if (userDoc.uid === user.uid) {
      showMessage('Vous ne pouvez pas supprimer votre propre compte', 'error'); return;
    }
    if (!projet?.motDePasseAdmin) {
      showMessage("Mot de passe administrateur non configuré. Renseignez-le dans Paramètres avant de pouvoir supprimer un compte.", 'error');
      return;
    }

    setCheckingLinks(true);
    let nbOps = 0;
    try {
      nbOps = await compterOperationsLiees(userDoc);
    } catch (error) {
      setCheckingLinks(false);
      showMessage("Impossible de vérifier les opérations liées : " + error.message, 'error');
      return;
    }
    setCheckingLinks(false);

    if (nbOps > 0) {
      showMessage(
        `Suppression impossible : ${userDoc.nom} est rattaché à ${nbOps} opération(s). Désactivez plutôt son compte pour lui retirer l'accès tout en conservant l'historique.`,
        'error'
      );
      return;
    }

    setDeleteTarget(userDoc);
  };

  const executeDeleteUser = async () => {
    const userDoc = deleteTarget;
    setDeleteTarget(null);
    if (!userDoc) return;
    try {
      await deleteDoc(doc(db, 'users', userDoc.id));
      setUsers(users.filter(u => u.id !== userDoc.id));
      showMessage('Utilisateur supprimé');
    } catch (error) {
      showMessage('Erreur: ' + error.message, 'error');
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

      {/* Message de notification (toast, visible même par-dessus les fenêtres modales) */}
      {message && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 20000,
          padding: '14px 20px',
          background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
          borderRadius: 10,
          color: message.type === 'success' ? '#2e7d32' : '#C43E3E',
          fontSize: 14,
          maxWidth: 480,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
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
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleToggleActive(u)}
                            style={{
                              padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                              border: `1px solid ${u.actif === false ? '#a5d6a7' : '#ffe0b2'}`,
                              background: u.actif === false ? '#e8f5e9' : '#fff8e1',
                              color: u.actif === false ? '#2e7d32' : '#C5961F'
                            }}
                            title={u.actif === false ? 'Réactiver ce compte' : "Désactiver ce compte (retire l'accès sans supprimer l'historique)"}
                          >
                            {u.actif === false ? 'Réactiver' : 'Désactiver'}
                          </button>
                        )}
                        {!isCurrentUser && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={checkingLinks}
                            style={{ padding: '5px 10px', border: '1px solid #ffcdd2', borderRadius: 6, background: '#fff5f5', cursor: checkingLinks ? 'wait' : 'pointer', fontSize: 11, color: '#C43E3E', opacity: checkingLinks ? 0.6 : 1 }}
                            title="Supprimer définitivement"
                          >
                            {checkingLinks ? '...' : 'Suppr'}
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

      <ConfirmModal data={confirmData} onCancel={() => closeConfirm(false)} onConfirm={() => closeConfirm(true)} />

      <PasswordModal
        show={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDeleteUser}
        title="Supprimer un utilisateur"
        description={deleteTarget ? `Supprimer définitivement le compte de ${deleteTarget.nom} (${deleteTarget.email}) ?` : ''}
        warning="Action irréversible. Le profil sera supprimé de l'application ; le compte de connexion devra être retiré séparément dans la console Firebase."
        confirmText="Supprimer définitivement"
        confirmColor="#C43E3E"
      />

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
