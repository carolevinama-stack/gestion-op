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
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  if (isNaN(d1) || isNaN(d2)) return null;
  let count = 0;
  const current = new Date(d1);
  while (current < d2) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
};

const joursCalendaires = (dateDebut, dateFin) => {
  if (!dateDebut || !dateFin) return null;
  const d1 = new Date(dateDebut);
  const d2 = new Date(dateFin);
  if (isNaN(d1) || isNaN(d2)) return null;
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

const DelaiBadge = ({ jours, seuilOrange, seuilRouge, unite = 'j ouvrés' }) => {
  if (jours === null || jours === undefined) return <span style={{ color: '#999', fontSize: 10 }}>—</span>;
  let bg = '#e8f5e9', color = '#2e7d32';
  if (jours > seuilOrange) { bg = '#fff3e0'; color = '#e65100'; }
  if (jours > seuilRouge) { bg = '#ffebee'; color = '#c62828'; }
  return <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{jours} {unite}</span>;
};

const StatutBadge = ({ statut }) => {
  const map = {
    CREE: { bg: '#e3f2fd', color: '#1565c0', label: 'Créé' },
    TRANSMIS_CF: { bg: '#fff3e0', color: '#e65100', label: 'Transmis CF' },
    VISE_CF: { bg: '#e8f5e9', color: '#2e7d32', label: 'Visé CF' },
    REJETE_CF: { bg: '#ffebee', color: '#c62828', label: 'Rejeté CF' },
    RETOURNE_CF: { bg: '#fce4ec', color: '#ad1457', label: 'Retourné CF' },
    DIFFERE_CF: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Différé CF' },
    TRANSMIS_AC: { bg: '#fff3e0', color: '#e65100', label: 'Transmis AC' },
    REJETE_AC: { bg: '#ffebee', color: '#c62828', label: 'Rejeté AC' },
    RETOURNE_AC: { bg: '#fce4ec', color: '#ad1457', label: 'Retourné AC' },
    DIFFERE_AC: { bg: '#f3e5f5', color: '#6a1b9a', label: 'Différé AC' },
    PAYE: { bg: '#e8f5e9', color: '#1b5e20', label: 'Payé' },
    PAYE_PARTIEL: { bg: '#f1f8e9', color: '#33691e', label: 'Payé partiel' },
    ARCHIVE: { bg: '#eceff1', color: '#546e6a', label: 'Archivé' },
    ANNULE: { bg: '#eceff1', color: '#546e6a', label: 'Annulé' },
  };
  const s = map[statut] || { bg: '#eee', color: '#666', label: statut };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{s.label}</span>;
};

const TypeBadge = ({ type }) => {
  const map = { PROVISOIRE: { bg: '#e3f2fd', color: '#1565c0' }, DEFINITIF: { bg: '#f3e5f5', color: '#6a1b9a' }, ANNULATION: { bg: '#fff3e0', color: '#e65100' } };
  const s = map[type] || { bg: '#eee', color: '#666' };
  return <span style={{ background: s.bg, color: s.color, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600 }}>{type || '—'}</span>;
};

const ExerciceBadge = ({ exerciceId, exercices, exerciceActif }) => {
  const ex = exercices.find(e => e.id === exerciceId);
  if (!ex) return null;
  const isActif = exerciceActif && ex.id === exerciceActif.id;
  if (isActif) return null;
  return <span style={{ background: '#ffebee', color: '#c62828', padding: '1px 5px', borderRadius: 3, fontSize: 8, fontWeight: 700, marginLeft: 4 }}>{ex.annee}</span>;
};

// Styles tableau
const thStyle = { padding: '8px 10px', fontSize: 10, fontWeight: 700, textAlign: 'left', borderBottom: '2px solid #ddd', background: '#f5f7fa', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1 };
const tdStyle = { padding: '7px 10px', fontSize: 11, borderBottom: '1px solid #eee' };
const tdRight = { ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 };
const tdMono = { ...tdStyle, fontWeight: 600, fontFamily: 'monospace', fontSize: 10 };
const tdEllipsis = { ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function PageRapport() {
  const { ops, setOps, beneficiaires, sources, exercices, exerciceActif } = useAppContext();
  const [activeTab, setActiveTab] = useState('compta');
  const [dateRef, setDateRef] = useState(new Date().toISOString().split('T')[0]);
  const [filtreExercice, setFiltreExercice] = useState('tous');
  const [selectedOps, setSelectedOps] = useState([]);
  const [obsText, setObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [editingObsId, setEditingObsId] = useState(null);
  const [editingObsText, setEditingObsText] = useState('');
  const [importing, setImporting] = useState(false);

  // Helpers
  const getBen = useCallback((op) => beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || op.beneficiaireNom || '—', [beneficiaires]);
  const getSource = useCallback((op) => sources.find(s => s.id === op.sourceId)?.sigle || op.sourceSigle || '—', [sources]);

  // Filtre exercice
  const filteredOps = useMemo(() => {
    if (filtreExercice === 'tous') return ops;
    return ops.filter(op => op.exerciceId === filtreExercice);
  }, [ops, filtreExercice]);

  // ============================================================
  // DONNÉES PAR ONGLET
  // ============================================================
  const opsCompta = useMemo(() =>
    filteredOps.filter(op => ['CREE', 'VISE_CF', 'RETOURNE_CF', 'RETOURNE_AC', 'DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut)),
    [filteredOps]);

  const opsNonVisesCF = useMemo(() =>
    filteredOps.filter(op => op.statut === 'TRANSMIS_CF').map(op => ({ ...op, delai: joursOuvres(op.dateTransmissionCF, dateRef) })),
    [filteredOps, dateRef]);

  const opsNonSoldes = useMemo(() =>
    filteredOps.filter(op => ['TRANSMIS_AC'].includes(op.statut)).map(op => {
      const delai = joursOuvres(op.dateTransmissionAC, dateRef);
      let opsProvRattaches = [];
      let ecart = null;
      if (op.type === 'DEFINITIF' && op.opProvisoireId) {
        const prov = ops.find(o => o.id === op.opProvisoireId);
        if (prov) opsProvRattaches.push(prov);
      }
      if (op.type === 'DEFINITIF' && opsProvRattaches.length > 0) {
        const totalPaye = opsProvRattaches.reduce((sum, p) => sum + Number(p.montantPaye || p.montant || 0), 0);
        ecart = totalPaye - Number(op.montant || 0);
      }
      return { ...op, delai, opsProvRattaches, ecart };
    }),
    [filteredOps, ops, dateRef]);

  const opsAAnnuler = useMemo(() =>
    filteredOps.filter(op => {
      if (op.type !== 'PROVISOIRE') return false;
      if (!['VISE_CF', 'TRANSMIS_AC', 'PAYE'].includes(op.statut)) return false;
      return !ops.some(o => o.type === 'ANNULATION' && o.opProvisoireId === op.id);
    }).map(op => ({ ...op, delai: joursOuvres(op.dateVisaCF, dateRef) })),
    [filteredOps, ops, dateRef]);

  const opsARegulariser = useMemo(() =>
    filteredOps.filter(op => {
      if (op.type !== 'PROVISOIRE') return false;
      if (!['PAYE', 'PAYE_PARTIEL'].includes(op.statut)) return false;
      return !ops.some(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id);
    }).map(op => ({ ...op, delaiJours: joursCalendaires(op.datePaiement, dateRef) })),
    [filteredOps, ops, dateRef]);

  const currentData = () => {
    switch (activeTab) {
      case 'compta': return opsCompta;
      case 'nonvise': return opsNonVisesCF;
      case 'nonsolde': return opsNonSoldes;
      case 'annuler': return opsAAnnuler;
      case 'regulariser': return opsARegulariser;
      default: return [];
    }
  };

  const tabs = [
    { id: 'compta', label: 'En cours compta', icon: '🏢', count: opsCompta.length },
    { id: 'nonvise', label: 'Non visés CF', icon: '⏳', count: opsNonVisesCF.length },
    { id: 'nonsolde', label: 'Non soldés', icon: '💰', count: opsNonSoldes.length },
    { id: 'annuler', label: 'À annuler', icon: '🚫', count: opsAAnnuler.length },
    { id: 'regulariser', label: 'À régulariser', icon: '📋', count: opsARegulariser.length },
  ];

  // ============================================================
  // OBSERVATIONS
  // ============================================================
  const handleToggleSelect = (opId) => {
    setSelectedOps(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  };

  const handleSelectAll = () => {
    const data = currentData();
    if (selectedOps.length === data.length) setSelectedOps([]);
    else setSelectedOps(data.map(op => op.id));
  };

  const handleSaveObs = async () => {
    if (!obsText.trim() || selectedOps.length === 0) return;
    setSavingObs(true);
    try {
      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), { observation: obsText.trim(), updatedAt: new Date().toISOString() });
      }
      setOps(prev => prev.map(op => selectedOps.includes(op.id) ? { ...op, observation: obsText.trim() } : op));
      setSelectedOps([]);
      setObsText('');
      alert('✅ Observation enregistrée pour ' + selectedOps.length + ' OP.');
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
    setSavingObs(false);
  };

  const handleEditObs = async (opId) => {
    if (!editingObsText.trim()) return;
    try {
      await updateDoc(doc(db, 'ops', opId), { observation: editingObsText.trim(), updatedAt: new Date().toISOString() });
      setOps(prev => prev.map(op => op.id === opId ? { ...op, observation: editingObsText.trim() } : op));
      setEditingObsId(null);
      setEditingObsText('');
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedOps([]);
    setObsText('');
    setEditingObsId(null);
  };

  // ============================================================
  // IMPORT EXCEL OP ANTÉRIEURS
  // ============================================================
  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const template = [{
        'N° OP': 'IDA-2023-0045', 'Type': 'PROVISOIRE', 'Bénéficiaire': 'SARL EXEMPLE',
        'Objet': 'Fourniture matériel', 'Montant': 5000000, 'Montant payé': 5000000,
        'Source': 'IDA', 'Exercice': 2023, 'Ligne budgétaire': '2.1.1',
        'Date création': '2023-05-15', 'Date transmission CF': '2023-06-01',
        'Date visa CF': '2023-06-05', 'Date transmission AC': '2023-06-10',
        'Date paiement': '2023-07-01', 'Statut': 'TRANSMIS_AC',
        'N° OP provisoire rattaché': '', 'Observation': ''
      }];
      const ws = XLSX.utils.json_to_sheet(template);
      ws['!cols'] = Object.keys(template[0]).map(k => ({ wch: Math.max(k.length + 2, 18) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Canevas');
      XLSX.writeFile(wb, 'Canevas_Import_OP_Anterieurs.xlsx');
    } catch (e) {
      alert('Erreur : ' + e.message);
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) { alert('Fichier vide.'); setImporting(false); return; }

      let imported = 0, skipped = 0;

      for (const row of rows) {
        const numero = String(row['N° OP'] || '').trim();
        if (!numero) { skipped++; continue; }

        // Vérifier doublon
        if (ops.find(op => op.numero === numero)) { skipped++; continue; }

        // Trouver ou créer bénéficiaire
        const benNom = String(row['Bénéficiaire'] || '').trim();
        let benId = null;
        if (benNom) {
          const benExist = beneficiaires.find(b => b.nom?.toLowerCase() === benNom.toLowerCase());
          if (benExist) {
            benId = benExist.id;
          } else {
            const benRef = await addDoc(collection(db, 'beneficiaires'), { nom: benNom, createdAt: new Date().toISOString() });
            benId = benRef.id;
          }
        }

        // Trouver source et exercice
        const srcSigle = String(row['Source'] || '').trim();
        const sourceId = sources.find(s => s.sigle?.toLowerCase() === srcSigle.toLowerCase())?.id || null;
        const annee = parseInt(row['Exercice']);
        const exerciceId = exercices.find(ex => ex.annee === annee)?.id || null;

        // Formater les dates (gère les dates Excel numériques)
        const formatDate = (val) => {
          if (!val) return null;
          if (typeof val === 'number') {
            const d = new Date((val - 25569) * 86400 * 1000);
            return d.toISOString().split('T')[0];
          }
          return String(val).trim();
        };

        const opData = {
          numero,
          type: String(row['Type'] || 'PROVISOIRE').trim().toUpperCase(),
          sourceId, exerciceId, beneficiaireId: benId,
          beneficiaireNom: benNom, sourceSigle: srcSigle,
          objet: String(row['Objet'] || '').trim(),
          montant: parseFloat(row['Montant']) || 0,
          montantPaye: row['Montant payé'] !== undefined && row['Montant payé'] !== '' ? parseFloat(row['Montant payé']) : null,
          ligneBudgetaire: String(row['Ligne budgétaire'] || '').trim(),
          dateCreation: formatDate(row['Date création']),
          dateTransmissionCF: formatDate(row['Date transmission CF']),
          dateVisaCF: formatDate(row['Date visa CF']),
          dateTransmissionAC: formatDate(row['Date transmission AC']),
          datePaiement: formatDate(row['Date paiement']),
          statut: String(row['Statut'] || 'TRANSMIS_AC').trim().toUpperCase(),
          opProvisoireNumero: String(row['N° OP provisoire rattaché'] || '').trim() || null,
          opProvisoireId: null,
          observation: String(row['Observation'] || '').trim() || null,
          importAnterieur: true,
          modeReglement: 'VIREMENT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Rattacher OP provisoire si numéro renseigné
        if (opData.opProvisoireNumero) {
          const provOp = ops.find(o => o.numero === opData.opProvisoireNumero);
          if (provOp) opData.opProvisoireId = provOp.id;
        }

        await addDoc(collection(db, 'ops'), opData);
        imported++;
      }

      alert('✅ Import terminé : ' + imported + ' OP importé(s), ' + skipped + ' ignoré(s) (doublons ou vides).');
      window.location.reload();
    } catch (err) {
      alert('Erreur import : ' + err.message);
    }
    setImporting(false);
    e.target.value = '';
  };

  // ============================================================
  // EXPORT EXCEL
  // ============================================================
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const delaiLabel = (j, seuil) => j === null ? '' : j > seuil ? '⛔ DÉPASSÉ' : '✅ OK';

      const data1 = opsCompta.map(op => ({
        'N° OP': op.numero, 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant': Number(op.montant || 0),
        'Source': getSource(op), 'Date création': op.dateCreation || '', 'Statut': op.statut, 'Observation': op.observation || ''
      }));
      const data2 = opsNonVisesCF.map(op => ({
        'N° OP': op.numero, 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant': Number(op.montant || 0),
        'Source': getSource(op), 'N° Bordereau CF': op.bordereauCF || '', 'Date transmission CF': op.dateTransmissionCF || '',
        'Délai (j ouvrés)': op.delai ?? '', 'Statut délai': delaiLabel(op.delai, 5), 'Observation': op.observation || ''
      }));
      const data3 = opsNonSoldes.map(op => ({
        'N° OP': op.numero, 'Type': op.type || '', 'Bénéficiaire': getBen(op), 'Objet': op.objet || '',
        'Montant OP': Number(op.montant || 0), 'Montant payé': Number(op.montantPaye || op.montant || 0),
        'N° Bordereau AC': op.bordereauAC || '', 'Date transmission AC': op.dateTransmissionAC || '',
        'Délai (j ouvrés)': op.delai ?? '', 'Statut délai': delaiLabel(op.delai, 5),
        'OP provisoires rattachés': op.opsProvRattaches?.map(p => p.numero).join(', ') || '',
        'Écart': op.ecart ?? '', 'Observation': op.observation || ''
      }));
      const data4 = opsAAnnuler.map(op => ({
        'N° OP': op.numero, 'Bénéficiaire': getBen(op), 'Objet': op.objet || '', 'Montant': Number(op.montant || 0),
        'Source': getSource(op), 'Date visa CF': op.dateVisaCF || '', 'Délai (j ouvrés)': op.delai ?? '',
        'Statut délai': delaiLabel(op.delai, 2), 'Observation': op.observation || ''
      }));
      const data5 = opsARegulariser.map(op => {
        const defLie = ops.find(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id);
        return {
          'N° OP provisoire': op.numero, 'Bénéficiaire': getBen(op), 'Objet': op.objet || '',
          'Montant': Number(op.montant || 0), 'Montant payé': Number(op.montantPaye || op.montant || 0),
          'Date paiement': op.datePaiement || '', 'Délai (jours)': op.delaiJours ?? '',
          'Statut délai': delaiLabel(op.delaiJours, 60), 'N° OP définitif': defLie?.numero || '', 'Observation': op.observation || ''
        };
      });

      const wb = XLSX.utils.book_new();
      const addSheet = (data, name) => {
        const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Aucune donnée': '' }]);
        if (data.length > 0) {
          ws['!cols'] = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length, ...data.map(r => String(r[key] || '').length)) + 2 }));
        }
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      addSheet(data1, 'En cours compta');
      addSheet(data2, 'Non visés CF');
      addSheet(data3, 'Non soldés');
      addSheet(data4, 'À annuler');
      addSheet(data5, 'À régulariser');
      XLSX.writeFile(wb, 'Rapport_OP_' + dateRef + '.xlsx');
    } catch (err) {
      alert('Erreur export : ' + err.message);
    }
  };

  // ============================================================
  // CELLULE OBSERVATION (cliquable pour modifier)
  // ============================================================
  const ObsCell = ({ op }) => {
    if (editingObsId === op.id) {
      return (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input
            value={editingObsText}
            onChange={e => setEditingObsText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleEditObs(op.id); if (e.key === 'Escape') setEditingObsId(null); }}
            style={{ ...styles.input, marginBottom: 0, fontSize: 10, padding: '3px 6px', width: 150 }}
            autoFocus
          />
          <button onClick={() => handleEditObs(op.id)} style={{ border: 'none', background: '#1b5e20', color: '#fff', borderRadius: 4, padding: '3px 6px', fontSize: 10, cursor: 'pointer' }}>✓</button>
          <button onClick={() => setEditingObsId(null)} style={{ border: 'none', background: '#999', color: '#fff', borderRadius: 4, padding: '3px 6px', fontSize: 10, cursor: 'pointer' }}>✕</button>
        </div>
      );
    }
    return (
      <span
        onClick={() => { setEditingObsId(op.id); setEditingObsText(op.observation || ''); }}
        style={{ cursor: 'pointer', color: op.observation ? '#333' : '#bbb', fontSize: 10, fontStyle: op.observation ? 'normal' : 'italic' }}
        title="Cliquer pour modifier"
      >
        {op.observation || 'Ajouter...'}
      </span>
    );
  };

  // ============================================================
  // CHECKBOX
  // ============================================================
  const CheckCell = ({ opId }) => (
    <input type="checkbox" checked={selectedOps.includes(opId)} onChange={() => handleToggleSelect(opId)} style={{ cursor: 'pointer', width: 15, height: 15 }} />
  );

  // ============================================================
  // TABLEAUX
  // ============================================================
  const renderCompta = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={{ ...thStyle, width: 30 }}><input type="checkbox" checked={selectedOps.length === opsCompta.length && opsCompta.length > 0} onChange={handleSelectAll} /></th>
        <th style={thStyle}>N° OP</th><th style={thStyle}>Bénéficiaire</th><th style={thStyle}>Objet</th>
        <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th><th style={thStyle}>Source</th>
        <th style={thStyle}>Date création</th><th style={thStyle}>Statut</th><th style={{ ...thStyle, minWidth: 120 }}>Observation</th>
      </tr></thead>
      <tbody>
        {opsCompta.length === 0 && <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP en cours</td></tr>}
        {opsCompta.map(op => (
          <tr key={op.id} style={{ background: selectedOps.includes(op.id) ? '#e3f2fd' : 'transparent' }}>
            <td style={tdStyle}><CheckCell opId={op.id} /></td>
            <td style={tdMono}>{op.numero}<ExerciceBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td>
            <td style={tdStyle}>{getBen(op)}</td><td style={tdEllipsis}>{op.objet || '—'}</td>
            <td style={tdRight}>{formatMontant(op.montant)}</td><td style={tdStyle}>{getSource(op)}</td>
            <td style={tdStyle}>{op.dateCreation || '—'}</td><td style={tdStyle}><StatutBadge statut={op.statut} /></td>
            <td style={tdStyle}><ObsCell op={op} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderNonVisesCF = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={{ ...thStyle, width: 30 }}><input type="checkbox" checked={selectedOps.length === opsNonVisesCF.length && opsNonVisesCF.length > 0} onChange={handleSelectAll} /></th>
        <th style={thStyle}>N° OP</th><th style={thStyle}>Bénéficiaire</th><th style={thStyle}>Objet</th>
        <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th><th style={thStyle}>Source</th>
        <th style={thStyle}>N° Bordereau</th><th style={thStyle}>Date transm. CF</th>
        <th style={thStyle}>Délai</th><th style={{ ...thStyle, minWidth: 120 }}>Observation</th>
      </tr></thead>
      <tbody>
        {opsNonVisesCF.length === 0 && <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP en attente</td></tr>}
        {opsNonVisesCF.map(op => (
          <tr key={op.id} style={{ background: selectedOps.includes(op.id) ? '#e3f2fd' : 'transparent' }}>
            <td style={tdStyle}><CheckCell opId={op.id} /></td>
            <td style={tdMono}>{op.numero}<ExerciceBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td>
            <td style={tdStyle}>{getBen(op)}</td><td style={tdEllipsis}>{op.objet || '—'}</td>
            <td style={tdRight}>{formatMontant(op.montant)}</td><td style={tdStyle}>{getSource(op)}</td>
            <td style={tdStyle}>{op.bordereauCF || '—'}</td><td style={tdStyle}>{op.dateTransmissionCF || '—'}</td>
            <td style={tdStyle}><DelaiBadge jours={op.delai} seuilOrange={3} seuilRouge={5} /></td>
            <td style={tdStyle}><ObsCell op={op} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderNonSoldes = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={{ ...thStyle, width: 30 }}><input type="checkbox" checked={selectedOps.length === opsNonSoldes.length && opsNonSoldes.length > 0} onChange={handleSelectAll} /></th>
        <th style={thStyle}>N° OP</th><th style={thStyle}>Type</th><th style={thStyle}>Bénéficiaire</th><th style={thStyle}>Objet</th>
        <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th><th style={{ ...thStyle, textAlign: 'right' }}>Mt payé</th>
        <th style={thStyle}>N° Bord.</th><th style={thStyle}>Date transm. AC</th>
        <th style={thStyle}>Délai</th><th style={thStyle}>OP prov.</th>
        <th style={{ ...thStyle, textAlign: 'right' }}>Écart</th><th style={{ ...thStyle, minWidth: 120 }}>Observation</th>
      </tr></thead>
      <tbody>
        {opsNonSoldes.length === 0 && <tr><td colSpan={13} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP non soldé</td></tr>}
        {opsNonSoldes.map(op => (
          <tr key={op.id} style={{ background: selectedOps.includes(op.id) ? '#e3f2fd' : 'transparent' }}>
            <td style={tdStyle}><CheckCell opId={op.id} /></td>
            <td style={tdMono}>{op.numero}<ExerciceBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td>
            <td style={tdStyle}><TypeBadge type={op.type} /></td>
            <td style={tdStyle}>{getBen(op)}</td><td style={tdEllipsis}>{op.objet || '—'}</td>
            <td style={tdRight}>{formatMontant(op.montant)}</td>
            <td style={tdRight}>{formatMontant(op.montantPaye || op.montant)}</td>
            <td style={tdStyle}>{op.bordereauAC || '—'}</td><td style={tdStyle}>{op.dateTransmissionAC || '—'}</td>
            <td style={tdStyle}><DelaiBadge jours={op.delai} seuilOrange={3} seuilRouge={5} /></td>
            <td style={{ ...tdStyle, fontSize: 9, fontFamily: 'monospace' }}>{op.opsProvRattaches?.length > 0 ? op.opsProvRattaches.map(p => p.numero).join(', ') : '—'}</td>
            <td style={tdRight}>
              {op.ecart !== null && op.ecart !== undefined ? (
                <span style={{ color: op.ecart > 0 ? '#c62828' : op.ecart < 0 ? '#e65100' : '#2e7d32', fontWeight: 600 }}>
                  {op.ecart > 0 ? '+' + formatMontant(op.ecart) : op.ecart < 0 ? formatMontant(op.ecart) : '0'}
                </span>
              ) : '—'}
            </td>
            <td style={tdStyle}><ObsCell op={op} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderAAnnuler = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={{ ...thStyle, width: 30 }}><input type="checkbox" checked={selectedOps.length === opsAAnnuler.length && opsAAnnuler.length > 0} onChange={handleSelectAll} /></th>
        <th style={thStyle}>N° OP</th><th style={thStyle}>Bénéficiaire</th><th style={thStyle}>Objet</th>
        <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th><th style={thStyle}>Source</th>
        <th style={thStyle}>Date visa CF</th><th style={thStyle}>Délai</th><th style={{ ...thStyle, minWidth: 120 }}>Observation</th>
      </tr></thead>
      <tbody>
        {opsAAnnuler.length === 0 && <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP à annuler</td></tr>}
        {opsAAnnuler.map(op => (
          <tr key={op.id} style={{ background: selectedOps.includes(op.id) ? '#e3f2fd' : 'transparent' }}>
            <td style={tdStyle}><CheckCell opId={op.id} /></td>
            <td style={tdMono}>{op.numero}<ExerciceBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td>
            <td style={tdStyle}>{getBen(op)}</td><td style={tdEllipsis}>{op.objet || '—'}</td>
            <td style={tdRight}>{formatMontant(op.montant)}</td><td style={tdStyle}>{getSource(op)}</td>
            <td style={tdStyle}>{op.dateVisaCF || '—'}</td>
            <td style={tdStyle}><DelaiBadge jours={op.delai} seuilOrange={1} seuilRouge={2} /></td>
            <td style={tdStyle}><ObsCell op={op} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderARegulariser = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr>
        <th style={{ ...thStyle, width: 30 }}><input type="checkbox" checked={selectedOps.length === opsARegulariser.length && opsARegulariser.length > 0} onChange={handleSelectAll} /></th>
        <th style={thStyle}>N° OP prov.</th><th style={thStyle}>Bénéficiaire</th><th style={thStyle}>Objet</th>
        <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th><th style={{ ...thStyle, textAlign: 'right' }}>Mt payé</th>
        <th style={thStyle}>Date paiement</th><th style={thStyle}>Délai</th>
        <th style={thStyle}>OP définitif</th><th style={{ ...thStyle, minWidth: 120 }}>Observation</th>
      </tr></thead>
      <tbody>
        {opsARegulariser.length === 0 && <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Aucun OP à régulariser</td></tr>}
        {opsARegulariser.map(op => {
          const defLie = ops.find(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id);
          return (
            <tr key={op.id} style={{ background: selectedOps.includes(op.id) ? '#e3f2fd' : 'transparent' }}>
              <td style={tdStyle}><CheckCell opId={op.id} /></td>
              <td style={tdMono}>{op.numero}<ExerciceBadge exerciceId={op.exerciceId} exercices={exercices} exerciceActif={exerciceActif} /></td>
              <td style={tdStyle}>{getBen(op)}</td><td style={tdEllipsis}>{op.objet || '—'}</td>
              <td style={tdRight}>{formatMontant(op.montant)}</td>
              <td style={tdRight}>{formatMontant(op.montantPaye || op.montant)}</td>
              <td style={tdStyle}>{op.datePaiement || '—'}</td>
              <td style={tdStyle}><DelaiBadge jours={op.delaiJours} seuilOrange={45} seuilRouge={60} unite="jours" /></td>
              <td style={{ ...tdStyle, fontSize: 9, fontFamily: 'monospace' }}>{defLie?.numero || '—'}</td>
              <td style={tdStyle}><ObsCell op={op} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <div>
      {/* EN-TÊTE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>📊 Rapport</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Exercice :</label>
            <select value={filtreExercice} onChange={e => setFiltreExercice(e.target.value)} style={{ ...styles.input, width: 130, marginBottom: 0, fontSize: 11 }}>
              <option value="tous">Tous</option>
              {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600 }}>Date réf. :</label>
            <input type="date" value={dateRef} onChange={e => setDateRef(e.target.value)} style={{ ...styles.input, width: 145, marginBottom: 0, fontSize: 11 }} />
          </div>
          <button onClick={handleExportExcel} style={{ ...styles.button, background: '#1b5e20', fontSize: 11, padding: '7px 14px' }}>📥 Export Excel</button>
        </div>
      </div>

      {/* IMPORT */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleDownloadTemplate} style={{ ...styles.button, background: '#0d47a1', fontSize: 11, padding: '6px 12px' }}>📄 Télécharger canevas</button>
        <label style={{ ...styles.button, background: '#e65100', fontSize: 11, padding: '6px 12px', cursor: 'pointer', opacity: importing ? 0.6 : 1 }}>
          📤 {importing ? 'Import en cours...' : 'Importer OP antérieurs'}
          <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} style={{ display: 'none' }} disabled={importing} />
        </label>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={{
            padding: '8px 14px', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            background: activeTab === tab.id ? '#1a1a2e' : '#f0f0f0', color: activeTab === tab.id ? '#fff' : '#333',
            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
          }}>
            {tab.icon} {tab.label}
            <span style={{ background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#ddd', padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* BARRE OBSERVATION EN MASSE */}
      {selectedOps.length > 0 && (
        <div style={{ background: '#e3f2fd', borderRadius: 8, padding: '10px 16px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{selectedOps.length} OP sélectionné(s)</span>
          <input
            value={obsText} onChange={e => setObsText(e.target.value)}
            placeholder="Saisir l'observation..."
            style={{ ...styles.input, marginBottom: 0, flex: 1, minWidth: 200, fontSize: 12 }}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveObs(); }}
          />
          <button onClick={handleSaveObs} disabled={savingObs || !obsText.trim()} style={{ ...styles.button, fontSize: 11, padding: '7px 14px', opacity: savingObs ? 0.6 : 1 }}>
            {savingObs ? '⏳' : '💾'} Enregistrer
          </button>
          <button onClick={() => { setSelectedOps([]); setObsText(''); }} style={{ ...styles.button, background: '#999', fontSize: 11, padding: '7px 14px' }}>Annuler</button>
        </div>
      )}

      {/* RÉSUMÉ */}
      <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 16px', marginBottom: 12, fontSize: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {activeTab === 'compta' && <span>Total : <strong>{formatMontant(opsCompta.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA — <strong>{opsCompta.length}</strong> OP</span>}
        {activeTab === 'nonvise' && <>
          <span>Total : <strong>{formatMontant(opsNonVisesCF.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span>
          <span>Dépassés ({'>'}5j) : <strong style={{ color: '#c62828' }}>{opsNonVisesCF.filter(o => o.delai > 5).length}</strong></span>
        </>}
        {activeTab === 'nonsolde' && <>
          <span>Total : <strong>{formatMontant(opsNonSoldes.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span>
          <span>Dépassés ({'>'}5j) : <strong style={{ color: '#c62828' }}>{opsNonSoldes.filter(o => o.delai > 5).length}</strong></span>
        </>}
        {activeTab === 'annuler' && <>
          <span>Total : <strong>{formatMontant(opsAAnnuler.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span>
          <span>Dépassés ({'>'}2j) : <strong style={{ color: '#c62828' }}>{opsAAnnuler.filter(o => o.delai > 2).length}</strong></span>
        </>}
        {activeTab === 'regulariser' && <>
          <span>Total : <strong>{formatMontant(opsARegulariser.reduce((s, o) => s + Number(o.montant || 0), 0))}</strong> FCFA</span>
          <span>Dépassés ({'>'}60j) : <strong style={{ color: '#c62828' }}>{opsARegulariser.filter(o => o.delaiJours > 60).length}</strong></span>
        </>}
      </div>

      {/* TABLEAU */}
      <div style={{ background: '#fff', borderRadius: 10, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', maxHeight: 'calc(100vh - 380px)' }}>
        {activeTab === 'compta' && renderCompta()}
        {activeTab === 'nonvise' && renderNonVisesCF()}
        {activeTab === 'nonsolde' && renderNonSoldes()}
        {activeTab === 'annuler' && renderAAnnuler()}
        {activeTab === 'regulariser' && renderARegulariser()}
      </div>
    </div>
  );
}
