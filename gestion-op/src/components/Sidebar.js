import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { LOGO_PIF2 } from '../utils/logos';

const accent = '#5D6C57';
const accentBg = '#EAEDD8';
const EXPANDED = 240;
const COLLAPSED = 68;

// ===================== ICÔNES SVG (Lucide-style, trait fin) =====================
const I = {
  dashboard: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  nouvelOp: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  consulterOp: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ops: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
  bordereaux: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  suivi: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  budget: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 14h.01"/><path d="M10 14h.01"/></svg>,
  beneficiaires: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  parametres: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  admin: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  logout: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
};

// ===================== CONFIG MENU =====================
const menuConfig = [
  { id: 'dashboard', icon: 'dashboard', label: 'Tableau de bord' },
  { section: 'OPÉRATIONS' },
  { id: 'nouvelOp', icon: 'nouvelOp', label: 'Nouvel OP' },
  { id: 'consulterOp', icon: 'consulterOp', label: 'Consulter OP' },
  { id: 'ops', icon: 'ops', label: 'Liste des OP' },
  { id: 'bordereaux', icon: 'bordereaux', label: 'Circuit' },
  { id: 'suivi', icon: 'suivi', label: 'Rapport' },
  { section: 'GESTION' },
  { id: 'budget', icon: 'budget', label: 'Budget' },
  { id: 'beneficiaires', icon: 'beneficiaires', label: 'Bénéficiaires' },
  { section: 'CONFIG' },
  { id: 'parametres', icon: 'parametres', label: 'Paramètres' },
];

// ===================== NAVITEM =====================
const NavItem = ({ id, icon, label, active, collapsed, onClick }) => {
  const [hov, setHov] = useState(false);
  const isH = hov && !active;
  return (
    <div
      onClick={() => onClick(id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: collapsed ? 0 : '0 12px',
        margin: collapsed ? '2px 10px' : '2px 12px',
        height: 44, borderRadius: 12, cursor: 'pointer',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? 'rgba(255,255,255,0.15)' : isH ? 'rgba(255,255,255,0.08)' : 'transparent',
        transition: 'all 0.15s ease', position: 'relative',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
        transition: 'all 0.2s ease',
      }}>
        {I[icon]?.(active ? '#fff' : isH ? '#e0e0e0' : 'rgba(255,255,255,0.55)')}
      </div>
      {!collapsed && (
        <span style={{
          fontSize: 13.5, fontWeight: active ? 700 : 500,
          color: active ? '#fff' : isH ? '#e0e0e0' : 'rgba(255,255,255,0.7)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.15s',
        }}>{label}</span>
      )}
      {collapsed && isH && (
        <div style={{
          position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
          marginLeft: 10, padding: '7px 14px', background: '#333', color: '#fff',
          borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pointerEvents: 'none',
        }}>
          {label}
          <div style={{
            position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)',
            width: 8, height: 8, background: '#333',
          }}/>
        </div>
      )}
    </div>
  );
};

// ===================== SIDEBAR =====================
const Sidebar = () => {
  const { currentPage, setCurrentPage, projet, exerciceActif, user, handleLogout, userProfile } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? COLLAPSED : EXPANDED;

  // Synchroniser la largeur sidebar avec le main via CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-w', w + 'px');
  }, [w]);

  const items = [...menuConfig];
  if (userProfile?.role === 'admin') {
    items.push({ id: 'admin', icon: 'admin', label: 'Administration' });
  }

  return (
    <div style={{
      width: w, minWidth: w, height: '100vh', position: 'fixed',
      background: '#5D6C57', color: '#fff',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden',
      boxShadow: '4px 0 24px rgba(0,0,0,0.03)',
      zIndex: 10,
    }}>

      {/* ── Bouton replier/déplier (flottant bord droit) ── */}
      <button onClick={() => setCollapsed(c => !c)} style={{
        position: 'absolute', top: 28, right: -14,
        width: 28, height: 28, borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.15)', background: '#5D6C57',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }} title={collapsed ? 'Déplier' : 'Replier'}>
        <span style={{ display: 'flex', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
          {I.chevron('#fff')}
        </span>
      </button>

      {/* ── Logo PIF2 ── */}
      <div style={{
        padding: collapsed ? '18px 0' : '18px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        justifyContent: collapsed ? 'center' : 'flex-start',
        minHeight: 70,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(255,255,255,0.9)', border: '1.5px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', flexShrink: 0,
        }}>
          <img src={LOGO_PIF2} alt="PIF2" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1.1 }}>
              {projet?.sigle || 'PIF 2'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, letterSpacing: 0.5 }}>Ordres de Paiement</div>
          </div>
        )}
      </div>

      {/* ── Menu ── */}
      <nav style={{ flex: 1, padding: '4px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {items.map((item, idx) => {
          if (item.section) {
            if (collapsed) return <div key={'s' + idx} style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '10px 14px' }}/>;
            return <div key={'s' + idx} style={{ padding: '20px 24px 6px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 }}>{item.section}</div>;
          }
          return (
            <NavItem key={item.id} id={item.id} icon={item.icon} label={item.label}
              active={currentPage === item.id} collapsed={collapsed} onClick={setCurrentPage}
            />
          );
        })}
      </nav>

      {/* ── Exercice ── */}
      {exerciceActif && (
        <div style={{ padding: collapsed ? '12px 0' : '12px 22px', textAlign: collapsed ? 'center' : 'left' }}>
          {collapsed ? (
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{String(exerciceActif.annee).slice(-2)}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C99A2B', boxShadow: '0 0 6px rgba(201,154,43,0.4)' }}/>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Exercice</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{exerciceActif.annee}</span>
            </div>
          )}
        </div>
      )}

      {/* ── User + Déconnexion ── */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 14px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', flexDirection: 'column', gap: 10,
        alignItems: collapsed ? 'center' : 'stretch',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>{(user?.email || 'U')[0].toUpperCase()}</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          )}
        </div>
        {!collapsed ? (
          <button onClick={handleLogout} style={{
            width: '100%', padding: '7px 10px', borderRadius: 8,
            border: 'none', background: 'rgba(255,255,255,0.08)',
            fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
          }}>{I.logout('rgba(255,255,255,0.5)')} Déconnexion</button>
        ) : (
          <button onClick={handleLogout} title="Déconnexion" style={{
            width: 38, height: 34, borderRadius: 8, margin: '0 auto',
            border: 'none', background: 'rgba(255,255,255,0.08)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{I.logout('rgba(255,255,255,0.5)')}</button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
