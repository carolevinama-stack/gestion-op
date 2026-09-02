import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import Autocomplete from '../components/Autocomplete';
import { formatMontant, sanitizeForExport, formatNumeroOp } from '../utils/formatters';
import { estAAnnuler, aUnDefinitifActif, trouverDefinitifActif } from '../utils/opCalculs';

// ============================================================
// PALETTE & ICÔNES
// ============================================================
const P = {
  bg:'#F6F4F1', card:'#FFFFFF', green:'#2E9940', greenDark:'#1B6B2E', greenLight:'#E8F5E9',
  olive:'#5D6A55', oliveDark:'#4A5A42', gold:'#C5961F', goldLight:'#FFF8E1', goldBorder:'#E8B931',
  red:'#C43E3E', redLight:'#FFEBEE', orange:'#D4722A',
  border:'#E2DFD8', text:'#3A3A3A', textSec:'#7A7A7A', textMuted:'#A0A0A0',
};

const I = {
  download: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  upload: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  fileText: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  save: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  check: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  undo: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/></svg>,
  building: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>,
  clock: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  money: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  ban: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  clipboard: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  checkCircle: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  loader: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
  close: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search: (c='#999', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
};

// ============================================================
// UTILITAIRES DE DATES ET BADGES
// ============================================================
const joursOuvres = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return null;
  const d1 = new Date(dateDebut), d2 = new Date(dateFin);
  if (isNaN(d1) || isNaN(d2)) return null;
  let count = 0; const cur = new Date(d1);
  while (cur < d2) { cur.setDate(cur.getDate() + 1); const day = cur.getDay(); if (day !== 0 && day !== 6) count++; }
  return count;
};

const joursCalendaires = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return null;
  const d1 = new Date(dateDebut), d2 = new Date(dateFin);
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.floor((d2 - d1) / 86400000);
};

const formatDate = (ds) => {
  if (!ds) return '—';
  if (ds.length >= 10) {
    const [y, m, d] = ds.substring(0, 10).split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return ds;
};

const DelaiBadge = ({ jours, seuilOrange, seuilRouge, unite = 'j ouvrés' }) => {
  if (jours === null || jours === undefined) return <span style={{ color: P.textMuted, fontSize: 10 }}>—</span>;
  let bg = P.greenLight, color = P.greenDark;
  if (jours > seuilOrange) { bg = P.goldLight; color = P.goldBorder; }
  // CORRECTION TYPO ICI : seuuRouge -> seuilRouge
  if (jours > seuilRouge) { bg = P.redLight; color = P.red; }
  return <span style={{ background: bg, color, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{jours} {unite}</span>;
};

const StatutBadge = ({ statut }) => {
  const m = {
    EN_COURS: { bg: '#e3f2fd', c: '#1565c0', l: 'En cours' }, TRANSMIS_CF: { bg: P.goldLight, c: P.gold, l: 'Transmis CF' },
    VISE_CF: { bg: P.greenLight, c: P.greenDark, l: 'Visé CF' }, REJETE_CF: { bg: P.redLight, c: P.red, l: 'Rejeté CF' },
    DIFFERE_CF: { bg: '#f3e5f5', c: '#6a1b9a', l: 'Différé CF' },
    TRANSMIS_AC: { bg: P.goldLight, c: P.gold, l: 'Transmis AC' }, REJETE_AC: { bg: P.redLight, c: P.red, l: 'Rejeté AC' },
    DIFFERE_AC: { bg: '#f3e5f5', c: '#6a1b9a', l: 'Différé AC' },
    PAYE: { bg: P.greenLight, c: P.greenDark, l: 'Payé' }, PAYE_PARTIEL: { bg: '#f1f8e9', c: '#33691e', l: 'Payé partiel' },
    ARCHIVE: { bg: '#eceff1', c: '#546e6a', l: 'Archivé' }, ANNULE: { bg: P.redLight, c: P.red, l: 'Annulé' },
    TRAITE: { bg: '#e0f2f1', c: '#00695c', l: 'Traité' },
  };
  const s = m[statut] || { bg: '#eee', c: '#666', l: statut };
  return <span style={{ background: s.bg, color: s.c, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{s.l}</span>;
};

const TypeBadge = ({ type }) => {
  const m = { PROVISOIRE: { bg: '#e3f2fd', c: '#1565c0' }, DEFINITIF: { bg: '#f3e5f5', c: '#6a1b9a' }, ANNULATION: { bg: P.goldLight, c: P.gold }, REJET: { bg: P.redLight, c: P.red }, DIRECT: {bg: P.olive + '22', c: P.oliveDark} };
  const s = m[type] || { bg: '#eee', c: '#666' };
  return <span style={{ background: s.bg, color: s.c, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{type || '—'}</span>;
};

const ExBadge = ({ exerciceId, exercices, exerciceActif }) => {
  const ex = exercices.find(e => e.id === exerciceId);
  if (!ex || (exerciceActif && ex.id === exerciceActif.id)) return null;
  return <span style={{ background: P.redLight, color: P.red, padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700, marginLeft: 6 }}>{ex.annee}</span>;
};

const ModalAlert = ({ data, onClose }) => {
  if (!data) return null;
  const isConfirm = data.type === 'confirm';
  const color = data.type === 'error' ? P.red : isConfirm ? P.gold : P.green;

  return <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.4)', backdropFilter:'blur(4px)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center'}}>
    <div style={{background:'white', borderRadius:16, padding:24, width:420, boxShadow:'0 10px 40px rgba(0,0,0,.2)'}}>
      <h3 style={{color, margin:'0 0 12px', textAlign:'center'}}>{data.title}</h3>
      <p style={{color:'#444', fontSize:14, marginBottom:24, whiteSpace:'pre-line', textAlign:'center', lineHeight:1.5}}>{data.message}</p>
      <div style={{display:'flex', gap:12, justifyContent:'center'}}>
        {isConfirm && <button onClick={onClose} style={{padding:'10px 24px', borderRadius:8, border:`1px solid ${P.border}`, background:'#f9f9f9', cursor:'pointer', fontWeight:600, color:P.text}}>Annuler</button>}
        <button onClick={() => {
          const confirmFn = data.onConfirm;
          onClose();
          if(isConfirm && confirmFn) setTimeout(() => confirmFn(), 150);
        }} style={{padding:'10px 32px', borderRadius:8, border:'none', background:color, color:'white', cursor:'pointer', fontWeight:700, minWidth:120}}>{isConfirm ? 'Confirmer' : 'OK'}</button>
      </div>
    </div>
  </div>;
};

const th = { padding: '12px 10px', fontSize: 11, fontWeight: 700, color: P.textSec, textTransform: 'uppercase', textAlign: 'left', borderBottom: `1px solid ${P.border}`, background: '#FAFAF8', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
const td = { padding: '10px 10px', fontSize: 11, borderBottom: '1px solid #eee', color: P.text };
const tdR = { ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 };
const tdM = { ...td, fontWeight: 700, fontFamily: 'monospace', fontSize: 10 };
const tdE = { ...td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const RAPPORT_PAGE_SIZE = 50;
const getNumOp = (numero) => { const m = (numero || '').match(/N°(\d+)\//); return m ? parseInt(m[1]) : 0; };

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function PageRapport() {
  const { ops, beneficiaires, sources, exercices, exerciceActif, setConsultOpData, setCurrentPage, permissions } = useAppContext();
  const [activeTab, setActiveTab] = useState('compta');
  const [dateRef, setDateRef] = useState(new Date().toISOString().split('T')[0]);
  const [filtreEx, setFiltreEx] = useState('tous');
  // Critères séparés plutôt qu'une recherche unique : on peut ainsi les croiser.
  // Repliés par défaut, la page reste telle qu'elle était pour qui n'en a pas besoin.
  const FILTRES_VIDES = { numero: '', beneficiaireId: '', objet: '', type: '', dateDebut: '', dateFin: '', montantMin: '', montantMax: '' };
  const [filtres, setFiltres] = useState(FILTRES_VIDES);
  const [showFiltres, setShowFiltres] = useState(false);
  const [triChamp, setTriChamp] = useState('date');
  const [triSens, setTriSens] = useState('asc');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState([]);
  const [obsText, setObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [alertData, setAlertData] = useState(null);
  const notify = (type, title, message) => setAlertData({ type, title, message });

  const getBen = useCallback((op) => beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || op.beneficiaireNom || '—', [beneficiaires]);
  const getSrc = useCallback((op) => sources.find(s => s.id === op.sourceId)?.sigle || op.sourceSigle || '—', [sources]);

  // Filtrage principal
  const mainOps = useMemo(() => {
    let r = ops.filter(op => op.statut !== 'TRAITE' && op.statut !== 'SUPPRIME');
    if (filtreEx !== 'tous') r = r.filter(op => op.exerciceId === filtreEx);
    return r;
  }, [ops, filtreEx]);


  // === FONCTION COMMUNE POUR VÉRIFIER LES RÉGULARISATIONS ===
  const hasValidReg = useCallback((opProvId) => aUnDefinitifActif(ops, opProvId), [ops]);

  // === DONNÉES PAR ONGLET ===
  const opsCompta = useMemo(() => mainOps.filter(op => ['EN_COURS', 'VISE_CF', 'DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut)), [mainOps]);

  const opsNonVisesCF = useMemo(() => mainOps.filter(op => op.statut === 'TRANSMIS_CF').map(op => ({ ...op, delai: joursOuvres(op.dateTransmissionCF, dateRef) })), [mainOps, dateRef]);

  // Filtre pour "Non soldés" incluant DIRECT, PROVISOIRE, DEFINITIF
  const opsNonSoldes = useMemo(() => mainOps.filter(op => {
    // 1. Exclure formellement Annulations et Rejets
    if (['ANNULATION', 'REJET'].includes(op.type)) return false;
    // 2. Accepter PROVISOIRE, DEFINITIF, DIRECT (implicit par élimination ci-dessus)
    // 3. Uniquement les statuts en attente de solde complet
    return ['TRANSMIS_AC', 'PAYE_PARTIEL'].includes(op.statut);
  }).map(op => {
    const delai = joursOuvres(op.dateTransmissionAC, dateRef);
    let prov = null; 
    let solde = null;
    
    // Cas Spécifique 1 : DEFINITIF rattaché à un PROVISOIRE payé
    if (op.type === 'DEFINITIF' && op.opProvisoireId) { 
      prov = ops.find(o => o.id === op.opProvisoireId); 
      if (prov) {
        // Solde = (Mt payé sur le Provisoire) - (Mt du Definitif actuel)
        const montantPayeProvisoire = Number(prov.montantPaye || prov.totalPaye || 0);
        const montantDefinitif = Number(op.montant || 0);
        solde = montantPayeProvisoire - montantDefinitif;
      }
    } 
    // Cas Spécifique 2 : DIRECT ou DEFINITIF sans prov ou PROVISOIRE (reste à payer classique)
    else {
      const montant = Number(op.montant || 0);
      const montantPaye = Number(op.montantPaye || op.totalPaye || 0);
      solde = montant - montantPaye;
    }
    
    return { ...op, delai, prov, solde }; 
  }), [mainOps, ops, dateRef]);

  // Filtre pour "À annuler" — mêmes règles que la catégorie "À annuler" du Tableau de bord
  const opsAAnnuler = useMemo(() => mainOps
    .filter(op => estAAnnuler(op, ops))
    .map(op => ({ ...op, delai: joursOuvres(op.dateVisaCF, dateRef) })), [mainOps, ops, dateRef]);

  const opsAReg = useMemo(() => mainOps.filter(op => {
    if (op.type !== 'PROVISOIRE') return false;
    if (!['PAYE', 'PAYE_PARTIEL'].includes(op.statut)) return false; 
    return !hasValidReg(op.id);
  }).map(op => ({ ...op, delaiJ: joursCalendaires(op.datePaiement || op.dateCreation, dateRef) })), [mainOps, hasValidReg, dateRef]);

  const getData = () => ({ compta: opsCompta, nonvise: opsNonVisesCF, nonsolde: opsNonSoldes, annuler: opsAAnnuler, regulariser: opsAReg }[activeTab] || []);

  // === RECHERCHE GLOBALE & TRI CHRONOLOGIQUE ===
  const lblF = { display: 'block', fontSize: 11, fontWeight: 700, color: P.textSec, marginBottom: 4 };

  // Affiché sur le bouton : un filtre actif dans une ligne repliée resterait invisible,
  // et le rapport paraîtrait vide sans raison.
  const nbFiltres = Object.keys(FILTRES_VIDES).filter(k => String(filtres[k] ?? '').trim() !== '').length;

  const rawData = getData();
  const displayData = useMemo(() => {
    let data = rawData;
    const f = filtres;
    data = data.filter(op => {
      if (f.numero && !String(op.numero || '').toLowerCase().includes(f.numero.toLowerCase())) return false;
      if (f.objet && !String(op.objet || '').toLowerCase().includes(f.objet.toLowerCase())) return false;
      if (f.type && op.type !== f.type) return false;
      if (f.beneficiaireId) {
        // Identifiant d'abord, repli sur le nom figé sur l'OP pour les OP importés.
        const benSel = beneficiaires.find(b => b.id === f.beneficiaireId);
        const memeNom = benSel && (getBen(op) || '').toLowerCase() === String(benSel.nom || '').toLowerCase();
        if (op.beneficiaireId !== f.beneficiaireId && !memeNom) return false;
      }
      if (f.dateDebut || f.dateFin) {
        const d = op.dateCreation || '';
        if (f.dateDebut && d < f.dateDebut) return false;
        if (f.dateFin && d > f.dateFin) return false;
      }
      if (f.montantMin !== '' || f.montantMax !== '') {
        // Valeur absolue : les annulations sont enregistrées en négatif.
        const mt = Math.abs(Number(op.montant) || 0);
        if (f.montantMin !== '' && mt < Number(f.montantMin)) return false;
        if (f.montantMax !== '' && mt > Number(f.montantMax)) return false;
      }
      return true;
    });
    return [...data].sort((a, b) => {
      const diff = triChamp === 'numero'
        ? getNumOp(a.numero) - getNumOp(b.numero)
        : (a.dateCreation || '').localeCompare(b.dateCreation || '');
      return triSens === 'asc' ? diff : -diff;
    });
  }, [rawData, filtres, beneficiaires, getBen, triChamp, triSens]);

  const totalPagesRapport = Math.max(1, Math.ceil(displayData.length / RAPPORT_PAGE_SIZE));
  const pageRapport = Math.min(page, totalPagesRapport);
  const pageData = displayData.slice((pageRapport - 1) * RAPPORT_PAGE_SIZE, pageRapport * RAPPORT_PAGE_SIZE);

  const toggleTri = (champ) => {
    if (triChamp === champ) setTriSens(s => s === 'asc' ? 'desc' : 'asc');
    else { setTriChamp(champ); setTriSens('asc'); }
    setPage(1);
  };

  const tabs = [
    { id: 'compta', label: 'En cours compta', icon: I.building, count: opsCompta.length, color: P.olive },
    { id: 'nonvise', label: 'Non visés CF', icon: I.clock, count: opsNonVisesCF.length, color: P.gold },
    { id: 'nonsolde', label: 'Non soldés', icon: I.money, count: opsNonSoldes.length, color: P.orange },
    { id: 'annuler', label: 'À annuler', icon: I.ban, count: opsAAnnuler.length, color: P.red },
    { id: 'regulariser', label: 'À régulariser', icon: I.clipboard, count: opsAReg.length, color: P.textSec },
  ];

  // === ACTIONS ===
  const toggleSel = (id) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSel(sel.length === pageData.length && pageData.length > 0 ? [] : pageData.map(o => o.id));
  const changeTab = (t) => { setActiveTab(t); setSel([]); setObsText(''); setEditId(null); setFiltres(FILTRES_VIDES); setPage(1); };

  const saveObs = async () => {
    if (sel.length === 0) return;
    setSavingObs(true);
    try {
      const v = obsText.trim() || null;
      const batch = writeBatch(db);
      for (const id of sel) {
        batch.update(doc(db, 'ops', id), { observation: v, updatedAt: new Date().toISOString() });
      }
      await batch.commit();
      setSel([]); setObsText('');
      notify('success', 'Enregistré', `Observation enregistrée pour ${sel.length} OP.`);
    } catch (e) { notify('error', 'Erreur', e.message); }
    setSavingObs(false);
  };

  const editObs = async (id) => {
    try {
      const v = editText.trim() || null;
      await updateDoc(doc(db, 'ops', id), { observation: v, updatedAt: new Date().toISOString() });
      setEditId(null); setEditText('');
    } catch (e) { notify('error', 'Erreur', e.message); }
  };



  // === IMPORT / EXPORT EXCEL ===


  // === FONCTION DE RÉCUPÉRATION DU MOTIF (CORRECTION BÉTON)
  const getDefaultObs = (op) => {
    // 1. Si on a saisi une observation manuelle, c'est elle qui prime
    if (op.observation && op.observation.trim() !== '') return op.observation;
    
    // 2. Si c'est un OP Différé, on cherche le motif, peu importe le nom de la variable dans la BD
    if (['DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut)) {
      const motif = op.motifDiffere || op.observationDiffere || op.motifRejet || op.motif || op.commentaire || op.observationRejet;
      if (motif) return `Motif différé : ${motif}`;
      return 'Motif différé (en attente)';
    }

    // 3. Cas standards
    if (['EN_COURS', 'CREE'].includes(op.statut)) return 'À transférer au CF';
    if (op.statut === 'VISE_CF') return "À transférer à l'AC";
    
    return '';
  };

  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const dl = (j, s) => j === null ? '' : j > s ? 'DÉPASSÉ' : 'OK';
      
      const appendTotal = (dataArray, totalMt, totalPaye) => {
        if (!dataArray.length) return dataArray;
        const keys = Object.keys(dataArray[0]);
        const totalRow = {};
        keys.forEach(k => totalRow[k] = '');
        totalRow[keys[0]] = 'TOTAL GENERAL';
        if (keys.includes('Montant')) totalRow['Montant'] = totalMt;
        if (keys.includes('Montant OP')) totalRow['Montant OP'] = totalMt;
        if (keys.includes('Montant payé')) totalRow['Montant payé'] = totalPaye;
        if (keys.includes('Mt payé')) totalRow['Mt payé'] = totalPaye;
        dataArray.push(totalRow);
        return dataArray;
      };

      const d1 = appendTotal(opsCompta.map(op => ({ 'N° OP': op.numero, 'Type': op.type || '', 'Bénéficiaire': sanitizeForExport(getBen(op)), 'Objet': sanitizeForExport(op.objet || ''), 'Montant': Number(op.montant || 0), 'Source': getSrc(op), 'Date création': formatDate(op.dateCreation), 'Statut': op.statut, 'Observation': sanitizeForExport(getDefaultObs(op)) })), opsCompta.reduce((s, o) => s + Number(o.montant || 0), 0), 0);
      const d2 = appendTotal(opsNonVisesCF.map(op => ({ 'N° OP': op.numero, 'Type': op.type || '', 'Bénéficiaire': sanitizeForExport(getBen(op)), 'Objet': sanitizeForExport(op.objet || ''), 'Montant': Number(op.montant || 0), 'Source': getSrc(op), 'N° Bordereau CF': op.bordereauCF || '', 'Date transmission CF': formatDate(op.dateTransmissionCF), 'Délai (j ouvrés)': op.delai ?? '', 'Statut délai': dl(op.delai, 5), 'Observation': sanitizeForExport(getDefaultObs(op)) })), opsNonVisesCF.reduce((s, o) => s + Number(o.montant || 0), 0), 0);
      
      // Excel Export pour "Non soldés" incluant DIRECT, PROVISOIRE, DEFINITIF
      // Note: J'utilise 'o' comme nom de variable pour les callbacks afin d'éviter les erreurs 'no-undef' reportées par ESLint
      const d3 = appendTotal(opsNonSoldes.map(o => ({
        'N° OP': o.numero,
        'Type': o.type || '',
        'Bénéficiaire': sanitizeForExport(getBen(o)),
        'Objet': sanitizeForExport(o.objet || ''),
        'Montant OP': Number(o.montant || 0),
        'Montant payé': Number(o.montantPaye || o.totalPaye || 0), // CORRECTION ICI : op -> o
        'N° Bordereau AC': o.bordereauAC || '',
        'Date transmission AC': formatDate(o.dateTransmissionAC),
        'Délai (j ouvrés)': o.delai ?? '',
        'Statut délai': dl(o.delai, 5),
        'OP prov. rattaché': o.prov ? o.prov.numero : '',
        'Solde': o.solde ?? '', // CORRECTION ICI : op -> o
        'Observation': sanitizeForExport(getDefaultObs(o))
      })), opsNonSoldes.reduce((s, o) => s + Number(o.montant || 0), 0), opsNonSoldes.reduce((s, o) => s + Number(o.montantPaye || o.totalPaye || 0), 0));
      
      const d4 = appendTotal(opsAAnnuler.map(op => ({ 'N° OP': op.numero, 'Type': op.type || '', 'Bénéficiaire': sanitizeForExport(getBen(op)), 'Objet': sanitizeForExport(op.objet || ''), 'Montant': Number(op.montant || 0), 'Source': getSrc(op), 'Date visa CF': formatDate(op.dateVisaCF), 'Délai (j ouvrés)': op.delai ?? '', 'Statut délai': dl(op.delai, 2), 'Observation': sanitizeForExport(getDefaultObs(op)) })), opsAAnnuler.reduce((s, o) => s + Number(o.montant || 0), 0), 0);
      const d5 = appendTotal(opsAReg.map(op => {
        const def = trouverDefinitifActif(ops, op.id);
        return { 'N° OP provisoire': op.numero, 'Type': op.type || '', 'Bénéficiaire': sanitizeForExport(getBen(op)), 'Objet': sanitizeForExport(op.objet || ''), 'Montant': Number(op.montant || 0), 'Montant payé': Number(op.montantPaye || op.montant || 0), 'Date de référence': formatDate(op.datePaiement || op.dateCreation), 'Délai (jours)': op.delaiJ ?? '', 'Statut délai': dl(op.delaiJ, 60), 'N° OP définitif': def?.numero || '', 'Observation': sanitizeForExport(getDefaultObs(op)) };
      }), opsAReg.reduce((s, o) => s + Number(o.montant || 0), 0), opsAReg.reduce((s, o) => s + Number(o.montantPaye || o.montant || 0), 0));

      const wb = XLSX.utils.book_new();
      const fDate = dateRef.split('-').reverse().join('/'); 
      
      const addSheet = (data, sheetName, titleText) => {
        const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Aucune donnée': '' }], { origin: "A3" });
        XLSX.utils.sheet_add_aoa(ws, [[titleText]], { origin: "A1" });
        if (data.length) ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 2, 15) }));
        for (let cellRef in ws) {
          if (cellRef[0] === '!') continue;
          const cell = ws[cellRef];
          if (cell.t === 'n') cell.z = '#,##0'; // Formatage des nombres
        }
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      addSheet(d1, 'En cours compta', `OP a la comptabilité au ${fDate}`);
      addSheet(d2, 'Non visés CF', `OP en attente au Controle Financier au ${fDate}`);
      addSheet(d3, 'Non soldés', `OP en attente chez l'Agent comptable au ${fDate}`);
      addSheet(d4, 'À annuler', `OP en attente a annuler au ${fDate}`);
      addSheet(d5, 'À régulariser', `OP a regulariser au ${fDate}`);

      const fileNameDate = dateRef.split('-').reverse().join('-');
      XLSX.writeFile(wb, `OP EN TRAITEMENT AU ${fileNameDate}.xlsx`);
    } catch (err) { notify('error', 'Erreur', err.message); }
  };

  const ObsCell = ({ op }) => {
    const defaultObs = getDefaultObs(op);
    const displayText = defaultObs || 'Ajouter observation...';

    if (editId === op.id) return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') editObs(op.id); if (e.key === 'Escape') setEditId(null); }} style={{ ...styles.input, marginBottom: 0, fontSize: 11, padding: '4px 8px', width: 160, borderRadius: 6, border: `1px solid ${P.greenDark}` }} autoFocus />
        <button onClick={() => editObs(op.id)} style={{ border: 'none', background: P.greenDark, color: '#fff', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{I.check('#fff', 14)}</button>
        <button onClick={() => setEditId(null)} style={{ border: 'none', background: P.textMuted, color: '#fff', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{I.close('#fff', 14)}</button>
      </div>
    );
    
    // Détermination de la couleur d'affichage du texte (Rouge si c'est un différé automatique !)
    let textColor = P.textMuted;
    if (op.observation) textColor = P.text;
    else if (defaultObs && !defaultObs.includes('Ajouter')) {
      textColor = defaultObs.includes('Motif différé') ? P.red : P.orange;
    }

    return (
      <span 
        onClick={() => { setEditId(op.id); setEditText(op.observation || (defaultObs.startsWith('Motif') ? '' : defaultObs) || ''); }} 
        style={{ 
          cursor: 'pointer', 
          color: textColor, 
          fontSize: 11, 
          fontStyle: op.observation || defaultObs ? 'normal' : 'italic', 
          fontWeight: defaultObs && !op.observation ? 600 : 400 
        }} 
        title="Cliquer pour modifier"
      >
        {displayText}
      </span>
    );
  };

  const Chk = ({ id }) => <input type="checkbox" checked={sel.includes(id)} onChange={() => toggleSel(id)} style={{ cursor: 'pointer', width: 14, height: 14, accentColor: P.greenDark }} />;
  const ChkAll = ({ data }) => <input type="checkbox" checked={sel.length === data.length && data.length > 0} onChange={toggleAll} style={{ accentColor: P.greenDark }} />;

  return (
    <div>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: P.greenDark, margin: 0 }}>Rapport Comptable</h1>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: P.textSec }}>Exercice :</label>
            <select value={filtreEx} onChange={e => { setFiltreEx(e.target.value); setPage(1); }} style={{ ...styles.input, width: 140, marginBottom: 0, fontSize: 12, borderRadius: 8, border: `1px solid ${P.border}` }}>
              <option value="tous">Tous les exercices</option>
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: P.textSec }}>Date de réf. :</label>
            <input type="date" value={dateRef} onChange={e => setDateRef(e.target.value)} style={{ ...styles.input, width: 140, marginBottom: 0, fontSize: 12, borderRadius: 8, border: `1px solid ${P.border}` }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {tabs.map(t => {
            const isActive = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => changeTab(t.id)} style={{
                padding: '10px 18px', borderRadius: 10,
                border: isActive ? `2px solid ${t.color}` : '2px solid transparent',
                background: isActive ? t.color : P.card,
                color: isActive ? '#fff' : P.textSec,
                fontWeight: 600, cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all .2s',
                boxShadow: isActive ? `0 4px 12px ${t.color}33` : '0 1px 3px rgba(0,0,0,.06)'
              }}>
                {t.icon(isActive ? '#fff' : t.color, 16)} {t.label}
                <span style={{ background: isActive ? 'rgba(255,255,255,.25)' : P.border, padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{t.count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[{ champ: 'date', label: 'Date' }, { champ: 'numero', label: 'N° OP' }].map(t => {
              const active = triChamp === t.champ;
              return (
                <button key={t.champ} onClick={() => toggleTri(t.champ)} title={`Trier par ${t.label}`} style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px',
                  background: active ? P.greenDark : '#FAFAF8', color: active ? '#fff' : P.textSec,
                  border: `1px solid ${active ? P.greenDark : P.border}`, borderRadius: 8, cursor: 'pointer',
                  fontSize: 11, fontWeight: 700, height: 36
                }}>
                  {t.label} {active ? (triSens === 'asc' ? '▲' : '▼') : ''}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={() => setShowFiltres(!showFiltres)}
            title="Filtrer par n°, bénéficiaire, objet, type, date ou montant"
            style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, padding: '0 14px', background: nbFiltres > 0 ? P.greenLight : '#fff', color: nbFiltres > 0 ? P.greenDark : P.textSec, border: `1px solid ${nbFiltres > 0 ? P.greenDark : P.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            {I.search(nbFiltres > 0 ? P.greenDark : P.textMuted, 14)}
            {showFiltres ? 'Masquer les filtres' : 'Filtres'}
            {nbFiltres > 0 && <span style={{ background: P.greenDark, color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{nbFiltres}</span>}
          </button>


          <button onClick={handleExport} title="Exporter le rapport actuel en Excel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: P.greenDark, border: 'none', borderRadius: 8, cursor: 'pointer', width: 36, height: 36, boxShadow: `0 2px 8px ${P.greenDark}44` }}>
            {I.fileText('#fff', 16)}
          </button>
        </div>
      </div>

      {showFiltres && (
        <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ width: 120 }}>
            <label style={lblF}>N° OP</label>
            <input type="text" placeholder="0042" value={filtres.numero} onChange={e => { setFiltres({ ...filtres, numero: e.target.value }); setPage(1); }} style={{ ...styles.input, marginBottom: 0, width: 120 }} />
          </div>
          <div style={{ minWidth: 200, flex: 1 }}>
            <label style={lblF}>Bénéficiaire</label>
            <Autocomplete
              options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || ''] }))}
              value={filtres.beneficiaireId ? { value: filtres.beneficiaireId, label: beneficiaires.find(b => b.id === filtres.beneficiaireId)?.nom || '' } : null}
              onChange={(o) => { setFiltres({ ...filtres, beneficiaireId: o?.value || '' }); setPage(1); }}
              placeholder="Tous les bénéficiaires"
              noOptionsMessage="Aucun bénéficiaire"
              accentColor={P.greenDark}
            />
          </div>
          <div style={{ minWidth: 160, flex: 1 }}>
            <label style={lblF}>Objet</label>
            <input type="text" placeholder="Mot de l'objet" value={filtres.objet} onChange={e => { setFiltres({ ...filtres, objet: e.target.value }); setPage(1); }} style={{ ...styles.input, marginBottom: 0, width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <label style={lblF}>Type d'OP</label>
            <select value={filtres.type} onChange={e => { setFiltres({ ...filtres, type: e.target.value }); setPage(1); }} style={{ ...styles.input, marginBottom: 0, width: 150, cursor: 'pointer' }}>
              <option value="">Tous les types</option>
              {['DIRECT', 'PROVISOIRE', 'DEFINITIF', 'ANNULATION', 'REJET'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ width: 145 }}>
            <label style={lblF}>Créé du</label>
            <input type="date" value={filtres.dateDebut} onChange={e => { setFiltres({ ...filtres, dateDebut: e.target.value }); setPage(1); }} style={{ ...styles.input, marginBottom: 0, width: 145 }} />
          </div>
          <div style={{ width: 145 }}>
            <label style={lblF}>au</label>
            <input type="date" value={filtres.dateFin} onChange={e => { setFiltres({ ...filtres, dateFin: e.target.value }); setPage(1); }} style={{ ...styles.input, marginBottom: 0, width: 145 }} />
          </div>
          <div style={{ width: 140 }}>
            <label style={lblF}>Montant min</label>
            <input type="number" placeholder="0" value={filtres.montantMin} onChange={e => { setFiltres({ ...filtres, montantMin: e.target.value }); setPage(1); }} style={{ ...styles.input, marginBottom: 0, width: 140 }} />
          </div>
          <div style={{ width: 140 }}>
            <label style={lblF}>Montant max</label>
            <input type="number" placeholder="Illimité" value={filtres.montantMax} onChange={e => { setFiltres({ ...filtres, montantMax: e.target.value }); setPage(1); }} style={{ ...styles.input, marginBottom: 0, width: 140 }} />
          </div>
          <button onClick={() => { setFiltres(FILTRES_VIDES); setPage(1); }}
            style={{ height: 38, padding: '0 14px', background: '#f5f5f5', border: `1px solid ${P.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: P.textSec }}>Effacer</button>
        </div>
      )}

      {sel.length > 0 && (
        <div style={{ background: P.goldLight, borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', border: `1px solid ${activeTab === 'extratraite' ? P.green : P.goldBorder}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: P.gold }}>{sel.length} OP sélectionné(s)</span>
          {permissions.canEdit && (
          <>
          <input value={obsText} onChange={e => setObsText(e.target.value)} placeholder="Saisir une observation pour la sélection..." style={{ ...styles.input, marginBottom: 0, flex: 1, minWidth: 250, fontSize: 12, borderRadius: 8 }} onKeyDown={e => { if (e.key === 'Enter') saveObs(); }} />
          <button onClick={saveObs} disabled={savingObs} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: P.greenDark, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: savingObs ? 0.6 : 1 }}>
            {savingObs ? I.loader() : I.save()} Enregistrer l'observation
          </button>
          </>
          )}
          <button onClick={() => { setSel([]); setObsText(''); }} style={{ padding: '8px 16px', background: 'transparent', color: P.textSec, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
            Annuler la sélection
          </button>
        </div>
      )}

      <div style={{ padding: '0 8px', marginBottom: 16, fontSize: 13, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        {activeTab === 'compta' && <span style={{ color: P.text }}>Montant total affiché : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.olive }}>{formatMontant(displayData.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span>}
        {activeTab === 'nonvise' && <><span style={{ color: P.text }}>Montant total affiché : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.gold }}>{formatMontant(displayData.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span><span>Dépassés ({'>'}5j ouvrés) : <strong style={{ color: P.red, fontSize: 14 }}>{displayData.filter(o => o.delai > 5).length}</strong></span></>}
        {activeTab === 'nonsolde' && <><span style={{ color: P.text }}>Montant total affiché : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.orange }}>{formatMontant(displayData.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span><span>Dépassés ({'>'}5j ouvrés) : <strong style={{ color: P.red, fontSize: 14 }}>{displayData.filter(o => o.delai > 5).length}</strong></span></>}
        {activeTab === 'annuler' && <><span style={{ color: P.text }}>Montant total affiché : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.red }}>{formatMontant(displayData.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span><span>Dépassés ({'>'}2j ouvrés) : <strong style={{ color: P.red, fontSize: 14 }}>{displayData.filter(o => o.delai > 2).length}</strong></span></>}
        {activeTab === 'regulariser' && <><span style={{ color: P.text }}>Montant total affiché : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.textSec }}>{formatMontant(displayData.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span><span>Dépassés ({'>'}60j calendaires) : <strong style={{ color: P.red, fontSize: 14 }}>{displayData.filter(o => o.delaiJ > 60).length}</strong></span></>}
      </div>

      <div style={{ background: P.card, borderRadius: 12, overflow: 'auto', border: `1px solid ${P.border}`, height: 'calc(100vh - 210px)' }}>
        {activeTab === 'compta' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={pageData} /></th><th style={th}>N° OP</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>Date création</th><th style={th}>Statut</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
            <tbody>
              {pageData.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun résultat trouvé</td></tr>}
              {pageData.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.greenLight : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{formatNumeroOp(op.numero)}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}><TypeBadge type={op.type} /></td><td style={td}>{getBen(op)}</td><td style={tdE} title={op.objet}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{formatDate(op.dateCreation)}</td><td style={td}><StatutBadge statut={op.statut} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
            </tbody>
          </table>
        )}
        {activeTab === 'nonvise' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={pageData} /></th><th style={th}>N° OP</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>N° Bordereau</th><th style={th}>Date transm. CF</th><th style={th}>Délai</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
            <tbody>
              {pageData.length === 0 && <tr><td colSpan={11} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun résultat trouvé</td></tr>}
              {pageData.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.goldLight : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{formatNumeroOp(op.numero)}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}><TypeBadge type={op.type} /></td><td style={td}>{getBen(op)}</td><td style={tdE} title={op.objet}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={{...td, fontFamily: 'monospace', fontSize: 10}}>{op.bordereauCF || '—'}</td><td style={td}>{formatDate(op.dateTransmissionCF)}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={3} seuilRouge={5} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
            </tbody>
          </table>
        )}
        {activeTab === 'nonsolde' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={pageData} /></th><th style={th}>N° OP</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Mt payé</th><th style={th}>N° Bord.</th><th style={th}>Date transm. AC</th><th style={th}>Délai</th><th style={th}>OP prov. rattaché</th><th style={{ ...th, textAlign: 'right' }}>Solde</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
            <tbody>
              {pageData.length === 0 && <tr><td colSpan={13} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun résultat trouvé</td></tr>}
              {/* Rendu du tableau incluant DIRECT */}
              {pageData.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.orange + '15' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{formatNumeroOp(op.numero)}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}><TypeBadge type={op.type} /></td><td style={td}>{getBen(op)}</td><td style={tdE} title={op.objet}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={tdR}>{formatMontant(op.montantPaye || 0)}</td><td style={{...td, fontFamily: 'monospace', fontSize: 10}}>{op.bordereauAC || '—'}</td><td style={td}>{formatDate(op.dateTransmissionAC)}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={3} seuilRouge={5} /></td><td style={{ ...td, fontSize: 10, fontFamily: 'monospace', color: P.textSec }}>{op.prov ? formatNumeroOp(op.prov.numero) : '—'}</td><td style={tdR}>{op.solde !== null && op.solde !== undefined ? <span style={{ color: op.solde > 0 ? P.red : op.solde < 0 ? P.orange : P.greenDark, fontWeight: 700 }}>{formatMontant(op.solde)}</span> : '—'}</td><td style={td}><ObsCell op={op} /></td></tr>)}
            </tbody>
          </table>
        )}
        {activeTab === 'annuler' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={pageData} /></th><th style={th}>N° OP</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>Date visa CF</th><th style={th}>Délai</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
            <tbody>
              {pageData.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun résultat trouvé</td></tr>}
              {pageData.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.redLight : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{formatNumeroOp(op.numero)}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}><TypeBadge type={op.type} /></td><td style={td}>{getBen(op)}</td><td style={tdE} title={op.objet}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{formatDate(op.dateVisaCF)}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={1} seuilRouge={2} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
            </tbody>
          </table>
        )}
        {activeTab === 'regulariser' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={pageData} /></th><th style={th}>N° OP prov.</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Mt payé</th><th style={th}>Date Réf.</th><th style={th}>Délai</th><th style={th}>OP définitif</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
            <tbody>
              {pageData.length === 0 && <tr><td colSpan={11} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun résultat trouvé</td></tr>}
              {pageData.map(op => { 
                const def = trouverDefinitifActif(ops, op.id); 
                return (
                  <tr key={op.id} style={{ background: sel.includes(op.id) ? '#f0f0f0' : 'transparent', cursor: 'pointer' }} onClick={(e) => { if(e.target.tagName !== 'INPUT') { setConsultOpData(op); setCurrentPage('consulterOp'); } }}>
                    <td style={td}><Chk id={op.id} /></td>
                    <td style={tdM}>{formatNumeroOp(op.numero)}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td>
                    <td style={td}><TypeBadge type={op.type} /></td>
                    <td style={td}>{getBen(op)}</td>
                    <td style={tdE} title={op.objet}>{op.objet || '—'}</td>
                    <td style={tdR}>{formatMontant(op.montant)}</td>
                    <td style={tdR}>{formatMontant(op.montantPaye || op.montant)}</td>
                    <td style={td}>{formatDate(op.datePaiement || op.dateCreation)}</td>
                    <td style={td}><DelaiBadge jours={op.delaiJ} seuilOrange={45} seuilRouge={60} unite="jours" /></td>
                    <td style={{ ...td, fontSize: 10, fontFamily: 'monospace', color: P.textSec }}>{def?.numero || '—'}</td>
                    <td style={td} onClick={e => e.stopPropagation()}><ObsCell op={op} /></td>
                  </tr>
                ); 
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPagesRapport > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 14 }}>
          <button disabled={pageRapport === 1} onClick={() => setPage(p => p - 1)} style={{ ...styles.buttonIcon, opacity: pageRapport === 1 ? 0.4 : 1 }}>◀</button>
          <span style={{ fontSize: 13, color: P.textSec }}>Page {pageRapport} / {totalPagesRapport} ({displayData.length} OP)</span>
          <button disabled={pageRapport === totalPagesRapport} onClick={() => setPage(p => p + 1)} style={{ ...styles.buttonIcon, opacity: pageRapport === totalPagesRapport ? 0.4 : 1 }}>▶</button>
        </div>
      )}
    </div>
  );
}
