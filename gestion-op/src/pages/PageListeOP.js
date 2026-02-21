import React, { useState } from 'react';
import Autocomplete from '../components/Autocomplete';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import MontantInput from '../components/MontantInput';
import PasswordModal from '../components/PasswordModal';

const PageListeOP = () => {
  const { projet, sources, exercices, exerciceActif, beneficiaires, budgets, ops, setOps, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL'); 
  const [activeTab, setActiveTab] = useState('CUMUL_OP'); 
  const [showAnterieur, setShowAnterieur] = useState(false); 
  const [selectedExercice, setSelectedExercice] = useState(exerciceActif?.id || null);
  const [filters, setFilters] = useState({
    type: '',
    statut: '',
    search: '',
    ligneBudgetaire: '',
    dateDebut: '',
    dateFin: ''
  });
  const [showDetail, setShowDetail] = useState(null);
  const [actionForm, setActionForm] = useState({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' });
  const [showPaiementModal, setShowPaiementModal] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importError, setImportError] = useState('');
  const [showStatutModal, setShowStatutModal] = useState(null); 
  const [showEditModal, setShowEditModal] = useState(null); 
  const [editForm, setEditForm] = useState({});
  const [showArchiveModal, setShowArchiveModal] = useState(null); 
  const [showTransmissionModal, setShowTransmissionModal] = useState(null); 
  const [showCircuitModal, setShowCircuitModal] = useState(null); 
  const [circuitForm, setCircuitForm] = useState({}); 
  const [drawerOp, setDrawerOp] = useState(null); 

  // Exercice courant (actif ou sélectionné)
  const currentExerciceId = showAnterieur ? selectedExercice : exerciceActif?.id;
  const currentExercice = exercices.find(e => e.id === currentExerciceId);
  const currentSourceObj = activeSource === 'ALL' ? null : sources.find(s => s.id === activeSource);

  const allLignes = [...new Set(
    budgets
      .filter(b => b.exerciceId === currentExerciceId)
      .flatMap(b => b.lignes || [])
      .map(l => l.code)
  )].sort();

  const typeColors = {
    PROVISOIRE: '#E8B931',
    DIRECT: '#E8B931',
    DEFINITIF: '#2e7d32',
    ANNULATION: '#C43E3E'
  };

  const statutConfig = {
    EN_COURS: { bg: '#E8F5E9', color: '#D4722A', label: 'En cours' },
    CREE: { bg: '#E8F5E9', color: '#D4722A', label: 'En cours' },
    TRANSMIS_CF: { bg: '#E8B93115', color: '#E8B931', label: 'Transmis CF' },
    DIFFERE_CF: { bg: '#E8B93120', color: '#C5961F', label: 'Différé CF' },
    RETOURNE_CF: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Retourné CF' },
    VISE_CF: { bg: '#E8F5E9', color: '#2e7d32', label: 'Visé CF' },
    REJETE_CF: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté CF' },
    TRANSMIS_AC: { bg: '#C5961F15', color: '#C5961F', label: 'Transmis AC' },
    DIFFERE_AC: { bg: '#E8B93120', color: '#C5961F', label: 'Différé AC' },
    RETOURNE_AC: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Retourné AC' },
    PAYE_PARTIEL: { bg: '#E8B93115', color: '#E8B931', label: 'Payé partiel' },
    PAYE: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Payé' },
    REJETE_AC: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté AC' },
    ARCHIVE: { bg: '#F7F5F2', color: '#888', label: 'Archivé' },
    ANNULE: { bg: '#C43E3E15', color: '#C43E3E', label: 'Annulé' },
    TRAITE: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Régularisé' },
    SUPPRIME: { bg: '#F7F5F2', color: '#999', label: 'Supprimé' }
  };

  const buildCircuitSteps = (op) => {
    if (!op) return [];
    const statut = op.statut === 'CREE' ? 'EN_COURS' : op.statut;
    const circuitNormal = [
      { key: 'EN_COURS', label: 'En cours', date: op.dateCreation || op.createdAt?.split('T')[0] },
      { key: 'TRANSMIS_CF', label: 'Transmis CF', date: op.dateTransmissionCF },
      { key: 'VISE_CF', label: 'Visé CF', date: op.dateVisaCF },
      { key: 'TRANSMIS_AC', label: 'Transmis AC', date: op.dateTransmissionAC },
      { key: 'PAYE', label: 'Payé', date: op.datePaiement || (op.paiements?.length > 0 ? op.paiements[op.paiements.length - 1].date : null) },
      { key: 'ARCHIVE', label: 'Archivé', date: op.dateArchivage }
    ];
    const statutOrder = ['EN_COURS', 'TRANSMIS_CF', 'VISE_CF', 'TRANSMIS_AC', 'PAYE', 'ARCHIVE'];
    if (statut === 'DIFFERE_CF') {
      return [
        { ...circuitNormal[0], state: 'done' }, { ...circuitNormal[1], state: 'done' },
        { key: 'DIFFERE_CF', label: 'Différé CF', date: op.dateDiffere || op.updatedAt?.split('T')[0], state: 'deferred' },
        { ...circuitNormal[2], state: 'pending' }, { ...circuitNormal[3], state: 'pending' }, { ...circuitNormal[4], state: 'pending' }
      ];
    }
    if (statut === 'REJETE_CF') {
      return [{ ...circuitNormal[0], state: 'done' }, { ...circuitNormal[1], state: 'done' }, { key: 'REJETE_CF', label: 'Rejeté CF', date: op.dateRejet || op.updatedAt?.split('T')[0], state: 'rejected' }];
    }
    if (statut === 'DIFFERE_AC') {
      return [
        { ...circuitNormal[0], state: 'done' }, { ...circuitNormal[1], state: 'done' }, { ...circuitNormal[2], state: 'done' }, { ...circuitNormal[3], state: 'done' },
        { key: 'DIFFERE_AC', label: 'Différé AC', date: op.dateDiffere || op.updatedAt?.split('T')[0], state: 'deferred' }, { ...circuitNormal[4], state: 'pending' }
      ];
    }
    if (statut === 'REJETE_AC') {
      return [{ ...circuitNormal[0], state: 'done' }, { ...circuitNormal[1], state: 'done' }, { ...circuitNormal[2], state: 'done' }, { ...circuitNormal[3], state: 'done' }, { key: 'REJETE_AC', label: 'Rejeté AC', date: op.dateRejet || op.updatedAt?.split('T')[0], state: 'rejected' }];
    }
    const currentIdx = statutOrder.indexOf(statut);
    return circuitNormal.map((step, i) => ({ ...step, state: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'pending' }));
  };

  const getDrawerMessage = (op) => {
    if (!op) return null;
    const s = op.statut;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';
    if (s === 'EN_COURS' || s === 'CREE') return { type: 'info', text: 'Cet OP est en cours de préparation.' };
    if (s === 'TRANSMIS_CF') return { type: 'info', text: `Transmis au Contrôleur Financier le ${formatDate(op.dateTransmissionCF)} — en attente de visa.` };
    if (s === 'DIFFERE_CF') return { type: 'warning', title: 'Différé par le CF', text: op.motifDiffere || op.motifRejet || 'Aucun motif renseigné', date: formatDate(op.dateDiffere || op.updatedAt) };
    if (s === 'REJETE_CF') return { type: 'danger', title: 'Rejeté par le CF', text: op.motifRejet || 'Aucun motif renseigné', date: formatDate(op.dateRejet || op.updatedAt) };
    if (s === 'VISE_CF') return { type: 'info', text: `Visé par le CF le ${formatDate(op.dateVisaCF)} — en attente de transmission à l'AC.` };
    if (s === 'TRANSMIS_AC') return { type: 'info', text: `Chez l'Agent Comptable depuis le ${formatDate(op.dateTransmissionAC)} — en attente de paiement.` };
    if (s === 'DIFFERE_AC') return { type: 'warning', title: 'Différé par l\'AC', text: op.motifDiffere || op.motifRejet || 'Aucun motif renseigné', date: formatDate(op.dateDiffere || op.updatedAt) };
    if (s === 'REJETE_AC') return { type: 'danger', title: 'Rejeté par l\'AC', text: op.motifRejet || 'Aucun motif renseigné', date: formatDate(op.dateRejet || op.updatedAt) };
    if (s === 'PAYE' || s === 'PAYE_PARTIEL') return { type: 'success', text: `Payé le ${formatDate(op.datePaiement || op.updatedAt)} — ${formatMontant(op.totalPaye || op.montant)} FCFA` };
    if (s === 'ARCHIVE') return { type: 'info', text: `Archivé le ${formatDate(op.dateArchivage || op.updatedAt)}` };
    if (s === 'SUPPRIME') return { type: 'danger', text: `OP mis à la corbeille le ${formatDate(op.dateSuppression || op.updatedAt)}` };
    return null;
  };

  const opsExercice = ops.filter(op => {
    if (op.exerciceId !== currentExerciceId) return false;
    if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
    if (op.statut === 'SUPPRIME' && activeTab !== 'CORBEILLE') return false; 
    return true;
  });

  const provisoiresARegulariser = opsExercice.filter(op => {
    if (op.type !== 'PROVISOIRE') return false;
    if (op.statut !== 'PAYE' && op.statut !== 'PAYE_PARTIEL') return false;
    const hasRegularisationActive = opsExercice.some(o => 
      (o.type === 'DEFINITIF' || o.type === 'ANNULATION') && 
      o.opProvisoireId === op.id &&
      !['REJETE_CF', 'REJETE_AC', 'SUPPRIME'].includes(o.statut)
    );
    return !hasRegularisationActive;
  });

  const getAnciennete = (dateStr) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  };

  const provisoiresAnnuler = opsExercice.filter(op => {
    if (op.type !== 'PROVISOIRE') return false;
    if (['PAYE', 'PAYE_PARTIEL', 'REJETE_CF', 'REJETE_AC', 'ARCHIVE', 'ANNULE', 'SUPPRIME'].includes(op.statut)) return false;
    const hasRegularisationActive = opsExercice.some(o => (o.type === 'DEFINITIF' || o.type === 'ANNULATION') && o.opProvisoireId === op.id && !['REJETE_CF', 'REJETE_AC', 'SUPPRIME'].includes(o.statut));
    return !hasRegularisationActive;
  });
  
  const counts = {
    CUMUL_OP: opsExercice.filter(o => o.statut !== 'SUPPRIME').length,
    PROV_A_ANNULER: provisoiresAnnuler.length,
    A_REGULARISER: provisoiresARegulariser.length,
    CORBEILLE: opsExercice.filter(o => o.statut === 'SUPPRIME').length 
  };

  const getFilteredByTab = () => {
    let result = opsExercice.filter(o => o.statut !== 'SUPPRIME'); 
    switch (activeTab) {
      case 'CUMUL_OP': break;
      case 'PROV_A_ANNULER': result = provisoiresAnnuler; break;
      case 'A_REGULARISER': result = provisoiresARegulariser; break;
      case 'CORBEILLE': result = opsExercice.filter(o => o.statut === 'SUPPRIME'); break; 
      default: break;
    }
    return result;
  };

  const filteredOps = getFilteredByTab().filter(op => {
    if (filters.type && op.type !== filters.type) return false;
    if (filters.statut && op.statut !== filters.statut) return false;
    if (filters.ligneBudgetaire && !(op.ligneBudgetaire || '').toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
      const source = sources.find(s => s.id === op.sourceId);
      if (!op.numero?.toLowerCase().includes(search) && !(op.beneficiaireNom || ben?.nom || '').toLowerCase().includes(search) && !op.objet?.toLowerCase().includes(search) && !source?.sigle?.toLowerCase().includes(search)) return false;
    }
    if (filters.dateDebut && op.dateCreation < filters.dateDebut) return false;
    if (filters.dateFin && op.dateCreation > filters.dateFin) return false;
    return true;
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const buildDisplayOps = () => {
    const filteredOpsChrono = [...filteredOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const lines = [];
    filteredOpsChrono.forEach(op => lines.push({ ...op, isRejetLine: false, displayDate: op.createdAt || op.dateCreation }));
    filteredOpsChrono.forEach(op => {
      if (['REJETE_CF', 'REJETE_AC'].includes(op.statut)) {
        lines.push({ ...op, isRejetLine: true, displayNumero: (op.numero || '') + ' - REJET', displayMontant: -(op.montant || 0), displayDate: op.updatedAt || op.createdAt || op.dateCreation });
      }
    });
    lines.sort((a, b) => (a.displayDate || '').localeCompare(b.displayDate || ''));
    const cumulParLigne = {}; 
    const getDotationOP = (op) => {
      if (op.dotationLigne !== undefined && op.dotationLigne !== null) return op.dotationLigne;
      const latestBudget = budgets.filter(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId).sort((a, b) => (b.version || 1) - (a.version || 1))[0];
      const ligne = latestBudget?.lignes?.find(l => l.code === op.ligneBudgetaire);
      return ligne?.dotation || 0;
    };
    lines.forEach(line => {
      const lb = line.ligneBudgetaire || '_NONE_';
      line.engagementAnterieur = cumulParLigne[lb] || 0;
      if (line.isRejetLine) cumulParLigne[lb] = (cumulParLigne[lb] || 0) + line.displayMontant; 
      else if (!['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE', 'SUPPRIME'].includes(line.statut)) cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (line.montant || 0);
      if (!line.isRejetLine && ['REJETE_CF', 'REJETE_AC'].includes(line.statut)) cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (line.montant || 0);
      line.disponible = getDotationOP(line) - (cumulParLigne[lb] || 0);
    });
    return lines.reverse();
  };
  
  const displayOps = buildDisplayOps();
  const totaux = { count: filteredOps.length, montant: filteredOps.reduce((sum, op) => sum + (op.montant || 0), 0), paye: filteredOps.reduce((sum, op) => sum + (op.totalPaye || 0), 0) };

  const handleOpenTransmissionCF = (op) => { setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], bordereau: op.bordereauCF || '' }); setShowTransmissionModal({ op, destination: 'CF' }); };
  const handleOpenTransmissionAC = (op) => { setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], bordereau: op.bordereauAC || '' }); setShowTransmissionModal({ op, destination: 'AC' }); };
  const handleConfirmTransmission = async () => {
    const { op, destination } = showTransmissionModal;
    try {
      const updates = { statut: destination === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC', updatedAt: new Date().toISOString() };
      if (destination === 'CF') { updates.dateTransmissionCF = actionForm.date; updates.bordereauCF = actionForm.bordereau.trim() || null; }
      else { updates.dateTransmissionAC = actionForm.date; updates.bordereauAC = actionForm.bordereau.trim() || null; }
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      setShowTransmissionModal(null);
      setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' });
    } catch (error) { console.error('Erreur:', error); alert('Erreur lors de la transmission'); }
  };

  const handleViserCF = async (op) => {
    if (!window.confirm(`Viser l'OP ${op.numero} ?`)) return;
    try {
      const updates = { statut: 'VISE_CF', dateVisaCF: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'ops', op.id), updates);
      let updatedOps = ops.map(o => o.id === op.id ? { ...o, ...updates } : o);
      if (op.type === 'ANNULATION' && op.opProvisoireId) {
        const annuleUpdates = { statut: 'ANNULE', dateAnnulation: new Date().toISOString().split('T')[0], opAnnulationId: op.id, updatedAt: new Date().toISOString() };
        await updateDoc(doc(db, 'ops', op.opProvisoireId), annuleUpdates);
        updatedOps = updatedOps.map(o => o.id === op.opProvisoireId ? { ...o, ...annuleUpdates } : o);
      }
      setOps(updatedOps);
    } catch (error) { console.error('Erreur:', error); alert('Erreur lors du visa'); }
  };

  const handlePaiement = async () => {
    if (!actionForm.reference.trim()) { alert('La référence est obligatoire'); return; }
    const m = parseFloat(actionForm.montant);
    if (!m || m <= 0) { alert('Le montant doit être supérieur à 0'); return; }
    const op = showPaiementModal;
    if (m > (op.montant - (op.totalPaye || 0))) { alert(`Le montant dépasse le reste à payer`); return; }
    try {
      const nouveauP = { date: actionForm.date, reference: actionForm.reference.trim(), montant: m, mode: op.modeReglement || 'VIREMENT' };
      const nTotal = (op.totalPaye || 0) + m;
      const nStatut = nTotal >= op.montant ? 'PAYE' : 'PAYE_PARTIEL';
      const updates = { paiements: [...(op.paiements || []), nouveauP], totalPaye: nTotal, statut: nStatut, datePaiement: nStatut === 'PAYE' ? actionForm.date : op.datePaiement, updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      setShowPaiementModal(null);
      setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '' });
    } catch (error) { console.error('Erreur:', error); alert('Erreur paiement'); }
  };

  const handleDeleteWithPassword = (op) => {
    setShowPasswordModal({
      title: 'Supprimer un OP', description: `Déplacer l'OP ${op.numero} vers la corbeille ?`, confirmText: 'Mettre à la corbeille', confirmColor: '#C43E3E',
      action: async () => {
        try {
          const updates = { statut: 'SUPPRIME', dateSuppression: new Date().toISOString(), updatedAt: new Date().toISOString() };
          await updateDoc(doc(db, 'ops', op.id), updates);
          setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
          setShowPasswordModal(null); setShowDetail(null); 
        } catch (error) { console.error('Erreur:', error); alert('Erreur suppression'); }
      }
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B6B2E" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: '#1B6B2E' }}>Liste des Ordres de Paiement</h1>
          {currentExercice && <span style={{ background: showAnterieur ? '#E8B93120' : '#E8F5E9', color: showAnterieur ? '#E8B931' : '#D4722A', padding: '4px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{currentExercice.annee}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} style={{ padding: '8px 16px', borderRadius: 9, border: '1.5px solid rgba(34,51,0,0.08)', background: '#FFFFFF', fontSize: 12, fontWeight: 600, color: '#D4722A', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>Export Excel</button>
          <button onClick={() => setCurrentPage('nouvelOp')} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#D4722A', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>Nouvel OP</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'CUMUL_OP', label: 'Liste OP' },
          { key: 'PROV_A_ANNULER', label: 'Prov. à annuler' },
          { key: 'A_REGULARISER', label: 'À régulariser' },
          { key: 'CORBEILLE', label: 'Corbeille' }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: activeTab === tab.key ? '#D4722A' : '#fff', color: activeTab === tab.key ? 'white' : '#666', fontWeight: 600, fontSize: 12, cursor: 'pointer', boxShadow: activeTab === tab.key ? '0 2px 8px rgba(75,93,22,0.2)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
            {tab.label} <span style={{ background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#EDE9E3', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 800 }}>{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #EDE9E3' }}>
        <button onClick={() => setActiveSource('ALL')} style={{ padding: '10px 18px', border: 'none', borderBottom: activeSource === 'ALL' ? '3px solid #D4722A' : '3px solid transparent', background: 'transparent', color: activeSource === 'ALL' ? '#D4722A' : '#999', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', marginBottom: -2 }}>
          CUMUL OP <span style={{ fontSize: 10, color: '#bbb', marginLeft: 4 }}>{opsExercice.length}</span>
        </button>
        {sources.map(source => (
          <button key={source.id} onClick={() => setActiveSource(source.id)} style={{ padding: '10px 18px', border: 'none', borderBottom: activeSource === source.id ? `3px solid ${source.couleur}` : '3px solid transparent', background: 'transparent', color: activeSource === source.id ? source.couleur : '#999', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', marginBottom: -2 }}>
            {source.sigle} <span style={{ fontSize: 10, color: '#bbb', marginLeft: 4 }}>{opsExercice.filter(op => op.sourceId === source.id).length}</span>
          </button>
        ))}
      </div>

      {/* Barre de recherche et filtres */}
      <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: 12, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '3 1 280px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, marginBottom: 3, color: '#888', textTransform: 'uppercase' }}>Recherche</label>
            <input type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="N°, bénéficiaire, objet..." style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 0, fontSize: 12 }} />
          </div>
          <div style={{ flex: '1 1 120px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, marginBottom: 3, color: '#888', textTransform: 'uppercase' }}>Ligne budgétaire</label>
            <input type="text" placeholder="Filtrer..." value={filters.ligneBudgetaire} onChange={(e) => setFilters({ ...filters, ligneBudgetaire: e.target.value })} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 0, fontSize: 12 }} list="lignesList" />
            <datalist id="lignesList">{allLignes.map(code => <option key={code} value={code} />)}</datalist>
          </div>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto', maxHeight: '60vh' }}>
          <table style={styles.table}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                {activeSource === 'ALL' && <th style={{ ...styles.th, width: 55, background: '#F7F5F2', fontSize: 9.5 }}>Source</th>}
                <th style={{ ...styles.th, width: 140, background: '#F7F5F2', fontSize: 9.5 }}>N° OP</th>
                <th style={{ ...styles.th, width: 140, background: '#F7F5F2', fontSize: 9.5 }}>Bénéficiaire</th>
                <th style={{ ...styles.th, background: '#F7F5F2', fontSize: 9.5 }}>Objet</th>
                <th style={{ ...styles.th, width: 60, background: '#F7F5F2', fontSize: 9.5 }}>Ligne</th>
                <th style={{ ...styles.th, width: 100, textAlign: 'right', background: '#F7F5F2', fontSize: 9.5 }}>Montant</th>
                
                {/* Masquer Eng. Ant et Disponible si onglet principal "Cumul OP" ou Source "ALL" */}
                {activeTab !== 'CUMUL_OP' && activeSource !== 'ALL' && (
                  <>
                    <th style={{ ...styles.th, width: 100, textAlign: 'right', background: '#F7F5F2', fontSize: 9.5 }}>Eng. ant.</th>
                    <th style={{ ...styles.th, width: 100, textAlign: 'right', background: '#F7F5F2', fontSize: 9.5 }}>Disponible</th>
                  </>
                )}
                <th style={{ ...styles.th, width: 95, background: '#F7F5F2', fontSize: 9.5 }}>Statut</th>
                <th style={{ ...styles.th, width: 38, background: '#F7F5F2' }}></th>
              </tr>
            </thead>
            <tbody>
              {displayOps.map((op) => {
                const statutObj = statutConfig[op.statut] || { bg: '#F7F5F2', color: '#666', label: op.statut };
                return (
                  <tr key={op.id} style={{ cursor: 'pointer' }} onClick={() => setDrawerOp(op)} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }}>
                    {activeSource === 'ALL' && <td style={styles.td}><span style={{ background: sources.find(s => s.id === op.sourceId)?.couleur, color: 'white', padding: '2px 7px', borderRadius: 4, fontSize: 9 }}>{sources.find(s => s.id === op.sourceId)?.sigle}</span></td>}
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                    <td style={{ ...styles.td, fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.beneficiaireNom || 'N/A'}</td>
                    <td style={{ ...styles.td, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet}</td>
                    <td style={{ ...styles.td, fontSize: 10.5, fontFamily: 'monospace' }}>{op.ligneBudgetaire}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: op.isRejetLine ? '#C43E3E' : '#155A25' }}>{op.isRejetLine ? '-' : ''}{formatMontant(op.montant)}</td>
                    
                    {activeTab !== 'CUMUL_OP' && activeSource !== 'ALL' && (
                      <>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 10.5 }}>{formatMontant(op.engagementAnterieur)}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 10.5, color: op.disponible < 0 ? '#C43E3E' : '#2e7d32' }}>{formatMontant(op.disponible)}</td>
                      </>
                    )}
                    <td style={styles.td}><span style={{ background: statutObj.bg, color: statutObj.color, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600 }}>{statutObj.label}</span></td>
                    <td style={styles.td} onClick={(e) => e.stopPropagation()}><button onClick={() => setDrawerOp(op)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>👁️</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPasswordModal && <PasswordModal isOpen={!!showPasswordModal} onClose={() => setShowPasswordModal(null)} onConfirm={showPasswordModal.action} adminPassword={projet?.adminPassword || ''} title={showPasswordModal.title} description={showPasswordModal.description} confirmText={showPasswordModal.confirmText} confirmColor={showPasswordModal.confirmColor} />}
    </div>
  );
};

export default PageListeOP;
