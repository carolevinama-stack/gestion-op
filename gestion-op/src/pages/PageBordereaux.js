import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { ARMOIRIE, LOGO_PIF2 } from '../utils/logos';

// ============================================================
// COMPOSANTS STABLES (hors du composant principal)
// ============================================================
const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ background: bg, color, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>
));
const Empty = React.memo(({ text }) => (
  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}><div style={{ fontSize: 40, marginBottom: 10 }}>📭</div><p>{text}</p></div>
));
const STab = React.memo(({ active, label, count, color, onClick }) => (
  <button onClick={onClick} style={{ padding: '9px 16px', borderRadius: 6, border: 'none', background: active ? color : '#f5f5f5', color: active ? 'white' : '#666', fontWeight: 600, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
    {label}{count !== undefined && <span style={{ background: active ? 'rgba(255,255,255,0.25)' : '#ddd', padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{count}</span>}
  </button>
));
// Petite icône bouton
const IBtn = React.memo(({ icon, title, bg, color, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} title={title} style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: bg || P.bgSection, color: color || P.labelMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: disabled ? 0.5 : 1, transition: 'all 0.15s', padding: 0 }}>{icon}</button>
));

// ============================================================
// PALETTE PIF2 — Mindful #193
// ============================================================
const P = {
  bgApp: '#F6F4F1', bgSection: '#ECE2CE', bgCard: '#FDFCFA', inputBg: '#FFFDF5',
  sidebarDark: '#223300', olive: '#4B5D16', olivePale: '#E8F0D8',
  gold: '#C99A2B', goldPale: '#F5EDDA',
  cf: '#8B5E3C', cfDark: '#6B4530', cfPale: '#F2EBE4',
  ac: '#4B5D16', acDark: '#3A4A10', acPale: '#E8F0D8',
  arch: '#8A7D6B', archDark: '#6B5D45', archPale: '#ECE2CE',
  pay: '#223300', payPale: '#E8F0D8',
  red: '#9B2C2C', redPale: '#F5E1E1',
  labelMuted: '#8A7D6B',
};

// ============================================================
// TOAST (remplace alert)
// ============================================================
const ToastContainer = React.memo(({ toasts, onRemove }) => (
  <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
    {toasts.map(t => (
      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 9, background: P.bgCard, boxShadow: '0 4px 16px rgba(34,51,0,0.12)', borderLeft: `3px solid ${t.type === 'error' ? P.red : t.type === 'warning' ? P.gold : P.olive}`, animation: 'toastIn .25s ease' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: P.sidebarDark, flex: 1 }}>{t.message}</span>
        <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.4, fontSize: 12 }}>✕</button>
      </div>
    ))}
  </div>
));

// ============================================================
// CONFIRM BUTTON (double-clic, fit-content — remplace confirm + mdp)
// ============================================================
const ConfirmBtn = ({ label, confirmLabel, icon, bg, color, onConfirm, disabled, full }) => {
  const [c, setC] = useState(false);
  useEffect(() => { if (c) { const t = setTimeout(() => setC(false), 3000); return () => clearTimeout(t); } }, [c]);
  return <button onClick={() => { if (c) { onConfirm(); setC(false); } else setC(true); }} disabled={disabled}
    style={{ padding: '5px 10px', border: 'none', borderRadius: 6, background: c ? P.red : bg, color: c ? '#fff' : color, fontWeight: 600, fontSize: 11, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', width: full ? '100%' : 'fit-content', justifyContent: full ? 'center' : undefined }}>
    {c ? <>{confirmLabel || 'Confirmer ?'}</> : <>{icon} {label}</>}
  </button>;
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const PageBordereaux = () => {
  const { projet, sources, exercices, beneficiaires, ops, setOps, bordereaux, setBordereaux } = useAppContext();

  // === STATE ===
  const [mainTab, setMainTab] = useState('CF');
  const [subTabCF, setSubTabCF] = useState('NOUVEAU');
  const [subTabAC, setSubTabAC] = useState('NOUVEAU');
  const [subTabSuiviCF, setSubTabSuiviCF] = useState('DIFFERES');
  const [subTabSuiviAC, setSubTabSuiviAC] = useState('DIFFERES');
  const [subTabArch, setSubTabArch] = useState('A_ARCHIVER');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [selectedOps, setSelectedOps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchBT, setSearchBT] = useState('');
  const [searchSuivi, setSearchSuivi] = useState('');
  const [searchArch, setSearchArch] = useState('');

  // Drawer Retour CF
  const [drawerRetourCF, setDrawerRetourCF] = useState(false);
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');

  // Drawer Paiement AC
  const [drawerPaiement, setDrawerPaiement] = useState(null);
  const [resultatAC, setResultatAC] = useState('DIFFERE');
  const [motifRetourAC, setMotifRetourAC] = useState('');
  const [paiementMontant, setPaiementMontant] = useState('');
  const [paiementReference, setPaiementReference] = useState('');
  const [boiteDrawerPaiement, setBoiteDrawerPaiement] = useState('');

  // Drawer Archive
  const [drawerArchive, setDrawerArchive] = useState(false);
  const [boiteArchivage, setBoiteArchivage] = useState('');

  // Bordereaux UI
  const [expandedBT, setExpandedBT] = useState(null);
  const [editingBT, setEditingBT] = useState(null);
  const [showAddOps, setShowAddOps] = useState(null);
  const [editBtId, setEditBtId] = useState(null);
  const [editBtNumero, setEditBtNumero] = useState('');

  // Edit boîte archivage inline
  const [editBoiteId, setEditBoiteId] = useState(null);
  const [editBoiteVal, setEditBoiteVal] = useState('');

  // Toast
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), type === 'error' ? 5000 : 3000);
  }, []);
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  // === REFS pour dates ===
  const dateRefs = useRef({});
  const setDateRef = (key, el) => { if (el) dateRefs.current['_el_' + key] = el; };
  const readDate = (key) => dateRefs.current['_el_' + key]?.value || '';

  // === DATA ===
  const exerciceActif = exercices.find(e => e.actif);
  const currentSrc = sources.find(s => s.id === activeSourceBT);
  const opsForSource = ops.filter(op => op.sourceId === activeSourceBT && op.exerciceId === exerciceActif?.id);

  const opsEligiblesCF = opsForSource.filter(op => op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF');
  const opsTransmisCF = opsForSource.filter(op => op.statut === 'TRANSMIS_CF');
  const opsDifferesCF = opsForSource.filter(op => op.statut === 'DIFFERE_CF');
  const opsRejetesCF = opsForSource.filter(op => op.statut === 'REJETE_CF');
  const opsEligiblesAC = opsForSource.filter(op => op.statut === 'VISE_CF');
  const opsTransmisAC = opsForSource.filter(op => op.statut === 'TRANSMIS_AC' || op.statut === 'PAYE_PARTIEL');
  const opsDifferesAC = opsForSource.filter(op => op.statut === 'DIFFERE_AC');
  const opsRejetesAC = opsForSource.filter(op => op.statut === 'REJETE_AC');
  const opsAArchiver = opsForSource.filter(op => op.statut === 'PAYE');
  const opsArchives = opsForSource.filter(op => op.statut === 'ARCHIVE');

  const bordereauCF = bordereaux.filter(bt => bt.type === 'CF' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActif?.id);
  const bordereauAC = bordereaux.filter(bt => bt.type === 'AC' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActif?.id);

  // === HELPERS ===
  const getBen = (op) => op?.beneficiaireNom || beneficiaires.find(b => b.id === op?.beneficiaireId)?.nom || 'N/A';

  const filterBordereaux = (btList) => btList.filter(bt => {
    if (!searchBT) return true;
    const t = searchBT.toLowerCase();
    if ((bt.numero || '').toLowerCase().includes(t)) return true;
    return bt.opsIds?.some(opId => { const op = ops.find(o => o.id === opId); return (op?.numero || '').toLowerCase().includes(t) || getBen(op).toLowerCase().includes(t); });
  });

  const filterOpsBySearch = (opsList, term) => {
    if (!term) return opsList;
    const t = term.toLowerCase();
    return opsList.filter(op => (op.numero || '').toLowerCase().includes(t) || getBen(op).toLowerCase().includes(t) || (op.objet || '').toLowerCase().includes(t) || (op.motifDiffere || '').toLowerCase().includes(t) || (op.motifRejet || '').toLowerCase().includes(t) || (op.boiteArchivage || '').toLowerCase().includes(t));
  };

  const toggleOp = (opId) => setSelectedOps(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  const toggleAll = (opsList) => { if (selectedOps.length === opsList.length && opsList.length > 0) setSelectedOps([]); else setSelectedOps(opsList.map(o => o.id)); };
  const totalSelected = selectedOps.reduce((s, id) => s + (ops.find(o => o.id === id)?.montant || 0), 0);

  // Générer numéro BT via compteur Firestore (anti-doublon)
  const genererNumeroBTTransaction = async (typeBT) => {
    const pf = typeBT === 'CF' ? 'BT-CF' : 'BT-AC';
    const sp = projet?.sigle || 'PROJET'; const ss = currentSrc?.sigle || 'SRC';
    const a = exerciceActif?.annee || new Date().getFullYear();
    const compteurId = `${typeBT}_${activeSourceBT}_${exerciceActif?.id}`;
    const compteurRef = doc(db, 'compteurs', compteurId);
    
    const num = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(compteurRef);
      const current = snap.exists() ? (snap.data().count || 0) : 0;
      const next = current + 1;
      transaction.set(compteurRef, { count: next, type: typeBT, sourceId: activeSourceBT, exerciceId: exerciceActif?.id });
      return `${pf}-${String(next).padStart(4, '0')}/${sp}-${ss}/${a}`;
    });
    return num;
  };

  const chgTab = (t) => { setMainTab(t); setSelectedOps([]); setSearchBT(''); setExpandedBT(null); setEditingBT(null); setDrawerPaiement(null); setDrawerRetourCF(false); setDrawerArchive(false); setSearchSuivi(''); setSearchArch(''); };
  const chgSub = (fn, v) => { fn(v); setSelectedOps([]); setSearchBT(''); setExpandedBT(null); setEditingBT(null); setSearchSuivi(''); };

  // ================================================================
  // ACTIONS
  // ================================================================
  const handleCreateBordereau = async (typeBT) => {
    if (selectedOps.length === 0) { toast('Sélectionnez au moins un OP.', 'warning'); return; }
    const bf = typeBT === 'CF' ? 'bordereauCF' : 'bordereauAC';
    const eligibleStatuts = typeBT === 'CF' ? ['EN_COURS', 'DIFFERE_CF'] : ['VISE_CF'];
    const dejaUtilises = selectedOps.filter(opId => {
      const op = ops.find(o => o.id === opId);
      return !op || !eligibleStatuts.includes(op.statut) || (op[bf] && op[bf] !== '');
    });
    if (dejaUtilises.length > 0) { toast(`${dejaUtilises.length} OP déjà utilisé(s). Rafraîchissez.`, 'error'); setSelectedOps([]); return; }
    setSaving(true);
    try {
      const num = await genererNumeroBTTransaction(typeBT);
      await addDoc(collection(db, 'bordereaux'), { numero: num, type: typeBT, sourceId: activeSourceBT, exerciceId: exerciceActif.id, dateCreation: new Date().toISOString().split('T')[0], dateTransmission: null, opsIds: selectedOps, nbOps: selectedOps.length, totalMontant: totalSelected, statut: 'EN_COURS', createdAt: new Date().toISOString() });
      for (const opId of selectedOps) await updateDoc(doc(db, 'ops', opId), { [bf]: num, updatedAt: new Date().toISOString() });
      toast(`${num} créé`); setSelectedOps([]);
      if (typeBT === 'CF') setSubTabCF('BORDEREAUX'); else setSubTabAC('BORDEREAUX');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleTransmettre = async (bt) => {
    const d = readDate('trans_' + bt.id);
    if (!d) { toast('Saisissez une date.', 'warning'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'bordereaux', bt.id), { dateTransmission: d, statut: 'ENVOYE', updatedAt: new Date().toISOString() });
      const ns = bt.type === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC';
      const df = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      for (const opId of bt.opsIds) await updateDoc(doc(db, 'ops', opId), { statut: ns, [df]: d, updatedAt: new Date().toISOString() });
      toast(`${bt.numero} transmis`);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleAnnulerTransmission = async (bt) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'bordereaux', bt.id), { dateTransmission: null, statut: 'EN_COURS', updatedAt: new Date().toISOString() });
      const prevSt = bt.type === 'CF' ? 'EN_COURS' : 'VISE_CF';
      const df = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      for (const opId of bt.opsIds) {
        const op = ops.find(o => o.id === opId);
        const expected = bt.type === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC';
        if (op && op.statut === expected) await updateDoc(doc(db, 'ops', opId), { statut: prevSt, [df]: null, updatedAt: new Date().toISOString() });
      }
      toast('Transmission annulée');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleEnterEditBT = (bt) => { setEditingBT(bt.id); };

  const handleAddOpToBT = async (bt, opId) => {
    try {
      const nIds = [...bt.opsIds, opId];
      const nT = nIds.reduce((s, id) => s + (ops.find(x => x.id === id)?.montant || 0), 0);
      await updateDoc(doc(db, 'bordereaux', bt.id), { opsIds: nIds, nbOps: nIds.length, totalMontant: nT, updatedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'ops', opId), { [bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC']: bt.numero, updatedAt: new Date().toISOString() });
      setShowAddOps(null);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  };

  const handleRemoveOpFromBT = async (bt, opId) => {
    if (bt.opsIds.length <= 1) { toast('Minimum 1 OP.', 'warning'); return; }
    try {
      const nIds = bt.opsIds.filter(id => id !== opId);
      const nT = nIds.reduce((s, id) => s + (ops.find(x => x.id === id)?.montant || 0), 0);
      await updateDoc(doc(db, 'bordereaux', bt.id), { opsIds: nIds, nbOps: nIds.length, totalMontant: nT, updatedAt: new Date().toISOString() });
      const prevSt = bt.type === 'CF' ? 'EN_COURS' : 'VISE_CF';
      await updateDoc(doc(db, 'ops', opId), { [bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC']: null, statut: prevSt, updatedAt: new Date().toISOString() });
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  };

  const handleDeleteBordereau = async (bt) => {
    try {
      const ps = bt.type === 'CF' ? 'EN_COURS' : 'VISE_CF';
      const bf = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';
      const df = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      for (const opId of bt.opsIds) { const op = ops.find(o => o.id === opId); if (op) await updateDoc(doc(db, 'ops', opId), { [bf]: null, statut: ps, [df]: null, updatedAt: new Date().toISOString() }); }
      await deleteDoc(doc(db, 'bordereaux', bt.id));
      toast('Supprimé'); if (expandedBT === bt.id) setExpandedBT(null); setEditingBT(null);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  };

  // === MODIFIER N° BORDEREAU (protégé par mot de passe admin) ===
  const handleStartEditBtNumero = (bt) => {
    setEditBtId(bt.id);
    setEditBtNumero(bt.numero || '');
  };

  const handleSaveBtNumero = async (bt) => {
    const newNum = editBtNumero.trim();
    if (!newNum) { toast('Le numéro ne peut pas être vide.', 'warning'); return; }
    if (newNum === bt.numero) { setEditBtId(null); return; }
    const doublon = bordereaux.find(b => b.numero === newNum && b.id !== bt.id && b.type === bt.type);
    if (doublon) { toast('Ce numéro existe déjà.', 'warning'); return; }
    try {
      const btField = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';
      await updateDoc(doc(db, 'bordereaux', bt.id), { numero: newNum, updatedAt: new Date().toISOString() });
      for (const opId of (bt.opsIds || [])) {
        await updateDoc(doc(db, 'ops', opId), { [btField]: newNum, updatedAt: new Date().toISOString() });
      }
      setBordereaux(prev => prev.map(b => b.id === bt.id ? { ...b, numero: newNum } : b));
      setOps(prev => prev.map(o => (bt.opsIds || []).includes(o.id) ? { ...o, [btField]: newNum } : o));
      setEditBtId(null);
      toast('N° modifié');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  };

  // === RETOUR CF (BATCH via drawer) ===
  const handleRetourCF = async () => {
    if (selectedOps.length === 0) { toast('Sélectionnez des OP.', 'warning'); return; }
    const d = readDate('retourCF');
    if (!d) { toast('Date requise.', 'warning'); return; }
    if ((resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && !motifRetour.trim()) { toast('Motif obligatoire.', 'warning'); return; }
    setSaving(true);
    try {
      let upd = { updatedAt: new Date().toISOString() };
      if (resultatCF === 'VISE') { upd.statut = 'VISE_CF'; upd.dateVisaCF = d; }
      else if (resultatCF === 'DIFFERE') { upd.statut = 'DIFFERE_CF'; upd.dateDiffere = d; upd.motifDiffere = motifRetour.trim(); }
      else { upd.statut = 'REJETE_CF'; upd.dateRejet = d; upd.motifRejet = motifRetour.trim(); }
      for (const opId of selectedOps) {
        const op = ops.find(o => o.id === opId);
        const updOp = { ...upd };
        // ANNULATION visé CF → direct "À archiver" (skip AC)
        if (resultatCF === 'VISE' && op?.type === 'ANNULATION') { updOp.statut = 'PAYE'; updOp.dateVisaCF = d; }
        await updateDoc(doc(db, 'ops', opId), updOp);
      }
      const lab = resultatCF === 'VISE' ? 'Visé' : resultatCF === 'DIFFERE' ? 'Différé' : 'Rejeté';
      toast(`${selectedOps.length} OP → ${lab}`);
      setSelectedOps([]); setMotifRetour(''); setDrawerRetourCF(false);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleAnnulerRetour = async (opId, statut) => {
    const retour = ['DIFFERE_AC', 'REJETE_AC'].includes(statut) ? 'TRANSMIS_AC' : 'TRANSMIS_CF';
    setSaving(true);
    try {
      await updateDoc(doc(db, 'ops', opId), { statut: retour, dateVisaCF: null, dateDiffere: null, motifDiffere: null, dateRejet: null, motifRejet: null, updatedAt: new Date().toISOString() });
      toast('Annulation effectuée');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  // === RETOUR AC ===
  const handleRetourAC = async () => {
    if (!drawerPaiement) return;
    if (!motifRetourAC.trim()) { toast('Motif obligatoire.', 'warning'); return; }
    const d = readDate('retourAC');
    if (!d) { toast('Date requise.', 'warning'); return; }
    setSaving(true);
    try {
      let upd = { updatedAt: new Date().toISOString() };
      if (resultatAC === 'DIFFERE') { upd.statut = 'DIFFERE_AC'; upd.dateDiffere = d; upd.motifDiffere = motifRetourAC.trim(); }
      else { upd.statut = 'REJETE_AC'; upd.dateRejet = d; upd.motifRejet = motifRetourAC.trim(); }
      await updateDoc(doc(db, 'ops', drawerPaiement.id), upd);
      toast(`OP → ${resultatAC === 'DIFFERE' ? 'Différé' : 'Rejeté'} AC`); setDrawerPaiement(null); setMotifRetourAC('');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  // === PAIEMENT ===
  const handlePaiement = async (opId) => {
    const op = ops.find(o => o.id === opId);
    if (!op) return;
    const m = parseFloat(paiementMontant);
    if (!m || m <= 0) { toast('Montant invalide.', 'warning'); return; }
    const d = readDate('paiement');
    if (!d) { toast('Date requise.', 'warning'); return; }
    const paiem = op.paiements || [];
    const deja = paiem.reduce((s, p) => s + (p.montant || 0), 0);
    const reste = (op.montant || 0) - deja;
    if (m > reste + 1) { toast(`Dépasse le reste (${formatMontant(reste)} F).`, 'warning'); return; }
    const nP = [...paiem, { date: d, montant: m, reference: paiementReference.trim(), createdAt: new Date().toISOString() }];
    const tot = nP.reduce((s, p) => s + (p.montant || 0), 0);
    const solde = (op.montant || 0) - tot < 1;
    setSaving(true);
    try {
      const upd = { paiements: nP, totalPaye: tot, datePaiement: d, updatedAt: new Date().toISOString(), statut: solde ? 'PAYE' : 'PAYE_PARTIEL' };
      await updateDoc(doc(db, 'ops', opId), upd);
      toast(solde ? 'OP soldé' : 'Paiement partiel enregistré');
      setPaiementMontant(''); setPaiementReference('');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleAnnulerPaiement = async (opId) => {
    const op = ops.find(o => o.id === opId);
    const p = op?.paiements || [];
    if (p.length === 0) return;
    setSaving(true);
    try {
      const nP = p.slice(0, -1);
      const tot = nP.reduce((s, x) => s + (x.montant || 0), 0);
      const upd = { paiements: nP, totalPaye: tot, statut: nP.length > 0 ? 'PAYE_PARTIEL' : 'TRANSMIS_AC', updatedAt: new Date().toISOString() };
      if (nP.length === 0) upd.datePaiement = null;
      await updateDoc(doc(db, 'ops', opId), upd);
      toast('Paiement annulé');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  // === ARCHIVAGE ===
  const handleArchiverDirect = async (opId, boite) => {
    if (!boite || !boite.trim()) { toast('Renseignez la boîte.', 'warning'); return; }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'ops', opId), { statut: 'ARCHIVE', boiteArchivage: boite.trim(), dateArchivage: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() });
      toast('Archivé'); setDrawerPaiement(null); setBoiteDrawerPaiement('');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleArchiver = async () => {
    if (selectedOps.length === 0 || !boiteArchivage.trim()) return;
    setSaving(true);
    try {
      for (const opId of selectedOps) await updateDoc(doc(db, 'ops', opId), { statut: 'ARCHIVE', boiteArchivage: boiteArchivage.trim(), dateArchivage: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() });
      toast(`${selectedOps.length} OP archivé(s)`); setSelectedOps([]); setBoiteArchivage(''); setDrawerArchive(false);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleDesarchiver = async (opId) => {
    setSaving(true);
    try {
      const op = ops.find(o => o.id === opId);
      // Désarchiver = reculer d'1 étape → PAYE (À archiver)
      await updateDoc(doc(db, 'ops', opId), { statut: 'PAYE', boiteArchivage: null, dateArchivage: null, updatedAt: new Date().toISOString() });
      toast('Désarchivé');
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  // Annuler "À archiver" → reculer d'1 étape (ANNULATION → VISE_CF, normal → TRANSMIS_AC)
  const handleAnnulerPaye = async (opId) => {
    const op = ops.find(o => o.id === opId);
    const prev = op?.type === 'ANNULATION' ? 'VISE_CF' : (op?.totalPaye > 0 ? 'PAYE_PARTIEL' : 'TRANSMIS_AC');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'ops', opId), { statut: prev, updatedAt: new Date().toISOString() });
      toast(`OP → ${prev === 'VISE_CF' ? 'Visé CF' : 'Transmis AC'}`);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleModifierBoite = (opId) => {
    const op = ops.find(o => o.id === opId);
    setEditBoiteId(opId);
    setEditBoiteVal(op?.boiteArchivage || '');
  };

  const handleSaveBoite = async (opId) => {
    if (!editBoiteVal.trim()) { toast('Boîte vide.', 'warning'); return; }
    try {
      await updateDoc(doc(db, 'ops', opId), { boiteArchivage: editBoiteVal.trim(), updatedAt: new Date().toISOString() });
      toast('Boîte modifiée');
      setEditBoiteId(null);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
  };

  // === RÉINTRODUIRE ===
  const handleReintroduire = async (opIds, type = 'CF') => {
    const d = readDate('reintro');
    if (!d) { toast('Date requise.', 'warning'); return; }
    setSaving(true);
    try {
      for (const opId of opIds) {
        const op = ops.find(o => o.id === opId);
        const hist = [...(op?.historiqueDifferes || []), { dateDiffere: op?.dateDiffere, motifDiffere: op?.motifDiffere, dateReintroduction: d, type }];
        const upd = { statut: type === 'CF' ? 'EN_COURS' : 'TRANSMIS_AC', dateReintroduction: d, historiqueDifferes: hist, dateDiffere: null, motifDiffere: null, updatedAt: new Date().toISOString() };
        if (type === 'CF') { upd.bordereauCF = null; upd.dateTransmissionCF = null; }
        await updateDoc(doc(db, 'ops', opId), upd);
      }
      toast(`${opIds.length} OP réintroduit(s)`); setSelectedOps([]);
    } catch (e) { toast('Erreur : ' + e.message, 'error'); }
    setSaving(false);
  };

  // === CONVERSION MONTANT EN LETTRES ===
  const montantEnLettres = (n) => {
    if (n === 0) return 'zéro';
    const u = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const d = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
    const convertBlock = (num) => {
      if (num === 0) return '';
      if (num < 20) return u[num];
      if (num < 100) {
        const diz = Math.floor(num / 10);
        const rest = num % 10;
        if (diz === 7 || diz === 9) return d[diz] + (rest === 0 ? '-dix' : (rest === 1 && diz === 7 ? ' et onze' : '-' + u[10 + rest]));
        if (rest === 0) return d[diz] + (diz === 8 ? 's' : '');
        if (rest === 1 && diz < 8) return d[diz] + ' et un';
        return d[diz] + '-' + u[rest];
      }
      const cent = Math.floor(num / 100);
      const rest = num % 100;
      let r = cent === 1 ? 'cent' : u[cent] + ' cent';
      if (rest === 0 && cent > 1) r += 's';
      else if (rest > 0) r += ' ' + convertBlock(rest);
      return r;
    };
    const groups = [
      { val: 1000000000, label: 'milliard', labelP: 'milliards' },
      { val: 1000000, label: 'million', labelP: 'millions' },
      { val: 1000, label: 'mille', labelP: 'mille' },
      { val: 1, label: '', labelP: '' }
    ];
    let result = '';
    let remaining = Math.floor(Math.abs(n));
    for (const g of groups) {
      const count = Math.floor(remaining / g.val);
      remaining = remaining % g.val;
      if (count === 0) continue;
      if (g.val === 1) { result += (result ? ' ' : '') + convertBlock(count); continue; }
      if (g.val === 1000 && count === 1) { result += (result ? ' ' : '') + 'mille'; continue; }
      result += (result ? ' ' : '') + convertBlock(count) + ' ' + (count > 1 ? g.labelP : g.label);
    }
    return result.trim();
  };

  // === IMPRESSION ===
  const handlePrintBordereau = (bt) => {
    const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const nbEx = bt.type === 'CF' ? (projet?.nbExemplairesCF || 4) : (projet?.nbExemplairesAC || 2);
    const rows = btOps.map((op, i) => `<tr><td style="text-align:center">${i+1}</td><td>${getBen(op)}</td><td>${op.objet||'-'}</td><td style="text-align:center;font-family:monospace;font-size:9px;font-weight:bold">${op.numero}</td><td style="text-align:center">${nbEx}</td><td style="text-align:right;font-family:monospace;font-weight:bold">${Number(op.montant||0).toLocaleString('fr-FR')}</td></tr>`).join('');
    const dest = bt.type === 'CF' ? 'au Contrôleur Financier' : "à l'Agent Comptable";
    const destM = bt.type === 'CF' ? 'Monsieur le Contrôleur Financier' : "Monsieur l'Agent Comptable";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${bt.numero}</title>
<style>
  @page{size:A4 landscape;margin:10mm}
  @media print{.tb{display:none!important}body{background:#fff!important}.pg{box-shadow:none!important;margin:0!important}}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Century Gothic','Trebuchet MS',sans-serif;font-size:11px;background:#e0e0e0}
  .tb{background:#1a1a2e;padding:12px 20px;display:flex;gap:12px;align-items:center;position:sticky;top:0;z-index:100}
  .tb button{padding:8px 20px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;background:#2196F3;color:white}
  .tb span{color:rgba(255,255,255,0.7);margin-left:auto;font-size:12px}
  .pg{width:297mm;min-height:210mm;margin:20px auto;background:white;padding:12mm 15mm;box-shadow:0 2px 10px rgba(0,0,0,0.3)}
  .hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px}
  .hd-left{width:15%}
  .hd-left img{max-width:100px}
  .hd-center{width:55%;text-align:center;font-size:10px;line-height:1.5}
  .hd-center .sep{width:180px;border:none;border-top:1px solid #333;margin:3px auto}
  .hd-right{width:15%;text-align:center}
  .hd-right img{max-width:75px;margin:0 auto;display:block}
  .hd-right .dev{font-size:9px;font-style:italic;margin-top:2px;text-align:center}
  .fin{text-align:center;font-style:italic;font-size:10px;color:#0066aa;margin:8px 0 15px}
  .dw{display:flex;justify-content:flex-end;margin-bottom:20px}
  .db{text-align:left;font-size:11px;line-height:1.8}
  .bt-title{text-align:center;font-size:13px;font-weight:bold;text-decoration:underline;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-bottom:15px}
  th{border:1px solid #000;padding:8px 6px;font-size:10px;font-weight:bold;text-align:center;background:#f5f5f5}
  td{border:1px solid #000;padding:8px 6px;font-size:10px}
  .tot td{font-weight:bold;font-size:11px}
  .arr{font-size:11px;margin:15px 0}
  .obs{font-size:11px;margin-bottom:20px}
  .obs strong{text-decoration:underline}
  .sw{display:flex;justify-content:flex-end;margin-top:20px;margin-right:40px}
  .sb{text-align:center;width:250px}
  .sb .tit{font-weight:bold;font-size:11px}
  .sb .nom{font-weight:bold;font-size:11px;text-decoration:underline;margin-top:70px}
</style></head><body>
<div class="tb"><button onclick="window.print()">🖨️ Imprimer</button><span>Aperçu – ${bt.numero}</span></div>
<div class="pg">
  <div class="hd">
    <div class="hd-left"><img src="${LOGO_PIF2}" alt="PIF2"/></div>
    <div class="hd-center">
      <div style="font-weight:bold;font-size:11px;text-transform:uppercase">REPUBLIQUE DE CÔTE D'IVOIRE</div>
      <hr class="sep"/>
      <div style="font-weight:bold;font-style:italic">${projet?.ministere||''}</div>
      <hr class="sep"/>
      <div style="font-weight:bold;font-size:11px">${projet?.nomProjet||''}</div>
      <hr class="sep"/>
    </div>
    <div class="hd-right"><img src="${ARMOIRIE}" alt="Armoirie"/><div class="dev">Union – Discipline – Travail</div></div>
  </div>
  <div class="fin">Financement Groupe Banque Mondiale : Projet N° TF088829-CI, Crédit IDA N° 7187-CI</div>
  <div class="dw"><div class="db">Abidjan le,<br/>A ${destM}<br/>auprès du ${projet?.sigle||'PIF 2'}<br/><strong>ABIDJAN</strong></div></div>
  <div class="bt-title">BORDEREAU DE TRANSMISSION D'ORDRE DE PAIEMENT DIRECT N° ${bt.numero}</div>
  <table><thead><tr>
    <th style="width:70px">N° D'ORDRE</th>
    <th style="width:150px">BENEFICIAIRES</th>
    <th>OBJET</th>
    <th style="width:160px">N°DE L'OP</th>
    <th style="width:120px">NOMBRE<br/>D'EXEMPLAIRES DE<br/>L'OP</th>
    <th style="width:120px">MONTANT NET<br/>F CFA</th>
  </tr></thead><tbody>${rows}
    <tr class="tot"><td colspan="5" style="text-align:center;font-weight:bold">MONTANT TOTAL</td><td style="text-align:right;font-family:monospace;font-weight:bold">${Number(bt.totalMontant||0).toLocaleString('fr-FR')}</td></tr>
  </tbody></table>
  <div class="arr">Arrêté le présent bordereau à la somme de: <strong><em>${montantEnLettres(Number(bt.totalMontant||0))} Francs CFA</em></strong></div>
  ${bt.observations ? '<div class="obs"><strong>OBSERVATIONS</strong>: ' + bt.observations + '</div>' : ''}
  <div class="sw"><div class="sb"><div class="tit">${projet?.titreCoordonnateur||'LA COORDONNATRICE DU PIF 2'}</div><div class="nom">${projet?.coordonnateur||''}</div></div></div>
</div></body></html>`;
    const w = window.open('', '_blank', 'width=1100,height=700'); w.document.write(html); w.document.close();
  };

  // ================================================================
  // STYLES
  // ================================================================
  const drawerS = { position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, background: 'white', zIndex: 100, boxShadow: '-8px 0 32px rgba(12,74,94,0.12)', borderRadius: '20px 0 0 20px', display: 'flex', flexDirection: 'column' };
  const overlayS = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(12,74,94,0.08)', zIndex: 90 };
  const iStyle = { ...styles.input, marginBottom: 0, width: '100%' };

  // ================================================================
  // RENDU BORDEREAU (réutilisable CF/AC)
  // ================================================================
  const renderBordereaux = (btList, typeBT) => {
    const avails = typeBT === 'CF' ? opsForSource.filter(op => (op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF')) : opsForSource.filter(op => op.statut === 'VISE_CF');
    return <div style={styles.card}>
      <input type="text" placeholder="Rechercher bordereau ou OP..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...styles.input, marginBottom: 16, maxWidth: 400 }} />
      {filterBordereaux(btList).length === 0 ? <Empty text="Aucun bordereau" /> :
      <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {filterBordereaux(btList).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(bt => {
          const isExp = expandedBT === bt.id;
          const isPrep = bt.statut === 'EN_COURS';
          const isEdit = editingBT === bt.id;
          const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
          const availForBT = avails.filter(op => !bt.opsIds.includes(op.id));
          return <div key={bt.id} style={{ marginBottom: 2 }}>
            {/* Ligne compacte */}
            <div onClick={() => { setExpandedBT(isExp ? null : bt.id); setEditingBT(null); setShowAddOps(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isExp ? P.cfPale : isPrep ? P.goldPale : 'white', borderRadius: isExp ? '10px 10px 0 0' : 10, border: isExp ? `1px solid ${P.cf}` : isPrep ? `1px dashed ${P.gold}` : '1px solid #e0e0e0', borderBottom: isExp ? 'none' : undefined, cursor: 'pointer' }}>
              <span style={{ fontSize: 11, color: P.labelMuted, transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, minWidth: 200 }} onClick={e => e.stopPropagation()}>
                {editBtId === bt.id ? (
                  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                    <input value={editBtNumero} onChange={e => setEditBtNumero(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveBtNumero(bt); if (e.key === 'Escape') setEditBtId(null); }} style={{ ...styles.input, marginBottom: 0, fontSize: 11, fontFamily: 'monospace', fontWeight: 700, padding: '4px 8px', width: 180 }} autoFocus onClick={e => e.stopPropagation()} />
                    <button onClick={e => { e.stopPropagation(); handleSaveBtNumero(bt); }} style={{ border: 'none', background: P.ac, color: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>✓</button>
                    <button onClick={e => { e.stopPropagation(); setEditBtId(null); }} style={{ border: 'none', background: '#999', color: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>✕</button>
                  </span>
                ) : bt.numero}
              </span>
              <span style={{ fontSize: 12, color: P.labelMuted, minWidth: 90 }}>{bt.dateTransmission || bt.dateCreation}</span>
              <Badge bg={isPrep ? P.goldPale : P.acPale} color={isPrep ? P.gold : P.ac}>{isPrep ? 'En cours' : 'Transmis'}</Badge>
              <span style={{ fontSize: 12, color: P.labelMuted }}>{bt.nbOps} OP</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, marginLeft: 'auto' }}>{formatMontant(bt.totalMontant)} F</span>
              <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} onClick={e => e.stopPropagation()}>
                <IBtn icon="🖨️" title="Imprimer" bg={P.cfPale} color={P.cf} onClick={() => handlePrintBordereau(bt)} />
                <IBtn icon="🔢" title="Modifier le numéro" bg={P.payPale} color={P.pay} onClick={() => handleStartEditBtNumero(bt)} />
                {bt.statut === 'ENVOYE' && <IBtn icon="↩" title="Annuler la transmission" bg={P.cfPale} color={P.gold} onClick={() => handleAnnulerTransmission(bt)} disabled={saving} />}
                <IBtn icon="🗑️" title="Supprimer le bordereau" bg={P.redPale} color={P.red} onClick={() => handleDeleteBordereau(bt)} />
              </div>
            </div>
            {/* Détail déplié */}
            {isExp && <div style={{ border: `1px solid ${P.cf}`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16, background: 'white' }}>
              {/* Transmission */}
              {isPrep && <div style={{ background: P.goldPale, borderRadius: 8, padding: 12, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: P.gold }}>Date :</span>
                <input type="date" defaultValue={bt.dateTransmission || ''} ref={el => setDateRef('trans_' + bt.id, el)} style={{ ...styles.input, marginBottom: 0, width: 170 }} />
                <button onClick={() => handleTransmettre(bt)} disabled={saving} style={{ background: P.ac, color: 'white', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>✓ Transmettre</button>
              </div>}
              {/* Icônes Modifier / Annuler / Valider */}
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                {!isEdit && <IBtn icon="✏️" title="Modifier" bg={P.bgSection} color={P.labelMuted} onClick={() => handleEnterEditBT(bt)} />}
                {isEdit && <>
                  <IBtn icon="✕" title="Annuler les modifications" bg={P.redPale} color={P.red} onClick={() => { setEditingBT(null); setShowAddOps(null); }} />
                  <IBtn icon="✓" title="Valider les modifications" bg={P.acPale} color={P.ac} onClick={() => setEditingBT(null)} />
                </>}
              </div>
              {/* Table OPs */}
              <table style={{ ...styles.table, fontSize: 11 }}><thead><tr>
                <th style={{ ...styles.th, width: 30 }}>N°</th><th style={{ ...styles.th, width: 120 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={styles.th}>OBJET</th><th style={{ ...styles.th, width: 100, textAlign: 'right' }}>MONTANT</th>
                {isEdit && <th style={{ ...styles.th, width: 40 }}></th>}
              </tr></thead><tbody>
                {btOps.map((op, i) => <tr key={op.id}>
                  <td style={styles.td}>{i+1}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 11 }}>{getBen(op)}</td>
                  <td style={{ ...styles.td, fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                  {isEdit && <td style={{ ...styles.td, textAlign: 'center' }}><IBtn icon="✕" title="Retirer" bg={P.redPale} color={P.red} onClick={() => handleRemoveOpFromBT(bt, op.id)} /></td>}
                </tr>)}
              </tbody></table>
              {/* Ajouter OP en mode édition */}
              {isEdit && <div style={{ marginTop: 8 }}>
                <button onClick={() => setShowAddOps(showAddOps === bt.id ? null : bt.id)} style={{ background: P.acPale, color: P.ac, border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{showAddOps === bt.id ? '✕ Fermer' : '➕ Ajouter'}</button>
                {showAddOps === bt.id && <div style={{ marginTop: 8, padding: 12, background: P.acPale, borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {availForBT.length === 0 ? <span style={{ fontSize: 12, color: '#999' }}>Aucun OP disponible</span> :
                  availForBT.map(op => <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: `1px solid ${P.acPale}` }}>
                    <span style={{ fontSize: 11 }}><strong style={{ fontFamily: 'monospace' }}>{op.numero}</strong> — {getBen(op)} — {formatMontant(op.montant)} F</span>
                    <IBtn icon="+" title="Ajouter" bg="#2e7d32" color="white" onClick={() => handleAddOpToBT(bt, op.id)} />
                  </div>)}
                </div>}
              </div>}
            </div>}
          </div>;
        })}
      </div>}
    </div>;
  };

  // ================================================================
  // RENDU OP TABLE (réutilisable)
  // ================================================================
  const renderOpTable = (opsList, cols, onRow) => (
    <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 8 }}>
      <table style={styles.table}><thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
        {cols.map((c, i) => <th key={i} style={{ ...styles.th, ...c.style }}>{c.label}</th>)}
      </tr></thead><tbody>{opsList.map(onRow)}</tbody></table>
    </div>
  );

  // ================================================================
  // RENDU SUIVI (réutilisable CF/AC)
  // ================================================================
  const renderSuivi = (differes, rejetes, type = 'CF', subTab, setSubTab) => {
    return <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <STab active={subTab === 'DIFFERES'} label="Différés" count={differes.length} color={P.gold} onClick={() => { setSubTab('DIFFERES'); setSelectedOps([]); }} />
        <STab active={subTab === 'REJETES'} label="Rejetés" count={rejetes.length} color={P.red} onClick={() => { setSubTab('REJETES'); setSelectedOps([]); }} />
      </div>
      <div style={{ marginBottom: 12 }}><input type="text" placeholder="Rechercher..." value={searchSuivi} onChange={e => setSearchSuivi(e.target.value)} style={{ ...styles.input, maxWidth: 400, marginBottom: 0 }} /></div>

      {subTab === 'DIFFERES' && <div style={styles.card}>
        {filterOpsBySearch(differes, searchSuivi).length === 0 ? <Empty text="Aucun différé" /> : <>
        <div style={{ maxHeight: 350, overflowY: 'auto' }}>
          <table style={styles.table}><thead><tr>
            <th style={{ ...styles.th, width: 36 }}><input type="checkbox" checked={selectedOps.length === filterOpsBySearch(differes, searchSuivi).length && selectedOps.length > 0} onChange={() => toggleAll(filterOpsBySearch(differes, searchSuivi))} /></th>
            <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={{ ...styles.th, width: 100, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 90 }}>DATE</th><th style={styles.th}>MOTIF</th><th style={{ ...styles.th, width: 36 }}></th>
          </tr></thead><tbody>{filterOpsBySearch(differes, searchSuivi).map(op => {
            const ch = selectedOps.includes(op.id);
            return <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: ch ? P.goldPale : 'transparent' }}>
              <td style={styles.td}><input type="checkbox" checked={ch} onChange={() => toggleOp(op.id)} /></td>
              <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td>
              <td style={{ ...styles.td, fontSize: 12 }}>{getBen(op)}</td>
              <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
              <td style={{ ...styles.td, fontSize: 12 }}>{op.dateDiffere || '-'}</td>
              <td style={{ ...styles.td, fontSize: 11 }}>{op.motifDiffere || '-'}</td>
              <td style={styles.td} onClick={e => e.stopPropagation()}><IBtn icon="↩" title="Annuler" bg={P.cfPale} color={P.gold} onClick={() => handleAnnulerRetour(op.id, type === 'CF' ? 'DIFFERE_CF' : 'DIFFERE_AC')} /></td>
            </tr>;
          })}</tbody></table>
        </div>
        {selectedOps.length > 0 && selectedOps.some(id => differes.find(o => o.id === id)) && <div style={{ marginTop: 12, padding: 12, background: P.goldPale, borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Date</label>
            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el => setDateRef('reintro', el)} style={{ ...styles.input, marginBottom: 0, width: 170 }} />
          </div>
          <button onClick={() => handleReintroduire(selectedOps, type)} disabled={saving} style={{ ...styles.button, padding: '10px 24px', background: P.gold, marginBottom: 0 }}>{saving ? '...' : `Réintroduire (${selectedOps.length})`}</button>
        </div>}
        </>}
      </div>}

      {subTab === 'REJETES' && <div style={styles.card}>
        {filterOpsBySearch(rejetes, searchSuivi).length === 0 ? <Empty text="Aucun rejeté" /> :
        <div style={{ maxHeight: 350, overflowY: 'auto' }}>
          <table style={styles.table}><thead><tr>
            <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={{ ...styles.th, width: 100, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 90 }}>DATE</th><th style={styles.th}>MOTIF</th><th style={{ ...styles.th, width: 36 }}></th>
          </tr></thead><tbody>{filterOpsBySearch(rejetes, searchSuivi).map(op => (
            <tr key={op.id} style={{ background: P.redPale }}>
              <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td>
              <td style={{ ...styles.td, fontSize: 12 }}>{getBen(op)}</td>
              <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: P.red }}>{formatMontant(op.montant)}</td>
              <td style={{ ...styles.td, fontSize: 12 }}>{op.dateRejet || '-'}</td>
              <td style={{ ...styles.td, fontSize: 11 }}>{op.motifRejet || '-'}</td>
              <td style={styles.td}><IBtn icon="↩" title="Annuler le rejet" bg={P.redPale} color={P.red} onClick={() => handleAnnulerRetour(op.id, type === 'CF' ? 'REJETE_CF' : 'REJETE_AC')} /></td>
            </tr>
          ))}</tbody></table>
        </div>}
      </div>}
    </div>;
  };

  // ================================================================
  // RENDU PRINCIPAL
  // ================================================================
  return (
    <div>
      <style>{`@keyframes toastIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div style={{ background: '#1a1a2e', color: 'white', padding: '20px 24px', borderRadius: '10px 10px 0 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Circuit de validation</h1>
      </div>
      {/* Sources */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 0', flexWrap: 'wrap' }}>
        {sources.map(src => (
          <button key={src.id} onClick={() => { setActiveSourceBT(src.id); setSelectedOps([]); setExpandedBT(null); setEditingBT(null); setDrawerPaiement(null); setDrawerRetourCF(false); setDrawerArchive(false); }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: activeSourceBT === src.id ? (src.couleur || '#0f4c3a') : '#f0f0f0', color: activeSourceBT === src.id ? 'white' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>{src.sigle}</button>
        ))}
      </div>
      {/* Onglets principaux */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{ k: 'CF', l: 'Contrôle Financier', c: P.cf }, { k: 'AC', l: 'Agent Comptable', c: P.ac }, { k: 'ARCHIVES', l: 'Archives', c: P.arch }].map(t => (
          <button key={t.k} onClick={() => chgTab(t.k)} style={{ flex: 1, padding: '14px 12px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: mainTab === t.k ? t.c : '#e0e0e0', color: mainTab === t.k ? 'white' : '#666', borderRadius: 8 }}>{t.l}</button>
        ))}
      </div>

      {/* ===== CF ===== */}
      {mainTab === 'CF' && <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <STab active={subTabCF === 'NOUVEAU'} label="Nouveau BT" count={opsEligiblesCF.length} color={P.cf} onClick={() => chgSub(setSubTabCF, 'NOUVEAU')} />
          <STab active={subTabCF === 'BORDEREAUX'} label="Bordereaux" count={bordereauCF.length} color={P.cfDark} onClick={() => chgSub(setSubTabCF, 'BORDEREAUX')} />
          <STab active={subTabCF === 'RETOUR'} label="Retour CF" count={opsTransmisCF.length} color={P.gold} onClick={() => chgSub(setSubTabCF, 'RETOUR')} />
          <STab active={subTabCF === 'SUIVI'} label="Suivi" count={opsDifferesCF.length + opsRejetesCF.length} color={P.red} onClick={() => chgSub(setSubTabCF, 'SUIVI')} />
        </div>

        {/* Nouveau BT CF */}
        {subTabCF === 'NOUVEAU' && <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: P.cf }}>Sélectionner les OP pour un bordereau au CF</h3>
          <input type="text" placeholder="Rechercher OP..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...styles.input, marginBottom: 12, maxWidth: 400 }} />
          {filterOpsBySearch(opsEligiblesCF, searchBT).length === 0 ? <Empty text="Aucun OP" /> :
          <div style={{ maxHeight: 450, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <table style={styles.table}><thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
              <th style={{ ...styles.th, width: 36 }}><input type="checkbox" checked={selectedOps.length === filterOpsBySearch(opsEligiblesCF, searchBT).length && filterOpsBySearch(opsEligiblesCF, searchBT).length > 0} onChange={() => toggleAll(filterOpsBySearch(opsEligiblesCF, searchBT))} /></th>
              <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={styles.th}>OBJET</th><th style={{ ...styles.th, width: 70 }}>LIGNE</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 80 }}>STATUT</th>
            </tr></thead><tbody>
              {filterOpsBySearch(opsEligiblesCF, searchBT).map(op => {
                const ch = selectedOps.includes(op.id);
                return <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: ch ? P.cfPale : 'transparent' }}>
                  <td style={styles.td}><input type="checkbox" checked={ch} onChange={() => toggleOp(op.id)} /></td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{getBen(op)}</td>
                  <td style={{ ...styles.td, fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire || '-'}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                  <td style={styles.td}><Badge bg={op.statut === 'DIFFERE_CF' ? P.goldPale : P.cfPale} color={op.statut === 'DIFFERE_CF' ? P.gold : P.cf}>{op.statut === 'DIFFERE_CF' ? 'Différé' : 'En cours'}</Badge></td>
                </tr>;
              })}
            </tbody></table>
          </div>}
          {selectedOps.length > 0 && <div style={{ marginTop: 16, padding: 16, background: P.cfPale, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{selectedOps.length} OP — {formatMontant(totalSelected)} F</div>
            <button onClick={() => handleCreateBordereau('CF')} disabled={saving} style={{ ...styles.button, padding: '8px 16px', fontSize: 13, background: P.cf, width: '100%' }}>{saving ? '...' : 'Créer le bordereau'}</button>
          </div>}
        </div>}

        {/* Bordereaux CF */}
        {subTabCF === 'BORDEREAUX' && renderBordereaux(bordereauCF, 'CF')}

        {/* Retour CF - sélection + drawer */}
        {subTabCF === 'RETOUR' && <div style={styles.card}>
          <h3 style={{ margin: '0 0 6px', color: P.cf }}>OP transmis au CF ({opsTransmisCF.length})</h3>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Sélectionnez puis cliquez ✓ pour ouvrir le panneau retour.</p>
          <input type="text" placeholder="Rechercher..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...styles.input, marginBottom: 12, maxWidth: 400 }} />
          {filterOpsBySearch(opsTransmisCF, searchBT).length === 0 ? <Empty text="Aucun OP" /> :
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <table style={styles.table}><thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
              <th style={{ ...styles.th, width: 36 }}><input type="checkbox" checked={selectedOps.length === filterOpsBySearch(opsTransmisCF, searchBT).length && filterOpsBySearch(opsTransmisCF, searchBT).length > 0} onChange={() => toggleAll(filterOpsBySearch(opsTransmisCF, searchBT))} /></th>
              <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 100 }}>N° BT</th><th style={{ ...styles.th, width: 90 }}>TRANSMIS</th>
            </tr></thead><tbody>
              {filterOpsBySearch(opsTransmisCF, searchBT).map(op => {
                const ch = selectedOps.includes(op.id);
                return <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: ch ? P.cfPale : 'transparent' }}>
                  <td style={styles.td}><input type="checkbox" checked={ch} onChange={() => toggleOp(op.id)} /></td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{getBen(op)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 9 }}>{op.bordereauCF || '-'}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{op.dateTransmissionCF || '-'}</td>
                </tr>;
              })}
            </tbody></table>
          </div>}
          {selectedOps.length > 0 && <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button onClick={() => { setDrawerRetourCF(true); setResultatCF('VISE'); setMotifRetour(''); }} style={{ padding: '8px 16px', background: P.cf, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Retour CF ({selectedOps.length} OP) →</button>
          </div>}
        </div>}

        {/* Suivi CF */}
        {subTabCF === 'SUIVI' && renderSuivi(opsDifferesCF, opsRejetesCF, 'CF', subTabSuiviCF, setSubTabSuiviCF)}
      </div>}

      {/* ===== AC ===== */}
      {mainTab === 'AC' && <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <STab active={subTabAC === 'NOUVEAU'} label="Nouveau BT" count={opsEligiblesAC.length} color={P.ac} onClick={() => chgSub(setSubTabAC, 'NOUVEAU')} />
          <STab active={subTabAC === 'BORDEREAUX'} label="Bordereaux" count={bordereauAC.length} color={P.acDark} onClick={() => chgSub(setSubTabAC, 'BORDEREAUX')} />
          <STab active={subTabAC === 'PAIEMENT'} label="Paiements" count={opsTransmisAC.length} color={P.pay} onClick={() => chgSub(setSubTabAC, 'PAIEMENT')} />
          <STab active={subTabAC === 'SUIVI'} label="Suivi" count={opsDifferesAC.length + opsRejetesAC.length} color={P.red} onClick={() => chgSub(setSubTabAC, 'SUIVI')} />
        </div>

        {/* Nouveau BT AC */}
        {subTabAC === 'NOUVEAU' && <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: P.ac }}>OP visés pour un bordereau à l'AC</h3>
          <input type="text" placeholder="Rechercher..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...styles.input, marginBottom: 12, maxWidth: 400 }} />
          {filterOpsBySearch(opsEligiblesAC, searchBT).length === 0 ? <Empty text="Aucun OP visé" /> :
          <div style={{ maxHeight: 450, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <table style={styles.table}><thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
              <th style={{ ...styles.th, width: 36 }}><input type="checkbox" checked={selectedOps.length === filterOpsBySearch(opsEligiblesAC, searchBT).length && filterOpsBySearch(opsEligiblesAC, searchBT).length > 0} onChange={() => toggleAll(filterOpsBySearch(opsEligiblesAC, searchBT))} /></th>
              <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={styles.th}>OBJET</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 90 }}>VISA CF</th><th style={{ ...styles.th, width: 36 }}></th>
            </tr></thead><tbody>
              {filterOpsBySearch(opsEligiblesAC, searchBT).map(op => {
                const ch = selectedOps.includes(op.id);
                return <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: ch ? P.acPale : 'transparent' }}>
                  <td style={styles.td}><input type="checkbox" checked={ch} onChange={() => toggleOp(op.id)} /></td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{getBen(op)}</td>
                  <td style={{ ...styles.td, fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{op.dateVisaCF || '-'}</td>
                  <td style={styles.td} onClick={e => e.stopPropagation()}><IBtn icon="↩" title="Annuler le visa CF" bg={P.cfPale} color={P.gold} onClick={() => handleAnnulerRetour(op.id, 'VISE_CF')} /></td>
                </tr>;
              })}
            </tbody></table>
          </div>}
          {selectedOps.length > 0 && <div style={{ marginTop: 16, padding: 16, background: P.acPale, borderRadius: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{selectedOps.length} OP — {formatMontant(totalSelected)} F</div>
            <button onClick={() => handleCreateBordereau('AC')} disabled={saving} style={{ ...styles.button, padding: '8px 16px', fontSize: 13, background: P.ac, width: '100%' }}>{saving ? '...' : 'Créer le bordereau'}</button>
          </div>}
        </div>}

        {/* Bordereaux AC */}
        {subTabAC === 'BORDEREAUX' && renderBordereaux(bordereauAC, 'AC')}

        {/* Paiements AC */}
        {subTabAC === 'PAIEMENT' && <div style={styles.card}>
          <h3 style={{ margin: '0 0 6px', color: P.pay }}>Paiements ({opsTransmisAC.length})</h3>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Cliquez sur un OP pour gérer.</p>
          <input type="text" placeholder="Rechercher..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...styles.input, marginBottom: 12, maxWidth: 400 }} />
          {filterOpsBySearch(opsTransmisAC, searchBT).length === 0 ? <Empty text="Aucun OP" /> :
          <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            {filterOpsBySearch(opsTransmisAC, searchBT).map(op => {
              const paiem = op.paiements || [];
              const tot = paiem.reduce((s, p) => s + (p.montant || 0), 0);
              const reste = (op.montant || 0) - tot;
              return <div key={op.id} onClick={() => { setDrawerPaiement(op); setPaiementMontant(''); setPaiementReference(''); setMotifRetourAC(''); setBoiteDrawerPaiement(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: 10, marginBottom: 4, cursor: 'pointer', background: drawerPaiement?.id === op.id ? '#faf5ff' : 'white' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{op.numero}</span>
                <span style={{ fontSize: 12, flex: 1 }}>{getBen(op)}</span>
                {tot > 0 && <Badge bg={P.payPale} color={P.pay}>{Math.round(tot / (op.montant || 1) * 100)}%</Badge>}
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{formatMontant(op.montant)} F</span>
                {tot > 0 && <span style={{ fontSize: 11, color: reste > 0 ? P.red : P.ac }}>Reste {formatMontant(reste)}</span>}
                <span style={{ color: P.pay, fontSize: 14 }}>→</span>
              </div>;
            })}
          </div>}
        </div>}

        {/* Suivi AC */}
        {subTabAC === 'SUIVI' && renderSuivi(opsDifferesAC, opsRejetesAC, 'AC', subTabSuiviAC, setSubTabSuiviAC)}
      </div>}

      {/* ===== ARCHIVES ===== */}
      {mainTab === 'ARCHIVES' && <div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <STab active={subTabArch === 'A_ARCHIVER'} label="À archiver" count={opsAArchiver.length} color={P.arch} onClick={() => chgSub(setSubTabArch, 'A_ARCHIVER')} />
          <STab active={subTabArch === 'ARCHIVES'} label="Archivés" count={opsArchives.length} color={P.archDark} onClick={() => chgSub(setSubTabArch, 'ARCHIVES')} />
        </div>

        {/* À archiver */}
        {subTabArch === 'A_ARCHIVER' && <div style={styles.card}>
          <h3 style={{ margin: '0 0 6px', color: P.arch }}>OP soldés — prêts à archiver</h3>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Les OP soldés et les annulations visées apparaissent ici. Sélectionnez puis cliquez Archiver →</p>
          <input type="text" placeholder="Rechercher..." value={searchArch} onChange={e => setSearchArch(e.target.value)} style={{ ...styles.input, marginBottom: 12, maxWidth: 400 }} />
          {filterOpsBySearch(opsAArchiver, searchArch).length === 0 ? <Empty text="Aucun OP à archiver" /> :
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <table style={styles.table}><thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
              <th style={{ ...styles.th, width: 36 }}><input type="checkbox" checked={selectedOps.length === filterOpsBySearch(opsAArchiver, searchArch).length && filterOpsBySearch(opsAArchiver, searchArch).length > 0} onChange={() => toggleAll(filterOpsBySearch(opsAArchiver, searchArch))} /></th>
              <th style={{ ...styles.th, width: 50 }}>TYPE</th>
              <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 100 }}>DATE</th><th style={{ ...styles.th, width: 40 }}></th>
            </tr></thead><tbody>
              {filterOpsBySearch(opsAArchiver, searchArch).map(op => {
                const ch = selectedOps.includes(op.id);
                const isAnnul = op.type === 'ANNULATION';
                return <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: ch ? P.archPale : 'transparent' }}>
                  <td style={styles.td}><input type="checkbox" checked={ch} onChange={() => toggleOp(op.id)} /></td>
                  <td style={styles.td}><Badge bg={isAnnul ? P.redPale : P.acPale} color={isAnnul ? P.red : P.ac}>{isAnnul ? 'ANN' : 'OP'}</Badge></td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{getBen(op)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{op.datePaiement || op.dateVisaCF || '-'}</td>
                  <td style={styles.td} onClick={e => e.stopPropagation()}>
                    <ConfirmBtn label="↩" confirmLabel="Sûr ?" bg={P.cfPale} color={P.cf} onConfirm={() => handleAnnulerPaye(op.id)} disabled={saving} />
                  </td>
                </tr>;
              })}
            </tbody></table>
          </div>}
          {selectedOps.length > 0 && <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button onClick={() => { setDrawerArchive(true); setBoiteArchivage(''); }} style={{ padding: '8px 16px', background: P.arch, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Archiver ({selectedOps.length} OP) →</button>
          </div>}
        </div>}

        {/* Archivés */}
        {subTabArch === 'ARCHIVES' && <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: P.archDark }}>OP Archivés ({opsArchives.length})</h3>
          <input type="text" placeholder="Rechercher (N° OP, bénéficiaire, boîte)..." value={searchArch} onChange={e => setSearchArch(e.target.value)} style={{ ...styles.input, marginBottom: 12, maxWidth: 400 }} />
          {filterOpsBySearch(opsArchives, searchArch).length === 0 ? <Empty text="Aucun OP archivé" /> :
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            <table style={styles.table}><thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
              <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 120 }}>BOÎTE</th><th style={{ ...styles.th, width: 90 }}>DATE</th><th style={{ ...styles.th, width: 70 }}></th>
            </tr></thead><tbody>
              {filterOpsBySearch(opsArchives, searchArch).map(op => (
                <tr key={op.id}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{getBen(op)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                  <td style={{ ...styles.td, fontWeight: 700, color: P.arch }}>
                    {editBoiteId === op.id ? (
                      <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
                        <input type="text" value={editBoiteVal} onChange={e => setEditBoiteVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveBoite(op.id); if (e.key === 'Escape') setEditBoiteId(null); }}
                          autoFocus style={{ padding: '3px 6px', border: `1px solid ${P.bgSection}`, borderRadius: 5, fontSize: 11, width: 100 }} />
                        <IBtn icon="✓" title="OK" bg={P.acPale} color={P.ac} onClick={() => handleSaveBoite(op.id)} />
                        <IBtn icon="✕" title="Annuler" bg={P.redPale} color={P.red} onClick={() => setEditBoiteId(null)} />
                      </span>
                    ) : (op.boiteArchivage || '-')}
                  </td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{op.dateArchivage || '-'}</td>
                  <td style={{ ...styles.td, display: 'flex', gap: 4 }}>
                    <IBtn icon="✏️" title="Modifier la boîte" bg={P.archPale} color={P.arch} onClick={() => handleModifierBoite(op.id)} />
                    <ConfirmBtn label="↩" confirmLabel="Sûr ?" bg={P.cfPale} color={P.cf} onConfirm={() => handleDesarchiver(op.id)} disabled={saving} />
                  </td>
                </tr>
              ))}
            </tbody></table>
          </div>}
        </div>}
      </div>}

      {/* ===== DRAWER RETOUR CF ===== */}
      {drawerRetourCF && selectedOps.length > 0 && <>
        <div onClick={() => setDrawerRetourCF(false)} style={overlayS} />
        <div style={drawerS}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${P.cfPale}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: P.cf }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>Retour CF — {selectedOps.length} OP</h3>
            <button onClick={() => setDrawerRetourCF(false)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', color: 'white', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
            {/* Liste des OP sélectionnés */}
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${P.bgSection}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.labelMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>OP sélectionnés</div>
              {selectedOps.map(opId => { const op = ops.find(o => o.id === opId); if (!op) return null;
                return <div key={opId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: P.cfPale, borderRadius: 6, marginBottom: 3, fontSize: 11 }}>
                  <span><strong style={{ fontFamily: 'monospace' }}>{op.numero}</strong> — {getBen(op)}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(op.montant)} F</span>
                </div>;
              })}
              <div style={{ fontSize: 14, fontWeight: 800, color: P.cf, marginTop: 8, textAlign: 'right' }}>Total : {formatMontant(totalSelected)} F</div>
            </div>

            {/* Décision */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.labelMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Décision</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[{ v: 'VISE', l: '✅ Visé', c: P.ac, bg: P.acPale }, { v: 'DIFFERE', l: '⏸ Différé', c: P.gold, bg: P.goldPale }, { v: 'REJETE', l: '✕ Rejeté', c: P.red, bg: P.redPale }].map(o => (
                  <button key={o.v} onClick={() => setResultatCF(o.v)} style={{ flex: 1, padding: '12px 8px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: resultatCF === o.v ? `3px solid ${o.c}` : '2px solid #ddd', background: resultatCF === o.v ? o.bg : 'white', color: resultatCF === o.v ? o.c : '#999' }}>{o.l}</button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div style={{ marginBottom: 12 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date</label>
              <input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el => setDateRef('retourCF', el)} style={iStyle} />
            </div>

            {/* Motif */}
            {(resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: P.red }}>Motif (obligatoire) *</label>
              <textarea value={motifRetour} onChange={e => setMotifRetour(e.target.value)} placeholder="Motif..." style={{ ...styles.input, minHeight: 80, resize: 'vertical', marginBottom: 0 }} />
            </div>}

            {resultatCF === 'REJETE' && <p style={{ fontSize: 11, color: P.red, marginBottom: 8 }}></p>}

            <button onClick={handleRetourCF} disabled={saving} style={{ width: '100%', padding: 10, border: 'none', borderRadius: 8, background: resultatCF === 'VISE' ? P.ac : resultatCF === 'DIFFERE' ? P.gold : P.red, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>{saving ? '...' : `Valider (${selectedOps.length} OP)`}</button>
          </div>
        </div>
      </>}

      {/* ===== DRAWER ARCHIVAGE ===== */}
      {drawerArchive && selectedOps.length > 0 && <>
        <div onClick={() => setDrawerArchive(false)} style={overlayS} />
        <div style={drawerS}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${P.archPale}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: P.arch }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: 0 }}>Archivage — {selectedOps.length} OP</h3>
            <button onClick={() => setDrawerArchive(false)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', color: 'white', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
            {/* Liste des OP */}
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${P.bgSection}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: P.labelMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>OP sélectionnés</div>
              {selectedOps.map(opId => { const op = ops.find(o => o.id === opId); if (!op) return null;
                return <div key={opId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: P.archPale, borderRadius: 6, marginBottom: 3, fontSize: 11 }}>
                  <span><strong style={{ fontFamily: 'monospace' }}>{op.numero}</strong> — {getBen(op)}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(op.montant)} F</span>
                </div>;
              })}
              <div style={{ fontSize: 14, fontWeight: 800, color: P.arch, marginTop: 8, textAlign: 'right' }}>Total : {formatMontant(totalSelected)} F</div>
            </div>
            {/* Boîte */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Boîte d'archivage</label>
              <input type="text" value={boiteArchivage} onChange={e => setBoiteArchivage(e.target.value)} placeholder="Ex: BOX-2025-001" style={iStyle} />
            </div>
            <button onClick={handleArchiver} disabled={saving || !boiteArchivage.trim()} style={{ width: '100%', padding: 10, border: 'none', borderRadius: 8, background: P.arch, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: !boiteArchivage.trim() ? 0.5 : 1 }}>{saving ? '...' : `📦 Archiver (${selectedOps.length} OP)`}</button>
          </div>
        </div>
      </>}

      {/* ===== DRAWER PAIEMENT AC ===== */}
      {drawerPaiement && <>
        <div onClick={() => setDrawerPaiement(null)} style={overlayS} />
        <div style={drawerS}>
          <div style={{ padding: '18px 22px', borderBottom: `1px solid ${P.acPale}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: P.ac }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Gestion OP</h3>
            <button onClick={() => setDrawerPaiement(null)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', cursor: 'pointer', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
            {(() => {
              const op = ops.find(o => o.id === drawerPaiement.id) || drawerPaiement;
              const paiem = op.paiements || [];
              const tot = paiem.reduce((s, p) => s + (p.montant || 0), 0);
              const reste = (op.montant || 0) - tot;
              const pct = Math.round(tot / Math.max(op.montant || 1, 1) * 100);
              const isSolde = reste < 1;
              return <>
                {/* Info OP */}
                <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${P.bgSection}` }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: P.sidebarDark }}>{op.numero}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: P.sidebarDark, marginTop: 2 }}>{getBen(op)}</div>
                  <div style={{ fontSize: 12, color: P.labelMuted, marginTop: 2 }}>{op.objet || '-'}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: P.pay, marginTop: 8 }}>{formatMontant(op.montant)} <span style={{ fontSize: 12, color: P.labelMuted, fontWeight: 500 }}>FCFA</span></div>
                  <div style={{ marginTop: 10, background: '#f0f0f0', borderRadius: 6, height: 8, overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? P.ac : P.pay, borderRadius: 6 }} /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                    <span style={{ color: P.pay, fontWeight: 600 }}>Payé : {formatMontant(tot)} ({pct}%)</span>
                    <span style={{ color: reste > 0 ? P.red : P.ac, fontWeight: 600 }}>Reste : {formatMontant(reste)}</span>
                  </div>
                </div>

                {/* Historique paiements */}
                {paiem.length > 0 && <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: P.labelMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Historique</div>
                  {paiem.map((p, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: i % 2 === 0 ? '#faf5ff' : 'white', borderRadius: 6, marginBottom: 2 }}>
                    <div><span style={{ fontSize: 12, fontWeight: 500 }}>{p.date}</span><span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{p.reference || 'Sans réf.'}</span></div>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: P.pay }}>{formatMontant(p.montant)} F</span>
                  </div>)}
                  <ConfirmBtn label="↩ Annuler dernier" confirmLabel="Confirmer ?" bg={P.redPale} color={P.red} onConfirm={() => handleAnnulerPaiement(op.id)} disabled={saving} />
                </div>}

                {/* Nouveau paiement */}
                {!isSolde && (op.statut === 'TRANSMIS_AC' || op.statut === 'PAYE_PARTIEL') && <div style={{ background: P.acPale, borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: P.pay, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Nouveau paiement</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 120 }}><label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 3 }}>Date</label>
                      <input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el => setDateRef('paiement', el)} style={iStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}><label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 3 }}>Montant</label>
                      <input type="number" value={paiementMontant} onChange={e => setPaiementMontant(e.target.value)} placeholder={String(reste)} style={iStyle} />
                    </div>
                    <div style={{ flex: 1, minWidth: 100 }}><label style={{ fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 3 }}>Référence</label>
                      <input type="text" value={paiementReference} onChange={e => setPaiementReference(e.target.value)} placeholder="VIR-..." style={iStyle} />
                    </div>
                  </div>
                  <button onClick={() => handlePaiement(op.id)} disabled={saving} style={{ width: '100%', padding: 10, border: 'none', borderRadius: 8, background: P.pay, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{saving ? '...' : 'Payer'}</button>
                </div>}

                {/* OP soldé */}
                {isSolde && <div style={{ background: P.acPale, borderRadius: 8, padding: 10, textAlign: 'center', color: P.ac, fontWeight: 700, fontSize: 13, marginBottom: 16 }}>✅ OP entièrement soldé</div>}

                {/* Différer / Rejeter */}
                {op.statut === 'TRANSMIS_AC' && <div style={{ borderTop: `1px solid ${P.bgSection}`, paddingTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: P.labelMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Autre décision</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {[{ v: 'DIFFERE', l: '⏸ Différer', c: P.gold, bg: P.goldPale }, { v: 'REJETE', l: '✕ Rejeter', c: P.red, bg: P.redPale }].map(o => (
                      <button key={o.v} onClick={() => setResultatAC(o.v)} style={{ flex: 1, padding: '10px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: resultatAC === o.v ? `3px solid ${o.c}` : `2px solid ${P.bgSection}`, background: resultatAC === o.v ? o.bg : 'white', color: resultatAC === o.v ? o.c : P.labelMuted }}>{o.l}</button>
                    ))}
                  </div>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>Date</label>
                    <input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el => setDateRef('retourAC', el)} style={iStyle} />
                  </div>
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: P.red }}>Motif (obligatoire) *</label>
                    <textarea value={motifRetourAC} onChange={e => setMotifRetourAC(e.target.value)} placeholder="Motif..." style={{ ...styles.input, minHeight: 60, resize: 'vertical', marginBottom: 0 }} />
                  </div>
                  {resultatAC === 'REJETE' && <p style={{ fontSize: 11, color: P.red, marginBottom: 8 }}></p>}
                  <button onClick={handleRetourAC} disabled={saving} style={{ width: '100%', padding: 10, border: 'none', borderRadius: 8, background: resultatAC === 'DIFFERE' ? P.gold : P.red, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{saving ? '...' : 'Valider'}</button>
                </div>}

                {/* Annuler transmission AC */}
                {op.statut === 'TRANSMIS_AC' && paiem.length === 0 && <div style={{ borderTop: `1px solid ${P.acPale}`, paddingTop: 12, marginTop: 12 }}>
                  <ConfirmBtn label="↩ Annuler transmission AC" confirmLabel="Confirmer ?" bg={P.cfPale} color={P.cf} full
                    onConfirm={async () => {
                      setSaving(true);
                      try { await updateDoc(doc(db, 'ops', op.id), { statut: 'VISE_CF', dateTransmissionAC: null, bordereauAC: null, updatedAt: new Date().toISOString() }); toast('Transmission AC annulée'); setDrawerPaiement(null); } catch (e) { toast('Erreur : ' + e.message, 'error'); }
                      setSaving(false);
                    }} disabled={saving} />
                </div>}

                {/* Archiver */}
                {op.statut !== 'ARCHIVE' && <div style={{ borderTop: `1px solid ${P.bgSection}`, paddingTop: 16, marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: P.arch, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>📦 Archiver</div>
                  {!isSolde && <div style={{ background: P.cfPale, borderRadius: 8, padding: 10, color: P.gold, fontSize: 12, marginBottom: 12 }}></div>}
                  <div style={{ marginBottom: 10 }}><label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Boîte d'archivage</label>
                    <input type="text" value={boiteDrawerPaiement} onChange={e => setBoiteDrawerPaiement(e.target.value)} placeholder="Ex: BOX-2025-001" style={iStyle} />
                  </div>
                  <button onClick={() => handleArchiverDirect(op.id, boiteDrawerPaiement)} disabled={saving || !boiteDrawerPaiement.trim()} style={{ width: '100%', padding: 10, border: 'none', borderRadius: 8, background: P.arch, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: !boiteDrawerPaiement.trim() ? 0.5 : 1 }}><>{saving ? '...' : '📦 Archiver'}</></button>
                </div>}
              </>;
            })()}
          </div>
        </div>
      </>}
    </div>
  );
};

export default PageBordereaux;
