import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { LOGO_PIF2 } from '../utils/logos';

const PRIMARY = '#1B6B2E';
const PRIMARY_DARK = '#155A25';
const EXPANDED = 240;
const COLLAPSED = 68;

// ===================== ICÔNES SVG =====================
const I = {
  dashboard: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  
  // Icônes des dossiers principaux
  operations: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  circuit: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
  gestion: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  config: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,

  // Sous-icônes
  nouvelOp: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  consulterOp: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ops: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>,
  cf: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  ac: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>,
  archives: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  suivi: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  budget: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 14h.01"/><path d="M10 14h.01"/></svg>,
  beneficiaires: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  parametres: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  admin: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  
  logout: (c, s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron: (c, s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
};

// ===================== CONFIG MENU =====================
const menuConfig = [
  { id: 'dashboard', icon: 'dashboard', label: 'Tableau de bord' },
  { isDivider: true },
  
  { 
    id: 'grp_operations', 
    icon: 'operations', 
    label: 'Opérations',
    subItems: [
      { id: 'nouvelOp', icon: 'nouvelOp', label: 'Nouvel OP' },
      { id: 'consulterOp', icon: 'consulterOp', label: 'Consulter OP' },
      { id: 'ops', icon: 'ops', label: 'Liste des OP' },
    ]
  },
  { 
    id: 'circuit', 
    icon: 'circuit', 
    label: 'Circuit Validation',
    subItems: [
      { id: 'circuitCF', icon: 'cf', label: 'Contrôle Financier' },
      { id: 'circuitAC', icon: 'ac', label: 'Agent Comptable' },
      { id: 'archives', icon: 'archives', label: 'Salle des Archives' },
    ]
  },
  { 
    id: 'grp_gestion', 
    icon: 'gestion', 
    label: 'Gestion',
    subItems: [
      { id: 'suivi', icon: 'suivi', label: 'Rapport' },
      { id: 'budget', icon: 'budget', label: 'Budget' },
      { id: 'beneficiaires', icon: 'beneficiaires', label: 'Bénéficiaires' },
    ]
  },
  { 
    id: 'grp_config', 
    icon: 'config', 
    label: 'Configuration',
    subItems: [
      { id: 'parametres', icon: 'parametres', label: 'Paramètres' },
    ]
  },
];

// ===================== NAVITEM =====================
const NavItem = ({ id, icon, label, active, collapsed, onClick, hasChildren, isOpen, isSubItem }) => {
  const [hov, setHov] = useState(false);
  const isH = hov && !active;
  
  return (
    <div onClick={() => onClick(id)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={collapsed ? label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: isSubItem ? 10 : 14,
        padding: collapsed ? 0 : (isSubItem ? '0 8px' : '0 12px'), 
        margin: collapsed ? '2px 10px' : (isSubItem ? '2px 0' : '2px 12px'),
        height: isSubItem ? 38 : 44, 
        borderRadius: 12, cursor: 'pointer',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: active ? 'rgba(255,255,255,0.13)' : isH ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'all 0.15s ease', position: 'relative',
      }}>
      <div style={{
        width: isSubItem ? 30 : 38, height: isSubItem ? 30 : 38, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active && !isSubItem ? 'rgba(255,255,255,0.18)' : 'transparent',
        transition: 'all 0.2s ease',
      }}>
        {I[icon]?.(active ? '#fff' : isH ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)', isSubItem ? 16 : 20)}
      </div>
      {!collapsed && (
        <span style={{
          fontSize: isSubItem ? 12.5 : 13.5, fontWeight: active ? 700 : 500,
          color: active ? '#fff' : isH ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color 0.15s',
          flex: 1
        }}>{label}</span>
      )}
      
      {/* Flèche pour les menus dépliants */}
      {hasChildren && !collapsed && (
        <div style={{ display: 'flex', alignItems: 'center', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.25s ease' }}>
          {I.chevron(active ? '#fff' : 'rgba(255,255,255,0.4)', 14)}
        </div>
      )}

      {/* Infobulle barre rétractée */}
      {collapsed && isH && (
        <div style={{
          position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
          marginLeft: 10, padding: '7px 14px', background: '#333', color: '#fff',
          borderRadius: 8, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', pointerEvents: 'none',
        }}>
          {label}
          <div style={{ position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)', width: 8, height: 8, background: '#333' }}/>
        </div>
      )}
    </div>
  );
};

// ===================== SIDEBAR =====================
const Sidebar = () => {
  const { currentPage, setCurrentPage, projet, exerciceActif, user, handleLogout, userProfile } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);
  
  // Par défaut, Opérations et Circuit sont ouverts
  const [openGroups, setOpenGroups] = useState({ grp_operations: true, circuit: true }); 
  
  const w = collapsed ? COLLAPSED : EXPANDED;

  useEffect(() => { document.documentElement.style.setProperty('--sidebar-w', w + 'px'); }, [w]);

  // Clonage profond de menuConfig pour ajouter l'Admin dynamiquement
  const items = JSON.parse(JSON.stringify(menuConfig)); 
  if (userProfile?.role === 'admin') {
    const configGrp = items.find(i => i.id === 'grp_config');
    if(configGrp) configGrp.subItems.push({ id: 'admin', icon: 'admin', label: 'Administration' });
  }

  const handleGroupClick = (id) => {
    if (collapsed) setCollapsed(false); 
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{
      fontFamily: "'Century Gothic', 'Trebuchet MS', sans-serif", // POLICE AJOUTÉE ICI
      width: w, minWidth: w, height: '100vh', position: 'fixed',
      background: `linear-gradient(180deg, ${PRIMARY} 0%, ${PRIMARY_DARK} 100%)`,
      color: '#fff', display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(.4,0,.2,1), min-width 0.25s cubic-bezier(.4,0,.2,1)',
      overflow: 'hidden', zIndex: 10,
    }}>
      
      {/* STYLES INJECTÉS POUR LA BELLE BARRE DE DÉFILEMENT ET L'ANIMATION */}
      <style>{`
        .modern-scroll::-webkit-scrollbar { width: 4px; }
        .modern-scroll::-webkit-scrollbar-track { background: transparent; }
        .modern-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        .modern-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Bouton replier */}
      <button onClick={() => setCollapsed(c => !c)} style={{
        position: 'absolute', top: 28, right: -14, width: 28, height: 28, borderRadius: '50%',
        border: 'none', background: PRIMARY, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }} title={collapsed ? 'Déplier' : 'Replier'}>
        <span style={{ display: 'flex', transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>
          {I.chevron('#fff', 16)}
        </span>
      </button>

      {/* Logo */}
      <div style={{ padding: collapsed ? '18px 0' : '18px 20px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: collapsed ? 'center' : 'flex-start', minHeight: 70 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          <img src={LOGO_PIF2} alt="PIF2" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.5, lineHeight: 1.1 }}>{projet?.sigle || 'PIF 2'}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2, letterSpacing: 0.5 }}>Ordres de Paiement</div>
          </div>
        )}
      </div>

      {/* Menu Principal avec barre de défilement esthétique */}
      <nav className="modern-scroll" style={{ flex: 1, padding: '4px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        {items.map((item, idx) => {
          
          // LA LIGNE SÉPARATRICE ESTHÉTIQUE
          if (item.isDivider) {
            return (
              <div key={'s'+idx} style={{ margin: collapsed ? '15px 0' : '20px 0 10px 0' }}>
                <div style={{ 
                  height: 1, 
                  background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)', 
                  margin: '0 20px' 
                }}/>
              </div>
            );
          }

          // MENU DÉPLIANT (ACCORDÉON)
          if (item.subItems) {
            const isOpen = openGroups[item.id];
            const isActiveGroup = item.subItems.some(sub => sub.id === currentPage);
            
            return (
              <div key={item.id}>
                <NavItem 
                  id={item.id} icon={item.icon} label={item.label} active={isActiveGroup} 
                  collapsed={collapsed} onClick={() => handleGroupClick(item.id)} 
                  hasChildren isOpen={isOpen} 
                />
                {!collapsed && isOpen && (
                  <div style={{ 
                    marginLeft: 30, paddingLeft: 12, borderLeft: '1px solid rgba(255,255,255,0.15)', 
                    marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4, 
                    animation: 'fadeIn 0.2s ease forwards' 
                  }}>
                    {item.subItems.map(sub => (
                      <NavItem 
                        key={sub.id} id={sub.id} icon={sub.icon} label={sub.label} 
                        active={currentPage === sub.id} collapsed={false} 
                        onClick={setCurrentPage} isSubItem 
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return <NavItem key={item.id} id={item.id} icon={item.icon} label={item.label} active={currentPage === item.id} collapsed={collapsed} onClick={setCurrentPage}/>;
        })}
      </nav>

      {/* Exercice */}
      {exerciceActif && (
        <div style={{ padding: collapsed ? '12px 0' : '12px 22px', textAlign: collapsed ? 'center' : 'left' }}>
          {collapsed ? (
            <div style={{ fontSize: 14, fontWeight: 800, color: '#E8B931' }}>{String(exerciceActif.annee).slice(-2)}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E8B931', boxShadow: '0 0 6px rgba(232,185,49,0.4)' }}/>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Exercice</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{exerciceActif.annee}</span>
            </div>
          )}
        </div>
      )}

      {/* User + Déconnexion */}
      <div style={{ padding: collapsed ? '14px 0' : '14px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: collapsed ? 'center' : 'stretch' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
            {(user?.email || 'U')[0].toUpperCase()}
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
            </div>
          )}
        </div>
        {!collapsed ? (
          <button onClick={handleLogout} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.08)', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            {I.logout('rgba(255,255,255,0.5)')} Déconnexion
          </button>
        ) : (
          <button onClick={handleLogout} title="Déconnexion" style={{ width: 38, height: 34, borderRadius: 8, margin: '0 auto', border: 'none', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {I.logout('rgba(255,255,255,0.5)')}
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
