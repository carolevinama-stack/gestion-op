import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ===================== PALETTE PIF2 =====================
const P = {
  bgApp: '#F6F4F1',
  bgCard: '#FDFCFA',
  bgSection: '#ECE2CE',
  sidebarDark: '#223300',
  olive: '#4B5D16',
  olivePale: '#E8F0D8',
  gold: '#F2B635',
  orange: '#E45C10',
  labelMuted: '#8A7D6B',
  inputBg: '#FFFDF5',
};

// ===================== ICÔNES SVG =====================
const Icons = {
  user: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  fileText: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  dollar: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  check: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  save: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  eraser: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  wallet: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><circle cx="17" cy="14" r="1.5" fill={c}/></svg>,
  search: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  warning: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  refresh: (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
};

// ==================== TOAST SYSTEM ====================
const TOAST_STYLES = {
  success: { bg: `linear-gradient(135deg, ${P.olivePale} 0%, ${P.bgCard} 100%)`, iconBg: P.olivePale, iconBorder: `${P.olive}20` },
  error: { bg: `linear-gradient(135deg, #fff5f5 0%, ${P.bgCard} 100%)`, iconBg: '#ffebee', iconBorder: '#f4433620' },
  warning: { bg: `linear-gradient(135deg, #fffbf0 0%, ${P.bgCard} 100%)`, iconBg: '#fff3e0', iconBorder: '#ff980020' },
};
const ToastIcon = ({ type }) => {
  if (type === 'success') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>;
  if (type === 'error') return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c62828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e65100" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
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
    <div style={{
      background: s.bg, borderRadius: 14, padding: '16px 22px',
      display: 'flex', alignItems: 'center', gap: 14,
      minWidth: 320, maxWidth: 420,
      boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      animation: leaving ? 'toastOut 0.4s ease-in forwards' : 'toastIn 0.35s ease-out',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%', background: s.iconBg,
        border: `1.5px solid ${s.iconBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
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
    <div style={{ width: 28, height: 28, borderRadius: 8, background: accent + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
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

// ==================== PAGE NOUVEL OP ====================
const typeColors = { PROVISOIRE: P.gold, DIRECT: '#1565c0', DEFINITIF: '#2e7d32', ANNULATION: '#c62828' };
const PageNouvelOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exercices, exerciceActif, projet, consultOpData, setConsultOpData, setCurrentPage, userProfile } = useAppContext();
  const defaultForm = { type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT', objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '', montantTVA: '', tvaRecuperable: null, opProvisoireNumero: '', opProvisoireId: '', opProvisoireIds: [], opProvisoireNumeros: [] };

  // Restaurer le brouillon depuis localStorage
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem('op_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaultForm;
  };
  const loadSource = () => {
    try {
      const saved = localStorage.getItem('op_draft_source');
      if (saved && sources.find(s => s.id === saved)) return saved;
    } catch (e) {}
    return sources[0]?.id || null;
  };

  const [activeSource, setActiveSource] = useState(loadSource);
  const [toasts, setToasts] = useState([]);
  const [form, setForm] = useState(loadDraft);
  const [saving, setSaving] = useState(false);

  const showToast = useCallback((type, title, message = '') => {
    const uid = Date.now() + Math.random();
    setToasts(prev => [...prev, { uid, type, title, message }]);
  }, []);
  const removeToast = useCallback((uid) => {
    setToasts(prev => prev.filter(t => t.uid !== uid));
  }, []);

  // Sauvegarder le brouillon à chaque modification
  useEffect(() => {
    try { localStorage.setItem('op_draft', JSON.stringify(form)); } catch (e) {}
  }, [form]);
  useEffect(() => {
    try { if (activeSource) localStorage.setItem('op_draft_source', activeSource); } catch (e) {}
  }, [activeSource]);

  const currentSourceObj = sources.find(s => s.id === activeSource);
  const selectedBeneficiaire = beneficiaires.find(b => b.id === form.beneficiaireId);

  // Si on vient de Consulter OP avec duplication
  useEffect(() => {
    if (consultOpData && consultOpData._duplicate) {
      const op = consultOpData;
      if (op.sourceId) setActiveSource(op.sourceId);
      setForm({
        type: op.type === 'ANNULATION' ? 'PROVISOIRE' : op.type,
        beneficiaireId: op.beneficiaireId || '',
        ribIndex: 0,
        modeReglement: op.modeReglement || 'VIREMENT',
        objet: op.objet || '',
        piecesJustificatives: op.piecesJustificatives || '',
        montant: '',
        ligneBudgetaire: op.ligneBudgetaire || '',
        montantTVA: '',
        tvaRecuperable: op.tvaRecuperable === true ? true : op.tvaRecuperable === false ? false : null,
        opProvisoireNumero: '',
        opProvisoireId: '',
        opProvisoireIds: [],
        opProvisoireNumeros: []
      });
      if (setConsultOpData) setConsultOpData(null);
    }
  }, [consultOpData]);
  
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
  
  const getEngagementsAnterieurs = () => {
    if (!form.ligneBudgetaire) return 0;
    return ops
      .filter(op => 
        op.sourceId === activeSource && 
        op.exerciceId === exerciceActif?.id &&
        op.ligneBudgetaire === form.ligneBudgetaire &&
        ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
        !['REJETE', 'ANNULE'].includes(op.statut)
      )
      .reduce((sum, op) => sum + (op.montant || 0), 0);
  };

  const getEngagementActuel = () => {
    const montant = parseFloat(form.montant) || 0;
    if (form.type === 'DEFINITIF') {
      // Multi OP provisoires: subtract sum of all linked provisoires
      const ids = form.opProvisoireIds.length > 0 ? form.opProvisoireIds : (form.opProvisoireId ? [form.opProvisoireId] : []);
      const sumProv = ids.reduce((s, id) => { const o = ops.find(op => op.id === id); return s + (o?.montant || 0); }, 0);
      return montant - sumProv;
    }
    return montant;
  };

  const getEngagementsCumules = () => getEngagementsAnterieurs() + getEngagementActuel();
  const getDisponible = () => getDotation() - getEngagementsCumules();

  // OP provisoires pour ANNULATION (TOUS bénéficiaires - le bénéficiaire sera rempli après sélection)
  const opProvisoiresAnnulation = ops.filter(op =>
    op.type === 'PROVISOIRE' &&
    op.sourceId === activeSource &&
    op.exerciceId === exerciceActif?.id &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'ANNULATION')
  );

  // OP provisoires pour DEFINITIF (tous bénéficiaires, même source/exercice, exclure déjà sélectionnés)
  const opProvisoiresDefinitif = ops.filter(op =>
    op.type === 'PROVISOIRE' &&
    op.sourceId === activeSource &&
    op.exerciceId === exerciceActif?.id &&
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && o.type === 'DEFINITIF') &&
    !form.opProvisoireIds.includes(op.id)
  );

  const opProvisoiresDisponibles = form.type === 'ANNULATION' ? opProvisoiresAnnulation : opProvisoiresDefinitif;

  const getOpProvLabel = (op) => {
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ex = exercices.find(e => e.id === op.exerciceId);
    const isExtra = op.importAnterieur ? ' [Extra]' : '';
    const isAutreEx = (exerciceActif && op.exerciceId !== exerciceActif.id && ex) ? ` (${ex.annee})` : '';
    return `${op.numero}${isExtra}${isAutreEx} - ${ben?.nom || 'N/A'} - ${formatMontant(op.montant)} F`;
  };

  const genererNumero = () => {
    const sigleProjet = projet?.sigle || 'PROJET';
    const sigleSource = currentSourceObj?.sigle || 'OP';
    const annee = exerciceActif?.annee || new Date().getFullYear();
    const opsSource = ops.filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id);
    let maxNum = 0;
    opsSource.forEach(op => {
      const match = (op.numero || '').match(/N°(\d+)\//);
      if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
    });
    const nextNum = maxNum + 1;
    return `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
  };

  const handleSelectOpProvisoire = (opId) => {
    if (!opId) { setForm({ ...form, opProvisoireId: '', opProvisoireNumero: '' }); return; }
    const op = ops.find(o => o.id === opId);
    if (op) {
      setForm({
        ...form, opProvisoireId: opId, opProvisoireNumero: op.numero,
        beneficiaireId: op.beneficiaireId, ligneBudgetaire: op.ligneBudgetaire, objet: op.objet,
        montant: form.type === 'ANNULATION' ? String(op.montant) : form.montant,
        modeReglement: op.modeReglement || 'VIREMENT'
      });
    }
  };

  // DEFINITIF: ajouter un OP provisoire à la liste
  const handleAddOpProv = (opId) => {
    if (!opId) return;
    const op = ops.find(o => o.id === opId);
    if (!op || form.opProvisoireIds.includes(opId)) return;
    const newIds = [...form.opProvisoireIds, opId];
    const newNums = [...form.opProvisoireNumeros, op.numero];
    // Premier ajout → pré-remplir bénéficiaire, ligne, objet
    const isFirst = form.opProvisoireIds.length === 0;
    setForm({
      ...form,
      opProvisoireIds: newIds, opProvisoireNumeros: newNums,
      opProvisoireId: newIds[0], opProvisoireNumero: newNums[0],
      ...(isFirst ? { beneficiaireId: op.beneficiaireId, ligneBudgetaire: op.ligneBudgetaire, objet: op.objet, modeReglement: op.modeReglement || 'VIREMENT' } : {})
    });
  };

  // DEFINITIF: retirer un OP provisoire
  const handleRemoveOpProv = (opId) => {
    const idx = form.opProvisoireIds.indexOf(opId);
    if (idx === -1) return;
    const newIds = form.opProvisoireIds.filter(id => id !== opId);
    const newNums = form.opProvisoireNumeros.filter((_, i) => i !== idx);
    setForm({
      ...form,
      opProvisoireIds: newIds, opProvisoireNumeros: newNums,
      opProvisoireId: newIds[0] || '', opProvisoireNumero: newNums[0] || ''
    });
  };

  // Somme des OP provisoires sélectionnés (DEFINITIF)
  const getSumOpProv = () => form.opProvisoireIds.reduce((s, id) => { const o = ops.find(op => op.id === id); return s + (o?.montant || 0); }, 0);

  const handleClear = () => {
    setForm(defaultForm);
    try { localStorage.removeItem('op_draft'); } catch (e) {}
  };

  const handleSave = async () => {
    if (!activeSource) { showToast('error', 'Source manquante', 'Veuillez sélectionner une source de financement'); return; }
    if (!exerciceActif) { showToast('error', 'Exercice manquant', 'Aucun exercice actif'); return; }
    if (!form.beneficiaireId) { showToast('error', 'Champ obligatoire', 'Veuillez sélectionner un bénéficiaire'); return; }
    if (form.modeReglement === 'VIREMENT' && !selectedRib) { showToast('error', 'RIB manquant', 'Veuillez renseigner un RIB pour le bénéficiaire'); return; }
    if (!form.ligneBudgetaire) { showToast('error', 'Champ obligatoire', 'Veuillez sélectionner une ligne budgétaire'); return; }
    if (!form.objet.trim()) { showToast('error', 'Champ obligatoire', 'Veuillez saisir l\'objet de la dépense'); return; }
    if (!form.montant || (form.type !== 'ANNULATION' && parseFloat(form.montant) === 0)) { showToast('error', 'Champ obligatoire', 'Veuillez saisir un montant valide'); return; }
    if (['DIRECT', 'DEFINITIF'].includes(form.type) && form.tvaRecuperable === null) {
      showToast('error', 'Champ obligatoire', 'Veuillez indiquer si la TVA est récupérable (OUI / NON)'); return;
    }
    if (form.type === 'ANNULATION' && !form.opProvisoireId && !form.opProvisoireNumero.trim()) {
      showToast('error', 'Champ obligatoire', "Veuillez renseigner le N° d'OP Provisoire à annuler"); return;
    }
    if (form.type === 'DEFINITIF' && form.opProvisoireIds.length === 0 && !form.opProvisoireNumero.trim()) {
      showToast('error', 'Champ obligatoire', "Veuillez sélectionner au moins un OP Provisoire à régulariser"); return;
    }
    if (form.type !== 'ANNULATION' && getDisponible() < 0) {
      showToast('error', 'Budget insuffisant', `Disponible : ${formatMontant(getDisponible())} FCFA`); return;
    }

    setSaving(true);
    try {
      const sigleProjet = projet?.sigle || 'PROJET';
      const sigleSource = currentSourceObj?.sigle || 'OP';
      const annee = exerciceActif?.annee || new Date().getFullYear();
      
      const allOpsSnap = await getDocs(query(collection(db, 'ops'), where('sourceId', '==', activeSource), where('exerciceId', '==', exerciceActif.id)));
      const allNumerosExistants = allOpsSnap.docs.map(d => d.data().numero);
      
      let maxNum = 0;
      allNumerosExistants.forEach(n => {
        const match = (n || '').match(/N°(\d+)\//);
        if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
      });
      let nextNum = maxNum + 1;
      let numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
      let tentatives = 0;
      while (allNumerosExistants.includes(numero) && tentatives < 50) { nextNum++; numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`; tentatives++; }
      
      const numeroInitial = genererNumero();
      if (numero !== numeroInitial) showToast('warning', 'Numéro corrigé', `${numeroInitial} déjà utilisé → ${numero}`);
      
      const opData = {
        numero, type: form.type, sourceId: activeSource, exerciceId: exerciceActif.id,
        beneficiaireId: form.beneficiaireId, modeReglement: form.modeReglement,
        rib: selectedRib || null, ligneBudgetaire: form.ligneBudgetaire,
        objet: form.objet.trim(), piecesJustificatives: form.piecesJustificatives.trim(),
        montant: parseFloat(form.montant), montantTVA: form.montantTVA ? parseFloat(form.montantTVA) : null,
        tvaRecuperable: form.tvaRecuperable === true, statut: 'EN_COURS',
        opProvisoireId: form.opProvisoireId || null, opProvisoireNumero: form.opProvisoireNumero || null,
        opProvisoireIds: form.opProvisoireIds.length > 0 ? form.opProvisoireIds : (form.opProvisoireId ? [form.opProvisoireId] : []),
        opProvisoireNumeros: form.opProvisoireNumeros.length > 0 ? form.opProvisoireNumeros : (form.opProvisoireNumero ? [form.opProvisoireNumero] : []),
        dateCreation: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        creePar: userProfile?.nom || userProfile?.email || 'Inconnu'
      };

      const docRef = await addDoc(collection(db, 'ops'), opData);
      
      const doublonSnap = await getDocs(query(collection(db, 'ops'), where('numero', '==', numero)));
      if (doublonSnap.size > 1) {
        const allOpsSnap2 = await getDocs(query(collection(db, 'ops'), where('sourceId', '==', activeSource), where('exerciceId', '==', exerciceActif.id)));
        const allNums2 = allOpsSnap2.docs.map(d => d.data().numero);
        let fixMax = 0;
        allNums2.forEach(n => { const m = (n || '').match(/N°(\d+)\//); if (m) fixMax = Math.max(fixMax, parseInt(m[1])); });
        let fixNum = fixMax + 1;
        let fixNumero = `N°${String(fixNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;
        while (allNums2.includes(fixNumero)) { fixNum++; fixNumero = `N°${String(fixNum).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`; }
        await updateDoc(doc(db, 'ops', docRef.id), { numero: fixNumero, updatedAt: new Date().toISOString() });
        opData.numero = fixNumero;
        showToast('warning', 'Numéro corrigé', `Doublon corrigé → ${fixNumero}`);
      }
      
      setOps([...ops, { id: docRef.id, ...opData }]);
      showToast('success', 'OP créé avec succès', `N° ${opData.numero}`);
      handleClear();
    } catch (error) {
      console.error('Erreur:', error);
      showToast('error', 'Erreur', 'Erreur lors de la création de l\'OP');
    }
    setSaving(false);
  };

  // === STYLES ===
  const accent = currentSourceObj?.couleur || P.olive;
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: P.labelMuted, letterSpacing: 0.3 };
  const fieldStyle = { padding: '10px 14px', background: P.bgApp, borderRadius: 8, fontSize: 13, border: '1.5px solid rgba(34,51,0,0.08)', width: '100%', boxSizing: 'border-box' };
  const editFieldStyle = { ...fieldStyle, background: P.inputBg, border: `1.5px solid ${accent}40` };

  return (
    <div className="nouvelop-form" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`
        @keyframes toastIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
        .nouvelop-form *, .nouvelop-form *::before, .nouvelop-form *::after { box-sizing: border-box; }
        .nouvelop-form input, .nouvelop-form select, .nouvelop-form textarea { box-sizing: border-box; }
      `}</style>
      {toasts.map(t => (
        <div key={t.uid} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
          <ToastNotif toast={t} onDone={() => removeToast(t.uid)} />
        </div>
      ))}

      {/* ===== SOURCES DE FINANCEMENT (fixées en haut) ===== */}
      <div style={{ flexShrink: 0, marginBottom: 4 }}>
        <div style={{ maxWidth: 1020, margin: '0 auto' }}>
          <label style={{ ...labelStyle, fontSize: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            {Icons.wallet(P.labelMuted)}
            <span>SOURCE DE FINANCEMENT</span>
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            {sources.map(s => (
              <SourceCard key={s.id} source={s} active={activeSource === s.id} onClick={() => setActiveSource(s.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* ===== ZONE SCROLLABLE ===== */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!exerciceActif ? (
          <div style={{ maxWidth: 1020, margin: '0 auto', background: P.bgCard, borderRadius: 16, textAlign: 'center', padding: 40 }}>
            <div style={{ marginBottom: 16 }}>{Icons.warning(P.orange)}</div>
            <p style={{ color: P.orange, fontWeight: 600 }}>Aucun exercice actif</p>
            <p style={{ color: P.labelMuted }}>Veuillez définir un exercice actif dans les <span style={{ color: accent, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Paramètres</span></p>
          </div>
        ) : (
          <div style={{ maxWidth: 1020, margin: '0 auto', background: P.bgCard, borderRadius: 16, boxShadow: '0 2px 12px rgba(34,51,0,0.04)', border: '1px solid rgba(34,51,0,0.04)', borderTop: `3px solid ${accent}` }}>
            <div style={{ padding: '24px 28px 20px' }}>

              {/* ===== LIGNE 1 : N°OP + TYPE + DATE + (OP PROV) + EFFACER ===== */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: '0 1 auto' }}>
                  <label style={labelStyle}>N° OP (auto)</label>
                  <span style={{ padding: '6px 10px', background: P.bgApp, border: '1.5px solid rgba(34,51,0,0.08)', borderRadius: 8, fontFamily: 'monospace', fontWeight: 800, fontSize: 12, display: 'inline-block', whiteSpace: 'nowrap', color: P.sidebarDark }}>{genererNumero()}</span>
                </div>
                <div style={{ flex: '0 0 auto' }}>
                  <label style={labelStyle}>TYPE *</label>
                  <select value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value, opProvisoireId: '', opProvisoireNumero: '', opProvisoireIds: [], opProvisoireNumeros: [], tvaRecuperable: ['DIRECT', 'DEFINITIF'].includes(e.target.value) ? null : form.tvaRecuperable })}
                    style={{ padding: '5px 8px', border: `1.5px solid ${(typeColors[form.type] || P.labelMuted)}40`, borderRadius: 8, fontWeight: 700, fontSize: 11, color: typeColors[form.type] || P.labelMuted, cursor: 'pointer', background: P.bgCard, outline: 'none' }}>
                    <option value="PROVISOIRE">Provisoire</option>
                    <option value="DIRECT">Direct</option>
                    <option value="DEFINITIF">Définitif</option>
                    <option value="ANNULATION">Annulation</option>
                  </select>
                </div>
                <div style={{ flex: '0 0 auto' }}>
                  <label style={labelStyle}>DATE</label>
                  <span style={{ padding: '6px 10px', background: P.bgApp, border: '1.5px solid rgba(34,51,0,0.08)', borderRadius: 8, fontFamily: 'monospace', fontSize: 11, display: 'inline-block', color: P.sidebarDark }}>{new Date().toISOString().split('T')[0]}</span>
                </div>

                {/* OP Provisoire inline - ANNULATION (single select) */}
                {form.type === 'ANNULATION' && (
                  <div style={{ flex: '0 0 auto' }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, marginBottom: 3, color: '#c62828' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{Icons.refresh('#c62828')} OP PROV. *</span>
                    </label>
                    <Autocomplete
                      options={opProvisoiresDisponibles.map(op => ({ value: op.id, label: getOpProvLabel(op), searchFields: [op.numero, beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '', String(op.montant)] }))}
                      value={form.opProvisoireId ? opProvisoiresDisponibles.filter(o => o.id === form.opProvisoireId).map(op => ({ value: op.id, label: getOpProvLabel(op) }))[0] || (form.opProvisoireNumero ? { value: '', label: form.opProvisoireNumero } : null) : (form.opProvisoireNumero ? { value: '', label: form.opProvisoireNumero } : null)}
                      onChange={(option) => {
                        if (option?.value) { handleSelectOpProvisoire(option.value); }
                        else { setForm({ ...form, opProvisoireId: '', opProvisoireNumero: option?.label || '' }); }
                      }}
                      onInputChange={(text) => { if (!opProvisoiresDisponibles.find(o => o.id === form.opProvisoireId)) setForm({ ...form, opProvisoireNumero: text, opProvisoireId: '' }); }}
                      placeholder="N° ou sélectionner..."
                      noOptionsMessage="Saisir le N° manuellement"
                      accentColor="#c62828"
                      style={{ minWidth: 200 }}
                    />
                  </div>
                )}

                {/* OP Provisoire inline - DEFINITIF (multi-select) */}
                {form.type === 'DEFINITIF' && (
                  <div style={{ flex: '1 1 auto', minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 700, marginBottom: 3, color: '#2e7d32' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{Icons.refresh('#2e7d32')} OP PROV. * (multi)</span>
                    </label>
                    <Autocomplete
                      key={'def-prov-' + form.opProvisoireIds.length}
                      options={opProvisoiresDisponibles.map(op => ({ value: op.id, label: getOpProvLabel(op), searchFields: [op.numero, beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || '', String(op.montant)] }))}
                      value={null}
                      onChange={(option) => { if (option?.value) handleAddOpProv(option.value); }}
                      placeholder={form.opProvisoireIds.length > 0 ? 'Ajouter un autre OP prov...' : 'Rechercher un OP provisoire...'}
                      noOptionsMessage="Aucun OP provisoire disponible"
                      accentColor="#2e7d32"
                    />
                    {/* Chips des OP sélectionnés */}
                    {form.opProvisoireIds.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                        {form.opProvisoireIds.map((id, i) => {
                          const opP = ops.find(o => o.id === id);
                          const benP = opP ? beneficiaires.find(b => b.id === opP.beneficiaireId) : null;
                          return (
                            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#2e7d3215', border: '1px solid #2e7d3230', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 600, color: '#2e7d32' }}>
                              {opP?.numero || form.opProvisoireNumeros[i]} — {benP?.nom || 'N/A'} — {formatMontant(opP?.montant || 0)} F
                              <button onClick={() => handleRemoveOpProv(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: '#c62828', fontSize: 13, fontWeight: 700, marginLeft: 2 }}>&times;</button>
                            </span>
                          );
                        })}
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#2e7d32', padding: '3px 6px' }}>Total : {formatMontant(getSumOpProv())} F</span>
                      </div>
                    )}
                  </div>
                )}

                {/* EFFACER */}
                <div style={{ marginLeft: 'auto' }}>
                  <button onClick={handleClear} style={{ padding: '7px 16px', borderRadius: 8, border: '1.5px solid rgba(34,51,0,0.08)', background: P.bgCard, fontSize: 11, fontWeight: 600, color: P.labelMuted, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Icons.eraser(P.labelMuted)} EFFACER
                  </button>
                </div>
              </div>

              <div style={{ height: 1, background: P.bgApp, marginBottom: 20 }} />

              {/* ===== BÉNÉFICIAIRE + NCC + RÈGLEMENT ===== */}
              <div style={{ marginBottom: 24 }}>
                <SectionTitle icon={Icons.user(accent)} label="Bénéficiaire & Règlement" accent={accent} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, alignItems: 'end' }}>
                  <div style={{ gridColumn: '1 / 3' }}>
                    <label style={labelStyle}>NOM / RAISON SOCIALE *</label>
                    <Autocomplete
                      options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || '', ...(b.ribs || []).map(r => r.numero), ...(b.ribs || []).map(r => r.banque), b.rib || ''] }))}
                      value={form.beneficiaireId ? { value: form.beneficiaireId, label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || '' } : null}
                      onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })}
                      placeholder="Rechercher par nom ou NCC..."
                      isDisabled={form.type === 'ANNULATION' && !!form.opProvisoireId}
                      noOptionsMessage="Aucun bénéficiaire trouvé"
                      accentColor={accent}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'end' }}>
                    <div style={{ minWidth: 90 }}>
                      <label style={labelStyle}>N°CC</label>
                      <div style={{ ...fieldStyle, height: 38, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', padding: '10px 12px', color: P.sidebarDark, fontSize: 12 }}>{selectedBeneficiaire?.ncc || ''}</div>
                    </div>
                    <div>
                      <label style={labelStyle}>RÈGLEMENT</label>
                      <div style={{ display: 'flex', gap: 4, height: 38, alignItems: 'center' }}>
                        {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => {
                          const active = form.modeReglement === mode;
                          return (
                            <div key={mode} onClick={() => setForm({ ...form, modeReglement: mode })} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', height: 38, borderRadius: 8, border: `1.5px solid ${active ? accent : 'rgba(34,51,0,0.08)'}`, background: active ? accent + '08' : P.bgCard, cursor: 'pointer', boxSizing: 'border-box' }}>
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
                {/* RIB — aligné sur la largeur de OBJET */}
                {form.modeReglement === 'VIREMENT' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, marginTop: 10 }}>
                    <div style={{ gridColumn: '1 / 3' }}>
                      <label style={labelStyle}>RIB</label>
                      {!selectedBeneficiaire ? (
                        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', color: P.labelMuted, fontStyle: 'italic', fontSize: 12 }}>Sélectionnez un bénéficiaire</div>
                      ) : beneficiaireRibs.length === 0 ? (
                        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 6, background: P.orange + '10', color: P.orange, border: `1.5px solid ${P.orange}30`, fontSize: 12 }}>{Icons.warning(P.orange)} Aucun RIB</div>
                      ) : beneficiaireRibs.length === 1 ? (
                        <div style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'monospace' }}>
                          {beneficiaireRibs[0].banque && <span style={{ background: accent + '15', color: accent, padding: '3px 10px', borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{beneficiaireRibs[0].banque}</span>}
                          <span style={{ fontSize: 12, color: P.sidebarDark }}>{beneficiaireRibs[0].numero}</span>
                        </div>
                      ) : (
                        <select value={form.ribIndex} onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })} style={{ ...fieldStyle, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, width: 'auto' }}>
                          {beneficiaireRibs.map((rib, index) => <option key={index} value={index}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ===== DÉTAILS ===== */}
              <div style={{ marginBottom: 24 }}>
                <SectionTitle icon={Icons.fileText(accent)} label="Détails de la dépense" accent={accent} />
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16 }}>
                  <div style={{ gridColumn: '1 / 3' }}>
                    <label style={labelStyle}>OBJET *</label>
                    <textarea value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })}
                      style={{ ...editFieldStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} placeholder="Décrire l'objet de la dépense..." />
                  </div>
                  <div>
                    <label style={labelStyle}>PIÈCES JUSTIFICATIVES</label>
                    <textarea value={form.piecesJustificatives} onChange={(e) => setForm({ ...form, piecesJustificatives: e.target.value })}
                      style={{ ...editFieldStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} placeholder="Lister les pièces jointes..." />
                  </div>
                </div>
              </div>

              {/* ===== MONTANT ET BUDGET ===== */}
              <div style={{ marginBottom: 24 }}>
                <SectionTitle icon={Icons.dollar(accent)} label="Montant et budget" accent={accent} />
                {/* Ligne 1 : Montant + Ligne budg + Libellé */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>MONTANT (FCFA) *</label>
                    {form.type === 'ANNULATION' ? (
                      <input type="text" value={form.montant} onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.\-]/g, '');
                        setForm({ ...form, montant: val });
                      }}
                        style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} placeholder="0" />
                    ) : (
                      <MontantInput value={form.montant} onChange={(val) => setForm({ ...form, montant: val })}
                        style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} placeholder="0" />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>LIGNE BUDG. *</label>
                    <Autocomplete
                      options={(currentBudget?.lignes || []).map(l => ({ value: l.code, label: l.code, searchFields: [l.code, l.libelle] }))}
                      value={form.ligneBudgetaire ? { value: form.ligneBudgetaire, label: form.ligneBudgetaire } : null}
                      onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })}
                      placeholder="Code..."
                      isDisabled={form.type === 'ANNULATION' && !!form.opProvisoireId}
                      noOptionsMessage="Aucune ligne"
                      accentColor={accent}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>LIBELLÉ</label>
                    <div style={{ padding: '10px 14px', background: accent + '08', borderRadius: 8, fontSize: 12, color: P.labelMuted }}>{selectedLigne?.libelle || ''}</div>
                  </div>
                </div>
                {/* Ligne 2 : Budget + TVA alignés par le haut */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 3fr', gap: 16, alignItems: 'start' }}>
                  <div style={{ gridColumn: '1 / 3', background: P.bgApp, padding: 14, borderRadius: 12, border: `1px solid ${P.bgSection}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px' }}>
                      <span style={{ fontSize: 11, color: P.labelMuted }}>Dotation</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500, color: P.sidebarDark }}>{formatMontant(getDotation())}</span>
                      <span style={{ fontSize: 11, color: P.labelMuted }}>Engag. antérieurs</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500, color: P.sidebarDark }}>{formatMontant(getEngagementsAnterieurs())}</span>
                      <span style={{ fontSize: 11, color: P.labelMuted }}>Engag. actuel</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600, color: getEngagementActuel() < 0 ? '#2e7d32' : P.orange }}>{getEngagementActuel() >= 0 ? '+' : ''}{formatMontant(getEngagementActuel())}</span>
                      <span style={{ fontSize: 11, color: P.labelMuted }}>Engag. cumulés</span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500, color: P.sidebarDark }}>{formatMontant(getEngagementsCumules())}</span>
                      <div style={{ gridColumn: '1 / -1', height: 1, background: P.bgSection, margin: '4px 0' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: P.sidebarDark }}>Disponible</span>
                      <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 800, color: getDisponible() >= 0 ? '#2e7d32' : '#c62828' }}>{formatMontant(getDisponible())}</span>
                    </div>
                    {getDisponible() < 0 && form.type !== 'ANNULATION' && (
                      <div style={{ marginTop: 10, padding: 8, background: '#c6282810', borderRadius: 8, color: '#c62828', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.warning('#c62828')} Budget insuffisant</div>
                    )}
                  </div>
                  <div>
                    {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                      <div>
                        <label style={labelStyle}>TVA RÉCUPÉRABLE *</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {[{ val: true, lbl: 'OUI' }, { val: false, lbl: 'NON' }].map(opt => {
                            const active = form.tvaRecuperable === opt.val;
                            return (
                              <div key={opt.lbl} onClick={() => setForm({ ...form, tvaRecuperable: opt.val })}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: `1.5px solid ${active ? accent : 'rgba(34,51,0,0.08)'}`, background: active ? accent + '08' : P.bgCard, cursor: 'pointer' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${active ? accent : P.labelMuted}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accent }} />}
                                </div>
                                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? accent : P.labelMuted }}>{opt.lbl}</span>
                              </div>
                            );
                          })}
                          {form.tvaRecuperable && (
                            <MontantInput value={form.montantTVA} onChange={(val) => setForm({ ...form, montantTVA: val })} style={{ ...editFieldStyle, fontFamily: 'monospace', fontSize: 11, textAlign: 'right', width: 100, padding: '4px 8px' }} placeholder="0" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Récap paiement DEFINITIF */}
              {form.type === 'DEFINITIF' && form.opProvisoireIds.length > 0 && (() => {
                const sumProv = getSumOpProv();
                const mtDef = parseFloat(form.montant) || 0;
                const ecart = sumProv - mtDef;
                return (
                  <div style={{ marginBottom: 24, padding: 12, background: P.olivePale, borderRadius: 12, border: `1px solid ${P.olive}20` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 6 }}>{Icons.dollar('#2e7d32')} Récapitulatif — {form.opProvisoireIds.length} OP provisoire{form.opProvisoireIds.length > 1 ? 's' : ''}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, color: P.labelMuted, marginBottom: 4 }}>Total provisoire{form.opProvisoireIds.length > 1 ? 's' : ''}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: '#1565c0' }}>{formatMontant(sumProv)} F</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: P.labelMuted, marginBottom: 4 }}>Montant définitif</div>
                        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: P.sidebarDark }}>{mtDef > 0 ? formatMontant(mtDef) + ' F' : '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: P.labelMuted, marginBottom: 4 }}>Écart</div>
                        {mtDef > 0 ? (
                          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: ecart > 0 ? '#c62828' : ecart < 0 ? P.orange : '#2e7d32' }}>
                            {ecart > 0 ? '+' + formatMontant(ecart) + ' F' : ecart < 0 ? formatMontant(ecart) + ' F' : '0 F'}
                            <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                              {ecart > 0 ? <>{Icons.warning('#c62828')} Trop perçu → reversement</> : ecart < 0 ? <>{Icons.warning(P.orange)} Complément à payer</> : <>{Icons.check('#2e7d32')} Aucun écart</>}
                            </div>
                          </div>
                        ) : <div style={{ fontSize: 12, color: P.labelMuted }}>Saisir le montant définitif</div>}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ENREGISTRER */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 20, borderTop: `1px solid ${P.bgApp}` }}>
                <button onClick={handleSave} disabled={saving || (getDisponible() < 0 && form.type !== 'ANNULATION')}
                  title="Enregistrer l'OP"
                  style={{
                    width: 52, height: 52, borderRadius: '50%', border: 'none',
                    background: (getDisponible() < 0 && form.type !== 'ANNULATION') ? P.labelMuted : accent,
                    cursor: (saving || (getDisponible() < 0 && form.type !== 'ANNULATION')) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 4px 16px ${accent}40`, transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {saving ? (
                    <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>...</span>
                  ) : Icons.save('#fff')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageNouvelOp;
