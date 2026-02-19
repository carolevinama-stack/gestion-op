import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ===================== PALETTE PIF2 =====================
const P = {
  bgApp: '#F7F5F2',
  bgCard: '#FFFFFF',
  bgSection: '#EDE9E3',
  sidebarDark: '#155A25',
  olive: '#D4722A',
  olivePale: '#E8F5E9',
  gold: '#E8B931',
  orange: '#E8B931',
  labelMuted: '#888',
  inputBg: '#FFFFFF',
};

// ===================== ICÔNES SVG =====================
const Icons = {
  user: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  fileText: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  dollar: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  check: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  save: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  search: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  wallet: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5" fill={c}/></svg>,
  edit: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  copy: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  printer: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  warning: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  refresh: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  eyeSearch: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  editPen: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  lock: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  eye: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>,
  xCircle: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  clock: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  chevronUp: (c) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  chevronDown: (c) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
};

// ==================== TOAST SYSTEM ====================
const TOAST_STYLES = {
  success: { bg: `linear-gradient(135deg, ${P.olivePale} 0%, ${P.bgCard} 100%)`, iconBg: P.olivePale, iconBorder: `${P.olive}20` },
  error: { bg: `linear-gradient(135deg, #fff5f5 0%, ${P.bgCard} 100%)`, iconBg: '#ffebee', iconBorder: '#C43E3E20' },
  warning: { bg: `linear-gradient(135deg, #fffbf0 0%, ${P.bgCard} 100%)`, iconBg: '#fff3e0', iconBorder: '#ff980020' },
};
const ToastIcon = ({ type }) => {
  if (type === 'success') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === 'error') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C43E3E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5961F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
};
const ToastNotif = ({ toast, onDone }) => {
  const [leaving, setLeaving] = useState(false);
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3500);
    const t2 = setTimeout(onDone, 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div style={{ background: s.bg, borderRadius: 14, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 320, maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)', animation: leaving ? 'toastOut 0.4s ease-in forwards' : 'toastIn 0.35s ease-out' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: s.iconBg, border: `1.5px solid ${s.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ToastIcon type={toast.type} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: P.sidebarDark, marginBottom: 2 }}>{toast.title}</div>
        {toast.message && <div style={{ fontSize: 12, color: P.labelMuted, lineHeight: 1.4 }}>{toast.message}</div>}
      </div>
    </div>
  );
};

// ==================== SECTION TITLE ====================
const SectionTitle = ({ icon, label, accent }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 28, height: 28, borderRadius: 8, background: accent + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    {label}
  </div>
);

// ==================== SOURCE CARD ====================
const SourceCard = ({ source, active, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, borderRadius: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
        transform: hov && !active ? 'translateY(-2px)' : 'none',
        background: active ? source.couleur : P.bgCard,
        border: active ? `2px solid ${source.couleur}` : `2px solid ${hov ? source.couleur + '40' : 'rgba(34,51,0,0.06)'}`,
        boxShadow: active ? `0 8px 24px ${source.couleur}30, 0 2px 8px ${source.couleur}15` : hov ? '0 4px 16px rgba(34,51,0,0.06)' : '0 1px 4px rgba(34,51,0,0.03)',
      }}>
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: active ? 'rgba(255,255,255,0.2)' : source.couleur + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              {Icons.wallet(active ? 'rgba(255,255,255,0.9)' : source.couleur)}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: active ? '#fff' : source.couleur, letterSpacing: -0.5, lineHeight: 1 }}>{source.sigle || source.nom}</div>
              <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.6)' : P.labelMuted, marginTop: 3, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.nom}</div>
            </div>
          </div>
          {active && (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Icons.check('#fff')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== PAGE CONSULTER OP ====================
const statutConfig = {
  EN_COURS: { bg: P.bgSection, color: P.olive, label: 'En cours' },
  TRANSMIS_CF: { bg: P.orange + '15', color: P.orange, label: 'Transmis CF' },
  DIFFERE_CF: { bg: P.gold + '20', color: '#C5961F', label: 'Différé CF' },
  RETOURNE_CF: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Retourné CF' },
  VISE_CF: { bg: P.olivePale, color: '#2e7d32', label: 'Visé CF' },
  REJETE_CF: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté CF' },
  TRANSMIS_AC: { bg: '#C5961F15', color: '#C5961F', label: 'Transmis AC' },
  PAYE: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Payé' },
  REJETE_AC: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté AC' },
  ARCHIVE: { bg: P.bgSection, color: P.labelMuted, label: 'Archivé' },
};
const typeColors = { PROVISOIRE: P.gold, DIRECT: '#3B6B8A', DEFINITIF: '#3B6B8A', ANNULATION: '#C43E3E' };

const PageConsulterOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exerciceActif, exercices, projet, consultOpData, setConsultOpData, setCurrentPage } = useAppContext();
  const [activeSource, setActiveSource] = useState(sources[0]?.id || null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editNumero, setEditNumero] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const dropdownRef = useRef(null);
  const modalInputRef = useRef(null);

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => {
    setToasts(prev => prev.filter(t => t.uid !== uid));
  }, []);

  const askPassword = useCallback((title) => new Promise((resolve) => {
    setShowPwd(false);
    setModal({ type: 'password', title, resolve });
  }), []);
  const askConfirm = useCallback((title, message) => new Promise((resolve) => {
    setModal({ type: 'confirm', title, message, resolve });
  }), []);
  const closeModal = useCallback((result) => {
    if (modal?.resolve) modal.resolve(result);
    setModal(null);
    setShowPwd(false);
  }, [modal]);

  const [form, setForm] = useState({
    type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT',
    objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '',
    montantTVA: '', tvaRecuperable: false, opProvisoireNumero: '', opProvisoireId: '',
    opProvisoireIds: [], opProvisoireManuel: ''
  });

  useEffect(() => {
    if (consultOpData && !consultOpData._duplicate) {
      loadOp(consultOpData);
      if (setConsultOpData) setConsultOpData(null);
    }
  }, [consultOpData]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const opsSource = ops
    .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id)
    .sort((a, b) => (a.numero || '').localeCompare(b.numero || ''));

  const opsFiltered = opsSource.filter(op => {
    if (!searchText.trim()) return true;
    const term = searchText.toLowerCase();
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    return (op.numero || '').toLowerCase().includes(term) ||
      (ben?.nom || '').toLowerCase().includes(term) ||
      (ben?.ncc || '').toLowerCase().includes(term) ||
      (op.objet || '').toLowerCase().includes(term) ||
      String(op.montant || '').includes(term);
  });

  const currentIndex = selectedOp ? opsSource.findIndex(op => op.id === selectedOp.id) : -1;

  const goToPrev = () => {
    if (currentIndex > 0) loadOp(opsSource[currentIndex - 1]);
    else if (opsSource.length > 0) loadOp(opsSource[opsSource.length - 1]);
  };
  const goToNext = () => {
    if (currentIndex < opsSource.length - 1) loadOp(opsSource[currentIndex + 1]);
    else if (opsSource.length > 0) loadOp(opsSource[0]);
  };

  const loadOp = (op) => {
    if (!op) return;
    setSelectedOp(op);
    setIsEditMode(false);
    setEditNumero(null);
    setSearchText(op.numero || '');
    setShowDropdown(false);
    if (op.sourceId) setActiveSource(op.sourceId);
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ribs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
    const ribIndex = ribs.findIndex(r => r.numero === (typeof op.rib === 'object' ? op.rib?.numero : op.rib)) || 0;
    setForm({
      type: op.type || 'PROVISOIRE', beneficiaireId: op.beneficiaireId || '',
      ribIndex: ribIndex >= 0 ? ribIndex : 0, modeReglement: op.modeReglement || 'VIREMENT',
      objet: op.objet || '', piecesJustificatives: op.piecesJustificatives || '',
      montant: String(op.montant || ''), ligneBudgetaire: op.ligneBudgetaire || '',
      montantTVA: String(op.montantTVA || ''), tvaRecuperable: op.tvaRecuperable || false,
      opProvisoireNumero: op.opProvisoireNumero || '', opProvisoireId: op.opProvisoireId || '',
      opProvisoireIds: op.opProvisoireIds || [], opProvisoireManuel: ''
    });
  };

  const currentSourceObj = sources.find(s => s.id === activeSource);
  const accent = currentSourceObj?.couleur || P.olive;
  const selectedBeneficiaire = beneficiaires.find(b => b.id === form.beneficiaireId);
  const getBeneficiaireRibs = (ben) => {
    if (!ben) return [];
    if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
    if (ben.rib) return [{ banque: '', numero: ben.rib }];
    return [];
  };
  const beneficiaireRibs = getBeneficiaireRibs(selectedBeneficiaire);
  const selectedRib = beneficiaireRibs[form.ribIndex] || beneficiaireRibs[0] || null;

  const currentBudget = budgets
    .filter(b => b.sourceId === activeSource && b.exerciceId === exerciceActif?.id)
    .sort((a, b) => (b.version || 1) - (a.version || 1))[0];
  const selectedLigne = currentBudget?.lignes?.find(l => l.code === form.ligneBudgetaire);

  const getDotation = () => selectedLigne?.dotation || 0;
  
  // ===================== CALCUL DES ENGAGEMENTS (LOGIQUE SIMPLIFIÉE) =====================
  const getEngagementsAnterieurs = () => {
    if (!form.ligneBudgetaire || !selectedOp) return 0;
    
    // 1. Filtrer par source et exercice, trier par date
    const allOps = ops
      .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      
    let cumul = 0;
    
    for (const op of allOps) {
      // 2. On s'arrête AVANT l'OP actuel
      if (op.id === selectedOp.id) break;
      
      // 3. Si même ligne budgétaire, on additionne le montant (qu'il soit positif ou négatif)
      if (op.ligneBudgetaire === form.ligneBudgetaire) {
        cumul += (parseFloat(op.montant) || 0);
      }
    }
    return cumul;
  };

  const getEngagementActuel = () => {
    // On retourne simplement le montant du formulaire
    // Si c'est une annulation ou un rejet enregistré, le montant est déjà négatif
    const montant = parseFloat(form.montant) || 0;
    return montant;
  };

  const getEngagementsCumules = () => getEngagementsAnterieurs() + getEngagementActuel();
  const getDisponible = () => getDotation() - getEngagementsCumules();
  // ====================================================================================

  const opProvisoiresAnnulation = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' && op.beneficiaireId === form.beneficiaireId &&
    op.sourceId === activeSource &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'ANNULATION')
  ) : [];
  const opProvisoiresDefinitif = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' && op.beneficiaireId === form.beneficiaireId &&
    op.sourceId === activeSource &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => (o.opProvisoireId === op.id || (o.opProvisoireIds || []).includes(op.id)) && o.type === 'DEFINITIF')
  ) : [];
  const opProvisoiresDisponibles = form.type === 'ANNULATION' ? opProvisoiresAnnulation : opProvisoiresDefinitif;

  const getOpProvLabel = (op) => {
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ex = exercices?.find(e => e.id === op.exerciceId);
    const isExtra = op.importAnterieur ? ' [Extra]' : '';
    const isAutreEx = (exerciceActif && op.exerciceId !== exerciceActif.id && ex) ? ` (${ex.annee})` : '';
    return `${op.numero}${isExtra}${isAutreEx} - ${ben?.nom || 'N/A'} - ${formatMontant(op.montant)} F`;
  };

  const handleSelectOpProvisoire = (opId) => {
    if (!opId) { setForm({ ...form, opProvisoireId: '', opProvisoireNumero: '', opProvisoireManuel: '' }); return; }
    const op = ops.find(o => o.id === opId);
    if (op) {
      setForm({
        ...form, opProvisoireId: opId, opProvisoireNumero: op.numero,
        beneficiaireId: op.beneficiaireId, ligneBudgetaire: op.ligneBudgetaire, objet: op.objet,
        montant: form.type === 'ANNULATION' ? String(op.montant) : form.montant,
        modeReglement: op.modeReglement || 'VIREMENT', opProvisoireManuel: ''
      });
    }
  };

  // Multi-select pour DEFINITIF
  const handleSelectOpProvisoiresMulti = (opId, checked) => {
    const currentIds = form.opProvisoireIds || [];
    const newIds = checked ? [...currentIds, opId] : currentIds.filter(id => id !== opId);
    const selectedOps2 = newIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const numeros = selectedOps2.map(o => o.numero).join(', ');
    const libelles = [...new Set(selectedOps2.map(o => o.objet).filter(Boolean))].join(' / ');
    const updates = { ...form, opProvisoireIds: newIds, opProvisoireId: newIds[0] || '', opProvisoireManuel: '' };
    if (newIds.length > 0) {
      updates.objet = `Régularisation OP ${numeros} - ${libelles}`;
    }
    if (selectedOps2.length === 1) {
      updates.beneficiaireId = selectedOps2[0].beneficiaireId;
      updates.ligneBudgetaire = selectedOps2[0].ligneBudgetaire;
      updates.modeReglement = selectedOps2[0].modeReglement || 'VIREMENT';
    }
    setForm(updates);
  };

  const statutInfo = selectedOp ? (statutConfig[selectedOp.statut] || { bg: P.bgApp, color: P.labelMuted, label: selectedOp.statut || '' }) : null;

  // === ACTIONS ===
  const handleModifier = async () => {
    const pwd = await askPassword('Mot de passe requis pour modifier');
    if (pwd === null) return;
    if (pwd === (projet?.motDePasseAdmin || 'admin123')) {
      setIsEditMode(true);
    } else {
      showToast('error', 'Mot de passe incorrect');
    }
  };

  const handleEnregistrerModif = async () => {
    try {
      if (!selectedOp?.id) return;
      const ben = beneficiaires.find(b => b.id === form.beneficiaireId);
      const benRibs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
      const ribSel = benRibs[form.ribIndex || 0];
      const newMontant = parseFloat(form.montant) || selectedOp.montant;
      if (newMontant !== selectedOp.montant) {
        const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id);
        if (opsSuivants.length > 0) {
          const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
          const diff = newMontant - selectedOp.montant;
          const ok = await askConfirm('Impact montant', `Modification de ${diff > 0 ? '+' : ''}${formatMontant(diff)} F impactera : ${numeros}`);
          if (!ok) return;
        }
      }
      // Construire les champs OP provisoire selon le type
      let opProvFields = {};
      if (form.type === 'ANNULATION') {
        opProvFields.opProvisoireId = form.opProvisoireId || null;
        opProvFields.opProvisoireNumero = form.opProvisoireId
          ? form.opProvisoireNumero
          : form.opProvisoireManuel.trim() || null;
        opProvFields.opProvisoireIds = null;
        opProvFields.opProvisoireNumeros = null;
      } else if (form.type === 'DEFINITIF') {
        const ids = form.opProvisoireIds || [];
        const numeros = ids.map(id => ops.find(o => o.id === id)?.numero || '').filter(Boolean);
        opProvFields.opProvisoireId = ids[0] || form.opProvisoireId || null;
        opProvFields.opProvisoireIds = ids.length > 0 ? ids : null;
        opProvFields.opProvisoireNumero = ids.length > 0
          ? numeros.join(', ')
          : form.opProvisoireManuel.trim() || form.opProvisoireNumero || null;
        opProvFields.opProvisoireNumeros = numeros.length > 0 ? numeros : null;
      } else {
        opProvFields.opProvisoireId = null;
        opProvFields.opProvisoireNumero = null;
        opProvFields.opProvisoireIds = null;
        opProvFields.opProvisoireNumeros = null;
      }

      const updates = {
        type: form.type, beneficiaireId: form.beneficiaireId, modeReglement: form.modeReglement,
        rib: form.modeReglement === 'VIREMENT' ? (ribSel?.numero || '') : '',
        banque: form.modeReglement === 'VIREMENT' ? (ribSel?.banque || '') : '',
        objet: form.objet, piecesJustificatives: form.piecesJustificatives,
        montant: newMontant, ligneBudgetaire: form.ligneBudgetaire,
        tvaRecuperable: form.tvaRecuperable || false,
        montantTVA: form.tvaRecuperable ? (parseFloat(form.montantTVA) || 0) : 0,
        ...opProvFields,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'ops', selectedOp.id), updates);
      const updatedOp = { ...selectedOp, ...updates };
      setOps(ops.map(o => o.id === selectedOp.id ? updatedOp : o));
      setSelectedOp(updatedOp);
      setIsEditMode(false);
      showToast('success', 'OP modifié avec succès', selectedOp.numero);
    } catch (error) {
      showToast('error', 'Erreur', error.message);
    }
  };

  const handleSupprimer = async () => {
    if (!selectedOp) return;
    const pwd = await askPassword('Mot de passe requis pour supprimer');
    if (pwd === null) return;
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      showToast('error', 'Mot de passe incorrect');
      return;
    }
    const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id);
    let confirmTitle = 'Confirmer la suppression';
    let confirmMsg = `Supprimer l'OP ${selectedOp.numero} ?`;
    if (opsSuivants.length > 0) {
      const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
      confirmTitle = 'Impact sur d\'autres OP';
      confirmMsg = `La suppression impactera : ${numeros}`;
    }
    const ok = await askConfirm(confirmTitle, confirmMsg);
    if (ok) {
      try {
        await deleteDoc(doc(db, 'ops', selectedOp.id));
        setOps(ops.filter(o => o.id !== selectedOp.id));
        showToast('success', 'OP supprimé', selectedOp.numero);
        setSelectedOp(null);
        setSearchText('');
      } catch (error) {
        showToast('error', 'Erreur', error.message);
      }
    }
  };

  const handleDupliquer = () => {
    if (!selectedOp) return;
    setConsultOpData({ ...selectedOp, _duplicate: true });
    setCurrentPage('nouvelOp');
  };

  const handleimport React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ===================== PALETTE PIF2 =====================
const P = {
  bgApp: '#F7F5F2',
  bgCard: '#FFFFFF',
  bgSection: '#EDE9E3',
  sidebarDark: '#155A25',
  olive: '#D4722A',
  olivePale: '#E8F5E9',
  gold: '#E8B931',
  orange: '#E8B931',
  labelMuted: '#888',
  inputBg: '#FFFFFF',
};

// ===================== ICÔNES SVG =====================
const Icons = {
  user: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  fileText: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  dollar: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  check: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  save: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  search: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  wallet: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5" fill={c}/></svg>,
  edit: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  copy: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  printer: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  warning: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  refresh: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  eyeSearch: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  editPen: (c) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  lock: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  eye: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: (c) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>,
  xCircle: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  clock: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  chevronUp: (c) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  chevronDown: (c) => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
};

// ==================== TOAST SYSTEM ====================
const TOAST_STYLES = {
  success: { bg: `linear-gradient(135deg, ${P.olivePale} 0%, ${P.bgCard} 100%)`, iconBg: P.olivePale, iconBorder: `${P.olive}20` },
  error: { bg: `linear-gradient(135deg, #fff5f5 0%, ${P.bgCard} 100%)`, iconBg: '#ffebee', iconBorder: '#C43E3E20' },
  warning: { bg: `linear-gradient(135deg, #fffbf0 0%, ${P.bgCard} 100%)`, iconBg: '#fff3e0', iconBorder: '#ff980020' },
};
const ToastIcon = ({ type }) => {
  if (type === 'success') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === 'error') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C43E3E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C5961F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
};
const ToastNotif = ({ toast, onDone }) => {
  const [leaving, setLeaving] = useState(false);
  const s = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3500);
    const t2 = setTimeout(onDone, 3900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div style={{ background: s.bg, borderRadius: 14, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14, minWidth: 320, maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)', animation: leaving ? 'toastOut 0.4s ease-in forwards' : 'toastIn 0.35s ease-out' }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: s.iconBg, border: `1.5px solid ${s.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ToastIcon type={toast.type} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: P.sidebarDark, marginBottom: 2 }}>{toast.title}</div>
        {toast.message && <div style={{ fontSize: 12, color: P.labelMuted, lineHeight: 1.4 }}>{toast.message}</div>}
      </div>
    </div>
  );
};

// ==================== SECTION TITLE ====================
const SectionTitle = ({ icon, label, accent }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: accent, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 28, height: 28, borderRadius: 8, background: accent + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    {label}
  </div>
);

// ==================== SOURCE CARD ====================
const SourceCard = ({ source, active, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, borderRadius: 16, cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
        transform: hov && !active ? 'translateY(-2px)' : 'none',
        background: active ? source.couleur : P.bgCard,
        border: active ? `2px solid ${source.couleur}` : `2px solid ${hov ? source.couleur + '40' : 'rgba(34,51,0,0.06)'}`,
        boxShadow: active ? `0 8px 24px ${source.couleur}30, 0 2px 8px ${source.couleur}15` : hov ? '0 4px 16px rgba(34,51,0,0.06)' : '0 1px 4px rgba(34,51,0,0.03)',
      }}>
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: active ? 'rgba(255,255,255,0.2)' : source.couleur + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              {Icons.wallet(active ? 'rgba(255,255,255,0.9)' : source.couleur)}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: active ? '#fff' : source.couleur, letterSpacing: -0.5, lineHeight: 1 }}>{source.sigle || source.nom}</div>
              <div style={{ fontSize: 10, color: active ? 'rgba(255,255,255,0.6)' : P.labelMuted, marginTop: 3, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.nom}</div>
            </div>
          </div>
          {active && (
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Icons.check('#fff')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== PAGE CONSULTER OP ====================
const statutConfig = {
  EN_COURS: { bg: P.bgSection, color: P.olive, label: 'En cours' },
  TRANSMIS_CF: { bg: P.orange + '15', color: P.orange, label: 'Transmis CF' },
  DIFFERE_CF: { bg: P.gold + '20', color: '#C5961F', label: 'Différé CF' },
  RETOURNE_CF: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Retourné CF' },
  VISE_CF: { bg: P.olivePale, color: '#2e7d32', label: 'Visé CF' },
  REJETE_CF: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté CF' },
  TRANSMIS_AC: { bg: '#C5961F15', color: '#C5961F', label: 'Transmis AC' },
  PAYE: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Payé' },
  REJETE_AC: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté AC' },
  ARCHIVE: { bg: P.bgSection, color: P.labelMuted, label: 'Archivé' },
};
const typeColors = { PROVISOIRE: P.gold, DIRECT: '#3B6B8A', DEFINITIF: '#3B6B8A', ANNULATION: '#C43E3E' };

const PageConsulterOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exerciceActif, exercices, projet, consultOpData, setConsultOpData, setCurrentPage } = useAppContext();
  const [activeSource, setActiveSource] = useState(sources[0]?.id || null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [editNumero, setEditNumero] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const dropdownRef = useRef(null);
  const modalInputRef = useRef(null);

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => {
    setToasts(prev => prev.filter(t => t.uid !== uid));
  }, []);

  const askPassword = useCallback((title) => new Promise((resolve) => {
    setShowPwd(false);
    setModal({ type: 'password', title, resolve });
  }), []);
  const askConfirm = useCallback((title, message) => new Promise((resolve) => {
    setModal({ type: 'confirm', title, message, resolve });
  }), []);
  const closeModal = useCallback((result) => {
    if (modal?.resolve) modal.resolve(result);
    setModal(null);
    setShowPwd(false);
  }, [modal]);

  const [form, setForm] = useState({
    type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT',
    objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '',
    montantTVA: '', tvaRecuperable: false, opProvisoireNumero: '', opProvisoireId: '',
    opProvisoireIds: [], opProvisoireManuel: ''
  });

  useEffect(() => {
    if (consultOpData && !consultOpData._duplicate) {
      loadOp(consultOpData);
      if (setConsultOpData) setConsultOpData(null);
    }
  }, [consultOpData]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const opsSource = ops
    .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id)
    .sort((a, b) => (a.numero || '').localeCompare(b.numero || ''));

  const opsFiltered = opsSource.filter(op => {
    if (!searchText.trim()) return true;
    const term = searchText.toLowerCase();
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    return (op.numero || '').toLowerCase().includes(term) ||
      (ben?.nom || '').toLowerCase().includes(term) ||
      (ben?.ncc || '').toLowerCase().includes(term) ||
      (op.objet || '').toLowerCase().includes(term) ||
      String(op.montant || '').includes(term);
  });

  const currentIndex = selectedOp ? opsSource.findIndex(op => op.id === selectedOp.id) : -1;

  const goToPrev = () => {
    if (currentIndex > 0) loadOp(opsSource[currentIndex - 1]);
    else if (opsSource.length > 0) loadOp(opsSource[opsSource.length - 1]);
  };
  const goToNext = () => {
    if (currentIndex < opsSource.length - 1) loadOp(opsSource[currentIndex + 1]);
    else if (opsSource.length > 0) loadOp(opsSource[0]);
  };

  const loadOp = (op) => {
    if (!op) return;
    setSelectedOp(op);
    setIsEditMode(false);
    setEditNumero(null);
    setSearchText(op.numero || '');
    setShowDropdown(false);
    if (op.sourceId) setActiveSource(op.sourceId);
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ribs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
    const ribIndex = ribs.findIndex(r => r.numero === (typeof op.rib === 'object' ? op.rib?.numero : op.rib)) || 0;
    setForm({
      type: op.type || 'PROVISOIRE', beneficiaireId: op.beneficiaireId || '',
      ribIndex: ribIndex >= 0 ? ribIndex : 0, modeReglement: op.modeReglement || 'VIREMENT',
      objet: op.objet || '', piecesJustificatives: op.piecesJustificatives || '',
      montant: String(op.montant || ''), ligneBudgetaire: op.ligneBudgetaire || '',
      montantTVA: String(op.montantTVA || ''), tvaRecuperable: op.tvaRecuperable || false,
      opProvisoireNumero: op.opProvisoireNumero || '', opProvisoireId: op.opProvisoireId || '',
      opProvisoireIds: op.opProvisoireIds || [], opProvisoireManuel: ''
    });
  };

  const currentSourceObj = sources.find(s => s.id === activeSource);
  const accent = currentSourceObj?.couleur || P.olive;
  const selectedBeneficiaire = beneficiaires.find(b => b.id === form.beneficiaireId);
  const getBeneficiaireRibs = (ben) => {
    if (!ben) return [];
    if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
    if (ben.rib) return [{ banque: '', numero: ben.rib }];
    return [];
  };
  const beneficiaireRibs = getBeneficiaireRibs(selectedBeneficiaire);
  const selectedRib = beneficiaireRibs[form.ribIndex] || beneficiaireRibs[0] || null;

  const currentBudget = budgets
    .filter(b => b.sourceId === activeSource && b.exerciceId === exerciceActif?.id)
    .sort((a, b) => (b.version || 1) - (a.version || 1))[0];
  const selectedLigne = currentBudget?.lignes?.find(l => l.code === form.ligneBudgetaire);

  const getDotation = () => selectedLigne?.dotation || 0;
  
  // ===================== CALCUL DES ENGAGEMENTS (LOGIQUE SIMPLIFIÉE) =====================
  const getEngagementsAnterieurs = () => {
    if (!form.ligneBudgetaire || !selectedOp) return 0;
    
    // 1. Filtrer par source et exercice, trier par date
    const allOps = ops
      .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      
    let cumul = 0;
    
    for (const op of allOps) {
      // 2. On s'arrête AVANT l'OP actuel
      if (op.id === selectedOp.id) break;
      
      // 3. Si même ligne budgétaire, on additionne le montant (qu'il soit positif ou négatif)
      if (op.ligneBudgetaire === form.ligneBudgetaire) {
        cumul += (parseFloat(op.montant) || 0);
      }
    }
    return cumul;
  };

  const getEngagementActuel = () => {
    // On retourne simplement le montant du formulaire
    // Si c'est une annulation ou un rejet enregistré, le montant est déjà négatif
    const montant = parseFloat(form.montant) || 0;
    return montant;
  };

  const getEngagementsCumules = () => getEngagementsAnterieurs() + getEngagementActuel();
  const getDisponible = () => getDotation() - getEngagementsCumules();
  // ====================================================================================

  const opProvisoiresAnnulation = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' && op.beneficiaireId === form.beneficiaireId &&
    op.sourceId === activeSource &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'ANNULATION')
  ) : [];
  const opProvisoiresDefinitif = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' && op.beneficiaireId === form.beneficiaireId &&
    op.sourceId === activeSource &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => (o.opProvisoireId === op.id || (o.opProvisoireIds || []).includes(op.id)) && o.type === 'DEFINITIF')
  ) : [];
  const opProvisoiresDisponibles = form.type === 'ANNULATION' ? opProvisoiresAnnulation : opProvisoiresDefinitif;

  const getOpProvLabel = (op) => {
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ex = exercices?.find(e => e.id === op.exerciceId);
    const isExtra = op.importAnterieur ? ' [Extra]' : '';
    const isAutreEx = (exerciceActif && op.exerciceId !== exerciceActif.id && ex) ? ` (${ex.annee})` : '';
    return `${op.numero}${isExtra}${isAutreEx} - ${ben?.nom || 'N/A'} - ${formatMontant(op.montant)} F`;
  };

  const handleSelectOpProvisoire = (opId) => {
    if (!opId) { setForm({ ...form, opProvisoireId: '', opProvisoireNumero: '', opProvisoireManuel: '' }); return; }
    const op = ops.find(o => o.id === opId);
    if (op) {
      setForm({
        ...form, opProvisoireId: opId, opProvisoireNumero: op.numero,
        beneficiaireId: op.beneficiaireId, ligneBudgetaire: op.ligneBudgetaire, objet: op.objet,
        montant: form.type === 'ANNULATION' ? String(op.montant) : form.montant,
        modeReglement: op.modeReglement || 'VIREMENT', opProvisoireManuel: ''
      });
    }
  };

  // Multi-select pour DEFINITIF
  const handleSelectOpProvisoiresMulti = (opId, checked) => {
    const currentIds = form.opProvisoireIds || [];
    const newIds = checked ? [...currentIds, opId] : currentIds.filter(id => id !== opId);
    const selectedOps2 = newIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const numeros = selectedOps2.map(o => o.numero).join(', ');
    const libelles = [...new Set(selectedOps2.map(o => o.objet).filter(Boolean))].join(' / ');
    const updates = { ...form, opProvisoireIds: newIds, opProvisoireId: newIds[0] || '', opProvisoireManuel: '' };
    if (newIds.length > 0) {
      updates.objet = `Régularisation OP ${numeros} - ${libelles}`;
    }
    if (selectedOps2.length === 1) {
      updates.beneficiaireId = selectedOps2[0].beneficiaireId;
      updates.ligneBudgetaire = selectedOps2[0].ligneBudgetaire;
      updates.modeReglement = selectedOps2[0].modeReglement || 'VIREMENT';
    }
    setForm(updates);
  };

  const statutInfo = selectedOp ? (statutConfig[selectedOp.statut] || { bg: P.bgApp, color: P.labelMuted, label: selectedOp.statut || '' }) : null;

  // === ACTIONS ===
  const handleModifier = async () => {
    const pwd = await askPassword('Mot de passe requis pour modifier');
    if (pwd === null) return;
    if (pwd === (projet?.motDePasseAdmin || 'admin123')) {
      setIsEditMode(true);
    } else {
      showToast('error', 'Mot de passe incorrect');
    }
  };

  const handleEnregistrerModif = async () => {
    try {
      if (!selectedOp?.id) return;
      const ben = beneficiaires.find(b => b.id === form.beneficiaireId);
      const benRibs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
      const ribSel = benRibs[form.ribIndex || 0];
      const newMontant = parseFloat(form.montant) || selectedOp.montant;
      if (newMontant !== selectedOp.montant) {
        const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id);
        if (opsSuivants.length > 0) {
          const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
          const diff = newMontant - selectedOp.montant;
          const ok = await askConfirm('Impact montant', `Modification de ${diff > 0 ? '+' : ''}${formatMontant(diff)} F impactera : ${numeros}`);
          if (!ok) return;
        }
      }
      // Construire les champs OP provisoire selon le type
      let opProvFields = {};
      if (form.type === 'ANNULATION') {
        opProvFields.opProvisoireId = form.opProvisoireId || null;
        opProvFields.opProvisoireNumero = form.opProvisoireId
          ? form.opProvisoireNumero
          : form.opProvisoireManuel.trim() || null;
        opProvFields.opProvisoireIds = null;
        opProvFields.opProvisoireNumeros = null;
      } else if (form.type === 'DEFINITIF') {
        const ids = form.opProvisoireIds || [];
        const numeros = ids.map(id => ops.find(o => o.id === id)?.numero || '').filter(Boolean);
        opProvFields.opProvisoireId = ids[0] || form.opProvisoireId || null;
        opProvFields.opProvisoireIds = ids.length > 0 ? ids : null;
        opProvFields.opProvisoireNumero = ids.length > 0
          ? numeros.join(', ')
          : form.opProvisoireManuel.trim() || form.opProvisoireNumero || null;
        opProvFields.opProvisoireNumeros = numeros.length > 0 ? numeros : null;
      } else {
        opProvFields.opProvisoireId = null;
        opProvFields.opProvisoireNumero = null;
        opProvFields.opProvisoireIds = null;
        opProvFields.opProvisoireNumeros = null;
      }

      const updates = {
        type: form.type, beneficiaireId: form.beneficiaireId, modeReglement: form.modeReglement,
        rib: form.modeReglement === 'VIREMENT' ? (ribSel?.numero || '') : '',
        banque: form.modeReglement === 'VIREMENT' ? (ribSel?.banque || '') : '',
        objet: form.objet, piecesJustificatives: form.piecesJustificatives,
        montant: newMontant, ligneBudgetaire: form.ligneBudgetaire,
        tvaRecuperable: form.tvaRecuperable || false,
        montantTVA: form.tvaRecuperable ? (parseFloat(form.montantTVA) || 0) : 0,
        ...opProvFields,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'ops', selectedOp.id), updates);
      const updatedOp = { ...selectedOp, ...updates };
      setOps(ops.map(o => o.id === selectedOp.id ? updatedOp : o));
      setSelectedOp(updatedOp);
      setIsEditMode(false);
      showToast('success', 'OP modifié avec succès', selectedOp.numero);
    } catch (error) {
      showToast('error', 'Erreur', error.message);
    }
  };

  const handleSupprimer = async () => {
    if (!selectedOp) return;
    const pwd = await askPassword('Mot de passe requis pour supprimer');
    if (pwd === null) return;
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      showToast('error', 'Mot de passe incorrect');
      return;
    }
    const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id);
    let confirmTitle = 'Confirmer la suppression';
    let confirmMsg = `Supprimer l'OP ${selectedOp.numero} ?`;
    if (opsSuivants.length > 0) {
      const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
      confirmTitle = 'Impact sur d\'autres OP';
      confirmMsg = `La suppression impactera : ${numeros}`;
    }
    const ok = await askConfirm(confirmTitle, confirmMsg);
    if (ok) {
      try {
        await deleteDoc(doc(db, 'ops', selectedOp.id));
        setOps(ops.filter(o => o.id !== selectedOp.id));
        showToast('success', 'OP supprimé', selectedOp.numero);
        setSelectedOp(null);
        setSearchText('');
      } catch (error) {
        showToast('error', 'Erreur', error.message);
      }
    }
  };

  const handleDupliquer = () => {
    if (!selectedOp) return;
    setConsultOpData({ ...selectedOp, _duplicate: true });
    setCurrentPage('nouvelOp');
  };

  const handle
