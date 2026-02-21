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

  // Toutes les lignes budgétaires disponibles pour l'exercice courant
  const allLignes = [...new Set(
    budgets
      .filter(b => b.exerciceId === currentExerciceId)
      .flatMap(b => b.lignes || [])
      .map(l => l.code)
  )].sort();

  // Couleurs par type
  const typeColors = {
    PROVISOIRE: '#E8B931',
    DIRECT: '#E8B931',
    DEFINITIF: '#2e7d32',
    ANNULATION: '#C43E3E'
  };

  // Couleurs par statut
  const statutConfig = {
    EN_COURS: { bg: '#E8F5E9', color: '#D4722A', label: 'En cours', icon: '' },
    CREE: { bg: '#E8F5E9', color: '#D4722A', label: 'En cours', icon: '' },
    TRANSMIS_CF: { bg: '#E8B93115', color: '#E8B931', label: 'Transmis CF', icon: '' },
    DIFFERE_CF: { bg: '#E8B93120', color: '#C5961F', label: 'Différé CF', icon: '' },
    RETOURNE_CF: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Retourné CF', icon: '' },
    VISE_CF: { bg: '#E8F5E9', color: '#2e7d32', label: 'Visé CF', icon: '' },
    REJETE_CF: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté CF', icon: '' },
    TRANSMIS_AC: { bg: '#C5961F15', color: '#C5961F', label: 'Transmis AC', icon: '' },
    DIFFERE_AC: { bg: '#E8B93120', color: '#C5961F', label: 'Différé AC', icon: '' },
    RETOURNE_AC: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Retourné AC', icon: '' },
    PAYE_PARTIEL: { bg: '#E8B93115', color: '#E8B931', label: 'Payé partiel', icon: '' },
    PAYE: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Payé', icon: '' },
    REJETE_AC: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté AC', icon: '' },
    ARCHIVE: { bg: '#F7F5F2', color: '#888', label: 'Archivé', icon: '' },
    ANNULE: { bg: '#C43E3E15', color: '#C43E3E', label: 'Annulé', icon: '' },
    TRAITE: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Régularisé', icon: '' },
    SUPPRIME: { bg: '#F7F5F2', color: '#999', label: 'Supprimé', icon: '' } 
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
        { ...circuitNormal[0], state: 'done' },
        { ...circuitNormal[1], state: 'done' },
        { key: 'DIFFERE_CF', label: 'Différé CF', date: op.dateDiffere || op.updatedAt?.split('T')[0], state: 'deferred' },
        { ...circuitNormal[2], state: 'pending' },
        { ...circuitNormal[3], state: 'pending' },
        { ...circuitNormal[4], state: 'pending' }
      ];
    }
    if (statut === 'REJETE_CF') {
      return [
        { ...circuitNormal[0], state: 'done' },
        { ...circuitNormal[1], state: 'done' },
        { key: 'REJETE_CF', label: 'Rejeté CF', date: op.dateRejet || op.updatedAt?.split('T')[0], state: 'rejected' }
      ];
    }
    if (statut === 'DIFFERE_AC') {
      return [
        { ...circuitNormal[0], state: 'done' },
        { ...circuitNormal[1], state: 'done' },
        { ...circuitNormal[2], state: 'done' },
        { ...circuitNormal[3], state: 'done' },
        { key: 'DIFFERE_AC', label: 'Différé AC', date: op.dateDiffere || op.updatedAt?.split('T')[0], state: 'deferred' },
        { ...circuitNormal[4], state: 'pending' }
      ];
    }
    if (statut === 'REJETE_AC') {
      return [
        { ...circuitNormal[0], state: 'done' },
        { ...circuitNormal[1], state: 'done' },
        { ...circuitNormal[2], state: 'done' },
        { ...circuitNormal[3], state: 'done' },
        { key: 'REJETE_AC', label: 'Rejeté AC', date: op.dateRejet || op.updatedAt?.split('T')[0], state: 'rejected' }
      ];
    }

    const currentIdx = statutOrder.indexOf(statut);
    return circuitNormal.map((step, i) => ({
      ...step,
      state: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'pending'
    }));
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

  // Filtrage principal des OP : On cache les supprimés SAUF si on est dans la corbeille
  const opsExercice = ops.filter(op => {
    if (op.exerciceId !== currentExerciceId) return false;
    if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
    if (op.statut === 'SUPPRIME' && activeTab !== 'CORBEILLE') return false; 
    return true;
  });

  // Provisoires à régulariser : OP Provisoires PAYÉS sans régularisation valide liée
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

  // Provisoires à annuler : OP Provisoires NON PAYÉS sans régularisation
  const provisoiresAnnuler = opsExercice.filter(op => {
    if (op.type !== 'PROVISOIRE') return false;
    if (['PAYE', 'PAYE_PARTIEL', 'REJETE_CF', 'REJETE_AC', 'ARCHIVE', 'ANNULE', 'SUPPRIME'].includes(op.statut)) return false;
    
    const hasRegularisationActive = opsExercice.some(o => 
      (o.type === 'DEFINITIF' || o.type === 'ANNULATION') && 
      o.opProvisoireId === op.id &&
      !['REJETE_CF', 'REJETE_AC', 'SUPPRIME'].includes(o.statut)
    );
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
      if (
        !op.numero?.toLowerCase().includes(search) &&
        !(op.beneficiaireNom || ben?.nom || '').toLowerCase().includes(search) &&
        !op.objet?.toLowerCase().includes(search) &&
        !source?.sigle?.toLowerCase().includes(search)
      ) return false;
    }
    if (filters.dateDebut && op.dateCreation < filters.dateDebut) return false;
    if (filters.dateFin && op.dateCreation > filters.dateFin) return false;
    return true;
  }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const filteredOpsChrono = [...filteredOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  
  const buildDisplayOps = () => {
    const lines = [];
    filteredOpsChrono.forEach(op => {
      lines.push({ ...op, isRejetLine: false, displayDate: op.createdAt || op.dateCreation });
    });
    filteredOpsChrono.forEach(op => {
      if (['REJETE_CF', 'REJETE_AC'].includes(op.statut)) {
        lines.push({
          ...op,
          isRejetLine: true,
          displayNumero: (op.numero || '') + ' - REJET',
          displayMontant: -(op.montant || 0),
          displayDate: op.updatedAt || op.createdAt || op.dateCreation
        });
      }
    });
    lines.sort((a, b) => (a.displayDate || '').localeCompare(b.displayDate || ''));
    
    const cumulParLigne = {}; 
    const getDotationOP = (op) => {
      if (op.dotationLigne !== undefined && op.dotationLigne !== null) return op.dotationLigne;
      const latestBudget = budgets
        .filter(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId)
        .sort((a, b) => (b.version || 1) - (a.version || 1))[0];
      const ligne = latestBudget?.lignes?.find(l => l.code === op.ligneBudgetaire);
      return ligne?.dotation || 0;
    };
    
    let ordre = 0;
    lines.forEach(line => {
      ordre++;
      line.ordre = ordre;
      const lb = line.ligneBudgetaire || '_NONE_';
      line.engagementAnterieur = cumulParLigne[lb] || 0;
      
      if (line.isRejetLine) {
        cumulParLigne[lb] = (cumulParLigne[lb] || 0) + line.displayMontant; 
      } else if (!['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE', 'SUPPRIME'].includes(line.statut)) {
        cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (line.montant || 0);
      }
      if (!line.isRejetLine && ['REJETE_CF', 'REJETE_AC'].includes(line.statut)) {
        cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (line.montant || 0);
      }
      
      const dotOP = getDotationOP(line);
      const totalEngageLigne = cumulParLigne[lb] || 0;
      line.disponible = dotOP - totalEngageLigne;
    });
    
    return lines.reverse();
  };
  
  const displayOps = buildDisplayOps();

  const totaux = {
    count: filteredOps.length,
    montant: filteredOps.reduce((sum, op) => sum + (op.montant || 0), 0),
    paye: filteredOps.reduce((sum, op) => sum + (op.totalPaye || 0), 0)
  };

  const handleOpenTransmissionCF = (op) => {
    setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], bordereau: op.bordereauCF || '' });
    setShowTransmissionModal({ op, destination: 'CF' });
  };

  const handleOpenTransmissionAC = (op) => {
    setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], bordereau: op.bordereauAC || '' });
    setShowTransmissionModal({ op, destination: 'AC' });
  };

  const handleConfirmTransmission = async () => {
    const { op, destination } = showTransmissionModal;
    try {
      const updates = { 
        statut: destination === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC',
        updatedAt: new Date().toISOString()
      };
      
      if (destination === 'CF') {
        updates.dateTransmissionCF = actionForm.date;
        updates.bordereauCF = actionForm.bordereau.trim() || null;
      } else {
        updates.dateTransmissionAC = actionForm.date;
        updates.bordereauAC = actionForm.bordereau.trim() || null;
      }
      
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      setShowTransmissionModal(null);
      setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la transmission');
    }
  };

  const handleViserCF = async (op) => {
    if (!window.confirm(`Viser l'OP ${op.numero} ?`)) return;
    try {
      const updates = { 
        statut: 'VISE_CF',
        dateVisaCF: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'ops', op.id), updates);
      let updatedOps = ops.map(o => o.id === op.id ? { ...o, ...updates } : o);

      if (op.type === 'ANNULATION' && op.opProvisoireId) {
        const annuleUpdates = {
          statut: 'ANNULE',
          dateAnnulation: new Date().toISOString().split('T')[0],
          opAnnulationId: op.id,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(doc(db, 'ops', op.opProvisoireId), annuleUpdates);
        updatedOps = updatedOps.map(o => o.id === op.opProvisoireId ? { ...o, ...annuleUpdates } : o);
      }
      setOps(updatedOps);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du visa');
    }
  };

  const handleRetourner = async (op, origine) => {
    const motif = window.prompt(`Motif du retour par le ${origine} :`);
    if (!motif) return;
    try {
      const updates = { 
        statut: origine === 'CF' ? 'RETOURNE_CF' : 'RETOURNE_AC',
        [`dateRetour${origine}`]: new Date().toISOString().split('T')[0],
        [`motifRetour${origine}`]: motif.trim(),
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du retour');
    }
  };

  const handlePaiement = async () => {
    if (!actionForm.reference.trim()) { alert('La référence est obligatoire'); return; }
    const montantPaye = parseFloat(actionForm.montant);
    if (!montantPaye || montantPaye <= 0) { alert('Le montant doit être supérieur à 0'); return; }
    
    const op = showPaiementModal;
    const totalPayeActuel = op.totalPaye || 0;
    const resteAPayer = op.montant - totalPayeActuel;
    
    if (montantPaye > resteAPayer) { alert(`Le montant ne peut pas dépasser le reste à payer (${formatMontant(resteAPayer)} FCFA)`); return; }
    
    try {
      const nouveauPaiement = { date: actionForm.date, reference: actionForm.reference.trim(), montant: montantPaye, mode: op.modeReglement || 'VIREMENT' };
      const paiements = [...(op.paiements || []), nouveauPaiement];
      const nouveauTotalPaye = totalPayeActuel + montantPaye;
      const nouveauReste = op.montant - nouveauTotalPaye;
      const nouveauStatut = nouveauReste <= 0 ? 'PAYE' : 'PAYE_PARTIEL';
      
      const updates = { 
        paiements, totalPaye: nouveauTotalPaye, resteAPayer: nouveauReste, statut: nouveauStatut,
        datePaiement: nouveauStatut === 'PAYE' ? actionForm.date : op.datePaiement, updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      setShowPaiementModal(null);
      setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '' });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'enregistrement du paiement');
    }
  };

  const handleArchiver = (op) => {
    setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], boiteArchive: op.boiteArchive || '' });
    setShowArchiveModal(op);
  };
  
  const handleConfirmArchive = async () => {
    const op = showArchiveModal;
    try {
      const updates = { 
        statut: 'ARCHIVE', dateArchivage: actionForm.date, boiteArchive: actionForm.boiteArchive.trim() || null, updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      setShowArchiveModal(null);
      setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '' });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'archivage');
    }
  };

  const handleDeleteWithPassword = (op) => {
    let warningMsg = `L'OP sera déplacé vers la corbeille.`;
    if (!['REJETE_CF', 'REJETE_AC', 'ARCHIVE'].includes(op.statut)) {
      warningMsg += ` Le budget de ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire} sera libéré.`;
    }
    if (['TRANSMIS_CF', 'VISE_CF', 'TRANSMIS_AC', 'PAYE_PARTIEL', 'PAYE'].includes(op.statut)) {
      warningMsg += ` Attention : cet OP est déjà en cours de traitement !`;
    }
    
    setShowPasswordModal({
      title: 'Supprimer un OP',
      description: `Déplacer l'OP ${op.numero} vers la corbeille ?`,
      warningMessage: warningMsg,
      confirmText: 'Mettre à la corbeille',
      confirmColor: '#C43E3E',
      action: async () => {
        try {
          const updates = {
            statut: 'SUPPRIME',
            dateSuppression: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await updateDoc(doc(db, 'ops', op.id), updates);
          setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
          setShowPasswordModal(null);
          setShowDetail(null); 
        } catch (error) {
          console.error('Erreur:', error);
          alert('Erreur lors de la mise à la corbeille');
        }
      }
    });
  };

  const handleOpenStatutModal = (op) => {
    setShowStatutModal({ op });
    setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', nouveauStatut: '' });
  };

  const handleChangeStatut = async () => {
    const op = showStatutModal.op;
    const { nouveauStatut, date, motif } = actionForm;
    if (!nouveauStatut) { alert('Veuillez sélectionner un statut'); return; }
    if (['DIFFERE_CF', 'DIFFERE_AC', 'REJETE_CF', 'REJETE_AC'].includes(nouveauStatut) && !motif.trim()) { alert('Le motif est obligatoire pour ce statut'); return; }
    
    if (['REJETE_CF', 'REJETE_AC'].includes(nouveauStatut)) {
      setShowPasswordModal({
        title: `Changer le statut en ${statutConfig[nouveauStatut]?.label}`,
        description: `L'OP ${op.numero} sera marqué comme rejeté.`,
        warningMessage: `Le rejet va libérer ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire}.`,
        confirmText: 'Confirmer',
        confirmColor: '#C43E3E',
        action: async () => { await saveStatutChange(op, nouveauStatut, date, motif); setShowPasswordModal(null); }
      });
      return;
    }
    await saveStatutChange(op, nouveauStatut, date, motif);
  };

  const saveStatutChange = async (op, nouveauStatut, date, motif) => {
    try {
      const updates = { statut: nouveauStatut, updatedAt: new Date().toISOString() };
      if (nouveauStatut === 'TRANSMIS_CF') updates.dateTransmissionCF = date;
      if (nouveauStatut === 'VISE_CF') updates.dateVisaCF = date;
      if (nouveauStatut === 'TRANSMIS_AC') updates.dateTransmissionAC = date;
      if (nouveauStatut === 'DIFFERE_CF') { updates.dateDiffereCF = date; updates.motifDiffereCF = motif; }
      if (nouveauStatut === 'DIFFERE_AC') { updates.dateDiffereAC = date; updates.motifDiffereAC = motif; }
      if (nouveauStatut === 'REJETE_CF' || nouveauStatut === 'REJETE_AC') { updates.dateRejet = date; updates.motifRejet = motif; updates.rejetePar = nouveauStatut === 'REJETE_CF' ? 'CF' : 'AC'; }
      if (nouveauStatut === 'ARCHIVE') updates.dateArchivage = date;
      
      await updateDoc(doc(db, 'ops', op.id), updates);
      let updatedOps2 = ops.map(o => o.id === op.id ? { ...o, ...updates } : o);

      if (nouveauStatut === 'VISE_CF' && op.type === 'ANNULATION' && op.opProvisoireId) {
        const annuleUpdates = { statut: 'ANNULE', dateAnnulation: date, opAnnulationId: op.id, updatedAt: new Date().toISOString() };
        await updateDoc(doc(db, 'ops', op.opProvisoireId), annuleUpdates);
        updatedOps2 = updatedOps2.map(o => o.id === op.opProvisoireId ? { ...o, ...annuleUpdates } : o);
      }

      setOps(updatedOps2);
      setShowStatutModal(null);
      setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', nouveauStatut: '' });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  const handleDesarchiver = async (op) => {
    if (!window.confirm(`Désarchiver l'OP ${op.numero} ? Il retournera au statut "Payé".`)) return;
    try {
      const updates = { statut: 'PAYE', dateArchivage: null, updatedAt: new Date().toISOString() };
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du désarchivage');
    }
  };

  const handleOpenEdit = (op) => {
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const benRibs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
    let ribIdx = 0;
    if (op.rib && benRibs.length > 1) {
      const idx = benRibs.findIndex(r => r.numero === op.rib);
      if (idx >= 0) ribIdx = idx;
    }
    setEditForm({
      type: op.type || 'DIRECT', beneficiaireId: op.beneficiaireId || '', ribIndex: ribIdx, modeReglement: op.modeReglement || 'VIREMENT',
      objet: op.objet || '', piecesJustificatives: op.piecesJustificatives || '', montant: op.montant || '', ligneBudgetaire: op.ligneBudgetaire || '',
      dateCreation: op.dateCreation || '', tvaRecuperable: op.tvaRecuperable || false, montantTVA: op.montantTVA || ''
    });
    setShowEditModal(op);
  };

  const handleSaveEdit = async () => {
    const op = showEditModal;
    const montantModifie = parseFloat(editForm.montant) !== op.montant;
    const beneficiaireModifie = editForm.beneficiaireId !== op.beneficiaireId;
    
    if (montantModifie || beneficiaireModifie) {
      const opsPostérieurs = ops.filter(o => 
        o.sourceId === op.sourceId && o.exerciceId === op.exerciceId && o.ligneBudgetaire === editForm.ligneBudgetaire &&
        o.id !== op.id && (o.createdAt || '') > (op.createdAt || '')
      );
      
      let warningMsg = '';
      if (montantModifie) warningMsg = `Le montant passe de ${formatMontant(op.montant)} à ${formatMontant(parseFloat(editForm.montant))} FCFA.`;
      if (beneficiaireModifie) {
        const oldBen = beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || 'N/A';
        const newBen = beneficiaires.find(b => b.id === editForm.beneficiaireId)?.nom || 'N/A';
        warningMsg += (warningMsg ? ' ' : '') + `Bénéficiaire : ${oldBen} → ${newBen}.`;
      }
      if (opsPostérieurs.length > 0 && montantModifie) warningMsg += ` Attention : ${opsPostérieurs.length} OP postérieur(s) sur cette ligne seront impactés.`;
      
      setShowPasswordModal({
        title: 'Confirmer les modifications', description: `Modification de l'OP ${op.numero}`, warningMessage: warningMsg,
        confirmText: 'Confirmer la modification', confirmColor: '#E8B931',
        action: async () => { await saveEditChanges(op); setShowPasswordModal(null); }
      });
      return;
    }
    await saveEditChanges(op);
  };

  const saveEditChanges = async (op) => {
    try {
      const ben = beneficiaires.find(b => b.id === editForm.beneficiaireId);
      const benRibs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
      const selectedRib = benRibs[editForm.ribIndex || 0];
      
      const updates = {
        type: editForm.type, beneficiaireId: editForm.beneficiaireId, beneficiaireNom: ben?.nom || '',
        modeReglement: editForm.modeReglement, rib: editForm.modeReglement === 'VIREMENT' ? (selectedRib?.numero || '') : '',
        banque: editForm.modeReglement === 'VIREMENT' ? (selectedRib?.banque || '') : '',
        objet: editForm.objet, piecesJustificatives: editForm.piecesJustificatives, montant: parseFloat(editForm.montant) || op.montant,
        ligneBudgetaire: editForm.ligneBudgetaire, dateCreation: editForm.dateCreation, tvaRecuperable: editForm.tvaRecuperable || false,
        montantTVA: editForm.tvaRecuperable ? (parseFloat(editForm.montantTVA) || 0) : 0, updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      setShowEditModal(null);
      setEditForm({});
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la modification');
    }
  };

  const handleOpenCircuitModal = (op) => {
    setCircuitForm({
      statut: op.statut, dateCreation: op.dateCreation || '', dateTransmissionCF: op.dateTransmissionCF || '', bordereauCF: op.bordereauCF || '',
      dateVisaCF: op.dateVisaCF || '', numeroVisaCF: op.numeroVisaCF || '', dateTransmissionAC: op.dateTransmissionAC || '', bordereauAC: op.bordereauAC || '',
      datePaiement: op.datePaiement || '', referencePaiement: op.referencePaiement || '', dateArchivage: op.dateArchivage || '', boiteArchive: op.boiteArchive || '',
      dateDiffereCF: op.dateDiffereCF || '', motifDiffereCF: op.motifDiffereCF || '', dateDiffereAC: op.dateDiffereAC || '', motifDiffereAC: op.motifDiffereAC || '',
      dateRejet: op.dateRejet || '', motifRejet: op.motifRejet || '', rejetePar: op.rejetePar || ''
    });
    setShowCircuitModal(op);
  };

  const handleSaveCircuit = async () => {
    const op = showCircuitModal;
    const nouveauStatut = circuitForm.statut;
    if (['REJETE_CF', 'REJETE_AC'].includes(nouveauStatut) && !['REJETE_CF', 'REJETE_AC'].includes(op.statut)) {
      setShowPasswordModal({
        title: `Rejeter l'OP ${op.numero}`, description: `L'OP sera marqué comme rejeté par le ${nouveauStatut === 'REJETE_CF' ? 'CF' : 'AC'}.`,
        warningMessage: `Le rejet va libérer ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire}.`,
        confirmText: 'Confirmer le rejet', confirmColor: '#C43E3E',
        action: async () => { await saveCircuitChanges(op); setShowPasswordModal(null); }
      });
      return;
    }
    await saveCircuitChanges(op);
  };
  
  const saveCircuitChanges = async (op) => {
    try {
      const updates = {
        statut: circuitForm.statut, dateCreation: circuitForm.dateCreation || null, dateTransmissionCF: circuitForm.dateTransmissionCF || null,
        bordereauCF: circuitForm.bordereauCF || null, dateVisaCF: circuitForm.dateVisaCF || null, numeroVisaCF: circuitForm.numeroVisaCF || null,
        dateTransmissionAC: circuitForm.dateTransmissionAC || null, bordereauAC: circuitForm.bordereauAC || null, datePaiement: circuitForm.datePaiement || null,
        referencePaiement: circuitForm.referencePaiement || null, dateArchivage: circuitForm.dateArchivage || null, boiteArchive: circuitForm.boiteArchive || null,
        dateDiffereCF: circuitForm.dateDiffereCF || null, motifDiffereCF: circuitForm.motifDiffereCF || null, dateDiffereAC: circuitForm.dateDiffereAC || null,
        motifDiffereAC: circuitForm.motifDiffereAC || null, dateRejet: circuitForm.dateRejet || null, motifRejet: circuitForm.motifRejet || null,
        rejetePar: circuitForm.rejetePar || null, updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'ops', op.id), updates);
      let updatedOps3 = ops.map(o => o.id === op.id ? { ...o, ...updates } : o);

      if (circuitForm.statut === 'VISE_CF' && op.type === 'ANNULATION' && op.opProvisoireId) {
        const annuleUpdates = { statut: 'ANNULE', dateAnnulation: circuitForm.dateVisaCF || new Date().toISOString().split('T')[0], opAnnulationId: op.id, updatedAt: new Date().toISOString() };
        await updateDoc(doc(db, 'ops', op.opProvisoireId), annuleUpdates);
        updatedOps3 = updatedOps3.map(o => o.id === op.opProvisoireId ? { ...o, ...annuleUpdates } : o);
      }

      setOps(updatedOps3);
      setShowCircuitModal(null);
      setCircuitForm({});
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  // EXPORT EXCEL OFFICIELLEMENT RE-AJOUTÉ
  const handleExport = () => {
    const headers = ['Source', 'N° OP', 'Création', 'Type', 'Bénéficiaire', 'Objet', 'Ligne', 'Montant', 'Trans. CF', 'Visa CF', 'Trans. AC', 'Payé', 'Reste', 'Statut', 'Motif Rejet/Différé'];
    const rows = displayOps.map(op => {
      const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
      const source = sources.find(s => s.id === op.sourceId);
      const motif = op.motifRejet || op.motifDiffereCF || op.motifDiffereAC || '';
      const montantAffiche = op.isRejetLine ? -(op.montant || 0) : (op.montant || 0);
      return [
        source?.sigle || '', op.isRejetLine ? op.displayNumero : op.numero, op.dateCreation || '', op.isRejetLine ? 'REJET' : op.type,
        op.beneficiaireNom || ben?.nom || '', op.objet || '', op.ligneBudgetaire || '', montantAffiche,
        op.dateTransmissionCF || '', op.dateVisaCF || '', op.dateTransmissionAC || '', op.totalPaye || 0,
        (op.montant || 0) - (op.totalPaye || 0), op.isRejetLine ? 'Rejet' : (statutConfig[op.statut]?.label || op.statut), motif
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OP_${activeSource === 'ALL' ? 'TOUTES_SOURCES' : currentSourceObj?.sigle}_${currentExercice?.annee || 'TOUS'}_${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      <div style={{ background: '#FFFFFF', padding: '12px 16px', borderRadius: 12, marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: '3 1 280px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, marginBottom: 3, color: '#888', textTransform: 'uppercase' }}>Recherche</label>
            <input type="text" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="N°, bénéficiaire, objet..." style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 0, fontSize: 12, color: '#000000' }} />
          </div>
          <div style={{ flex: '1 1 110px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, marginBottom: 3, color: '#888', textTransform: 'uppercase' }}>Type</label>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 0, fontSize: 12, color: '#000000' }}>
              <option value="">Tous</option>
              <option value="PROVISOIRE">Provisoire</option>
              <option value="DIRECT">Direct</option>
              <option value="DEFINITIF">Définitif</option>
              <option value="ANNULATION">Annulation</option>
            </select>
          </div>
          <div style={{ flex: '1 1 120px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, marginBottom: 3, color: '#888', textTransform: 'uppercase' }}>Statut</label>
            <select value={filters.statut} onChange={(e) => setFilters({ ...filters, statut: e.target.value })} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 0, fontSize: 12, color: '#000000' }}>
              <option value="">Tous</option>
              {Object.entries(statutConfig).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 120px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, marginBottom: 3, color: '#888', textTransform: 'uppercase' }}>Ligne budgétaire</label>
            <input type="text" placeholder="Filtrer..." value={filters.ligneBudgetaire} onChange={(e) => setFilters({ ...filters, ligneBudgetaire: e.target.value })} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 0, fontSize: 12, color: '#000000' }} list="lignesList" />
            <datalist id="lignesList">{allLignes.map(code => <option key={code} value={code} />)}</datalist>
          </div>
          <div style={{ flex: '1 1 110px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, marginBottom: 3, color: '#888', textTransform: 'uppercase' }}>Du</label>
            <input type="date" value={filters.dateDebut} onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 0, fontSize: 12, color: '#000000' }} />
          </div>
          <div style={{ flex: '1 1 110px', minWidth: 0 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, marginBottom: 3, color: '#888', textTransform: 'uppercase' }}>Au</label>
            <input type="date" value={filters.dateFin} onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })} style={{ ...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 0, fontSize: 12, color: '#000000' }} />
          </div>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F7F5F2' }}>
          <span style={{ fontSize: 12, color: '#888' }}>
            <strong style={{ color: '#D4722A' }}>{totaux.count}</strong> OP — Montant : <strong style={{ color: '#2C5A7A', fontFamily: 'monospace' }}>{formatMontant(totaux.montant)}</strong>
            {totaux.paye > 0 && <> — Payé : <strong style={{ color: '#1B6B2E', fontFamily: 'monospace' }}>{formatMontant(totaux.paye)}</strong></>}
          </span>
          {(filters.type || filters.statut || filters.search || filters.ligneBudgetaire || filters.dateDebut || filters.dateFin) && (
            <button 
              onClick={() => setFilters({ type: '', statut: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '' })}
              style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(34,51,0,0.08)', background: '#F7F5F2', fontSize: 11, color: '#999', cursor: 'pointer' }}
            >
              Effacer filtres
            </button>
          )}
        </div>

        {filteredOps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            <div style={{ marginBottom: 12, opacity: 0.4 }}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg></div>
            <div style={{ fontSize: 13 }}>Aucun OP trouvé</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '60vh' }}>
            <table style={styles.table}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  {activeSource === 'ALL' && <th style={{ ...styles.th, width: 55, background: '#F7F5F2', fontSize: 9.5 }}>Source</th>}
                  <th style={{ ...styles.th, width: 140, background: '#F7F5F2', fontSize: 9.5 }}>N° OP</th>
                  <th style={{ ...styles.th, width: 70, background: '#F7F5F2', fontSize: 9.5 }}>Type</th>
                  <th style={{ ...styles.th, width: 140, background: '#F7F5F2', fontSize: 9.5 }}>Bénéficiaire</th>
                  <th style={{ ...styles.th, background: '#F7F5F2', fontSize: 9.5 }}>Objet</th>
                  <th style={{ ...styles.th, width: 60, background: '#F7F5F2', fontSize: 9.5 }}>Ligne</th>
                  <th style={{ ...styles.th, width: 95, textAlign: 'right', background: '#F7F5F2', fontSize: 9.5 }}>Dotation</th>
                  <th style={{ ...styles.th, width: 100, textAlign: 'right', background: '#F7F5F2', fontSize: 9.5 }}>Montant</th>
                  {activeTab === 'A_REGULARISER' && <th style={{ ...styles.th, width: 70, background: '#F7F5F2', fontSize: 9.5 }}>Ancienneté</th>}
                  
                  {activeSource !== 'ALL' && (
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
                  const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                  const source = sources.find(s => s.id === op.sourceId);
                  const isRejet = op.isRejetLine;
                  const statutObj = isRejet ? { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejet', icon: '↩' } : (statutConfig[op.statut] || { bg: '#F7F5F2', color: '#666', label: op.statut });
                  const anciennete = getAnciennete(op.dateCreation);
                  
                  let dotationLigne = op.dotationLigne;
                  if (dotationLigne === undefined || dotationLigne === null) {
                    const currentBudget = budgets.filter(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId).sort((a, b) => (b.version || 1) - (a.version || 1))[0];
                    const ligneBudget = currentBudget?.lignes?.find(l => l.code === op.ligneBudgetaire);
                    dotationLigne = ligneBudget?.dotation || 0;
                  }
                  
                  return (
                    <tr key={isRejet ? op.id + '-rejet' : op.id} style={{ cursor: 'pointer' }} onClick={() => setDrawerOp(op)} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }}>
                      {activeSource === 'ALL' && <td style={styles.td}><span style={{ background: sources.find(s => s.id === op.sourceId)?.couleur, color: 'white', padding: '2px 7px', borderRadius: 4, fontSize: 9 }}>{sources.find(s => s.id === op.sourceId)?.sigle}</span></td>}
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                      <td style={{ ...styles.td }}><span style={{ background: isRejet ? '#C43E3E15' : `${typeColors[op.type]}18`, color: isRejet ? '#C43E3E' : typeColors[op.type], padding: '2px 7px', borderRadius: 4, fontSize: 9, fontWeight: 700 }}>{isRejet ? 'REJET' : op.type}</span></td>
                      <td style={{ ...styles.td, fontSize: 11, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.beneficiaireNom || ben?.nom || 'N/A'}</td>
                      <td style={{ ...styles.td, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#888' }} title={op.objet}>{op.objet || '-'}</td>
                      <td style={{ ...styles.td, fontSize: 10.5, fontFamily: 'monospace' }}>{op.ligneBudgetaire}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 10.5 }}>{formatMontant(dotationLigne)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: op.isRejetLine ? '#C43E3E' : '#155A25' }}>{op.isRejetLine ? '-' : ''}{formatMontant(op.montant)}</td>
                      
                      {activeTab === 'A_REGULARISER' && <td style={{ ...styles.td }}><span style={{ background: anciennete > 30 ? '#C43E3E15' : anciennete > 15 ? '#E8B93120' : '#E8F5E9', color: anciennete > 30 ? '#C43E3E' : anciennete > 15 ? '#E8B931' : '#2e7d32', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 600 }}>{anciennete}j</span></td>}

                      {activeSource !== 'ALL' && (
                        <>
                          <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 10.5 }}>{formatMontant(op.engagementAnterieur)}</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 10.5, color: op.disponible < 0 ? '#C43E3E' : '#2e7d32' }}>{formatMontant(op.disponible)}</td>
                        </>
                      )}
                      <td style={styles.td}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: statutObj.bg, color: statutObj.color, padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: statutObj.color }} />{statutObj.label}</span></td>
                      <td style={styles.td} onClick={(e) => e.stopPropagation()}><button onClick={() => setDrawerOp(op)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>👁️</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== DRAWER APERÇU OP ===== */}
      {drawerOp && (
        <>
          <div onClick={() => setDrawerOp(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(12,74,94,0.08)', zIndex: 90 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, background: '#FFFFFF', zIndex: 100, boxShadow: '-8px 0 32px rgba(12,74,94,0.12)', borderRadius: '20px 0 0 20px', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #EDE9E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2C5A7A', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>Aperçu OP</h3>
              <button onClick={() => setDrawerOp(null)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: '#F7F5F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
              {(() => {
                const ben = beneficiaires.find(b => b.id === drawerOp.beneficiaireId);
                const source = sources.find(s => s.id === drawerOp.sourceId);
                const msg = getDrawerMessage(drawerOp);
                const steps = buildCircuitSteps(drawerOp);
                const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';

                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid #EDE9E3' }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#2C5A7A', marginBottom: 3 }}>{drawerOp.numero}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#2C5A7A' }}>{drawerOp.beneficiaireNom || ben?.nom || 'N/A'}</div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{drawerOp.objet || '-'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#D4722A', fontFeatureSettings: "'tnum'" }}>{formatMontant(drawerOp.montant)}</div>
                        <div style={{ fontSize: 11, color: '#888' }}>FCFA</div>
                      </div>
                    </div>

                    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Circuit de validation</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 10 }}>
                      {steps.map((step, i) => {
                        const dotStyle = { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, border: '2.5px solid', ...(step.state === 'done' ? { background: '#D4722A', borderColor: '#D4722A', color: 'white' } : step.state === 'current' ? { background: '#D4722A', borderColor: '#D4722A', color: 'white', boxShadow: '0 0 0 4px rgba(75,93,22,0.15)' } : step.state === 'deferred' ? { background: '#E8B931', borderColor: '#E8B931', color: 'white' } : step.state === 'rejected' ? { background: '#C43E3E', borderColor: '#C43E3E', color: 'white' } : { background: '#F7F5F2', borderColor: '#EDE9E3', color: '#ccc' }) };
                        const dotContent = step.state === 'done' ? '✓' : step.state === 'rejected' ? '✕' : step.state === 'deferred' ? '◌' : step.state === 'current' ? '●' : '○';
                        return (
                          <React.Fragment key={i}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                              <div style={dotStyle}>{dotContent}</div>
                              <div style={{ fontSize: 8.5, fontWeight: 600, color: ['done', 'current'].includes(step.state) ? '#155A25' : '#888', marginTop: 4, textAlign: 'center', maxWidth: 52, lineHeight: '1.2' }}>{step.label}</div>
                              {step.date && <div style={{ fontSize: 8, color: '#D4722A', fontWeight: 500 }}>{formatDate(step.date)}</div>}
                            </div>
                            {i < steps.length - 1 && <div style={{ flex: 1, height: 2.5, background: steps[i + 1]?.state === 'done' || steps[i + 1]?.state === 'current' ? '#D4722A' : steps[i + 1]?.state === 'deferred' ? '#E8B931' : steps[i + 1]?.state === 'rejected' ? '#C43E3E' : '#EDE9E3', minWidth: 10, margin: '13px 2px 0' }} />}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {msg && (
                      <div style={{ padding: '11px 14px', borderRadius: 10, fontSize: 12, marginTop: 10, display: 'flex', alignItems: 'flex-start', gap: 9, background: msg.type === 'warning' ? '#fef3cd' : msg.type === 'danger' ? '#fee2e2' : '#E8F5E9', color: msg.type === 'warning' ? '#C5961F' : msg.type === 'danger' ? '#C43E3E' : '#D4722A' }}>
                        <div>{msg.title && <><strong>{msg.title}</strong>{msg.date ? ` — ${msg.date}` : ''}<br/></>}<span style={{ fontSize: 12 }}>{msg.text}</span></div>
                      </div>
                    )}

                    <div style={{ height: 1, background: '#EDE9E3', margin: '16px 0' }} />

                    <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Informations</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                      {[
                        { label: 'Type', value: drawerOp.type },
                        { label: 'Source', value: source?.nom || source?.sigle || '-' },
                        { label: 'Ligne budgétaire', value: drawerOp.ligneBudgetaire || '-', mono: true },
                        { label: 'Mode règlement', value: drawerOp.modeReglement || '-' },
                        { label: 'Eng. antérieur', value: formatMontant(drawerOp.engagementAnterieur || 0), mono: true },
                        { label: 'Disponible', value: formatMontant(drawerOp.disponible || 0), mono: true, color: (drawerOp.disponible || 0) >= 0 ? '#D4722A' : '#C43E3E' }
                      ].map((item, i) => (
                        <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid #EDE9E3' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: item.mono ? 600 : 500, color: item.color || '#155A25', marginTop: 2, fontFamily: item.mono ? 'monospace' : 'inherit' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => { setConsultOpData(drawerOp); setCurrentPage('consulterOp'); setDrawerOp(null); }}
                      style={{ width: '100%', padding: 12, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: '#D4722A', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20 }}
                    >
                      Voir détail complet
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {showPasswordModal && <PasswordModal isOpen={!!showPasswordModal} onClose={() => setShowPasswordModal(null)} onConfirm={showPasswordModal.action} adminPassword={projet?.adminPassword || ''} title={showPasswordModal.title} description={showPasswordModal.description} confirmText={showPasswordModal.confirmText} confirmColor={showPasswordModal.confirmColor} />}
    </div>
  );
};

export default PageListeOP;
