import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// ============================================================
// PALETTE & ICÔNES (Aligné sur le reste de l'application)
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
  save: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>,
  check: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  undo: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/></svg>,
  building: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>,
  clock: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  money: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>,
  ban: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  clipboard: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  checkCircle: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  loader: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>,
};

// ============================================================
// UTILITAIRES
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

const DelaiBadge = ({ jours, seuilOrange, seuilRouge, unite = 'j ouvrés' }) => {
  if (jours === null || jours === undefined) return <span style={{ color: P.textMuted, fontSize: 10 }}>—</span>;
  let bg = P.greenLight, color = P.greenDark;
  if (jours > seuilOrange) { bg = P.goldLight; color = P.goldBorder; }
  if (jours > seuilRouge) { bg = P.redLight; color = P.red; }
  return <span style={{ background: bg, color, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{jours} {unite}</span>;
};

const StatutBadge = ({ statut }) => {
  const m = {
    CREE: { bg: '#e3f2fd', c: '#1565c0', l: 'Créé' }, TRANSMIS_CF: { bg: P.goldLight, c: P.gold, l: 'Transmis CF' },
    VISE_CF: { bg: P.greenLight, c: P.greenDark, l: 'Visé CF' }, REJETE_CF: { bg: P.redLight, c: P.red, l: 'Rejeté CF' },
    RETOURNE_CF: { bg: '#fce4ec', c: '#ad1457', l: 'Retourné CF' }, DIFFERE_CF: { bg: '#f3e5f5', c: '#6a1b9a', l: 'Différé CF' },
    TRANSMIS_AC: { bg: P.goldLight, c: P.gold, l: 'Transmis AC' }, REJETE_AC: { bg: P.redLight, c: P.red, l: 'Rejeté AC' },
    RETOURNE_AC: { bg: '#fce4ec', c: '#ad1457', l: 'Retourné AC' }, DIFFERE_AC: { bg: '#f3e5f5', c: '#6a1b9a', l: 'Différé AC' },
    PAYE: { bg: P.greenLight, c: P.greenDark, l: 'Payé' }, PAYE_PARTIEL: { bg: '#f1f8e9', c: '#33691e', l: 'Payé partiel' },
    ARCHIVE: { bg: '#eceff1', c: '#546e6a', l: 'Archivé' }, ANNULE: { bg: '#eceff1', c: '#546e6a', l: 'Annulé' },
    TRAITE: { bg: '#e0f2f1', c: '#00695c', l: 'Traité' },
  };
  const s = m[statut] || { bg: '#eee', c: '#666', l: statut };
  return <span style={{ background: s.bg, color: s.c, padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>{s.l}</span>;
};

const TypeBadge = ({ type }) => {
  const m = { PROVISOIRE: { bg: '#e3f2fd', c: '#1565c0' }, DEFINITIF: { bg: '#f3e5f5', c: '#6a1b9a' }, ANNULATION: { bg: P.goldLight, c: P.gold } };
  const s = m[type] || { bg: '#eee', c: '#666' };
  return <span style={{ background: s.bg, color: s.c, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{type || '—'}</span>;
};

const ExBadge = ({ exerciceId, exercices, exerciceActif }) => {
  const ex = exercices.find(e => e.id === exerciceId);
  if (!ex || (exerciceActif && ex.id === exerciceActif.id)) return null;
  return <span style={{ background: P.redLight, color: P.red, padding: '1px 5px', borderRadius: 4, fontSize: 9, fontWeight: 700, marginLeft: 6 }}>{ex.annee}</span>;
};

// Styles standards du tableau
const th = { padding: '12px 10px', fontSize: 11, fontWeight: 700, color: P.textSec, textTransform: 'uppercase', textAlign: 'left', borderBottom: `1px solid ${P.border}`, background: '#FAFAF8', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
const td = { padding: '10px 10px', fontSize: 11, borderBottom: '1px solid #eee', color: P.text };
const tdR = { ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 };
const tdM = { ...td, fontWeight: 700, fontFamily: 'monospace', fontSize: 10 };
const tdE = { ...td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function PageRapport() {
  const { ops, beneficiaires, sources, exercices, exerciceActif } = useAppContext();
  const [activeTab, setActiveTab] = useState('compta');
  const [dateRef, setDateRef] = useState(new Date().toISOString().split('T')[0]);
  const [filtreEx, setFiltreEx] = useState('tous');
  const [sel, setSel] = useState([]);
  const [obsText, setObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');
  const [importing, setImporting] = useState(false);

  const getBen = useCallback((op) => beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || op.beneficiaireNom || '—', [beneficiaires]);
  const getSrc = useCallback((op) => sources.find(s => s.id === op.sourceId)?.sigle || op.sourceSigle || '—', [sources]);

  // Filtrage : exclure TRAITE des 5 onglets principaux
  const mainOps = useMemo(() => {
    let r = ops.filter(op => op.statut !== 'TRAITE');
    if (filtreEx !== 'tous') r = r.filter(op => op.exerciceId === filtreEx);
    return r;
  }, [ops, filtreEx]);

  // 6ème onglet : OP extra traités
  const opsExtraTraites = useMemo(() => {
    let r = ops.filter(op => op.importAnterieur && op.statut === 'TRAITE');
    if (filtreEx !== 'tous') r = r.filter(op => op.exerciceId === filtreEx);
    return r;
  }, [ops, filtreEx]);

  // === DONNÉES PAR ONGLET ===
  const opsCompta = useMemo(() => mainOps.filter(op => ['CREE', 'VISE_CF', 'RETOURNE_CF', 'RETOURNE_AC', 'DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut)), [mainOps]);

  const opsNonVisesCF = useMemo(() => mainOps.filter(op => op.statut === 'TRANSMIS_CF').map(op => ({ ...op, delai: joursOuvres(op.dateTransmissionCF, dateRef) })), [mainOps, dateRef]);

  const opsNonSoldes = useMemo(() => mainOps.filter(op => op.statut === 'TRANSMIS_AC').map(op => {
    const delai = joursOuvres(op.dateTransmissionAC, dateRef);
    let provs = []; let ecart = null;
    if (op.type === 'DEFINITIF' && op.opProvisoireId) { const p = ops.find(o => o.id === op.opProvisoireId); if (p) provs.push(p); }
    if (op.type === 'DEFINITIF' && provs.length > 0) ecart = provs.reduce((s, p) => s + Number(p.montantPaye || p.montant || 0), 0) - Number(op.montant || 0);
    return { ...op, delai, provs, ecart };
  }), [mainOps, ops, dateRef]);

  const opsAAnnuler = useMemo(() => mainOps.filter(op => op.type === 'PROVISOIRE' && ['VISE_CF', 'TRANSMIS_AC', 'PAYE'].includes(op.statut) && !ops.some(o => o.type === 'ANNULATION' && o.opProvisoireId === op.id)).map(op => ({ ...op, delai: joursOuvres(op.dateVisaCF, dateRef) })), [mainOps, ops, dateRef]);

  const opsAReg = useMemo(() => mainOps.filter(op => op.type === 'PROVISOIRE' && ['PAYE', 'PAYE_PARTIEL'].includes(op.statut) && !ops.some(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id)).map(op => ({ ...op, delaiJ: joursCalendaires(op.datePaiement, dateRef) })), [mainOps, ops, dateRef]);

  const getData = () => ({ compta: opsCompta, nonvise: opsNonVisesCF, nonsolde: opsNonSoldes, annuler: opsAAnnuler, regulariser: opsAReg, extratraite: opsExtraTraites }[activeTab] || []);

  const tabs = [
    { id: 'compta', label: 'En cours compta', icon: I.building, count: opsCompta.length, color: P.olive },
    { id: 'nonvise', label: 'Non visés CF', icon: I.clock, count: opsNonVisesCF.length, color: P.gold },
    { id: 'nonsolde', label: 'Non soldés', icon: I.money, count: opsNonSoldes.length, color: P.orange },
    { id: 'annuler', label: 'À annuler', icon: I.ban, count: opsAAnnuler.length, color: P.red },
    { id: 'regulariser', label: 'À régulariser', icon: I.clipboard, count: opsAReg.length, color: P.textSec },
    { id: 'extratraite', label: 'Extra traités', icon: I.checkCircle, count: opsExtraTraites.length, color: P.greenDark },
  ];

  // === SÉLECTION / OBSERVATIONS ===
  const toggleSel = (id) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => { const d = getData(); setSel(sel.length === d.length ? [] : d.map(o => o.id)); };
  const changeTab = (t) => { setActiveTab(t); setSel([]); setObsText(''); setEditId(null); };

  // OPTIMISATION : Utilisation de writeBatch pour sauver en bloc sans surcharger Firebase
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
      alert(`Observation enregistrée pour ${sel.length} OP.`);
    } catch (e) { alert('Erreur : ' + e.message); }
    setSavingObs(false);
  };

  const editObs = async (id) => {
    try {
      const v = editText.trim() || null;
      await updateDoc(doc(db, 'ops', id), { observation: v, updatedAt: new Date().toISOString() });
      setEditId(null); setEditText('');
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  // === MARQUER TRAITÉ / ANNULER ===
  const handleTraite = async () => {
    const extras = sel.filter(id => ops.find(o => o.id === id)?.importAnterieur);
    if (extras.length === 0) { alert('Sélectionnez au moins un OP importé (extra).'); return; }
    if (!window.confirm(`Marquer ${extras.length} OP extra comme "Traité" ?\nIls seront déplacés dans l'onglet "Extra traités".`)) return;
    try {
      const batch = writeBatch(db);
      for (const id of extras) {
        batch.update(doc(db, 'ops', id), { statut: 'TRAITE', updatedAt: new Date().toISOString() });
      }
      await batch.commit();
      setSel([]); 
      alert(`${extras.length} OP marqué(s) comme traité(s).`);
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  const handleUnTraite = async () => {
    if (sel.length === 0) return;
    if (!window.confirm(`Remettre ${sel.length} OP dans les rapports ?`)) return;
    try {
      const batch = writeBatch(db);
      for (const id of sel) {
        const op = ops.find(o => o.id === id);
        const prev = op?.datePaiement ? 'PAYE' : op?.dateTransmissionAC ? 'TRANSMIS_AC' : op?.dateVisaCF ? 'VISE_CF' : op?.dateTransmissionCF ? 'TRANSMIS_CF' : 'CREE';
        batch.update(doc(db, 'ops', id), { statut: prev, updatedAt: new Date().toISOString() });
      }
      await batch.commit();
      setSel([]); 
      alert(`OP remis dans les rapports.`);
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  // === IMPORT EXCEL ===
  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const tpl = [{ 'N° OP': 'IDA-2023-0045', 'Type': 'PROVISOIRE', 'Bénéficiaire': 'SARL EXEMPLE', 'Objet': 'Fourniture matériel', 'Montant': 5000000, 'Montant payé': 5000000, 'Source': 'IDA', 'Exercice': 2023, 'Ligne budgétaire': '2.1.1', 'Date création': '2023-05-15', 'Date transmission CF': '2023-06-01', 'Date visa CF': '2023-06-05', 'Date transmission AC': '2023-06-10', 'Date paiement': '2023-07-01', 'Statut': 'TRANSMIS_AC', 'N° OP provisoire rattaché': '', 'Observation': '' }];
      const ws = XLSX.utils.json_to_sheet(tpl);
      ws['!cols'] = Object.keys(tpl[0]).map(k => ({ wch: Math.max(k.length + 2, 18) }));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Canevas');
      XLSX.writeFile(wb, 'Canevas_Import_OP_Anterieurs.xlsx');
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data); const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      if (rows.length === 0) { alert('Fichier vide.'); setImporting(false); return; }
      let imp = 0, skip = 0;
      const fmtDate = (v) => { if (!v) return null; if (typeof v === 'number') { const d = new Date((v - 25569) * 86400000); return d.toISOString().split('T')[0]; } return String(v).trim(); };

      for (const row of rows) {
        const numero = String(row['N° OP'] || '').trim();
        if (!numero || ops.find(op => op.numero === numero)) { skip++; continue; }
        const benNom = String(row['Bénéficiaire'] || '').trim();
        let benId = null;
        if (benNom) {
          const exist = beneficiaires.find(b => b.nom?.toLowerCase() === benNom.toLowerCase());
          benId = exist ? exist.id : (await addDoc(collection(db, 'beneficiaires'), { nom: benNom, createdAt: new Date().toISOString() })).id;
        }
        const srcSigle = String(row['Source'] || '').trim();
        const sourceId = sources.find(s => s.sigle?.toLowerCase() === srcSigle.toLowerCase())?.id || null;
        const exerciceId = exercices.find(ex => ex.annee === parseInt(row['Exercice']))?.id || null;

        await addDoc(collection(db, 'ops'), {
          numero, type: String(row['Type'] || 'PROVISOIRE').trim().toUpperCase(),
          sourceId, exerciceId, beneficiaireId: benId, beneficiaireNom: benNom, sourceSigle: srcSigle,
          objet: String(row['Objet'] || '').trim(), montant: parseFloat(row['Montant']) || 0,
          montantPaye: row['Montant payé'] !== undefined && row['Montant payé'] !== '' ? parseFloat(row['Montant payé']) : null,
          ligneBudgetaire: String(row['Ligne budgétaire'] || '').trim(),
          dateCreation: fmtDate(row['Date création']), dateTransmissionCF: fmtDate(row['Date transmission CF']),
          dateVisaCF: fmtDate(row['Date visa CF']), dateTransmissionAC: fmtDate(row['Date transmission AC']),
          datePaiement: fmtDate(row['Date paiement']),
          statut: String(row['Statut'] || 'TRANSMIS_AC').trim().toUpperCase(),
          opProvisoireNumero: String(row['N° OP provisoire rattaché'] || '').trim() || null,
          opProvisoireId: ops.find(o => o.numero === String(row['N° OP provisoire rattaché'] || '').trim())?.id || null,
          observation: String(row['Observation'] || '').trim() || null,
          importAnterieur: true, modeReglement: 'VIREMENT',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
        imp++;
      }
      alert(`Import terminé : ${imp} OP importé(s), ${skip} ignoré(s).`); 
      window.location.reload();
    } catch (err) { alert('Erreur : ' + err.message); }
    setImporting(false); e.target.value = '';
  };

  // === EXPORT EXCEL ===
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const dl = (j, s) => j === null ? '' : j > s ? 'DÉPASSÉ' : 'OK';
      const d1 = opsCompta.map(op => ({ 'N° OP': op.numero, 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant': Number(op.montant || 0), 'Source': getSrc(op), 'Date création': op.dateCreation || '', 'Statut': op.statut, 'Observation': op.observation || '' }));
      const d2 = opsNonVisesCF.map(op => ({ 'N° OP': op.numero, 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant': Number(op.montant || 0), 'Source': getSrc(op), 'N° Bordereau CF': op.bordereauCF || '', 'Date transmission CF': op.dateTransmissionCF || '', 'Délai (j ouvrés)': op.delai ?? '', 'Statut délai': dl(op.delai, 5), 'Observation': op.observation || '' }));
      const d3 = opsNonSoldes.map(op => ({ 'N° OP': op.numero, 'Type': op.type || '', 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant OP': Number(op.montant || 0), 'Montant payé': Number(op.montantPaye || op.montant || 0), 'N° Bordereau AC': op.bordereauAC || '', 'Date transmission AC': op.dateTransmissionAC || '', 'Délai (j ouvrés)': op.delai ?? '', 'Statut délai': dl(op.delai, 5), 'OP prov. rattachés': op.provs?.map(p => p.numero).join(', ') || '', 'Écart': op.ecart ?? '', 'Observation': op.observation || '' }));
      const d4 = opsAAnnuler.map(op => ({ 'N° OP': op.numero, 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant': Number(op.montant || 0), 'Source': getSrc(op), 'Date visa CF': op.dateVisaCF || '', 'Délai (j ouvrés)': op.delai ?? '', 'Statut délai': dl(op.delai, 2), 'Observation': op.observation || '' }));
      const d5 = opsAReg.map(op => { const def = ops.find(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id); return { 'N° OP provisoire': op.numero, 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant': Number(op.montant || 0), 'Montant payé': Number(op.montantPaye || op.montant || 0), 'Date paiement': op.datePaiement || '', 'Délai (jours)': op.delaiJ ?? '', 'Statut délai': dl(op.delaiJ, 60), 'N° OP définitif': def?.numero || '', 'Observation': op.observation || '' }; });
      const d6 = opsExtraTraites.map(op => ({ 'N° OP': op.numero, 'Type': op.type || '', 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant': Number(op.montant || 0), 'Montant payé': Number(op.montantPaye || op.montant || 0), 'Source': getSrc(op), 'Date création': op.dateCreation || '', 'Observation': op.observation || '' }));

      const wb = XLSX.utils.book_new();
      const add = (data, name) => { const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Aucune donnée': '' }]); if (data.length) ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, ...data.map(r => String(r[k] || '').length)) + 2 })); XLSX.utils.book_append_sheet(wb, ws, name); };
      add(d1, 'En cours compta'); add(d2, 'Non visés CF'); add(d3, 'Non soldés');
      add(d4, 'À annuler'); add(d5, 'À régulariser'); add(d6, 'Extra traités');
      XLSX.writeFile(wb, 'Rapport_OP_' + dateRef + '.xlsx');
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  // === CELLULE OBSERVATION ===
  const ObsCell = ({ op }) => {
    if (editId === op.id) return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') editObs(op.id); if (e.key === 'Escape') setEditId(null); }} style={{ ...styles.input, marginBottom: 0, fontSize: 11, padding: '4px 8px', width: 160, borderRadius: 6, border: `1px solid ${P.greenDark}` }} autoFocus />
        <button onClick={() => editObs(op.id)} style={{ border: 'none', background: P.greenDark, color: '#fff', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{I.check('#fff', 14)}</button>
        <button onClick={() => setEditId(null)} style={{ border: 'none', background: P.textMuted, color: '#fff', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{I.close('#fff', 14)}</button>
      </div>
    );
    return <span onClick={() => { setEditId(op.id); setEditText(op.observation || ''); }} style={{ cursor: 'pointer', color: op.observation ? P.text : P.textMuted, fontSize: 11, fontStyle: op.observation ? 'normal' : 'italic' }} title="Cliquer pour modifier">{op.observation || 'Ajouter observation...'}</span>;
  };

  const Chk = ({ id }) => <input type="checkbox" checked={sel.includes(id)} onChange={() => toggleSel(id)} style={{ cursor: 'pointer', width: 14, height: 14, accentColor: P.greenDark }} />;
  const ChkAll = ({ data }) => <input type="checkbox" checked={sel.length === data.length && data.length > 0} onChange={toggleAll} style={{ accentColor: P.greenDark }} />;

  // === TABLEAUX ===
  const renderCompta = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsCompta} /></th><th style={th}>N° OP</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>Date création</th><th style={th}>Statut</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
      <tbody>
        {opsCompta.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun OP en cours</td></tr>}
        {opsCompta.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.greenLight : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{op.dateCreation || '—'}</td><td style={td}><StatutBadge statut={op.statut} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  const renderNonVisesCF = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsNonVisesCF} /></th><th style={th}>N° OP</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>N° Bordereau</th><th style={th}>Date transm. CF</th><th style={th}>Délai</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
      <tbody>
        {opsNonVisesCF.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun OP en attente</td></tr>}
        {opsNonVisesCF.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.goldLight : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{op.bordereauCF || '—'}</td><td style={td}>{op.dateTransmissionCF || '—'}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={3} seuilRouge={5} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  const renderNonSoldes = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsNonSoldes} /></th><th style={th}>N° OP</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Mt payé</th><th style={th}>N° Bord.</th><th style={th}>Date transm. AC</th><th style={th}>Délai</th><th style={th}>OP prov.</th><th style={{ ...th, textAlign: 'right' }}>Écart</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
      <tbody>
        {opsNonSoldes.length === 0 && <tr><td colSpan={13} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun OP non soldé</td></tr>}
        {opsNonSoldes.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.orange + '15' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}><TypeBadge type={op.type} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={tdR}>{formatMontant(op.montantPaye || op.montant)}</td><td style={td}>{op.bordereauAC || '—'}</td><td style={td}>{op.dateTransmissionAC || '—'}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={3} seuilRouge={5} /></td><td style={{ ...td, fontSize: 10, fontFamily: 'monospace', color: P.textSec }}>{op.provs?.length > 0 ? op.provs.map(p => p.numero).join(', ') : '—'}</td><td style={tdR}>{op.ecart !== null && op.ecart !== undefined ? <span style={{ color: op.ecart > 0 ? P.red : op.ecart < 0 ? P.orange : P.greenDark, fontWeight: 700 }}>{op.ecart > 0 ? '+' + formatMontant(op.ecart) : op.ecart < 0 ? formatMontant(op.ecart) : '0'}</span> : '—'}</td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  const renderAAnnuler = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsAAnnuler} /></th><th style={th}>N° OP</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>Date visa CF</th><th style={th}>Délai</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
      <tbody>
        {opsAAnnuler.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun OP à annuler</td></tr>}
        {opsAAnnuler.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.redLight : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{op.dateVisaCF || '—'}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={1} seuilRouge={2} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  const renderAReg = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsAReg} /></th><th style={th}>N° OP prov.</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Mt payé</th><th style={th}>Date paiement</th><th style={th}>Délai</th><th style={th}>OP définitif</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
      <tbody>
        {opsAReg.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun OP à régulariser</td></tr>}
        {opsAReg.map(op => { const def = ops.find(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id); return <tr key={op.id} style={{ background: sel.includes(op.id) ? '#f0f0f0' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={tdR}>{formatMontant(op.montantPaye || op.montant)}</td><td style={td}>{op.datePaiement || '—'}</td><td style={td}><DelaiBadge jours={op.delaiJ} seuilOrange={45} seuilRouge={60} unite="jours" /></td><td style={{ ...td, fontSize: 10, fontFamily: 'monospace', color: P.textSec }}>{def?.numero || '—'}</td><td style={td}><ObsCell op={op} /></td></tr>; })}
      </tbody>
    </table>
  );

  const renderExtraTraites = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsExtraTraites} /></th><th style={th}>N° OP</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Mt payé</th><th style={th}>Source</th><th style={th}>Date création</th><th style={{ ...th, minWidth: 160 }}>Observation</th></tr></thead>
      <tbody>
        {opsExtraTraites.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: P.textMuted, padding: 30 }}>Aucun OP extra traité</td></tr>}
        {opsExtraTraites.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? P.greenLight : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}><TypeBadge type={op.type} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={tdR}>{formatMontant(op.montantPaye || op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{op.dateCreation || '—'}</td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  // === RENDU ===
  return (
    <div>
      {/* EN-TÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: P.greenDark, margin: 0 }}>Rapport Comptable</h1>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: P.textSec }}>Exercice :</label>
            <select value={filtreEx} onChange={e => setFiltreEx(e.target.value)} style={{ ...styles.input, width: 140, marginBottom: 0, fontSize: 12, borderRadius: 8, border: `1px solid ${P.border}` }}>
              <option value="tous">Tous les exercices</option>
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: P.textSec }}>Date de réf. :</label>
            <input type="date" value={dateRef} onChange={e => setDateRef(e.target.value)} style={{ ...styles.input, width: 140, marginBottom: 0, fontSize: 12, borderRadius: 8, border: `1px solid ${P.border}` }} />
          </div>
          <button onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: P.greenDark, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: `0 4px 12px ${P.greenDark}33`, transition: 'all .2s' }}>
            {I.fileText('#fff', 16)} Exporter le rapport
          </button>
        </div>
      </div>

      {/* ZONE ACTIONS (IMPORT) */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#FAFAF8', color: P.textSec, border: `1px solid ${P.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          {I.download(P.textSec, 14)} Télécharger Canevas
        </button>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: P.orange, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: `0 2px 8px ${P.orange}44`, opacity: importing ? 0.6 : 1 }}>
          {importing ? I.loader('#fff', 14) : I.upload('#fff', 14)}
          {importing ? 'Import en cours...' : 'Importer des OP antérieurs'}
          <input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
        </label>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
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

      {/* BARRE DE SÉLECTION DYNAMIQUE */}
      {sel.length > 0 && (
        <div style={{ background: `${activeTab === 'extratraite' ? P.greenLight : P.goldLight}`, borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', border: `1px solid ${activeTab === 'extratraite' ? P.green : P.goldBorder}` }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: activeTab === 'extratraite' ? P.greenDark : P.gold }}>{sel.length} OP sélectionné(s)</span>
          <input value={obsText} onChange={e => setObsText(e.target.value)} placeholder="Saisir une observation pour la sélection..." style={{ ...styles.input, marginBottom: 0, flex: 1, minWidth: 250, fontSize: 12, borderRadius: 8 }} onKeyDown={e => { if (e.key === 'Enter') saveObs(); }} />
          <button onClick={saveObs} disabled={savingObs} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: P.greenDark, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: savingObs ? 0.6 : 1 }}>
            {savingObs ? I.loader() : I.save()} Enregistrer l'observation
          </button>
          {activeTab !== 'extratraite' && sel.some(id => ops.find(o => o.id === id)?.importAnterieur) && (
            <button onClick={handleTraite} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: P.olive, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {I.checkCircle()} Marquer comme Traité
            </button>
          )}
          {activeTab === 'extratraite' && (
            <button onClick={handleUnTraite} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: P.orange, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {I.undo()} Remettre dans le circuit
            </button>
          )}
          <button onClick={() => { setSel([]); setObsText(''); }} style={{ padding: '8px 16px', background: 'transparent', color: P.textSec, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
            Annuler la sélection
          </button>
        </div>
      )}

      {/* RÉSUMÉ DYNAMIQUE DE L'ONGLET */}
      <div style={{ background: P.card, borderRadius: 10, padding: '12px 20px', marginBottom: 20, fontSize: 13, display: 'flex', gap: 24, flexWrap: 'wrap', border: `1px solid ${P.border}`, boxShadow: '0 2px 6px rgba(0,0,0,.02)' }}>
        {activeTab === 'compta' && <span style={{ color: P.text }}>Montant total en cours : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.olive }}>{formatMontant(opsCompta.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span>}
        {activeTab === 'nonvise' && <><span style={{ color: P.text }}>Montant total en attente : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.gold }}>{formatMontant(opsNonVisesCF.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span><span>Dépassés ({'>'}5j ouvrés) : <strong style={{ color: P.red, fontSize: 14 }}>{opsNonVisesCF.filter(o => o.delai > 5).length}</strong></span></>}
        {activeTab === 'nonsolde' && <><span style={{ color: P.text }}>Montant total non soldé : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.orange }}>{formatMontant(opsNonSoldes.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span><span>Dépassés ({'>'}5j ouvrés) : <strong style={{ color: P.red, fontSize: 14 }}>{opsNonSoldes.filter(o => o.delai > 5).length}</strong></span></>}
        {activeTab === 'annuler' && <><span style={{ color: P.text }}>Montant total à annuler : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.red }}>{formatMontant(opsAAnnuler.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span><span>Dépassés ({'>'}2j ouvrés) : <strong style={{ color: P.red, fontSize: 14 }}>{opsAAnnuler.filter(o => o.delai > 2).length}</strong></span></>}
        {activeTab === 'regulariser' && <><span style={{ color: P.text }}>Montant total à régulariser : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.textSec }}>{formatMontant(opsAReg.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span><span>Dépassés ({'>'}60j calendaires) : <strong style={{ color: P.red, fontSize: 14 }}>{opsAReg.filter(o => o.delaiJ > 60).length}</strong></span></>}
        {activeTab === 'extratraite' && <span style={{ color: P.text }}>Montant total classé (Extra) : <strong style={{ fontFamily: 'monospace', fontSize: 15, color: P.greenDark }}>{formatMontant(opsExtraTraites.reduce((s, o) => s + Number(o.montant || 0), 0))} F</strong></span>}
      </div>

      {/* TABLEAU */}
      <div style={{ background: P.card, borderRadius: 12, overflow: 'auto', border: `1px solid ${P.border}`, maxHeight: 'calc(100vh - 350px)' }}>
        {activeTab === 'compta' && renderCompta()}
        {activeTab === 'nonvise' && renderNonVisesCF()}
        {activeTab === 'nonsolde' && renderNonSoldes()}
        {activeTab === 'annuler' && renderAAnnuler()}
        {activeTab === 'regulariser' && renderAReg()}
        {activeTab === 'extratraite' && renderExtraTraites()}
      </div>
    </div>
  );
}
