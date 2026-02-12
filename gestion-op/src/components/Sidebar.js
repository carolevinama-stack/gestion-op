import React from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';

const ROLE_LABELS = {
  ADMIN: { label: 'Admin', color: '#f0b429', icon: '👑' },
  SAISIE: { label: 'Saisie', color: '#ff9800', icon: '✏️' },
  CF: { label: 'Contrôleur F.', color: '#42a5f5', icon: '✅' },
  AC: { label: 'Agent Compt.', color: '#66bb6a', icon: '💳' },
  CONSULTATION: { label: 'Consultation', color: '#bdbdbd', icon: '👁️' }
};

const NavItem = ({ id, icon, label, currentPage, setCurrentPage, canAccess }) => {
  if (!canAccess) return null;
  return (
    <div 
      onClick={() => setCurrentPage(id)} 
      style={{ 
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', cursor: 'pointer', 
        borderLeft: currentPage === id ? '3px solid #f0b429' : '3px solid transparent', 
        background: currentPage === id ? 'rgba(255,255,255,0.15)' : 'transparent',
        transition: 'all 0.2s'
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 14 }}>{label}</span>
    </div>
  );
};

const Sidebar = () => {
  const { currentPage, setCurrentPage, projet, exerciceActif, user, userProfile, userRole, canAccessPage, handleLogout } = useAppContext();
  const roleInfo = ROLE_LABELS[userRole] || ROLE_LABELS.CONSULTATION;

  return (
    <div style={styles.sidebar}>
      <div style={{ padding: 18, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: '#f0b429', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌳</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{projet?.sigle || 'GESTION OP'}</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Ordres de Paiement</div>
          </div>
        </div>
      </div>
      
      <nav style={{ flex: 1, padding: '14px 0', overflowY: 'auto' }}>
        <NavItem id="dashboard" icon="📊" label="Tableau de bord" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('dashboard')} />
        
        <div style={{ padding: '16px 18px 6px', fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>OPÉRATIONS</div>
        <NavItem id="nouvelOp" icon="➕" label="Nouvel OP" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('nouvelOp')} />
        <NavItem id="consulterOp" icon="🔍" label="Consulter OP" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('consulterOp')} />
        <NavItem id="ops" icon="📋" label="Liste des OP" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('ops')} />
        <NavItem id="bordereaux" icon="📨" label="Bordereaux" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('bordereaux')} />
        <NavItem id="suivi" icon="🔄" label="Suivi Circuit" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('suivi')} />
        
        <div style={{ padding: '16px 18px 6px', fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>GESTION</div>
        <NavItem id="budget" icon="💰" label="Budget" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('budget')} />
        <NavItem id="beneficiaires" icon="👥" label="Bénéficiaires" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('beneficiaires')} />
        
        <div style={{ padding: '16px 18px 6px', fontSize: 10, opacity: 0.5, letterSpacing: 1 }}>CONFIGURATION</div>
        <NavItem id="parametres" icon="⚙️" label="Paramètres" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('parametres')} />
        <NavItem id="admin" icon="🔐" label="Utilisateurs" currentPage={currentPage} setCurrentPage={setCurrentPage} canAccess={canAccessPage('admin')} />
      </nav>
      
      {exerciceActif && (
        <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>EXERCICE ACTIF</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f0b429' }}>{exerciceActif.annee}</div>
        </div>
      )}
      
      <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: '50%', 
            background: 'rgba(255,255,255,0.15)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700
          }}>
            {userProfile?.nom ? userProfile.nom[0].toUpperCase() : '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userProfile?.nom || user.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ fontSize: 10 }}>{roleInfo.icon}</span>
              <span style={{ fontSize: 10, color: roleInfo.color, fontWeight: 600 }}>{roleInfo.label}</span>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} style={{ 
          width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', 
          padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11 
        }}>
          Déconnexion
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
