import React, { useState, useMemo, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

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
  if (jours === null || jours === undefined) return <span style={{ color: '#999', fontSize: 10 }}>—</span>;
  let bg = '#e8f5e9', color = '#2e7d32';
  if (jours > seuilOrange) { bg = '#fff3e0'; color = '#e65100'; }
  if (jours > seuilRouge) { bg = '#ffebee'; color = '#c62828'; }
  return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{jours} {unite}</span>;
};

const StatutBadge = ({ statut }) => {
  const m = {
    CREE: { bg: '#e3f2fd', c: '#1565c0', l: 'Créé' }, TRANSMIS_CF: { bg: '#fff3e0', c: '#e65100', l: 'Transmis CF' },
    VISE_CF: { bg: '#e8f5e9', c: '#2e7d32', l: 'Visé CF' }, REJETE_CF: { bg: '#ffebee', c: '#c62828', l: 'Rejeté CF' },
    RETOURNE_CF: { bg: '#fce4ec', c: '#ad1457', l: 'Retourné CF' }, DIFFERE_CF: { bg: '#f3e5f5', c: '#6a1b9a', l: 'Différé CF' },
    TRANSMIS_AC: { bg: '#fff3e0', c: '#e65100', l: 'Transmis AC' }, REJETE_AC: { bg: '#ffebee', c: '#c62828', l: 'Rejeté AC' },
    RETOURNE_AC: { bg: '#fce4ec', c: '#ad1457', l: 'Retourné AC' }, DIFFERE_AC: { bg: '#f3e5f5', c: '#6a1b9a', l: 'Différé AC' },
    PAYE: { bg: '#e8f5e9', c: '#1b5e20', l: 'Payé' }, PAYE_PARTIEL: { bg: '#f1f8e9', c: '#33691e', l: 'Payé partiel' },
    ARCHIVE: { bg: '#eceff1', c: '#546e6a', l: 'Archivé' }, ANNULE: { bg: '#eceff1', c: '#546e6a', l: 'Annulé' },
    TRAITE: { bg: '#e0f2f1', c: '#00695c', l: 'Traité' },
  };
  const s = m[statut] || { bg: '#eee', c: '#666', l: statut };
  return <span style={{ background: s.bg, color: s.c, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{s.l}</span>;
};

const TypeBadge = ({ type }) => {
  const m = { PROVISOIRE: { bg: '#e3f2fd', c: '#1565c0' }, DEFINITIF: { bg: '#f3e5f5', c: '#6a1b9a' }, ANNULATION: { bg: '#fff3e0', c: '#e65100' } };
  const s = m[type] || { bg: '#eee', c: '#666' };
  return <span style={{ background: s.bg, color: s.c, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600 }}>{type || '—'}</span>;
};

const ExBadge = ({ exerciceId, exercices, exerciceActif }) => {
  const ex = exercices.find(e => e.id === exerciceId);
  if (!ex || (exerciceActif && ex.id === exerciceActif.id)) return null;
  return <span style={{ background: '#ffebee', color: '#c62828', padding: '1px 5px', borderRadius: 3, fontSize: 8, fontWeight: 700, marginLeft: 4 }}>{ex.annee}</span>;
};

const th = { padding: '8px 10px', fontSize: 10, fontWeight: 700, textAlign: 'left', borderBottom: '2px solid #ddd', background: '#f5f7fa', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
const td = { padding: '7px 10px', fontSize: 11, borderBottom: '1px solid #eee' };
const tdR = { ...td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 };
const tdM = { ...td, fontWeight: 600, fontFamily: 'monospace', fontSize: 10 };
const tdE = { ...td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function PageRapport() {
  const { ops, setOps, beneficiaires, sources, exercices, exerciceActif } = useAppContext();
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
    { id: 'compta', label: 'En cours compta', icon: '🏢', count: opsCompta.length },
    { id: 'nonvise', label: 'Non visés CF', icon: '⏳', count: opsNonVisesCF.length },
    { id: 'nonsolde', label: 'Non soldés', icon: '💰', count: opsNonSoldes.length },
    { id: 'annuler', label: 'À annuler', icon: '🚫', count: opsAAnnuler.length },
    { id: 'regulariser', label: 'À régulariser', icon: '📋', count: opsAReg.length },
    { id: 'extratraite', label: 'Extra traités', icon: '✅', count: opsExtraTraites.length },
  ];

  // === SÉLECTION / OBSERVATIONS ===
  const toggleSel = (id) => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => { const d = getData(); setSel(sel.length === d.length ? [] : d.map(o => o.id)); };
  const changeTab = (t) => { setActiveTab(t); setSel([]); setObsText(''); setEditId(null); };

  const saveObs = async () => {
    if (sel.length === 0) return;
    setSavingObs(true);
    try {
      const v = obsText.trim() || null;
      for (const id of sel) await updateDoc(doc(db, 'ops', id), { observation: v, updatedAt: new Date().toISOString() });
      setOps(p => p.map(op => sel.includes(op.id) ? { ...op, observation: v } : op));
      setSel([]); setObsText('');
      alert('✅ Observation enregistrée pour ' + sel.length + ' OP.');
    } catch (e) { alert('Erreur : ' + e.message); }
    setSavingObs(false);
  };

  const editObs = async (id) => {
    try {
      const v = editText.trim() || null;
      await updateDoc(doc(db, 'ops', id), { observation: v, updatedAt: new Date().toISOString() });
      setOps(p => p.map(op => op.id === id ? { ...op, observation: v } : op));
      setEditId(null); setEditText('');
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  // === MARQUER TRAITÉ / ANNULER ===
  const handleTraite = async () => {
    const extras = sel.filter(id => ops.find(o => o.id === id)?.importAnterieur);
    if (extras.length === 0) { alert('Sélectionnez au moins un OP importé (extra).'); return; }
    if (!window.confirm('Marquer ' + extras.length + ' OP extra comme "Traité" ?\nIls seront déplacés dans l\'onglet "Extra traités".')) return;
    try {
      for (const id of extras) await updateDoc(doc(db, 'ops', id), { statut: 'TRAITE', updatedAt: new Date().toISOString() });
      setOps(p => p.map(op => extras.includes(op.id) ? { ...op, statut: 'TRAITE' } : op));
      setSel([]); alert('✅ ' + extras.length + ' OP marqué(s) comme traité(s).');
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  const handleUnTraite = async () => {
    if (sel.length === 0) return;
    if (!window.confirm('Remettre ' + sel.length + ' OP dans les rapports ?')) return;
    try {
      for (const id of sel) {
        const op = ops.find(o => o.id === id);
        const prev = op?.datePaiement ? 'PAYE' : op?.dateTransmissionAC ? 'TRANSMIS_AC' : op?.dateVisaCF ? 'VISE_CF' : op?.dateTransmissionCF ? 'TRANSMIS_CF' : 'CREE';
        await updateDoc(doc(db, 'ops', id), { statut: prev, updatedAt: new Date().toISOString() });
        setOps(p => p.map(o => o.id === id ? { ...o, statut: prev } : o));
      }
      setSel([]); alert('✅ OP remis dans les rapports.');
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
      alert('✅ Import : ' + imp + ' OP importé(s), ' + skip + ' ignoré(s).'); window.location.reload();
    } catch (err) { alert('Erreur : ' + err.message); }
    setImporting(false); e.target.value = '';
  };

  // === EXPORT EXCEL ===
  const handleExport = async () => {
    try {
      const XLSX = await import('xlsx');
      const dl = (j, s) => j === null ? '' : j > s ? '⛔ DÉPASSÉ' : '✅ OK';
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
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') editObs(op.id); if (e.key === 'Escape') setEditId(null); }} style={{ ...styles.input, marginBottom: 0, fontSize: 10, padding: '3px 6px', width: 150 }} autoFocus />
        <button onClick={() => editObs(op.id)} style={{ border: 'none', background: '#1b5e20', color: '#fff', borderRadius: 4, padding: '3px 6px', fontSize: 10, cursor: 'pointer' }}>✓</button>
        <button onClick={() => setEditId(null)} style={{ border: 'none', background: '#999', color: '#fff', borderRadius: 4, padding: '3px 6px', fontSize: 10, cursor: 'pointer' }}>✕</button>
      </div>
    );
    return <span onClick={() => { setEditId(op.id); setEditText(op.observation || ''); }} style={{ cursor: 'pointer', color: op.observation ? '#333' : '#bbb', fontSize: 10, fontStyle: op.observation ? 'normal' : 'italic' }} title="Cliquer pour modifier">{op.observation || 'Ajouter...'}</span>;
  };

  const Chk = ({ id }) => <input type="checkbox" checked={sel.includes(id)} onChange={() => toggleSel(id)} style={{ cursor: 'pointer', width: 15, height: 15 }} />;
  const ChkAll = ({ data }) => <input type="checkbox" checked={sel.length === data.length && data.length > 0} onChange={toggleAll} />;

  // === TABLEAUX ===
  const renderCompta = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsCompta} /></th><th style={th}>N° OP</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>Date création</th><th style={th}>Statut</th><th style={{ ...th, minWidth: 120 }}>Observation</th></tr></thead>
      <tbody>
        {opsCompta.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucun OP en cours</td></tr>}
        {opsCompta.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? '#e3f2fd' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{op.dateCreation || '—'}</td><td style={td}><StatutBadge statut={op.statut} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  const renderNonVisesCF = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsNonVisesCF} /></th><th style={th}>N° OP</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>N° Bordereau</th><th style={th}>Date transm. CF</th><th style={th}>Délai</th><th style={{ ...th, minWidth: 120 }}>Observation</th></tr></thead>
      <tbody>
        {opsNonVisesCF.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucun OP en attente</td></tr>}
        {opsNonVisesCF.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? '#e3f2fd' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{op.bordereauCF || '—'}</td><td style={td}>{op.dateTransmissionCF || '—'}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={3} seuilRouge={5} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  const renderNonSoldes = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsNonSoldes} /></th><th style={th}>N° OP</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Mt payé</th><th style={th}>N° Bord.</th><th style={th}>Date transm. AC</th><th style={th}>Délai</th><th style={th}>OP prov.</th><th style={{ ...th, textAlign: 'right' }}>Écart</th><th style={{ ...th, minWidth: 120 }}>Observation</th></tr></thead>
      <tbody>
        {opsNonSoldes.length === 0 && <tr><td colSpan={13} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucun OP non soldé</td></tr>}
        {opsNonSoldes.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? '#e3f2fd' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}><TypeBadge type={op.type} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={tdR}>{formatMontant(op.montantPaye || op.montant)}</td><td style={td}>{op.bordereauAC || '—'}</td><td style={td}>{op.dateTransmissionAC || '—'}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={3} seuilRouge={5} /></td><td style={{ ...td, fontSize: 9, fontFamily: 'monospace' }}>{op.provs?.length > 0 ? op.provs.map(p => p.numero).join(', ') : '—'}</td><td style={tdR}>{op.ecart !== null && op.ecart !== undefined ? <span style={{ color: op.ecart > 0 ? '#c62828' : op.ecart < 0 ? '#e65100' : '#2e7d32', fontWeight: 600 }}>{op.ecart > 0 ? '+' + formatMontant(op.ecart) : op.ecart < 0 ? formatMontant(op.ecart) : '0'}</span> : '—'}</td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  const renderAAnnuler = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsAAnnuler} /></th><th style={th}>N° OP</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={th}>Source</th><th style={th}>Date visa CF</th><th style={th}>Délai</th><th style={{ ...th, minWidth: 120 }}>Observation</th></tr></thead>
      <tbody>
        {opsAAnnuler.length === 0 && <tr><td colSpan={9} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucun OP à annuler</td></tr>}
        {opsAAnnuler.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? '#e3f2fd' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{op.dateVisaCF || '—'}</td><td style={td}><DelaiBadge jours={op.delai} seuilOrange={1} seuilRouge={2} /></td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  const renderAReg = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsAReg} /></th><th style={th}>N° OP prov.</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Mt payé</th><th style={th}>Date paiement</th><th style={th}>Délai</th><th style={th}>OP définitif</th><th style={{ ...th, minWidth: 120 }}>Observation</th></tr></thead>
      <tbody>
        {opsAReg.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucun OP à régulariser</td></tr>}
        {opsAReg.map(op => { const def = ops.find(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id); return <tr key={op.id} style={{ background: sel.includes(op.id) ? '#e3f2fd' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={tdR}>{formatMontant(op.montantPaye || op.montant)}</td><td style={td}>{op.datePaiement || '—'}</td><td style={td}><DelaiBadge jours={op.delaiJ} seuilOrange={45} seuilRouge={60} unite="jours" /></td><td style={{ ...td, fontSize: 9, fontFamily: 'monospace' }}>{def?.numero || '—'}</td><td style={td}><ObsCell op={op} /></td></tr>; })}
      </tbody>
    </table>
  );

  const renderExtraTraites = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={{ ...th, width: 30 }}><ChkAll data={opsExtraTraites} /></th><th style={th}>N° OP</th><th style={th}>Type</th><th style={th}>Bénéficiaire</th><th style={th}>Objet</th><th style={{ ...th, textAlign: 'right' }}>Montant</th><th style={{ ...th, textAlign: 'right' }}>Mt payé</th><th style={th}>Source</th><th style={th}>Date création</th><th style={{ ...th, minWidth: 120 }}>Observation</th></tr></thead>
      <tbody>
        {opsExtraTraites.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: 'center', color: '#999' }}>Aucun OP extra traité</td></tr>}
        {opsExtraTraites.map(op => <tr key={op.id} style={{ background: sel.includes(op.id) ? '#e3f2fd' : 'transparent' }}><td style={td}><Chk id={op.id} /></td><td style={tdM}>{op.numero}<ExBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td><td style={td}><TypeBadge type={op.type} /></td><td style={td}>{getBen(op)}</td><td style={tdE}>{op.objet || '—'}</td><td style={tdR}>{formatMontant(op.montant)}</td><td style={tdR}>{formatMontant(op.montantPaye || op.montant)}</td><td style={td}>{getSrc(op)}</td><td style={td}>{op.dateCreation || '—'}</td><td style={td}><ObsCell op={op} /></td></tr>)}
      </tbody>
    </table>
  );

  // === RENDU ===
  return (
    <div>
      {/* EN-TÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>📊 Rapport</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Exercice :</label>
            <select value={filtreEx} onChange={e => setFiltreEx(e.target.value)} style={{ ...styles.input, width: 130, marginBottom: 0, fontSize: 11 }}>
              <option value="tous">Tous</option>
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Date réf. :</label>
            <input type="date" value={dateRef} onChange={e => setDateRef(e.target.value)} style={{ ...styles.input, width: 145, marginBottom: 0, fontSize: 11 }} />
          </div>
          <button onClick={handleExport} style={{ ...styles.button, background: '#1b5e20', fontSize: 11, padding: '7px 14px' }}>📥 Export Excel</button>
        </div>
      </div>

      {/* IMPORT */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleDownloadTemplate} style={{ ...styles.button, background: '#0d47a1', fontSize: 11, padding: '6px 12px' }}>📄 Télécharger canevas</button>
        <label style={{ ...styles.button, background: '#e65100', fontSize: 11, padding: '6px 12px', cursor: 'pointer', opacity: importing ? 0.6 : 1 }}>
          📤 {importing ? 'Import en cours...' : 'Importer OP antérieurs'}
          <input type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
        </label>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => changeTab(t.id)} style={{
            padding: '8px 14px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: activeTab === t.id ? '#1a1a2e' : '#f0f0f0', color: activeTab === t.id ? '#fff' : '#333',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
          }}>
            {t.icon} {t.label}
            <span style={{ background: activeTab === t.id ? 'rgba(255,255,255,0.2)' : '#ddd', padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* BARRE SÉLECTION */}
      {sel.length > 0 && (
        <div style={{ background: '#e3f2fd', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{sel.length} OP sélectionné(s)</span>
          <input value={obsText} onChange={e => setObsText(e.target.value)} placeholder="Saisir l'observation..." style={{ ...styles.input, marginBottom: 0, flex: 1, minWidth: 200, fontSize: 12 }} onKeyDown={e => { if (e.key === 'Enter') saveObs(); }} />
          <button onClick={saveObs} disabled={savingObs} style={{ ...styles.button, fontSize: 11, padding: '7px 14px', opacity: savingObs ? 0.6 : 1 }}>{savingObs ? '⏳' : '💾'} Observation</button>
          {activeTab !== 'extratraite' && sel.some(id => ops.find(o => o.id === id)?.importAnterieur) && (
            <button onClick={handleTraite} style={{ ...styles.button, background: '#00695c', fontSize: 11, padding: '7px 14px' }}>✅ Marquer Traité</button>
          )}
          {activeTab === 'extratraite' && (
            <button onClick={handleUnTraite} style={{ ...styles.button, background: '#e65100', fontSize: 11, padding: '7px 14px' }}>↩️ Remettre dans rapports</button>
          )}
          <button onClick={() => { setSel([]); setObsText(''); }} style={{ ...styles.button, background: '#999', fontSize: 11, padding: '7px 14px' }}>Annuler</button>
        </div>
      )}

      {/* RÉSUMÉ */}
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 16px', marginBottom: 12, fontSize: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {activeTab === 'compta' && <span>Total : <strong>{formatMontant(opsCompta.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA — <strong>{opsCompta.length}</strong> OP</span>}
        {activeTab === 'nonvise' && <><span>Total : <strong>{formatMontant(opsNonVisesCF.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span><span>Dépassés ({'>'}5j) : <strong style={{ color: '#c62828' }}>{opsNonVisesCF.filter(o => o.delai > 5).length}</strong></span></>}
        {activeTab === 'nonsolde' && <><span>Total : <strong>{formatMontant(opsNonSoldes.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span><span>Dépassés ({'>'}5j) : <strong style={{ color: '#c62828' }}>{opsNonSoldes.filter(o => o.delai > 5).length}</strong></span></>}
        {activeTab === 'annuler' && <><span>Total : <strong>{formatMontant(opsAAnnuler.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span><span>Dépassés ({'>'}2j) : <strong style={{ color: '#c62828' }}>{opsAAnnuler.filter(o => o.delai > 2).length}</strong></span></>}
        {activeTab === 'regulariser' && <><span>Total : <strong>{formatMontant(opsAReg.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span><span>Dépassés ({'>'}60j) : <strong style={{ color: '#c62828' }}>{opsAReg.filter(o => o.delaiJ > 60).length}</strong></span></>}
        {activeTab === 'extratraite' && <span>Total : <strong>{formatMontant(opsExtraTraites.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA — <strong>{opsExtraTraites.length}</strong> OP traité(s)</span>}
      </div>

      {/* TABLEAU */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: 'calc(100vh - 380px)' }}>
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
