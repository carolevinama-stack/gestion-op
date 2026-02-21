import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore'; 
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
  textBlack: '#000000' // Noir pur appliqué
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
  PAYE_PARTIEL: { bg: P.gold + '20', color: '#C5961F', label: 'Payé Partiel' },
  PAYE: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Payé' },
  REJETE_AC: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté AC' },
  ARCHIVE: { bg: P.bgSection, color: P.labelMuted, label: 'Archivé' },
  SUPPRIME: { bg: '#C43E3E15', color: '#C43E3E', label: 'Supprimé' },
  ANNULE: { bg: '#C43E3E15', color: '#C43E3E', label: 'Annulé' }
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
    .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id && op.statut !== 'SUPPRIME')
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
  
  // ===================== CALCUL DES ENGAGEMENTS =====================
  const getEngagementsAnterieurs = () => {
    if (!form.ligneBudgetaire || !selectedOp) return 0;
    const allOps = ops
      .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id && op.statut !== 'SUPPRIME')
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    let cumul = 0;
    for (const op of allOps) {
      if (op.id === selectedOp.id) break;
      if (op.ligneBudgetaire === form.ligneBudgetaire) {
        cumul += (parseFloat(op.montant) || 0);
      }
    }
    return cumul;
  };

  const getEngagementActuel = () => {
    const montant = parseFloat(form.montant) || 0;
    return montant;
  };

  const getEngagementsCumules = () => getEngagementsAnterieurs() + getEngagementActuel();
  const getDisponible = () => getDotation() - getEngagementsCumules();

  const opProvisoiresAnnulation = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' && op.beneficiaireId === form.beneficiaireId &&
    op.sourceId === activeSource &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE', 'SUPPRIME'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'ANNULATION' && o.statut !== 'SUPPRIME')
  ) : [];
  const opProvisoiresDefinitif = form.beneficiaireId ? ops.filter(op =>
    op.type === 'PROVISOIRE' && op.beneficiaireId === form.beneficiaireId &&
    op.sourceId === activeSource &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE', 'SUPPRIME'].includes(op.statut) &&
    !ops.find(o => (o.opProvisoireId === op.id || (o.opProvisoireIds || []).includes(op.id)) && o.type === 'DEFINITIF' && o.statut !== 'SUPPRIME')
  ) : [];

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

  const handleSelectOpProvisoiresMulti = (opId, checked) => {
    const currentIds = form.opProvisoireIds || [];
    const newIds = checked ? [...currentIds, opId] : currentIds.filter(id => id !== opId);
    const selectedOps2 = newIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const numeros = selectedOps2.map(o => o.numero).join(', ');
    const updates = { ...form, opProvisoireIds: newIds, opProvisoireId: newIds[0] || '', opProvisoireManuel: '' };
    if (newIds.length > 0) {
      updates.objet = `Régularisation OP ${numeros} - ...`;
    }
    if (selectedOps2.length === 1) {
      updates.beneficiaireId = selectedOps2[0].beneficiaireId;
      updates.ligneBudgetaire = selectedOps2[0].ligneBudgetaire;
      updates.modeReglement = selectedOps2[0].modeReglement || 'VIREMENT';
    }
    setForm(updates);
  };

  const statutInfo = selectedOp ? (statutConfig[selectedOp.statut] || { bg: P.bgApp, color: P.labelMuted, label: selectedOp.statut || '' }) : null;

  // VERROU DE SÉCURITÉ ET DE CONTRÔLE INTERNE : 
  // Bloqué dès que le CF a visé (il faut annuler le visa dans les bordereaux pour pouvoir modifier)
  const isLockedForEdit = selectedOp && ['VISE_CF', 'TRANSMIS_AC', 'PAYE_PARTIEL', 'PAYE', 'ARCHIVE'].includes(selectedOp.statut);

  // === ACTIONS ===
  const handleModifier = async () => {
    if (isLockedForEdit) {
      showToast('error', 'Action bloquée', "L'OP a déjà été visé par le CF, transmis à l'Agent Comptable ou payé. La modification directe est verrouillée. Veuillez annuler l'étape dans la gestion des bordereaux.");
      return;
    }
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
        const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id && o.statut !== 'SUPPRIME');
        if (opsSuivants.length > 0) {
          const ok = await askConfirm('Impact montant', 'Modification impactera les cumuls suivants.');
          if (!ok) return;
        }
      }
      let opProvFields = {};
      if (form.type === 'ANNULATION') {
        opProvFields.opProvisoireId = form.opProvisoireId || null;
        opProvFields.opProvisoireNumero = form.opProvisoireId ? form.opProvisoireNumero : form.opProvisoireManuel.trim() || null;
        opProvFields.opProvisoireIds = null;
      } else if (form.type === 'DEFINITIF') {
        const ids = form.opProvisoireIds || [];
        opProvFields.opProvisoireId = ids[0] || form.opProvisoireId || null;
        opProvFields.opProvisoireIds = ids.length > 0 ? ids : null;
      } else {
        opProvFields.opProvisoireId = null;
        opProvFields.opProvisoireIds = null;
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
    if (['TRANSMIS_AC', 'PAYE_PARTIEL', 'PAYE', 'ARCHIVE'].includes(selectedOp.statut)) {
      showToast('error', 'Action bloquée', "Impossible de supprimer un OP déjà transmis à l'Agent Comptable ou payé.");
      return;
    }
    const pwd = await askPassword('Mot de passe requis pour supprimer (Corbeille)');
    if (pwd === null) return;
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      showToast('error', 'Mot de passe incorrect');
      return;
    }
    const ok = await askConfirm('Confirmer la mise à la corbeille', `Mettre l'OP ${selectedOp.numero} à la corbeille ? Son budget sera libéré.`);
    if (ok) {
      try {
        const updates = {
          statut: 'SUPPRIME',
          dateSuppression: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'ops', selectedOp.id), updates);
        setOps(ops.map(o => o.id === selectedOp.id ? { ...o, ...updates } : o));
        showToast('success', 'OP mis à la corbeille', selectedOp.numero);
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

  const handleStartEditNumero = async () => {
    const pwd = await askPassword('Mot de passe admin requis');
    if (pwd === null) return;
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      showToast('error', 'Mot de passe incorrect');
      return;
    }
    setEditNumero(selectedOp.numero || '');
  };

  const handleSaveNumero = async () => {
    if (!selectedOp || editNumero === null) return;
    const newNum = editNumero.trim();
    if (!newNum) { showToast('error', 'Numéro vide', 'Le numéro ne peut pas être vide'); return; }
    if (newNum === selectedOp.numero) { setEditNumero(null); return; }
    try {
      await updateDoc(doc(db, 'ops', selectedOp.id), { numero: newNum, updatedAt: new Date().toISOString() });
      setOps(prev => prev.map(o => o.id === selectedOp.id ? { ...o, numero: newNum } : o));
      setSelectedOp(prev => ({ ...prev, numero: newNum }));
      setEditNumero(null);
      showToast('success', 'Numéro modifié', newNum);
    } catch (e) { showToast('error', 'Erreur', e.message); }
  };

  const handlePrint = () => {
    if (!selectedOp) return;
    const ben = selectedBeneficiaire;
    const src = currentSourceObj;
    const engAnterieurs = getEngagementsAnterieurs();
    const engActuel = getEngagementActuel();
    const engCumules = engAnterieurs + engActuel;
    const disponible = getDotation() - engCumules;
    const fmtSigne = (val) => val < 0 ? ('-' + formatMontant(Math.abs(val))) : formatMontant(val);
    const printMontantTotal = fmtSigne(engActuel);
    const printEngActuel = fmtSigne(engActuel);
    const printEngCumules = fmtSigne(engCumules);
    const printDisponible = fmtSigne(disponible);
    const isBailleur = src?.sigle?.includes('IDA') || src?.sigle?.includes('BAD') || src?.sigle?.includes('UE');
    const isTresor = src?.sigle?.includes('BN') || src?.sigle?.includes('TRESOR') || src?.sigle?.includes('ETAT');
    const codeImputationComplet = (src?.codeImputation || '') + ' ' + (selectedOp.ligneBudgetaire || '');
    const ribDisplay = selectedRib ? (typeof selectedRib === 'object' ? selectedRib.numero : selectedRib) : '';
    const banqueDisplay = selectedRib && typeof selectedRib === 'object' ? selectedRib.banque : '';

    const htmlParts = [
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OP ' + selectedOp.numero + '</title>',
      '<style>',
      '@page{size:A4;margin:10mm}@media print{.toolbar{display:none!important}body{background:#fff!important;padding:0!important}.page-container{box-shadow:none!important;margin:0!important;width:100%!important}}',
      '*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Century Gothic","Trebuchet MS",sans-serif;font-size:11px;line-height:1.4;background:#e0e0e0}',
      '.toolbar{background:#3B6B8A;padding:12px 20px;display:flex;gap:12px;align-items:center;position:sticky;top:0;z-index:100}',
      '.toolbar button{padding:8px 20px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}.btn-print{background:#D4722A;color:#fff}.btn-pdf{background:#D4722A;color:#fff}.toolbar-title{color:#fff;font-size:14px;margin-left:auto}',
      '.page-container{width:210mm;min-height:297mm;margin:20px auto;background:#fff;padding:8mm;box-shadow:0 2px 10px rgba(0,0,0,0.3)}.inner-frame{border:2px solid #000}',
      '.header{display:flex;border-bottom:1px solid #000}.header-logo{width:22%;padding:8px;display:flex;align-items:center;justify-content:center;border-right:1px solid #000}.header-logo img{max-height:75px;max-width:100%}',
      '.header-center{width:56%;padding:6px;text-align:center;border-right:1px solid #000}.header-center .republic{font-weight:bold;font-size:11px}.header-center .sep{font-size:8px;letter-spacing:0.5px;color:#333}',
      '.header-center .ministry{font-style:italic;font-size:10px}.header-center .project{font-weight:bold;font-size:10px}.header-right{width:22%;padding:8px;font-size:10px;text-align:right}',
      '.op-title-section{text-align:center;padding:6px 10px;border-bottom:1px solid #000}.exercice-type-line{display:flex;justify-content:space-between;align-items:center}',
      '.exercice-type-line>div:first-child{width:25%;text-align:left;font-size:11px}.exercice-type-line>div:nth-child(2){width:50%;text-align:center}.exercice-type-line>div:last-child{width:25%;text-align:right}',
      '.op-title{font-weight:bold;text-decoration:underline;font-size:11px}.op-numero{font-size:10px;margin-top:2px}.body-content{padding:12px 15px;border-bottom:1px solid #000}',
      '.type-red{color:#c00;font-weight:bold;font-style:italic}.field{margin-bottom:8px}.field-title{text-decoration:underline;font-size:10px;margin-bottom:6px}.field-value{font-weight:bold}',
      '.field-large{margin:15px 0;min-height:45px;line-height:1.6;word-wrap:break-word}.checkbox-line{display:flex;align-items:center;margin-bottom:8px}.checkbox-label{min-width:230px}',
      '.checkbox-options{display:flex;gap:50px}.check-item{display:flex;align-items:center;gap:6px}.box{width:18px;height:14px;border:1px solid #000;display:inline-flex;align-items:center;justify-content:center;font-size:10px}',
      '.budget-section{margin-top:15px}.budget-row{display:flex;align-items:center;margin-bottom:8px}.budget-row .col-left{width:33.33%}.budget-row .col-center{width:33.33%}.budget-row .col-right{width:33.33%}',
      '.value-box{border:1px solid #000;padding:4px 10px;text-align:right;font-weight:bold;white-space:nowrap;font-size:10px}',
      '.budget-table{width:100%;border-collapse:collapse}.budget-table td{border:1px solid #000;padding:4px 8px;font-size:10px}',
      '.budget-table .col-letter{width:4%;text-align:center;font-weight:bold}.budget-table .col-label{width:29.33%}.budget-table .col-amount{width:33.33%;text-align:right;padding-right:10px}.budget-table .col-empty{width:33.33%;border:none}',
      '.signatures-section{display:flex;border-bottom:1px solid #000}.sig-box{width:33.33%;min-height:160px;display:flex;flex-direction:column;border-right:1px solid #000}.sig-box:last-child{border-right:none}',
      '.sig-header{text-align:center;font-weight:bold;font-size:9px;padding:6px;border-bottom:1px solid #000;line-height:1.3}.sig-content{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:8px}',
      '.sig-name{text-align:right;font-weight:bold;text-decoration:underline;font-size:9px}.abidjan-row{display:flex;border-bottom:1px solid #000}.abidjan-cell{width:33.33%;padding:4px 10px;font-size:9px;border-right:1px solid #000}.abidjan-cell:last-child{border-right:none}',
      '.acquit-section{display:flex}.acquit-empty{width:66.66%;border-right:1px solid #000}.acquit-box{width:33.33%;min-height:110px;display:flex;flex-direction:column}.acquit-header{text-align:center;font-size:9px;padding:6px;border-bottom:1px solid #000}',
      '.acquit-content{flex:1;display:flex;flex-direction:column;justify-content:flex-end;padding:8px}.acquit-date{font-size:9px;text-align:left}',
      '</style></head><body>',
      '<div class="toolbar"><button class="btn-print" onclick="window.print()">Imprimer</button><button class="btn-pdf" onclick="window.print()">Exporter PDF</button><span class="toolbar-title">Aperçu – OP ' + selectedOp.numero + '</span></div>',
      '<div class="page-container"><div class="inner-frame"><div class="header"><div class="header-logo"><img src="' + LOGO_PIF2 + '" alt="PIF2" /></div>',
      '<div class="header-center"><div class="republic">REPUBLIQUE DE CÔTE D\'IVOIRE</div><div class="sep">------------------------</div><div class="ministry">MINISTERE DES EAUX ET FORETS</div><div class="sep">------------------------</div><div class="project">PROJET D\'INVESTISSEMENT FORESTIER 2</div><div class="sep">------------------------</div></div>',
      '<div class="header-right"><div style="text-align:center;"><img src="' + ARMOIRIE + '" alt="Armoirie" style="max-height:50px;max-width:60px;margin-bottom:3px;" /><div>Union – Discipline – Travail</div></div></div></div>',
      '<div class="op-title-section"><div class="exercice-type-line"><div>EXERCICE&nbsp;&nbsp;<strong>' + (exerciceActif?.annee || '') + '</strong></div><div><div class="op-title">ORDRE DE PAIEMENT</div><div class="op-numero">N°' + selectedOp.numero + '</div></div><div class="type-red">' + selectedOp.type + '</div></div></div>',
      '<div class="body-content"><div class="field"><div class="field-title">REFERENCE DU BENEFICIAIRE</div></div><div class="field">BENEFICIAIRE :&nbsp;&nbsp;&nbsp;<span class="field-value">' + (ben?.nom || '') + '</span></div><div class="field">COMPTE CONTRIBUABLE :&nbsp;&nbsp;&nbsp;<span class="field-value">' + (ben?.ncc || '') + '</span></div>',
      '<div class="checkbox-line"><span class="checkbox-label">COMPTE DE DISPONIBILITE A DEBITER :</span><div class="checkbox-options"><span class="check-item">BAILLEUR <span class="box">' + (isBailleur ? 'x' : '') + '</span></span><span class="check-item">TRESOR <span class="box">' + (isTresor ? 'x' : '') + '</span></span></div></div>',
      '<div class="checkbox-line"><span class="checkbox-label">MODE DE REGLEMENT :</span><div class="checkbox-options"><span class="check-item">ESPECE <span class="box">' + (selectedOp.modeReglement === 'ESPECES' ? 'x' : '') + '</span></span><span class="check-item">CHEQUE <span class="box">' + (selectedOp.modeReglement === 'CHEQUE' ? 'x' : '') + '</span></span><span class="check-item">VIREMENT <span class="box">' + (selectedOp.modeReglement === 'VIREMENT' ? 'x' : '') + '</span></span></div></div>',
      '<div class="field">REFERENCES BANCAIRES :&nbsp;&nbsp;&nbsp;<span class="field-value">' + (selectedOp.modeReglement === 'VIREMENT' ? (banqueDisplay ? banqueDisplay + ' - ' : '') + ribDisplay : '') + '</span></div>',
      '<div class="field-large">OBJET DE LA DEPENSE :&nbsp;&nbsp;&nbsp;<span class="field-value">' + (selectedOp.objet || '') + '</span></div>',
      '<div class="field-large">PIECES JUSTIFICATIVES :&nbsp;&nbsp;&nbsp;<span class="field-value">' + (selectedOp.piecesJustificatives || '') + '</span></div>',
      '<div class="budget-section"><div class="budget-row"><div class="col-left">MONTANT TOTAL :</div><div class="col-center"><div class="value-box">' + printMontantTotal + '</div></div><div class="col-right"></div></div>',
      '<div class="budget-row"><div class="col-left">IMPUTATION BUDGETAIRE :</div><div class="col-center"><div class="value-box">' + codeImputationComplet.trim() + '</div></div><div class="col-right"></div></div>',
      '<table class="budget-table"><tr><td class="col-letter">A</td><td class="col-label">Dotation budgétaire</td><td class="col-amount">' + formatMontant(getDotation()) + '</td><td class="col-empty"></td></tr>',
      '<tr><td class="col-letter">B</td><td class="col-label">Engagements antérieurs</td><td class="col-amount">' + formatMontant(engAnterieurs) + '</td><td class="col-empty"></td></tr>',
      '<tr><td class="col-letter">C</td><td class="col-label">Engagement actuel</td><td class="col-amount">' + printEngActuel + '</td><td class="col-empty"></td></tr>',
      '<tr><td class="col-letter">D</td><td class="col-label">Engagements cumulés (B + C)</td><td class="col-amount">' + printEngCumules + '</td><td class="col-empty"></td></tr>',
      '<tr><td class="col-letter">E</td><td class="col-label">Disponible budgétaire (A - D)</td><td class="col-amount">' + printDisponible + '</td><td class="col-empty"></td></tr></table></div></div>',
      '<div class="signatures-section"><div class="sig-box"><div class="sig-header">VISA<br/>COORDONNATRICE</div><div class="sig-content"><div class="sig-name">ABE-KOFFI Thérèse</div></div></div>',
      '<div class="sig-box"><div class="sig-header">VISA<br/>CONTRÔLEUR FINANCIER</div><div class="sig-content"></div></div><div class="sig-box"><div class="sig-header">VISA AGENT<br/>COMPTABLE</div><div class="sig-content"></div></div></div>',
      '<div class="abidjan-row"><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div></div>',
      '<div class="acquit-section"><div class="acquit-empty"></div><div class="acquit-box"><div class="acquit-header">ACQUIT LIBERATOIRE</div><div class="acquit-content"><div class="acquit-date">Abidjan, le</div></div></div></div></div></div></body></html>'
    ];
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(htmlParts.join(''));
    printWindow.document.close();
  };

  // === STYLES ===
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#333', letterSpacing: 0.3 };
  const fieldStyle = { padding: '10px 14px', background: P.bgApp, borderRadius: 8, fontSize: 13, border: '1.5px solid rgba(34,51,0,0.08)', width: '100%', boxSizing: 'border-box', color: P.textBlack };
  const editFieldStyle = { ...fieldStyle, background: P.inputBg, border: `1.5px solid ${accent}40`, color: P.textBlack };
  const isReadOnly = selectedOp && !isEditMode;

  return (
    <div className="consulterop-form" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes toastIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        .consulterop-form *, .consulterop-form *::before, .consulterop-form *::after { box-sizing: border-box; }
        .consulterop-form input, .consulterop-form select, .consulterop-form textarea { box-sizing: border-box; color: ${P.textBlack}; } 
      `}</style>
      {toasts.map(t => (
        <div key={t.uid} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
          <ToastNotif toast={t} onDone={() => removeToast(t.uid)} />
        </div>
      ))}

      {modal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(34,51,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(3px)' }}
          onClick={() => closeModal(null)}>
          <div style={{ background: P.bgCard, borderRadius: 20, padding: '28px 32px', minWidth: 380, maxWidth: 440, boxShadow: '0 8px 40px rgba(34,51,0,0.15)', animation: 'modalIn 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: modal.type === 'password' ? P.olive + '12' : P.orange + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {modal.type === 'password' ? Icons.lock(P.olive) : Icons.warning(P.orange)}
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, color: P.sidebarDark, marginBottom: modal.type === 'confirm' && modal.message ? 8 : 18 }}>{modal.title}</div>
            {modal.type === 'confirm' && modal.message && (
              <div style={{ textAlign: 'center', fontSize: 13, color: P.labelMuted, marginBottom: 20, lineHeight: 1.5 }}>{modal.message}</div>
            )}
            {modal.type === 'password' && (
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <input ref={modalInputRef} type={showPwd ? 'text' : 'password'} autoFocus placeholder="Mot de passe..."
                  onKeyDown={e => { if (e.key === 'Enter') closeModal(e.target.value); if (e.key === 'Escape') closeModal(null); }}
                  style={{ width: '100%', padding: '12px 48px 12px 16px', borderRadius: 12, border: '1.5px solid rgba(34,51,0,0.12)', background: P.inputBg, fontSize: 14, outline: 'none', textAlign: 'center', letterSpacing: showPwd ? 0 : 3, color: P.textBlack }} />
                <button onClick={() => setShowPwd(!showPwd)} type="button" tabIndex={-1}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
                  {showPwd ? Icons.eyeOff(P.labelMuted) : Icons.eye(P.labelMuted)}
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => closeModal(null)}
                style={{ flex: 1, padding: '11px 20px', borderRadius: 12, border: '1.5px solid rgba(34,51,0,0.08)', background: P.bgCard, fontSize: 13, fontWeight: 600, color: P.labelMuted, cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={() => {
                if (modal.type === 'password') closeModal(modalInputRef.current?.value || '');
                else closeModal(true);
              }}
                style={{ flex: 1, padding: '11px 20px', borderRadius: 12, border: 'none', background: modal.type === 'confirm' ? P.orange : P.olive, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {modal.type === 'confirm' ? 'Confirmer' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sources fixées */}
      <div style={{ flexShrink: 0, marginBottom: 4 }}>
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <label style={{ ...labelStyle, fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>{Icons.wallet(P.labelMuted)} SOURCE DE FINANCEMENT</label>
          <div style={{ display: 'flex', gap: 12 }}>
            {sources.map(s => (
              <SourceCard key={s.id} source={s} active={activeSource === s.id} onClick={() => { setActiveSource(s.id); setSelectedOp(null); setSearchText(''); setIsEditMode(false); }} />
            ))}
          </div>
        </div>
      </div>

      {/* Zone scrollable */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!exerciceActif ? (
          <div style={{ maxWidth: 1020, margin: '0 auto', background: P.bgCard, borderRadius: 16, textAlign: 'center', padding: 40 }}>
            <div style={{ marginBottom: 16 }}>{Icons.warning(P.orange)}</div>
            <p style={{ color: P.orange, fontWeight: 600 }}>Aucun exercice actif</p>
          </div>
        ) : (
          <div style={{ maxWidth: 1020, margin: '0 auto', background: P.bgCard, borderRadius: 16, boxShadow: '0 2px 12px rgba(34,51,0,0.04)', border: '1px solid rgba(34,51,0,0.04)', borderTop: `3px solid ${accent}` }}>
            <div style={{ padding: '24px 28px 20px' }}>

              {/* LIGNE 1 : RECHERCHE + N°OP + TYPE + DATE + (OP PROV) + STATUT */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 16, flexWrap: 'wrap' }}>
                {/* Recherche */}
                <div style={{ flex: '0 0 auto', position: 'relative' }} ref={dropdownRef}>
                  <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>{Icons.search(P.labelMuted)} RECHERCHER</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <input type="text" value={searchText} onChange={(e) => { setSearchText(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="N° OP, bénéficiaire..."
                      style={{ width: 200, padding: '8px 10px', border: '1.5px solid rgba(34,51,0,0.08)', borderRadius: '8px 0 0 8px', outline: 'none', fontFamily: 'monospace', fontWeight: 600, fontSize: 12, background: P.bgCard, color: P.textBlack }} />
                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '0 8px 8px 0', overflow: 'hidden', border: '1.5px solid rgba(34,51,0,0.08)', borderLeft: 'none' }}>
                      <button onClick={goToPrev} title="OP précédent" style={{ padding: '3px 8px', background: P.bgApp, cursor: 'pointer', border: 'none', borderBottom: '1px solid rgba(34,51,0,0.08)', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.chevronUp(accent)}</button>
                      <button onClick={goToNext} title="OP suivant" style={{ padding: '3px 8px', background: P.bgApp, cursor: 'pointer', border: 'none', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icons.chevronDown(accent)}</button>
                    </div>
                    <span style={{ fontSize: 11, color: P.labelMuted, whiteSpace: 'nowrap', marginLeft: 4 }}>{selectedOp ? `${currentIndex + 1}/${opsSource.length}` : `${opsSource.length}`}</span>
                  </div>
                  {showDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: P.bgCard, border: '1.5px solid rgba(34,51,0,0.08)', borderTop: 'none', borderRadius: '0 0 10px 10px', maxHeight: 300, overflowY: 'auto', zIndex: 1000, boxShadow: '0 8px 24px rgba(34,51,0,0.08)', minWidth: 380 }}>
                      {opsFiltered.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: P.labelMuted, fontSize: 13 }}>Aucun OP trouvé</div>
                      ) : opsFiltered.map(op => {
                        const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                        const isSelected = selectedOp?.id === op.id;
                        const tc = typeColors[op.type] || P.labelMuted;
                        return (
                          <div key={op.id} onClick={() => loadOp(op)} style={{ padding: '10px 14px', borderBottom: `1px solid ${P.bgApp}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isSelected ? accent + '0a' : 'transparent', transition: 'background 0.15s' }}
                            onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = P.bgApp; }}
                            onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? accent + '0a' : 'transparent'; }}>
                            <div>
                              <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: P.textBlack }}>{op.numero}</div>
                              <div style={{ fontSize: 11, color: P.labelMuted, marginTop: 2 }}>{ben?.nom || 'N/A'} — {(op.objet || '').substring(0, 40)}{(op.objet || '').length > 40 ? '...' : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, fontFamily: 'monospace', color: accent, fontSize: 12 }}>{formatMontant(op.montant)} F</div>
                              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: tc + '18', color: tc }}>{op.type}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedOp && (
                  <>
                    {/* N° OP */}
                    <div style={{ flex: '0 1 auto' }}>
                      <label style={labelStyle}>N° OP</label>
                      {editNumero !== null ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input value={editNumero} onChange={e => setEditNumero(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveNumero(); if (e.key === 'Escape') setEditNumero(null); }}
                            style={{ padding: '6px 8px', border: `1.5px solid ${accent}40`, borderRadius: 8, fontFamily: 'monospace', fontWeight: 700, fontSize: 12, background: P.inputBg, width: 200, color: P.textBlack }} autoFocus />
                          <button onClick={handleSaveNumero} style={{ border: 'none', background: '#3B6B8A', color: '#fff', borderRadius: 6, padding: '6px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓</button>
                          <button onClick={() => setEditNumero(null)} style={{ border: 'none', background: P.labelMuted, color: '#fff', borderRadius: 6, padding: '6px 8px', fontSize: 11, cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <span style={{ padding: '8px 10px', background: P.bgApp, border: '1.5px solid rgba(34,51,0,0.08)', borderRadius: 8, fontFamily: 'monospace', fontWeight: 800, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', color: P.textBlack }}>
                          {selectedOp.numero} <span onClick={handleStartEditNumero} style={{ opacity: 0.3, cursor: 'pointer' }}>{Icons.editPen(P.labelMuted)}</span>
                        </span>
                      )}
                    </div>

                    {/* TYPE */}
                    <div style={{ flex: '0 0 auto' }}>
                      <label style={labelStyle}>TYPE</label>
                      {isEditMode ? (
                        <select value={form.type}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setForm({ ...form, type: newType, opProvisoireId: '', opProvisoireNumero: '', opProvisoireIds: [], opProvisoireManuel: '',
                              tvaRecuperable: ['DIRECT', 'DEFINITIF'].includes(newType) ? null : form.tvaRecuperable });
                          }}
                          style={{ padding: '8px 10px', border: `1.5px solid ${(typeColors[form.type] || P.labelMuted)}40`, borderRadius: 8, fontWeight: 700, fontSize: 11, color: typeColors[form.type] || P.labelMuted, cursor: 'pointer', background: P.bgCard, outline: 'none' }}>
                          <option value="PROVISOIRE">Provisoire</option>
                          <option value="DIRECT">Direct</option>
                          <option value="DEFINITIF">Définitif</option>
                          <option value="ANNULATION">Annulation</option>
                        </select>
                      ) : (
                        <span style={{ padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: (typeColors[selectedOp.type] || P.labelMuted) + '15', color: typeColors[selectedOp.type] || P.labelMuted, display: 'inline-block' }}>{selectedOp.type}</span>
                      )}
                    </div>

                    {/* DATE */}
                    <div style={{ flex: '0 0 auto' }}>
                      <label style={labelStyle}>DATE</label>
                      <span style={{ padding: '8px 10px', background: P.bgApp, border: '1.5px solid rgba(34,51,0,0.08)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, display: 'inline-block', whiteSpace: 'nowrap', color: P.textBlack }}>{selectedOp.dateCreation || ''}</span>
                    </div>

                    {/* OP PROVISOIRE inline */}
                    {['ANNULATION', 'DEFINITIF'].includes(isEditMode ? form.type : selectedOp.type) && (
                      <div style={{ flex: '1 1 auto', minWidth: 220 }}>
                        <label style={{ display: 'block', fontSize: 9, fontWeight: 700, marginBottom: 3, color: (isEditMode ? form.type : selectedOp.type) === 'ANNULATION' ? '#C43E3E' : '#2e7d32' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{Icons.refresh((isEditMode ? form.type : selectedOp.type) === 'ANNULATION' ? '#C43E3E' : '#2e7d32')} OP PROV. {(isEditMode ? form.type : selectedOp.type) === 'DEFINITIF' ? 'À RÉGULARISER' : 'À ANNULER'}</span>
                        </label>
                        {isEditMode ? (
                          <div>
                            {form.type === 'ANNULATION' ? (
                              <Autocomplete
                                options={opProvisoiresAnnulation.map(op => ({ value: op.id, label: getOpProvLabel(op), searchFields: [op.numero, beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '', String(op.montant)] }))}
                                value={form.opProvisoireId ? opProvisoiresAnnulation.filter(o => o.id === form.opProvisoireId).map(op => ({ value: op.id, label: getOpProvLabel(op) }))[0] || (form.opProvisoireNumero ? { value: '', label: form.opProvisoireNumero } : null) : (form.opProvisoireNumero ? { value: '', label: form.opProvisoireNumero } : null)}
                                onChange={(option) => {
                                  if (option?.value) { handleSelectOpProvisoire(option.value); }
                                  else { setForm({ ...form, opProvisoireId: '', opProvisoireNumero: option?.label || '' }); }
                                }}
                                placeholder={form.beneficiaireId ? "Sélectionner un OP provisoire..." : "Sélectionner d'abord un bénéficiaire"}
                                noOptionsMessage="Aucun OP provisoire disponible"
                                accentColor="#C43E3E"
                              />
                            ) : (
                              <Autocomplete
                                isMulti
                                options={opProvisoiresDefinitif.map(op => ({ value: op.id, label: getOpProvLabel(op), searchFields: [op.numero, beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '', String(op.montant)] }))}
                                value={(form.opProvisoireIds || []).map(id => {
                                  const op2 = ops.find(o => o.id === id);
                                  return op2 ? { value: op2.id, label: getOpProvLabel(op2) } : null;
                                }).filter(Boolean)}
                                onChange={(selected) => {
                                  if (!selected || selected.length === 0) {
                                    setForm({ ...form, opProvisoireIds: [], opProvisoireId: '', opProvisoireNumero: '', objet: '' });
                                  } else {
                                    const newIds = selected.map(s => s.value);
                                    const removedId = (form.opProvisoireIds || []).find(id => !newIds.includes(id));
                                    const addedId = newIds.find(id => !(form.opProvisoireIds || []).includes(id));
                                    if (addedId) handleSelectOpProvisoiresMulti(addedId, true);
                                    else if (removedId) handleSelectOpProvisoiresMulti(removedId, false);
                                  }
                                }}
                                placeholder={form.beneficiaireId ? "Sélectionner un ou plusieurs OP provisoires..." : "Sélectionner d'abord un bénéficiaire"}
                                noOptionsMessage="Aucun OP provisoire disponible"
                                accentColor="#2e7d32"
                              />
                            )}
                            <div style={{ marginTop: 4 }}>
                              <div style={{ fontSize: 9, color: '#999', marginBottom: 2 }}>Hors système :</div>
                              <input type="text" value={form.opProvisoireManuel}
                                onChange={(e) => setForm({ ...form, opProvisoireManuel: e.target.value, opProvisoireId: '', opProvisoireIds: [] })}
                                placeholder="Saisir N° manuellement..."
                                style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1.5px solid #e0e0e0', width: '100%', boxSizing: 'border-box', background: '#fffde7', color: P.textBlack }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: 'monospace', display: 'inline-block', background: selectedOp.type === 'ANNULATION' ? '#C43E3E10' : P.olivePale, border: `1px solid ${selectedOp.type === 'ANNULATION' ? '#C43E3E25' : P.olive + '20'}`, color: P.textBlack }}>
                            {selectedOp.opProvisoireNumero || '—'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* STATUT */}
                    {statutInfo && (
                      <div style={{ flex: '0 0 auto', marginLeft: 'auto' }}>
                        <label style={labelStyle}>STATUT</label>
                        <span style={{ padding: '8px 12px', borderRadius: 8, background: statutInfo.bg, color: statutInfo.color, fontWeight: 700, fontSize: 10, display: 'inline-block', whiteSpace: 'nowrap' }}>{statutInfo.label}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {selectedOp ? (
                <>
                  <div style={{ height: 1, background: P.bgApp, marginBottom: 20 }} />
                  <div style={isReadOnly ? { pointerEvents: 'none' } : {}}>

                    {/* BÉNÉFICIAIRE & RÈGLEMENT */}
                    <div style={{ marginBottom: 24 }}>
                      <SectionTitle icon={Icons.user(accent)} label="Bénéficiaire & Règlement" accent={accent} />
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, alignItems: 'end' }}>
                        <div style={{ gridColumn: '1 / 3' }}>
                          <label style={labelStyle}>NOM / RAISON SOCIALE</label>
                          {isEditMode ? (
                            <Autocomplete options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || ''] }))} value={form.beneficiaireId ? { value: form.beneficiaireId, label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || '' } : null} onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })} placeholder="Rechercher..." accentColor={accent} />
                          ) : (
                            <div style={{ ...fieldStyle, height: 38, display: 'flex', alignItems: 'center' }}><span style={{ fontWeight: 600 }}>{selectedBeneficiaire?.nom || 'N/A'}</span></div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
                          <div style={{ minWidth: 90 }}>
                            <label style={labelStyle}>N°CC</label>
                            <div style={{ ...fieldStyle, height: 38, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', padding: '10px 12px', fontSize: 12 }}>{selectedBeneficiaire?.ncc || ''}</div>
                          </div>
                          <div>
                            <label style={labelStyle}>RÈGLEMENT</label>
                            <div style={{ display: 'flex', gap: 4, height: 38, alignItems: 'center' }}>
                              {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => {
                                const active = form.modeReglement === mode;
                                return (
                                  <div key={mode} onClick={() => isEditMode && setForm({ ...form, modeReglement: mode })} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', height: 38, borderRadius: 8, border: `1.5px solid ${active ? accent : 'rgba(34,51,0,0.08)'}`, background: active ? accent + '08' : P.bgCard, cursor: isEditMode ? 'pointer' : 'default', boxSizing: 'border-box' }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${active ? accent : P.labelMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />}
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? accent : P.labelMuted }}>{mode}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* RIB */}
                      {form.modeReglement === 'VIREMENT' && selectedRib && (
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, marginTop: 10 }}>
                          <div style={{ gridColumn: '1 / 3' }}>
                            <label style={labelStyle}>RIB</label>
                            {isEditMode && beneficiaireRibs.length > 1 ? (
                              <select value={form.ribIndex} onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })} style={{ ...fieldStyle, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, width: 'auto' }}>
                                {beneficiaireRibs.map((rib, i) => <option key={i} value={i}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>)}
                              </select>
                            ) : (
                              <div style={{ ...fieldStyle, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'monospace' }}>
                                {(typeof selectedRib === 'object' && selectedRib.banque) && <span style={{ background: accent + '15', color: accent, padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{selectedRib.banque}</span>}
                                <span style={{ fontSize: 12 }}>{typeof selectedRib === 'object' ? selectedRib.numero : selectedRib}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* DÉTAILS */}
                    <div style={{ marginBottom: 24 }}>
                      <SectionTitle icon={Icons.fileText(accent)} label="Détails de la dépense" accent={accent} />
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16 }}>
                        <div style={{ gridColumn: '1 / 3' }}>
                          <label style={labelStyle}>OBJET</label>
                          {isEditMode ? <textarea value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} style={{ ...editFieldStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                          : <div style={{ ...fieldStyle, minHeight: 100 }}>{form.objet || ''}</div>}
                        </div>
                        <div>
                          <label style={labelStyle}>PIÈCES JUSTIFICATIVES</label>
                          {isEditMode ? <textarea value={form.piecesJustificatives} onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })} style={{ ...editFieldStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                          : <div style={{ ...fieldStyle, minHeight: 100, fontSize: 12, color: form.piecesJustificatives ? P.textBlack : P.labelMuted }}>{form.piecesJustificatives || ''}</div>}
                        </div>
                      </div>
                    </div>

                    {/* MONTANT ET BUDGET */}
                    <div style={{ marginBottom: 24 }}>
                      <SectionTitle icon={Icons.dollar(accent)} label="Montant et budget" accent={accent} />
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, marginBottom: 16 }}>
                        <div>
                          <label style={labelStyle}>MONTANT (FCFA)</label>
                          {isEditMode ? <MontantInput value={form.montant} onChange={(val) => setForm({ ...form, montant: val })} style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} placeholder="0" />
                          : <div style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: 16, fontWeight: 700, textAlign: 'right', color: selectedOp.type === 'ANNULATION' ? '#C43E3E' : accent }}>{formatMontant(selectedOp.montant)}</div>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <label style={labelStyle}>LIGNE BUDG.</label>
                          {isEditMode ? <Autocomplete options={(currentBudget?.lignes || []).map(l => ({ value: l.code, label: l.code, searchFields: [l.code, l.libelle] }))} value={form.ligneBudgetaire ? { value: form.ligneBudgetaire, label: form.ligneBudgetaire } : null} onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })} placeholder="Code..." accentColor={accent} />
                          : <div style={{ ...fieldStyle, fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>{form.ligneBudgetaire || ''}</div>}
                        </div>
                        <div>
                          <label style={labelStyle}>LIBELLÉ</label>
                          <div style={{ padding: '10px 14px', background: accent + '08', borderRadius: 8, fontSize: 12, color: P.textBlack }}>{selectedLigne?.libelle || ''}</div>
                        </div>
                      </div>

                      {/* Budget + TVA + Rejet/Différé */}
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, alignItems: 'start' }}>
                        <div style={{ gridColumn: '1 / 3', background: P.bgApp, padding: 14, borderRadius: 12, border: `1px solid ${P.bgSection}` }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px' }}>
                            <span style={{ fontSize: 11, color: P.labelMuted }}>Dotation</span>
                            <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500, color: P.textBlack }}>{formatMontant(getDotation())}</span>
                            <span style={{ fontSize: 11, color: P.labelMuted }}>Engag. antérieurs</span>
                            <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500, color: P.textBlack }}>{getEngagementsAnterieurs() < 0 ? '-' + formatMontant(Math.abs(getEngagementsAnterieurs())) : formatMontant(getEngagementsAnterieurs())}</span>
                            <span style={{ fontSize: 11, color: P.labelMuted }}>Engag. actuel</span>
                            <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600, color: getEngagementActuel() < 0 ? '#C43E3E' : P.orange }}>{getEngagementActuel() < 0 ? '-' + formatMontant(Math.abs(getEngagementActuel())) : '+' + formatMontant(getEngagementActuel())}</span>
                            <span style={{ fontSize: 11, color: P.labelMuted }}>Engag. cumulés</span>
                            <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500, color: P.textBlack }}>{getEngagementsCumules() < 0 ? '-' + formatMontant(Math.abs(getEngagementsCumules())) : formatMontant(getEngagementsCumules())}</span>
                            <div style={{ gridColumn: '1 / -1', height: 1, background: P.bgSection, margin: '4px 0' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: P.textBlack }}>Disponible</span>
                            <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 800, color: getDisponible() >= 0 ? '#2e7d32' : '#C43E3E' }}>{formatMontant(getDisponible())}</span>
                          </div>
                          {getDisponible() < 0 && form.type !== 'ANNULATION' && (
                            <div style={{ marginTop: 10, padding: 8, background: '#C43E3E10', borderRadius: 8, color: '#C43E3E', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.warning('#C43E3E')} Budget insuffisant</div>
                          )}
                        </div>
                        {/* Col 3 : TVA + Motif rejet/différé */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                            <div>
                              <label style={labelStyle}>TVA RÉCUPÉRABLE</label>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                {[{ val: true, lbl: 'OUI' }, { val: false, lbl: 'NON' }].map(opt => {
                                  const active = form.tvaRecuperable === opt.val;
                                  return (
                                    <div key={opt.lbl} onClick={() => isEditMode && setForm({ ...form, tvaRecuperable: opt.val })} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${active ? accent : 'rgba(34,51,0,0.08)'}`, background: active ? accent + '08' : P.bgCard, cursor: isEditMode ? 'pointer' : 'default' }}>
                                      <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${active ? accent : P.labelMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />}
                                      </div>
                                      <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? accent : P.labelMuted }}>{opt.lbl}</span>
                                    </div>
                                  );
                                })}
                                {form.tvaRecuperable && (
                                  isEditMode ? (
                                    <MontantInput value={form.montantTVA} onChange={(val) => setForm({ ...form, montantTVA: val })} style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 11, textAlign: 'right', width: 100, padding: '4px 8px' }} placeholder="0" />
                                  ) : (
                                    selectedOp.montantTVA ? <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600 }}>{formatMontant(selectedOp.montantTVA)} F</span> : null
                                  )
                                )}
                              </div>
                            </div>
                          )}
                          {/* Motif rejet */}
                          {selectedOp.motifRejet && (
                            <div style={{ padding: 12, background: '#C43E3E08', borderRadius: 10, border: '1.5px solid #C43E3E25' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#C43E3E', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.xCircle('#C43E3E')} MOTIF DU REJET</div>
                              <div style={{ fontSize: 12, color: '#C43E3E', lineHeight: 1.5 }}>{selectedOp.motifRejet}</div>
                            </div>
                          )}
                          {/* Observation différé */}
                          {selectedOp.observationDiffere && (
                            <div style={{ padding: 12, background: P.gold + '10', borderRadius: 10, border: `1.5px solid ${P.gold}30` }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#C5961F', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.clock('#C5961F')} OBSERVATION — DIFFÉRÉ</div>
                              <div style={{ fontSize: 12, color: '#C5961F', lineHeight: 1.5 }}>{selectedOp.observationDiffere}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Boutons */}
                  {isEditMode ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: `2px solid ${P.gold}` }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ padding: '10px 16px', background: P.gold + '15', color: P.gold, borderRadius: 8, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.edit(P.gold)} Modification — {selectedOp.numero}</span>
                        <button onClick={() => { setIsEditMode(false); loadOp(selectedOp); }} style={{ ...styles.buttonSecondary, padding: '10px 16px', fontSize: 12, borderRadius: 8, border: '1.5px solid rgba(34,51,0,0.08)', background: P.bgCard, color: P.textBlack, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
                      </div>
                      <button onClick={handleEnregistrerModif} title="Enregistrer"
                        style={{ width: 52, height: 52, borderRadius: '50%', border: 'none', background: P.gold, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 16px ${P.gold}40`, transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        {Icons.save('#fff')}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: `1px solid ${P.bgApp}` }}>
                      <span style={{ padding: '8px 14px', background: accent + '10', color: accent, borderRadius: 8, fontWeight: 700, fontSize: 12, fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.eyeSearch(accent)} {selectedOp.numero}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {/* Bouton Modifier : Grisé si OP verrouillé (Visé CF, Payé, transmis AC, archivé) */}
                        <button 
                          title={isLockedForEdit ? "Verrouillé : OP déjà visé par le CF" : "Modifier"} 
                          onClick={() => {
                            if (isLockedForEdit) {
                              showToast('warning', 'Action impossible', "L'OP a déjà été visé par le CF, transmis à l'Agent Comptable ou payé. La modification directe est verrouillée. Veuillez annuler l'étape dans la gestion des bordereaux.");
                            } else {
                              handleModifier();
                            }
                          }}
                          style={{ 
                            width: 42, height: 42, borderRadius: '50%', border: 'none', 
                            background: isLockedForEdit ? P.bgSection : P.gold, 
                            color: 'white', cursor: isLockedForEdit ? 'not-allowed' : 'pointer', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            boxShadow: isLockedForEdit ? 'none' : `0 3px 12px ${P.gold}44`, transition: 'all 0.2s' 
                          }}
                          onMouseEnter={e => { if(!isLockedForEdit) e.currentTarget.style.transform = 'scale(1.12)'; }} 
                          onMouseLeave={e => { if(!isLockedForEdit) e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          {Icons.edit(isLockedForEdit ? P.labelMuted : '#fff')}
                        </button>

                        <button title="Mettre à la corbeille" onClick={handleSupprimer}
                          style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: P.labelMuted, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 12px ${P.labelMuted}44`, transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                          {Icons.trash('#fff')}
                        </button>
                        <button title="Dupliquer" onClick={handleDupliquer}
                          style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: P.orange, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 12px ${P.orange}44`, transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                          {Icons.copy('#fff')}
                        </button>
                        <button title="Imprimer" onClick={handlePrint}
                          style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: accent, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 12px ${accent}44`, transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                          {Icons.printer('#fff')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 60, color: P.labelMuted }}>
                  <div style={{ marginBottom: 16, opacity: 0.4 }}>{Icons.eyeSearch(P.labelMuted)}</div>
                  <p style={{ fontSize: 16, fontWeight: 500 }}>Sélectionnez un OP pour le consulter</p>
                  <p style={{ fontSize: 13 }}>Utilisez la barre de recherche ou les flèches</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageConsulterOp;
