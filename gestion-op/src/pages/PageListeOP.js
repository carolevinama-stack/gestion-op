import React, { useState } from 'react';
import Autocomplete from '../components/Autocomplete';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import MontantInput from '../components/MontantInput';
import PasswordModal from '../components/PasswordModal';

const PageListeOP = () => {
  const { projet, sources, exercices, exerciceActif, beneficiaires, budgets, ops, setOps, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL'); // 'ALL' pour toutes sources
  const [activeTab, setActiveTab] = useState('CUMUL_OP'); // Onglet de suivi actif
  const [showAnterieur, setShowAnterieur] = useState(false); // Afficher exercices antérieurs
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
  const [showStatutModal, setShowStatutModal] = useState(null); // { op, nouveauStatut } - pour changement manuel de statut
  const [showEditModal, setShowEditModal] = useState(null); // OP à modifier
  const [editForm, setEditForm] = useState({});
  const [showArchiveModal, setShowArchiveModal] = useState(null); // OP à archiver
  const [showTransmissionModal, setShowTransmissionModal] = useState(null); // { op, destination: 'CF'|'AC' }
  const [showCircuitModal, setShowCircuitModal] = useState(null); // OP pour modal circuit complet
  const [circuitForm, setCircuitForm] = useState({}); // Formulaire circuit
  const [drawerOp, setDrawerOp] = useState(null); // OP pour le panneau latéral aperçu

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
    PROVISOIRE: '#ff9800',
    DIRECT: '#2196f3',
    DEFINITIF: '#4caf50',
    ANNULATION: '#f44336'
  };

  // Couleurs par statut
  const statutConfig = {
    EN_COURS: { bg: '#e3f2fd', color: '#1565c0', label: 'En cours', icon: '🔵' },
    TRANSMIS_CF: { bg: '#fff3e0', color: '#e65100', label: 'Transmis CF', icon: '📤' },
    DIFFERE_CF: { bg: '#fff8e1', color: '#f9a825', label: 'Différé CF', icon: '⏸️' },
    RETOURNE_CF: { bg: '#e1f5fe', color: '#0277bd', label: 'Retourné CF', icon: '↩️' },
    VISE_CF: { bg: '#e8f5e9', color: '#2e7d32', label: 'Visé CF', icon: '✅' },
    REJETE_CF: { bg: '#ffebee', color: '#c62828', label: 'Rejeté CF', icon: '❌' },
    TRANSMIS_AC: { bg: '#f3e5f5', color: '#7b1fa2', label: 'Transmis AC', icon: '📤' },
    DIFFERE_AC: { bg: '#fff8e1', color: '#f9a825', label: 'Différé AC', icon: '⏸️' },
    RETOURNE_AC: { bg: '#e1f5fe', color: '#0277bd', label: 'Retourné AC', icon: '↩️' },
    PAYE_PARTIEL: { bg: '#fff3e0', color: '#ef6c00', label: 'Payé partiel', icon: '💰' },
    PAYE: { bg: '#e0f2f1', color: '#00695c', label: 'Payé', icon: '💰' },
    REJETE_AC: { bg: '#ffebee', color: '#c62828', label: 'Rejeté AC', icon: '❌' },
    ARCHIVE: { bg: '#eceff1', color: '#546e7a', label: 'Archivé', icon: '📦' }
  };

  // === CONSTRUCTION DE LA FRISE DU CIRCUIT ===
  const buildCircuitSteps = (op) => {
    if (!op) return [];
    const statut = op.statut;
    
    // Ordre normal du circuit
    const circuitNormal = [
      { key: 'EN_COURS', label: 'En cours', date: op.dateCreation || op.createdAt?.split('T')[0] },
      { key: 'TRANSMIS_CF', label: 'Transmis CF', date: op.dateTransmissionCF },
      { key: 'VISE_CF', label: 'Visé CF', date: op.dateVisaCF },
      { key: 'TRANSMIS_AC', label: 'Transmis AC', date: op.dateTransmissionAC },
      { key: 'PAYE', label: 'Payé', date: op.datePaiement || (op.paiements?.length > 0 ? op.paiements[op.paiements.length - 1].date : null) },
      { key: 'ARCHIVE', label: 'Archivé', date: op.dateArchivage }
    ];

    // Déterminer l'index actuel dans le circuit
    const statutOrder = ['EN_COURS', 'TRANSMIS_CF', 'VISE_CF', 'TRANSMIS_AC', 'PAYE', 'ARCHIVE'];
    
    // Cas spéciaux : différé ou rejeté
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

    // Circuit normal
    const currentIdx = statutOrder.indexOf(statut);
    return circuitNormal.map((step, i) => ({
      ...step,
      state: i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'pending'
    }));
  };

  // Message résumé du drawer
  const getDrawerMessage = (op) => {
    if (!op) return null;
    const s = op.statut;
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '';
    
    if (s === 'EN_COURS') return { type: 'info', text: 'Cet OP est en cours de préparation.' };
    if (s === 'TRANSMIS_CF') return { type: 'info', text: `Transmis au Contrôleur Financier le ${formatDate(op.dateTransmissionCF)} — en attente de visa.` };
    if (s === 'DIFFERE_CF') return { type: 'warning', title: 'Différé par le CF', text: op.motifDiffere || op.motifRejet || 'Aucun motif renseigné', date: formatDate(op.dateDiffere || op.updatedAt) };
    if (s === 'REJETE_CF') return { type: 'danger', title: 'Rejeté par le CF', text: op.motifRejet || 'Aucun motif renseigné', date: formatDate(op.dateRejet || op.updatedAt) };
    if (s === 'VISE_CF') return { type: 'info', text: `Visé par le CF le ${formatDate(op.dateVisaCF)} — en attente de transmission à l'AC.` };
    if (s === 'TRANSMIS_AC') return { type: 'info', text: `Chez l'Agent Comptable depuis le ${formatDate(op.dateTransmissionAC)} — en attente de paiement.` };
    if (s === 'DIFFERE_AC') return { type: 'warning', title: 'Différé par l\'AC', text: op.motifDiffere || op.motifRejet || 'Aucun motif renseigné', date: formatDate(op.dateDiffere || op.updatedAt) };
    if (s === 'REJETE_AC') return { type: 'danger', title: 'Rejeté par l\'AC', text: op.motifRejet || 'Aucun motif renseigné', date: formatDate(op.dateRejet || op.updatedAt) };
    if (s === 'PAYE' || s === 'PAYE_PARTIEL') return { type: 'success', text: `Payé le ${formatDate(op.datePaiement || op.updatedAt)} — ${formatMontant(op.totalPaye || op.montant)} FCFA` };
    if (s === 'ARCHIVE') return { type: 'info', text: `Archivé le ${formatDate(op.dateArchivage || op.updatedAt)}` };
    return null;
  };

  // OP de l'exercice courant (toutes sources ou source sélectionnée)
  const opsExercice = ops.filter(op => {
    if (op.exerciceId !== currentExerciceId) return false;
    if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
    return true;
  });

  // Provisoires à régulariser (sans DEFINITIF ou ANNULATION liés)
  const provisoiresARegulariser = opsExercice.filter(op => {
    if (op.type !== 'PROVISOIRE') return false;
    if (['REJETE_CF', 'REJETE_AC', 'ARCHIVE'].includes(op.statut)) return false;
    const hasRegularisation = opsExercice.some(o => 
      (o.type === 'DEFINITIF' || o.type === 'ANNULATION') && 
      o.opProvisoireId === op.id
    );
    return !hasRegularisation;
  });

  // Calcul ancienneté en jours
  const getAnciennete = (dateStr) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  };

  // Compteurs par onglet
  // Provisoires à annuler : OP provisoires sans définitif ni annulation associé
  const provisoiresAnnuler = opsExercice.filter(op => {
    if (op.type !== 'PROVISOIRE') return false;
    const hasDefinitif = opsExercice.some(o => o.opProvisoireId === op.id && o.type === 'DEFINITIF');
    const hasAnnulation = opsExercice.some(o => o.opProvisoireId === op.id && o.type === 'ANNULATION');
    return !hasDefinitif && !hasAnnulation && !['REJETE_CF', 'REJETE_AC'].includes(op.statut);
  });
  
  const counts = {
    CUMUL_OP: opsExercice.length,
    PROV_A_ANNULER: provisoiresAnnuler.length,
    A_REGULARISER: provisoiresARegulariser.length
  };

  // Filtrer selon l'onglet actif
  const getFilteredByTab = () => {
    let result = opsExercice;
    
    switch (activeTab) {
      case 'CUMUL_OP':
        // Tous les OP
        break;
      case 'PROV_A_ANNULER':
        result = provisoiresAnnuler;
        break;
      case 'A_REGULARISER':
        result = provisoiresARegulariser;
        break;
      default:
        break;
    }
    
    return result;
  };

  // Appliquer les filtres supplémentaires
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

  // Construire la liste d'affichage avec lignes de rejet dédoublées
  // Tri chronologique (plus ancien en premier) pour calculer l'ordre et le cumul
  const filteredOpsChrono = [...filteredOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  
  const buildDisplayOps = () => {
    const lines = [];
    // D'abord les OP dans l'ordre chronologique de création
    filteredOpsChrono.forEach(op => {
      lines.push({ ...op, isRejetLine: false, displayDate: op.createdAt || op.dateCreation });
    });
    // Ajouter les lignes de rejet (montant négatif) pour les OP rejetés
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
    // Trier par date (création pour les normaux, date de rejet pour les lignes de rejet)
    lines.sort((a, b) => (a.displayDate || '').localeCompare(b.displayDate || ''));
    
    // Calculer engagement antérieur PAR LIGNE BUDGÉTAIRE et disponible
    // Pour chaque OP, on somme les montants des OP antérieurs de la même ligne budgétaire
    const cumulParLigne = {}; // { ligneBudgetaire: montantCumulé }
    
    // Helper : récupérer la dotation figée d'un OP (fallback budget actuel si ancien OP)
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
      
      // L'engagement antérieur = cumul AVANT cet OP sur cette ligne
      line.engagementAnterieur = cumulParLigne[lb] || 0;
      
      // Mettre à jour le cumul pour cette ligne budgétaire
      if (line.isRejetLine) {
        cumulParLigne[lb] = (cumulParLigne[lb] || 0) + line.displayMontant; // négatif
      } else if (!['REJETE_CF', 'REJETE_AC'].includes(line.statut)) {
        cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (line.montant || 0);
      }
      // Si l'OP est rejeté mais c'est la ligne de création, on compte quand même le montant positif
      if (!line.isRejetLine && ['REJETE_CF', 'REJETE_AC'].includes(line.statut)) {
        cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (line.montant || 0);
      }
      
      // Disponible = dotation figée - engagement antérieur - montant de cet OP
      const dotOP = getDotationOP(line);
      const totalEngageLigne = cumulParLigne[lb] || 0;
      line.disponible = dotOP - totalEngageLigne;
    });
    
    return lines;
  };
  
  const displayOps = buildDisplayOps();

  // Totaux
  const totaux = {
    count: filteredOps.length,
    montant: filteredOps.reduce((sum, op) => sum + (op.montant || 0), 0),
    paye: filteredOps.reduce((sum, op) => sum + (op.totalPaye || 0), 0)
  };

  // === ACTIONS ===
  
  // Ouvrir modal transmission CF
  const handleOpenTransmissionCF = (op) => {
    setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], bordereau: op.bordereauCF || '' });
    setShowTransmissionModal({ op, destination: 'CF' });
  };

  // Ouvrir modal transmission AC
  const handleOpenTransmissionAC = (op) => {
    setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], bordereau: op.bordereauAC || '' });
    setShowTransmissionModal({ op, destination: 'AC' });
  };

  // Confirmer transmission (CF ou AC)
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

  // Viser CF
  const handleViserCF = async (op) => {
    if (!window.confirm(`Viser l'OP ${op.numero} ?`)) return;
    try {
      const updates = { 
        statut: 'VISE_CF',
        dateVisaCF: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du visa');
    }
  };

  // Retourner pour correction (CF ou AC)
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

  // Enregistrer un paiement
  const handlePaiement = async () => {
    if (!actionForm.reference.trim()) {
      alert('La référence est obligatoire');
      return;
    }
    const montantPaye = parseFloat(actionForm.montant);
    if (!montantPaye || montantPaye <= 0) {
      alert('Le montant doit être supérieur à 0');
      return;
    }
    
    const op = showPaiementModal;
    const totalPayeActuel = op.totalPaye || 0;
    const resteAPayer = op.montant - totalPayeActuel;
    
    if (montantPaye > resteAPayer) {
      alert(`Le montant ne peut pas dépasser le reste à payer (${formatMontant(resteAPayer)} FCFA)`);
      return;
    }
    
    try {
      const nouveauPaiement = {
        date: actionForm.date,
        reference: actionForm.reference.trim(),
        montant: montantPaye,
        mode: op.modeReglement || 'VIREMENT'
      };
      
      const paiements = [...(op.paiements || []), nouveauPaiement];
      const nouveauTotalPaye = totalPayeActuel + montantPaye;
      const nouveauReste = op.montant - nouveauTotalPaye;
      const nouveauStatut = nouveauReste <= 0 ? 'PAYE' : 'PAYE_PARTIEL';
      
      const updates = { 
        paiements,
        totalPaye: nouveauTotalPaye,
        resteAPayer: nouveauReste,
        statut: nouveauStatut,
        datePaiement: nouveauStatut === 'PAYE' ? actionForm.date : op.datePaiement,
        updatedAt: new Date().toISOString()
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

  // Archiver - ouvrir le modal
  const handleArchiver = (op) => {
    setActionForm({ ...actionForm, date: new Date().toISOString().split('T')[0], boiteArchive: op.boiteArchive || '' });
    setShowArchiveModal(op);
  };
  
  // Confirmer l'archivage
  const handleConfirmArchive = async () => {
    const op = showArchiveModal;
    try {
      const updates = { 
        statut: 'ARCHIVE',
        dateArchivage: actionForm.date,
        boiteArchive: actionForm.boiteArchive.trim() || null,
        updatedAt: new Date().toISOString()
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

  // Supprimer un OP (protégé par mot de passe)
  const handleDeleteWithPassword = (op) => {
    let warningMsg = `Cette action est irréversible.`;
    
    // Avertissement selon le statut
    if (!['REJETE_CF', 'REJETE_AC', 'ARCHIVE'].includes(op.statut)) {
      warningMsg += ` Le budget de ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire} sera libéré.`;
    }
    if (['TRANSMIS_CF', 'VISE_CF', 'TRANSMIS_AC', 'PAYE_PARTIEL', 'PAYE'].includes(op.statut)) {
      warningMsg += ` ⚠️ Attention : cet OP est déjà en cours de traitement !`;
    }
    
    setShowPasswordModal({
      title: 'Supprimer un OP',
      description: `Supprimer définitivement l'OP ${op.numero} (${statutConfig[op.statut]?.label || op.statut}) ?`,
      warningMessage: warningMsg,
      confirmText: '🗑️ Confirmer la suppression',
      confirmColor: '#c62828',
      action: async () => {
        try {
          await deleteDoc(doc(db, 'ops', op.id));
          setOps(ops.filter(o => o.id !== op.id));
          setShowPasswordModal(null);
          setShowDetail(null); // Fermer le détail si ouvert
        } catch (error) {
          console.error('Erreur:', error);
          alert('Erreur lors de la suppression');
        }
      }
    });
  };

  // Ouvrir le modal de changement de statut manuel
  const handleOpenStatutModal = (op) => {
    setShowStatutModal({ op });
    setActionForm({ 
      motif: '', 
      date: new Date().toISOString().split('T')[0], 
      reference: '', 
      montant: '',
      nouveauStatut: ''
    });
  };

  // Appliquer le changement de statut manuel
  const handleChangeStatut = async () => {
    const op = showStatutModal.op;
    const { nouveauStatut, date, motif } = actionForm;
    
    if (!nouveauStatut) {
      alert('Veuillez sélectionner un statut');
      return;
    }
    
    // Vérifier si motif obligatoire
    if (['DIFFERE_CF', 'DIFFERE_AC', 'REJETE_CF', 'REJETE_AC'].includes(nouveauStatut) && !motif.trim()) {
      alert('Le motif est obligatoire pour ce statut');
      return;
    }
    
    // Si rejet, demander mot de passe
    if (['REJETE_CF', 'REJETE_AC'].includes(nouveauStatut)) {
      setShowPasswordModal({
        title: `Changer le statut en ${statutConfig[nouveauStatut]?.label}`,
        description: `L'OP ${op.numero} sera marqué comme rejeté.`,
        warningMessage: `Le rejet va libérer ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire}.`,
        confirmText: '✓ Confirmer',
        confirmColor: '#c62828',
        action: async () => {
          await saveStatutChange(op, nouveauStatut, date, motif);
          setShowPasswordModal(null);
        }
      });
      return;
    }
    
    await saveStatutChange(op, nouveauStatut, date, motif);
  };

  // Sauvegarder le changement de statut
  const saveStatutChange = async (op, nouveauStatut, date, motif) => {
    try {
      const updates = { 
        statut: nouveauStatut,
        updatedAt: new Date().toISOString()
      };
      
      // Ajouter les dates spécifiques selon le statut
      if (nouveauStatut === 'TRANSMIS_CF') updates.dateTransmissionCF = date;
      if (nouveauStatut === 'VISE_CF') updates.dateVisaCF = date;
      if (nouveauStatut === 'TRANSMIS_AC') updates.dateTransmissionAC = date;
      if (nouveauStatut === 'DIFFERE_CF') {
        updates.dateDiffereCF = date;
        updates.motifDiffereCF = motif;
      }
      if (nouveauStatut === 'DIFFERE_AC') {
        updates.dateDiffereAC = date;
        updates.motifDiffereAC = motif;
      }
      if (nouveauStatut === 'REJETE_CF' || nouveauStatut === 'REJETE_AC') {
        updates.dateRejet = date;
        updates.motifRejet = motif;
        updates.rejetePar = nouveauStatut === 'REJETE_CF' ? 'CF' : 'AC';
      }
      if (nouveauStatut === 'ARCHIVE') updates.dateArchivage = date;
      
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      setShowStatutModal(null);
      setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', nouveauStatut: '' });
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du changement de statut');
    }
  };

  // Désarchiver un OP
  const handleDesarchiver = async (op) => {
    if (!window.confirm(`Désarchiver l'OP ${op.numero} ? Il retournera au statut "Payé".`)) return;
    try {
      const updates = { 
        statut: 'PAYE',
        dateArchivage: null,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du désarchivage');
    }
  };

  // Ouvrir le modal de modification
  const handleOpenEdit = (op) => {
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const benRibs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
    // Trouver l'index du RIB utilisé
    let ribIdx = 0;
    if (op.rib && benRibs.length > 1) {
      const idx = benRibs.findIndex(r => r.numero === op.rib);
      if (idx >= 0) ribIdx = idx;
    }
    
    setEditForm({
      type: op.type || 'DIRECT',
      beneficiaireId: op.beneficiaireId || '',
      ribIndex: ribIdx,
      modeReglement: op.modeReglement || 'VIREMENT',
      objet: op.objet || '',
      piecesJustificatives: op.piecesJustificatives || '',
      montant: op.montant || '',
      ligneBudgetaire: op.ligneBudgetaire || '',
      dateCreation: op.dateCreation || '',
      tvaRecuperable: op.tvaRecuperable || false,
      montantTVA: op.montantTVA || ''
    });
    setShowEditModal(op);
  };

  // Sauvegarder les modifications
  const handleSaveEdit = async () => {
    const op = showEditModal;
    const montantModifie = parseFloat(editForm.montant) !== op.montant;
    const beneficiaireModifie = editForm.beneficiaireId !== op.beneficiaireId;
    
    // Si le montant ou le bénéficiaire a changé, demander mot de passe
    if (montantModifie || beneficiaireModifie) {
      // Vérifier s'il y a des OP postérieurs sur la même ligne
      const opsPostérieurs = ops.filter(o => 
        o.sourceId === op.sourceId &&
        o.exerciceId === op.exerciceId &&
        o.ligneBudgetaire === editForm.ligneBudgetaire &&
        o.id !== op.id &&
        (o.createdAt || '') > (op.createdAt || '')
      );
      
      let warningMsg = '';
      if (montantModifie) {
        warningMsg = `Le montant passe de ${formatMontant(op.montant)} à ${formatMontant(parseFloat(editForm.montant))} FCFA.`;
      }
      if (beneficiaireModifie) {
        const oldBen = beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || 'N/A';
        const newBen = beneficiaires.find(b => b.id === editForm.beneficiaireId)?.nom || 'N/A';
        warningMsg += (warningMsg ? ' ' : '') + `Bénéficiaire : ${oldBen} → ${newBen}.`;
      }
      if (opsPostérieurs.length > 0 && montantModifie) {
        warningMsg += ` Attention : ${opsPostérieurs.length} OP postérieur(s) sur cette ligne seront impactés.`;
      }
      
      setShowPasswordModal({
        title: 'Confirmer les modifications',
        description: `Modification de l'OP ${op.numero}`,
        warningMessage: warningMsg,
        confirmText: '✓ Confirmer la modification',
        confirmColor: '#f57f17',
        action: async () => {
          await saveEditChanges(op);
          setShowPasswordModal(null);
        }
      });
      return;
    }
    
    await saveEditChanges(op);
  };

  // Sauvegarder les modifications de l'OP
  const saveEditChanges = async (op) => {
    try {
      // Récupérer le RIB sélectionné
      const ben = beneficiaires.find(b => b.id === editForm.beneficiaireId);
      const benRibs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
      const selectedRib = benRibs[editForm.ribIndex || 0];
      
      const updates = {
        type: editForm.type,
        beneficiaireId: editForm.beneficiaireId,
        beneficiaireNom: ben?.nom || '',
        modeReglement: editForm.modeReglement,
        rib: editForm.modeReglement === 'VIREMENT' ? (selectedRib?.numero || '') : '',
        banque: editForm.modeReglement === 'VIREMENT' ? (selectedRib?.banque || '') : '',
        objet: editForm.objet,
        piecesJustificatives: editForm.piecesJustificatives,
        montant: parseFloat(editForm.montant) || op.montant,
        ligneBudgetaire: editForm.ligneBudgetaire,
        dateCreation: editForm.dateCreation,
        tvaRecuperable: editForm.tvaRecuperable || false,
        montantTVA: editForm.tvaRecuperable ? (parseFloat(editForm.montantTVA) || 0) : 0,
        updatedAt: new Date().toISOString()
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

  // Export Excel
  const handleExport = () => {
    const headers = ['Source', 'N° OP', 'Création', 'Type', 'Bénéficiaire', 'Objet', 'Ligne', 'Montant', 'Trans. CF', 'Visa CF', 'Trans. AC', 'Payé', 'Reste', 'Statut', 'Motif Rejet/Différé'];
    const rows = filteredOps.map(op => {
      const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
      const source = sources.find(s => s.id === op.sourceId);
      const motif = op.motifRejet || op.motifDiffereCF || op.motifDiffereAC || '';
      return [
        source?.sigle || '',
        op.numero,
        op.dateCreation || '',
        op.type,
        op.beneficiaireNom || ben?.nom || '',
        op.objet || '',
        op.ligneBudgetaire || '',
        op.montant || 0,
        op.dateTransmissionCF || '',
        op.dateVisaCF || '',
        op.dateTransmissionAC || '',
        op.totalPaye || 0,
        (op.montant || 0) - (op.totalPaye || 0),
        statutConfig[op.statut]?.label || op.statut,
        motif
      ];
    });

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OP_${activeSource === 'ALL' ? 'TOUTES_SOURCES' : currentSourceObj?.sigle}_${currentExercice?.annee || 'TOUS'}_${activeTab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Ouvrir le modal de gestion complète du circuit
  const handleOpenCircuitModal = (op) => {
    setCircuitForm({
      statut: op.statut,
      dateCreation: op.dateCreation || '',
      dateTransmissionCF: op.dateTransmissionCF || '',
      bordereauCF: op.bordereauCF || '',
      dateVisaCF: op.dateVisaCF || '',
      numeroVisaCF: op.numeroVisaCF || '',
      dateTransmissionAC: op.dateTransmissionAC || '',
      bordereauAC: op.bordereauAC || '',
      datePaiement: op.datePaiement || '',
      referencePaiement: op.referencePaiement || '',
      dateArchivage: op.dateArchivage || '',
      boiteArchive: op.boiteArchive || '',
      dateDiffereCF: op.dateDiffereCF || '',
      motifDiffereCF: op.motifDiffereCF || '',
      dateDiffereAC: op.dateDiffereAC || '',
      motifDiffereAC: op.motifDiffereAC || '',
      dateRejet: op.dateRejet || '',
      motifRejet: op.motifRejet || '',
      rejetePar: op.rejetePar || ''
    });
    setShowCircuitModal(op);
  };

  // Sauvegarder les modifications du circuit
  const handleSaveCircuit = async () => {
    const op = showCircuitModal;
    const nouveauStatut = circuitForm.statut;
    
    // Si rejet avec motif renseigné, demander mot de passe
    if (['REJETE_CF', 'REJETE_AC'].includes(nouveauStatut) && !['REJETE_CF', 'REJETE_AC'].includes(op.statut)) {
      setShowPasswordModal({
        title: `Rejeter l'OP ${op.numero}`,
        description: `L'OP sera marqué comme rejeté par le ${nouveauStatut === 'REJETE_CF' ? 'CF' : 'AC'}.`,
        warningMessage: `Le rejet va libérer ${formatMontant(op.montant)} FCFA sur la ligne ${op.ligneBudgetaire}.`,
        confirmText: '❌ Confirmer le rejet',
        confirmColor: '#c62828',
        action: async () => {
          await saveCircuitChanges(op);
          setShowPasswordModal(null);
        }
      });
      return;
    }
    
    await saveCircuitChanges(op);
  };
  
  const saveCircuitChanges = async (op) => {
    try {
      const updates = {
        statut: circuitForm.statut,
        dateCreation: circuitForm.dateCreation || null,
        dateTransmissionCF: circuitForm.dateTransmissionCF || null,
        bordereauCF: circuitForm.bordereauCF || null,
        dateVisaCF: circuitForm.dateVisaCF || null,
        numeroVisaCF: circuitForm.numeroVisaCF || null,
        dateTransmissionAC: circuitForm.dateTransmissionAC || null,
        bordereauAC: circuitForm.bordereauAC || null,
        datePaiement: circuitForm.datePaiement || null,
        referencePaiement: circuitForm.referencePaiement || null,
        dateArchivage: circuitForm.dateArchivage || null,
        boiteArchive: circuitForm.boiteArchive || null,
        dateDiffereCF: circuitForm.dateDiffereCF || null,
        motifDiffereCF: circuitForm.motifDiffereCF || null,
        dateDiffereAC: circuitForm.dateDiffereAC || null,
        motifDiffereAC: circuitForm.motifDiffereAC || null,
        dateRejet: circuitForm.dateRejet || null,
        motifRejet: circuitForm.motifRejet || null,
        rejetePar: circuitForm.rejetePar || null,
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'ops', op.id), updates);
      setOps(ops.map(o => o.id === op.id ? { ...o, ...updates } : o));
      setShowCircuitModal(null);
      setCircuitForm({});
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📋 Liste des Ordres de Paiement</h1>
          {currentExercice && (
            <span style={{ 
              background: showAnterieur ? '#fff3e0' : '#e8f5e9', 
              color: showAnterieur ? '#e65100' : '#2e7d32', 
              padding: '6px 14px', 
              borderRadius: 20, 
              fontWeight: 700,
              fontSize: 14
            }}>
              {currentExercice.annee}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleExport} style={{ ...styles.buttonSecondary, background: '#e8f5e9', color: '#2e7d32' }}>
            📥 Export Excel
          </button>
          <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>
            ➕ Nouvel OP
          </button>
        </div>
      </div>

      {/* Sélecteur d'exercice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={showAnterieur}
            onChange={(e) => {
              setShowAnterieur(e.target.checked);
              if (!e.target.checked) setSelectedExercice(exerciceActif?.id);
            }}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ fontSize: 13, fontWeight: 500 }}>📅 Afficher exercices antérieurs</span>
        </label>
        {showAnterieur && (
          <select
            value={selectedExercice || ''}
            onChange={(e) => setSelectedExercice(e.target.value)}
            style={{ ...styles.input, marginBottom: 0, width: 150, padding: '8px 12px' }}
          >
            {exercices.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.annee} {ex.actif ? '(actif)' : ''}
              </option>
            ))}
          </select>
        )}
        {showAnterieur && (
          <span style={{ fontSize: 12, color: '#6c757d', fontStyle: 'italic' }}>
            ⚠️ Consultation seule - les modifications ne sont pas recommandées sur les exercices clos
          </span>
        )}
      </div>

      {/* Onglets de suivi */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'CUMUL_OP', label: 'Cumul OP', icon: '📋' },
          { key: 'PROV_A_ANNULER', label: 'Provisoires à annuler', icon: '⚠️' },
          { key: 'A_REGULARISER', label: 'À régulariser', icon: '⏳' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === tab.key ? '#0f4c3a' : '#f0f0f0',
              color: activeTab === tab.key ? 'white' : '#333',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {tab.icon} {tab.label} <span style={{ 
              background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#ddd',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 11
            }}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
        
        {/* Bouton Importer des OP */}
        <button
          onClick={() => setShowImportModal(true)}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '2px dashed #1565c0',
            background: '#e3f2fd',
            color: '#1565c0',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginLeft: 'auto'
          }}
        >
          📥 Importer des OP
        </button>
      </div>

      {/* Onglets sources */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e9ecef' }}>
        <button
          onClick={() => setActiveSource('ALL')}
          style={{
            padding: '12px 20px',
            border: 'none',
            borderBottom: activeSource === 'ALL' ? '3px solid #0f4c3a' : '3px solid transparent',
            background: 'transparent',
            color: activeSource === 'ALL' ? '#0f4c3a' : '#6c757d',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: -2
          }}
        >
          🌐 TOUTES
        </button>
        {sources.map(source => (
          <button
            key={source.id}
            onClick={() => setActiveSource(source.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderBottom: activeSource === source.id ? `3px solid ${source.couleur}` : '3px solid transparent',
              background: 'transparent',
              color: activeSource === source.id ? source.couleur : '#6c757d',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: -2
            }}
          >
            {source.sigle}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div style={{ ...styles.card, marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 130px 150px 110px 110px', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>RECHERCHE</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="🔍 N°, bénéficiaire, objet..."
              style={{ ...styles.input, marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>TYPE</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              style={{ ...styles.input, marginBottom: 0 }}
            >
              <option value="">Tous</option>
              <option value="PROVISOIRE">Provisoire</option>
              <option value="DIRECT">Direct</option>
              <option value="DEFINITIF">Définitif</option>
              <option value="ANNULATION">Annulation</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>STATUT</label>
            <select
              value={filters.statut}
              onChange={(e) => setFilters({ ...filters, statut: e.target.value })}
              style={{ ...styles.input, marginBottom: 0 }}
            >
              <option value="">Tous</option>
              {Object.entries(statutConfig).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>LIGNE BUDGÉTAIRE</label>
            <input
              type="text"
              placeholder="Rechercher / Filtrer..."
              value={filters.ligneBudgetaire}
              onChange={(e) => setFilters({ ...filters, ligneBudgetaire: e.target.value })}
              style={{ ...styles.input, marginBottom: 0 }}
              list="lignesBudgetairesList"
            />
            <datalist id="lignesBudgetairesList">
              {allLignes.map(code => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>DU</label>
            <input
              type="date"
              value={filters.dateDebut}
              onChange={(e) => setFilters({ ...filters, dateDebut: e.target.value })}
              style={{ ...styles.input, marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: '#6c757d' }}>AU</label>
            <input
              type="date"
              value={filters.dateFin}
              onChange={(e) => setFilters({ ...filters, dateFin: e.target.value })}
              style={{ ...styles.input, marginBottom: 0 }}
            />
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div style={styles.card}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#6c757d', fontSize: 14 }}>
            {totaux.count} OP - Montant : <strong>{formatMontant(totaux.montant)}</strong>
            {totaux.paye > 0 && <> - Payé : <strong style={{ color: '#2e7d32' }}>{formatMontant(totaux.paye)}</strong></>}
          </span>
          {(filters.type || filters.statut || filters.search || filters.ligneBudgetaire || filters.dateDebut || filters.dateFin) && (
            <button 
              onClick={() => setFilters({ type: '', statut: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '' })}
              style={{ ...styles.buttonSecondary, padding: '4px 12px', fontSize: 12 }}
            >
              ✕ Effacer filtres
            </button>
          )}
        </div>

        {filteredOps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#6c757d' }}>
            <div style={{ fontSize: 50, marginBottom: 16 }}>📭</div>
            <p>Aucun OP trouvé</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh' }}>
            <table style={styles.table}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  {activeSource === 'ALL' && <th style={{ ...styles.th, width: 60 }}>SOURCE</th>}
                  <th style={{ ...styles.th, width: 145 }}>N° OP</th>
                  <th style={{ ...styles.th, width: 75 }}>TYPE</th>
                  <th style={{ ...styles.th, width: 140 }}>BÉNÉFICIAIRE</th>
                  <th style={styles.th}>OBJET</th>
                  <th style={{ ...styles.th, width: 70 }}>LIGNE</th>
                  <th style={{ ...styles.th, width: 100, textAlign: 'right' }}>DOTATION</th>
                  <th style={{ ...styles.th, width: 100, textAlign: 'right' }}>MONTANT</th>
                  {activeTab === 'A_REGULARISER' && <th style={{ ...styles.th, width: 80 }}>ANCIENNETÉ</th>}
                  <th style={{ ...styles.th, width: 110, textAlign: 'right' }}>ENG. ANTÉRIEUR</th>
                  <th style={{ ...styles.th, width: 110, textAlign: 'right' }}>DISPONIBLE</th>
                  <th style={{ ...styles.th, width: 95 }}>STATUT</th>
                  <th style={{ ...styles.th, width: 44, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {displayOps.map((op, idx) => {
                  const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                  const source = sources.find(s => s.id === op.sourceId);
                  const isRejet = op.isRejetLine;
                  
                  // Ne pas afficher les lignes de rejet (désengagement) - demandé par Carole
                  if (isRejet) return null;
                  
                  // Ne pas afficher le statut "En cours" - demandé par Carole
                  const statutObj = statutConfig[op.statut] || { bg: '#f5f5f5', color: '#666', label: op.statut };
                  const anciennete = getAnciennete(op.dateCreation);
                  
                  // Dotation sauvegardée au moment de la création de l'OP
                  // Si anciens OP sans dotationLigne, fallback sur le budget actuel
                  let dotationLigne = op.dotationLigne;
                  if (dotationLigne === undefined || dotationLigne === null) {
                    const currentBudget = budgets
                      .filter(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId)
                      .sort((a, b) => (b.version || 1) - (a.version || 1))[0];
                    const ligneBudget = currentBudget?.lignes?.find(l => l.code === op.ligneBudgetaire);
                    dotationLigne = ligneBudget?.dotation || 0;
                  }
                  
                  return (
                    <tr key={op.id} style={{ cursor: 'pointer' }} onClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }}>
                      {activeSource === 'ALL' && (
                        <td style={styles.td}>
                          <span style={{ 
                            background: source?.couleur || '#666', 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: 4, 
                            fontSize: 10, 
                            fontWeight: 600 
                          }}>
                            {source?.sigle || '?'}
                          </span>
                        </td>
                      )}
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>
                        {op.numero}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          background: `${typeColors[op.type]}20`,
                          color: typeColors[op.type],
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 600
                        }}>
                          {op.type}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontSize: 11 }}>{op.beneficiaireNom || ben?.nom || 'N/A'}</td>
                      <td style={{ ...styles.td, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={op.objet}>
                        {op.objet || '-'}
                      </td>
                      <td style={{ ...styles.td, fontSize: 11, fontFamily: 'monospace' }}>{op.ligneBudgetaire || '-'}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#666' }}>
                        {formatMontant(dotationLigne)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>
                        {formatMontant(op.montant)}
                      </td>
                      {activeTab === 'A_REGULARISER' && (
                        <td style={styles.td}>
                          <span style={{
                            background: anciennete > 30 ? '#ffebee' : anciennete > 15 ? '#fff3e0' : '#e8f5e9',
                            color: anciennete > 30 ? '#c62828' : anciennete > 15 ? '#e65100' : '#2e7d32',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {anciennete}j
                          </span>
                        </td>
                      )}
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>
                        {formatMontant(op.engagementAnterieur || 0)}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 11, color: (op.disponible || 0) < 0 ? '#c62828' : '#2e7d32' }}>
                        {formatMontant(op.disponible)}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          background: statutObj.bg,
                          color: statutObj.color,
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600
                        }}>
                          {statutObj.label}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', padding: '8px 4px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDrawerOp(op)}
                          title="Aperçu du circuit"
                          style={{
                            width: 30, height: 30, borderRadius: 7,
                            border: drawerOp?.id === op.id ? 'none' : '1.5px solid #d1e0e0',
                            background: drawerOp?.id === op.id ? '#0891b2' : 'white',
                            color: drawerOp?.id === op.id ? 'white' : '#5f8a8b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'all 0.2s', padding: 0
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Import OP */}
      {showImportModal && (
        <div style={styles.modal} onClick={() => { setShowImportModal(false); setImportData([]); setImportError(''); }}>
          <div style={{ ...styles.modalContent, maxWidth: 900 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 20, borderBottom: '1px solid #e9ecef', background: '#1565c0', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>📥 Importer des OP depuis Excel/CSV</h2>
            </div>
            <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 20, padding: 16, background: '#e3f2fd', borderRadius: 8, fontSize: 13 }}>
                <strong>📋 Format attendu (colonnes) :</strong><br/>
                Type | Bénéficiaire (NCC) | Objet | Ligne Budgétaire | Montant | Date Création
              </div>
              
              <input 
                type="file" 
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    try {
                      const text = evt.target.result;
                      const lines = text.split('\n').filter(l => l.trim());
                      const headers = lines[0].split(/[;,\t]/);
                      
                      const data = lines.slice(1).map((line, idx) => {
                        const cols = line.split(/[;,\t]/);
                        return {
                          idx: idx + 1,
                          type: (cols[0] || '').trim().toUpperCase(),
                          beneficiaire: (cols[1] || '').trim(),
                          objet: (cols[2] || '').trim(),
                          ligneBudgetaire: (cols[3] || '').trim(),
                          montant: parseFloat((cols[4] || '0').replace(/[^\d.-]/g, '')) || 0,
                          dateCreation: (cols[5] || new Date().toISOString().split('T')[0]).trim(),
                          valid: true,
                          error: ''
                        };
                      }).filter(d => d.type || d.beneficiaire || d.montant);
                      
                      // Validation
                      data.forEach(d => {
                        if (!['PROVISOIRE', 'DIRECT', 'DEFINITIF', 'ANNULATION'].includes(d.type)) {
                          d.valid = false;
                          d.error = 'Type invalide';
                        }
                        if (!d.beneficiaire) {
                          d.valid = false;
                          d.error = 'Bénéficiaire manquant';
                        }
                        if (!d.montant || d.montant <= 0) {
                          d.valid = false;
                          d.error = 'Montant invalide';
                        }
                      });
                      
                      setImportData(data);
                      setImportError('');
                    } catch (err) {
                      setImportError('Erreur de lecture du fichier : ' + err.message);
                      setImportData([]);
                    }
                  };
                  reader.readAsText(file);
                }}
                style={{ marginBottom: 16 }}
              />
              
              {importError && (
                <div style={{ padding: 12, background: '#ffebee', color: '#c62828', borderRadius: 6, marginBottom: 16 }}>
                  ⚠️ {importError}
                </div>
              )}
              
              {importData.length > 0 && (
                <>
                  <div style={{ marginBottom: 12, fontSize: 13 }}>
                    <strong>{importData.length}</strong> lignes détectées — 
                    <span style={{ color: '#2e7d32' }}> {importData.filter(d => d.valid).length} valides</span> / 
                    <span style={{ color: '#c62828' }}> {importData.filter(d => !d.valid).length} erreurs</span>
                  </div>
                  
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 6 }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ ...styles.th, width: 40 }}>#</th>
                          <th style={{ ...styles.th, width: 80 }}>Type</th>
                          <th style={styles.th}>Bénéficiaire</th>
                          <th style={styles.th}>Objet</th>
                          <th style={{ ...styles.th, width: 70 }}>Ligne</th>
                          <th style={{ ...styles.th, width: 100, textAlign: 'right' }}>Montant</th>
                          <th style={{ ...styles.th, width: 100 }}>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.map(d => (
                          <tr key={d.idx} style={{ background: d.valid ? 'transparent' : '#fff8f8' }}>
                            <td style={styles.td}>{d.idx}</td>
                            <td style={styles.td}>{d.type}</td>
                            <td style={styles.td}>{d.beneficiaire}</td>
                            <td style={{ ...styles.td, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.objet}</td>
                            <td style={styles.td}>{d.ligneBudgetaire}</td>
                            <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(d.montant)}</td>
                            <td style={styles.td}>
                              {d.valid ? (
                                <span style={{ color: '#2e7d32', fontSize: 12 }}>✓ OK</span>
                              ) : (
                                <span style={{ color: '#c62828', fontSize: 11 }}>⚠️ {d.error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setShowImportModal(false); setImportData([]); }} style={styles.buttonSecondary}>
                      Annuler
                    </button>
                    <button 
                      onClick={async () => {
                        const validOps = importData.filter(d => d.valid);
                        if (validOps.length === 0) {
                          alert('Aucun OP valide à importer');
                          return;
                        }
                        
                        if (!window.confirm(`Importer ${validOps.length} OP ?`)) return;
                        
                        try {
                          for (const d of validOps) {
                            // Trouver le bénéficiaire par NCC ou nom
                            const ben = beneficiaires.find(b => 
                              b.ncc === d.beneficiaire || 
                              b.nom.toLowerCase().includes(d.beneficiaire.toLowerCase())
                            );
                            
                            // Générer le numéro
                            const sigleProjet = projet?.sigle || 'PROJET';
                            const sigleSrc = sources.find(s => s.id === activeSource)?.sigle || 'SRC';
                            const annee = exerciceActif?.annee || new Date().getFullYear();
                            const existants = ops.filter(o => o.sourceId === (activeSource === 'ALL' ? sources[0]?.id : activeSource) && o.exerciceId === exerciceActif?.id);
                            const nextNum = existants.length + 1;
                            const numero = `N°${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSrc}/${annee}`;
                            
                            const opData = {
                              numero,
                              type: d.type,
                              beneficiaireId: ben?.id || null,
                              beneficiaireNom: ben?.nom || d.beneficiaire,
                              objet: d.objet,
                              ligneBudgetaire: d.ligneBudgetaire,
                              montant: d.montant,
                              dateCreation: d.dateCreation,
                              statut: 'EN_COURS',
                              sourceId: activeSource === 'ALL' ? sources[0]?.id : activeSource,
                              exerciceId: exerciceActif?.id,
                              createdAt: new Date().toISOString(),
                              importedAt: new Date().toISOString()
                            };
                            
                            await addDoc(collection(db, 'ops'), opData);
                          }
                          
                          alert(`✅ ${validOps.length} OP importés avec succès !`);
                          setShowImportModal(false);
                          setImportData([]);
                        } catch (err) {
                          alert('Erreur import : ' + err.message);
                        }
                      }}
                      disabled={importData.filter(d => d.valid).length === 0}
                      style={{ ...styles.button, background: importData.filter(d => d.valid).length === 0 ? '#ccc' : '#2e7d32' }}
                    >
                      ✓ Importer {importData.filter(d => d.valid).length} OP
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail OP */}
      {showDetail && (
        <div style={styles.modal} onClick={() => setShowDetail(null)}>
          <div style={{ ...styles.modalContent, maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: sources.find(s => s.id === showDetail.sourceId)?.couleur || '#0f4c3a', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>📋 {showDetail.numero}</h2>
            </div>
            <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
              {(() => {
                const ben = beneficiaires.find(b => b.id === showDetail.beneficiaireId);
                const statut = statutConfig[showDetail.statut] || { label: showDetail.statut };
                const source = sources.find(s => s.id === showDetail.sourceId);
                
                // Dotation figée de l'OP (fallback budget actuel pour anciens OP)
                let dotation = showDetail.dotationLigne;
                if (dotation === undefined || dotation === null) {
                  const currentBudget = budgets
                    .filter(b => b.sourceId === showDetail.sourceId && b.exerciceId === showDetail.exerciceId)
                    .sort((a, b) => (b.version || 1) - (a.version || 1))[0];
                  const ligne = currentBudget?.lignes?.find(l => l.code === showDetail.ligneBudgetaire);
                  dotation = ligne?.dotation || 0;
                }
                
                const opsAnterieurs = ops.filter(o => 
                  o.sourceId === showDetail.sourceId &&
                  o.exerciceId === showDetail.exerciceId &&
                  o.ligneBudgetaire === showDetail.ligneBudgetaire &&
                  o.id !== showDetail.id &&
                  !['REJETE_CF', 'REJETE_AC'].includes(o.statut) &&
                  (o.createdAt || '') < (showDetail.createdAt || '')
                );
                
                const engagementsAnterieurs = opsAnterieurs.reduce((sum, o) => {
                  if (o.type === 'PROVISOIRE' || o.type === 'DIRECT') return sum + (o.montant || 0);
                  if (o.type === 'DEFINITIF') {
                    // Le définitif remplace le provisoire
                    const prov = ops.find(p => p.id === o.opProvisoireId);
                    return sum - (prov?.montant || 0) + (o.montant || 0);
                  }
                  if (o.type === 'ANNULATION') {
                    // L'annulation libère le montant du provisoire lié
                    const prov = ops.find(p => p.id === o.opProvisoireId);
                    return sum - (prov?.montant || 0);
                  }
                  return sum;
                }, 0);
                
                return (
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>SOURCE</label>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ background: source?.couleur || '#666', color: 'white', padding: '4px 12px', borderRadius: 4, fontWeight: 600 }}>
                            {source?.sigle || '?'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>TYPE</label>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ background: `${typeColors[showDetail.type]}20`, color: typeColors[showDetail.type], padding: '4px 12px', borderRadius: 4, fontWeight: 600 }}>
                            {showDetail.type}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>STATUT</label>
                        <div style={{ marginTop: 4 }}>
                          <span style={{ background: statut.bg, color: statut.color, padding: '4px 12px', borderRadius: 4, fontWeight: 600 }}>
                            {statut.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>BÉNÉFICIAIRE</label>
                      <div style={{ marginTop: 4, fontWeight: 600 }}>{showDetail.beneficiaireNom || ben?.nom || 'N/A'}</div>
                      {ben?.ncc && <div style={{ fontSize: 12, color: '#6c757d' }}>NCC: {ben.ncc}</div>}
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>OBJET</label>
                      <div style={{ marginTop: 4 }}>{showDetail.objet}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>LIGNE BUDGÉTAIRE</label>
                        <div style={{ marginTop: 4 }}><code>{showDetail.ligneBudgetaire}</code></div>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>MODE RÈGLEMENT</label>
                        <div style={{ marginTop: 4 }}>{showDetail.modeReglement}</div>
                      </div>
                    </div>
                    
                    {/* Section Budget / Engagements */}
                    <div style={{ background: '#e3f2fd', padding: 16, borderRadius: 8 }}>
                      <label style={{ fontSize: 11, color: '#1565c0', fontWeight: 600, marginBottom: 12, display: 'block' }}>📊 SITUATION BUDGÉTAIRE (Ligne {showDetail.ligneBudgetaire})</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 13 }}>
                        <div>
                          <div style={{ color: '#6c757d', fontSize: 11 }}>Dotation</div>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatMontant(dotation)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#6c757d', fontSize: 11 }}>Engagements antérieurs</div>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#e65100' }}>{formatMontant(engagementsAnterieurs)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#6c757d', fontSize: 11 }}>Disponible avant cet OP</div>
                          <div style={{ fontWeight: 600, fontFamily: 'monospace', color: (dotation - engagementsAnterieurs) >= 0 ? '#2e7d32' : '#c62828' }}>
                            {formatMontant(dotation - engagementsAnterieurs)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Montants de l'OP */}
                    <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>MONTANT</label>
                          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, fontFamily: 'monospace' }}>
                            {formatMontant(showDetail.montant)}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>PAYÉ</label>
                          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#2e7d32' }}>
                            {formatMontant(showDetail.totalPaye || 0)}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>RESTE</label>
                          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: (showDetail.montant - (showDetail.totalPaye || 0)) > 0 ? '#e65100' : '#2e7d32' }}>
                            {formatMontant(showDetail.montant - (showDetail.totalPaye || 0))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dates du circuit */}
                    <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
                      <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, marginBottom: 12, display: 'block' }}>📅 SUIVI DU CIRCUIT</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, fontSize: 12 }}>
                        {/* Colonne CF */}
                        <div style={{ background: '#fff3e0', padding: 12, borderRadius: 6 }}>
                          <div style={{ fontWeight: 600, color: '#e65100', marginBottom: 8 }}>Contrôleur Financier</div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6c757d', fontSize: 10 }}>Transmission</span>
                              <span style={{ fontWeight: 500 }}>{showDetail.dateTransmissionCF || '-'}</span>
                            </div>
                            {showDetail.bordereauCF && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6c757d', fontSize: 10 }}>Bordereau</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{showDetail.bordereauCF}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6c757d', fontSize: 10 }}>Visa</span>
                              <span style={{ fontWeight: 500, color: showDetail.dateVisaCF ? '#2e7d32' : '#adb5bd' }}>{showDetail.dateVisaCF || '-'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Colonne AC */}
                        <div style={{ background: '#f3e5f5', padding: 12, borderRadius: 6 }}>
                          <div style={{ fontWeight: 600, color: '#7b1fa2', marginBottom: 8 }}>Agent Comptable</div>
                          <div style={{ display: 'grid', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6c757d', fontSize: 10 }}>Transmission</span>
                              <span style={{ fontWeight: 500 }}>{showDetail.dateTransmissionAC || '-'}</span>
                            </div>
                            {showDetail.bordereauAC && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6c757d', fontSize: 10 }}>Bordereau</span>
                                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{showDetail.bordereauAC}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6c757d', fontSize: 10 }}>Paiement</span>
                              <span style={{ fontWeight: 500, color: showDetail.datePaiement ? '#00695c' : '#adb5bd' }}>{showDetail.datePaiement || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ligne Archivage */}
                      {(showDetail.dateArchivage || showDetail.boiteArchive) && (
                        <div style={{ marginTop: 12, background: '#eceff1', padding: 12, borderRadius: 6 }}>
                          <div style={{ fontWeight: 600, color: '#546e7a', marginBottom: 8 }}>📦 Archivage</div>
                          <div style={{ display: 'flex', gap: 24 }}>
                            <div>
                              <span style={{ color: '#6c757d', fontSize: 10 }}>Date : </span>
                              <span style={{ fontWeight: 500 }}>{showDetail.dateArchivage || '-'}</span>
                            </div>
                            {showDetail.boiteArchive && (
                              <div>
                                <span style={{ color: '#6c757d', fontSize: 10 }}>Boîte : </span>
                                <span style={{ fontWeight: 600 }}>{showDetail.boiteArchive}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Historique des paiements */}
                    {showDetail.paiements && showDetail.paiements.length > 0 && (
                      <div>
                        <label style={{ fontSize: 11, color: '#6c757d', fontWeight: 600, marginBottom: 8, display: 'block' }}>HISTORIQUE DES PAIEMENTS</label>
                        <table style={{ ...styles.table, fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th style={{ ...styles.th, fontSize: 11 }}>DATE</th>
                              <th style={{ ...styles.th, fontSize: 11 }}>RÉFÉRENCE</th>
                              <th style={{ ...styles.th, fontSize: 11, textAlign: 'right' }}>MONTANT</th>
                            </tr>
                          </thead>
                          <tbody>
                            {showDetail.paiements.map((p, i) => (
                              <tr key={i}>
                                <td style={styles.td}>{p.date}</td>
                                <td style={{ ...styles.td, fontFamily: 'monospace' }}>{p.reference}</td>
                                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(p.montant)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Motif retour */}
                    {(showDetail.statut === 'RETOURNE_CF' || showDetail.statut === 'RETOURNE_AC') && (
                      <div style={{ background: '#e1f5fe', padding: 16, borderRadius: 8 }}>
                        <label style={{ fontSize: 11, color: '#0277bd', fontWeight: 600 }}>↩️ MOTIF DU RETOUR</label>
                        <div style={{ marginTop: 4 }}>{showDetail.motifRetourCF || showDetail.motifRetourAC}</div>
                        <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                          Date: {showDetail.dateRetourCF || showDetail.dateRetourAC}
                        </div>
                      </div>
                    )}

                    {/* Motif différé */}
                    {(showDetail.statut === 'DIFFERE_CF' || showDetail.statut === 'DIFFERE_AC') && (
                      <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8 }}>
                        <label style={{ fontSize: 11, color: '#f9a825', fontWeight: 600 }}>⏸️ MOTIF DU DIFFÉRÉ</label>
                        <div style={{ marginTop: 4 }}>{showDetail.motifDiffereCF || showDetail.motifDiffereAC}</div>
                        <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                          Date: {showDetail.dateDiffereCF || showDetail.dateDiffereAC}
                        </div>
                      </div>
                    )}

                    {/* Motif rejet */}
                    {(showDetail.statut === 'REJETE_CF' || showDetail.statut === 'REJETE_AC') && showDetail.motifRejet && (
                      <div style={{ background: '#ffebee', padding: 16, borderRadius: 8 }}>
                        <label style={{ fontSize: 11, color: '#c62828', fontWeight: 600 }}>❌ MOTIF DU REJET</label>
                        <div style={{ marginTop: 4, color: '#c62828' }}>{showDetail.motifRejet}</div>
                        <div style={{ fontSize: 12, color: '#c62828', marginTop: 4 }}>
                          Date: {showDetail.dateRejet} - Par: {showDetail.rejetePar}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: '#6c757d' }}>
                      En cours le {showDetail.dateCreation || '-'}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  onClick={() => { handleOpenEdit(showDetail); setShowDetail(null); }} 
                  style={{ ...styles.buttonSecondary, background: '#fff8e1', color: '#f57f17' }}
                >
                  ✏️ Modifier
                </button>
                <button 
                  onClick={() => { handleDeleteWithPassword(showDetail); }} 
                  style={{ ...styles.buttonSecondary, background: '#ffebee', color: '#c62828' }}
                >
                  🗑️ Supprimer
                </button>
              </div>
              <button onClick={() => setShowDetail(null)} style={styles.buttonSecondary}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {showPaiementModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#e0f2f1' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#00695c' }}>💰 Enregistrer un paiement</h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>Montant OP</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace' }}>{formatMontant(showPaiementModal.montant)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>Déjà payé</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#2e7d32' }}>{formatMontant(showPaiementModal.totalPaye || 0)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 4 }}>Reste à payer</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', color: '#e65100' }}>{formatMontant(showPaiementModal.montant - (showPaiementModal.totalPaye || 0))}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date du paiement *</label>
                  <input 
                    type="date" 
                    value={actionForm.date} 
                    onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Référence *</label>
                  <input 
                    type="text" 
                    value={actionForm.reference} 
                    onChange={(e) => setActionForm({ ...actionForm, reference: e.target.value })}
                    style={styles.input}
                    placeholder="Ex: CHQ-045892, VIR-TRS-7821"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Montant payé *</label>
                <MontantInput 
                  value={actionForm.montant} 
                  onChange={(val) => setActionForm({ ...actionForm, montant: val })}
                  style={{ ...styles.input, fontFamily: 'monospace', fontSize: 18, textAlign: 'right' }}
                  placeholder="0"
                />
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowPaiementModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' }); }} style={styles.buttonSecondary}>Annuler</button>
              <button onClick={handlePaiement} style={{ ...styles.button, background: '#00695c' }}>
                💰 Enregistrer le paiement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transmission (CF ou AC) */}
      {showTransmissionModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 450 }}>
            <div style={{ 
              padding: 24, 
              borderBottom: '1px solid #e9ecef', 
              background: showTransmissionModal.destination === 'CF' ? '#fff3e0' : '#f3e5f5' 
            }}>
              <h2 style={{ margin: 0, fontSize: 18, color: showTransmissionModal.destination === 'CF' ? '#e65100' : '#7b1fa2' }}>
                📤 Transmettre {showTransmissionModal.destination === 'CF' ? 'au CF' : 'à l\'AC'}
              </h2>
              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showTransmissionModal.op.numero}</div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date de transmission *</label>
                <input 
                  type="date" 
                  value={actionForm.date} 
                  onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  N° Bordereau de transmission {showTransmissionModal.destination}
                </label>
                <input 
                  type="text" 
                  value={actionForm.bordereau} 
                  onChange={(e) => setActionForm({ ...actionForm, bordereau: e.target.value })}
                  style={styles.input}
                  placeholder={`Ex: BT-${showTransmissionModal.destination}-2026-001`}
                />
                <span style={{ fontSize: 11, color: '#6c757d' }}>Optionnel - référence du bordereau de transmission</span>
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowTransmissionModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '', bordereau: '' }); }} style={styles.buttonSecondary}>Annuler</button>
              <button onClick={handleConfirmTransmission} style={{ ...styles.button, background: showTransmissionModal.destination === 'CF' ? '#e65100' : '#7b1fa2' }}>
                📤 Confirmer la transmission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Archivage */}
      {showArchiveModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 450 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#eceff1' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#546e7a' }}>📦 Archiver l'OP</h2>
              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showArchiveModal.numero}</div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date d'archivage *</label>
                <input 
                  type="date" 
                  value={actionForm.date} 
                  onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>N° Boîte / Classeur d'archive</label>
                <input 
                  type="text" 
                  value={actionForm.boiteArchive} 
                  onChange={(e) => setActionForm({ ...actionForm, boiteArchive: e.target.value })}
                  style={styles.input}
                  placeholder="Ex: BOX-2026-001, Classeur IDA-A3..."
                />
                <span style={{ fontSize: 11, color: '#6c757d' }}>Optionnel - pour faciliter la recherche physique</span>
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowArchiveModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', boiteArchive: '' }); }} style={styles.buttonSecondary}>Annuler</button>
              <button onClick={handleConfirmArchive} style={{ ...styles.button, background: '#546e7a' }}>
                📦 Confirmer l'archivage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Changement de statut */}
      {showStatutModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 500 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#e3f2fd' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1565c0' }}>🔄 Changer le statut</h2>
              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showStatutModal.op.numero}</div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Nouveau statut *</label>
                <select
                  value={actionForm.nouveauStatut || ''}
                  onChange={(e) => setActionForm({ ...actionForm, nouveauStatut: e.target.value })}
                  style={styles.input}
                >
                  <option value="">-- Sélectionner --</option>
                  <option value="TRANSMIS_CF">📤 Transmis CF</option>
                  <option value="DIFFERE_CF">⏸️ Différé CF</option>
                  <option value="VISE_CF">✅ Visé CF</option>
                  <option value="REJETE_CF">❌ Rejeté CF</option>
                  <option value="TRANSMIS_AC">📤 Transmis AC</option>
                  <option value="DIFFERE_AC">⏸️ Différé AC</option>
                  <option value="PAYE_PARTIEL">💰 Payé partiel</option>
                  <option value="PAYE">💰 Payé</option>
                  <option value="REJETE_AC">❌ Rejeté AC</option>
                  <option value="ARCHIVE">📦 Archivé</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date *</label>
                <input
                  type="date"
                  value={actionForm.date}
                  onChange={(e) => setActionForm({ ...actionForm, date: e.target.value })}
                  style={styles.input}
                />
              </div>
              {['DIFFERE_CF', 'DIFFERE_AC', 'REJETE_CF', 'REJETE_AC'].includes(actionForm.nouveauStatut) && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Motif *</label>
                  <textarea
                    value={actionForm.motif}
                    onChange={(e) => setActionForm({ ...actionForm, motif: e.target.value })}
                    style={{ ...styles.input, minHeight: 80 }}
                    placeholder="Raison du différé ou rejet..."
                  />
                </div>
              )}
              {['REJETE_CF', 'REJETE_AC'].includes(actionForm.nouveauStatut) && (
                <div style={{ marginTop: 16, padding: 12, background: '#fff3e0', borderRadius: 8, fontSize: 13 }}>
                  ⚠️ Le rejet libérera le budget engagé.
                </div>
              )}
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowStatutModal(null); setActionForm({ motif: '', date: new Date().toISOString().split('T')[0], reference: '', montant: '', nouveauStatut: '' }); }} style={styles.buttonSecondary}>Annuler</button>
              <button onClick={handleChangeStatut} style={{ ...styles.button, background: '#1565c0' }}>
                ✓ Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modification OP */}
      {showEditModal && (() => {
        const editBeneficiaire = beneficiaires.find(b => b.id === editForm.beneficiaireId);
        const editRibs = editBeneficiaire?.ribs || (editBeneficiaire?.rib ? [{ numero: editBeneficiaire.rib, banque: '' }] : []);
        const editBudget = budgets
          .filter(b => b.sourceId === showEditModal.sourceId && b.exerciceId === showEditModal.exerciceId)
          .sort((a, b) => (b.version || 1) - (a.version || 1))[0];
        const editSource = sources.find(s => s.id === showEditModal.sourceId);
        
        // Dotation figée de l'OP (fallback budget actuel pour anciens OP)
        let dotation = showEditModal.dotationLigne;
        const editLigne = editBudget?.lignes?.find(l => l.code === editForm.ligneBudgetaire);
        if (dotation === undefined || dotation === null) {
          dotation = editLigne?.dotation || 0;
        }
        const engagementsAnterieurs = ops
          .filter(o => 
            o.sourceId === showEditModal.sourceId &&
            o.exerciceId === showEditModal.exerciceId &&
            o.ligneBudgetaire === editForm.ligneBudgetaire &&
            o.id !== showEditModal.id &&
            !['REJETE_CF', 'REJETE_AC'].includes(o.statut)
          )
          .reduce((sum, o) => sum + (o.montant || 0), 0);
        const engagementActuel = parseFloat(editForm.montant) || 0;
        const engagementsCumules = engagementsAnterieurs + engagementActuel;
        const disponible = dotation - engagementsCumules;
        
        // Fonction d'impression - Modèle exact PIF2
        const handlePrintOP = () => {
          const exercice = exercices.find(e => e.id === showEditModal.exerciceId);
          const selectedRib = editRibs[editForm.ribIndex || 0] || {};
          const isBailleur = editSource?.sigle?.includes('IDA') || editSource?.sigle?.includes('BAD') || editSource?.sigle?.includes('UE');
          const isTresor = editSource?.sigle?.includes('BN') || editSource?.sigle?.includes('TRESOR') || editSource?.sigle?.includes('ETAT');
          const codeImputationComplet = (editSource?.codeImputation || '') + ' ' + (editForm.ligneBudgetaire || '');
          
          const printContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>OP ${showEditModal.numero}</title>
<style>
  @page { size: A4; margin: 10mm; }
  @media print {
    .toolbar { display: none !important; }
    body { background: #fff !important; padding: 0 !important; }
    .page-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { 
    font-family: 'Century Gothic', 'Trebuchet MS', sans-serif; 
    font-size: 11px; 
    line-height: 1.4;
    background: #e0e0e0;
    padding: 0;
  }
  .toolbar {
    background: #1a1a2e;
    padding: 12px 20px;
    display: flex;
    gap: 12px;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .toolbar button {
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-print { background: #2196F3; color: #fff; }
  .btn-print:hover { background: #1976D2; }
  .btn-pdf { background: #4CAF50; color: #fff; }
  .btn-pdf:hover { background: #388E3C; }
  .toolbar-title { color: #fff; font-size: 14px; margin-left: auto; }
  .page-container {
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    background: #fff;
    padding: 8mm;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }
  .inner-frame {
    border: 2px solid #000;
    height: 100%;
  }
  .header {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .header-logo {
    width: 22%;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-right: 1px solid #000;
  }
  .header-logo img { max-height: 75px; max-width: 100%; }
  .header-center {
    width: 56%;
    padding: 6px;
    text-align: center;
    border-right: 1px solid #000;
  }
  .header-center .republic { font-weight: bold; font-size: 11px; }
  .header-center .sep { font-size: 8px; letter-spacing: 0.5px; color: #333; }
  .header-center .ministry { font-style: italic; font-size: 10px; }
  .header-center .project { font-weight: bold; font-size: 10px; }
  .header-right {
    width: 22%;
    padding: 8px;
    font-size: 10px;
    text-align: right;
  }
  .op-title-section {
    text-align: center;
    padding: 6px 10px;
    border-bottom: 1px solid #000;
  }
  .op-title { font-weight: bold; text-decoration: underline; font-size: 11px; }
  .op-numero { font-size: 10px; margin-top: 2px; }
  .body-content {
    padding: 12px 15px;
    border-bottom: 1px solid #000;
  }
  .exercice-line {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .type-red { color: #c00; font-weight: bold; }
  .field { margin-bottom: 8px; }
  .field-title { text-decoration: underline; font-size: 10px; margin-bottom: 6px; }
  .field-value { font-weight: bold; }
  .field-large {
    margin: 15px 0;
    min-height: 45px;
    line-height: 1.6;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .checkbox-line {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  .checkbox-label { min-width: 230px; }
  .checkbox-options { display: flex; gap: 50px; }
  .check-item { display: flex; align-items: center; gap: 6px; }
  .box { 
    width: 18px; 
    height: 14px; 
    border: 1px solid #000; 
    display: inline-flex; 
    align-items: center; 
    justify-content: center;
    font-size: 10px;
  }
  .budget-section { margin-top: 15px; }
  .budget-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  .budget-row .col-left { width: 33.33%; }
  .budget-row .col-center { width: 33.33%; }
  .budget-row .col-right { width: 33.33%; }
  .value-box {
    border: 1px solid #000;
    padding: 4px 10px;
    text-align: right;
    font-weight: bold;
    white-space: nowrap;
    font-size: 10px;
  }
  .budget-table {
    width: 100%;
    border-collapse: collapse;
  }
  .budget-table td {
    border: 1px solid #000;
    padding: 4px 8px;
    font-size: 10px;
  }
  .budget-table .col-letter { 
    width: 4%;
    text-align: center; 
    font-weight: bold; 
  }
  .budget-table .col-label { width: 29.33%; }
  .budget-table .col-amount { 
    width: 33.33%;
    text-align: right;
    padding-right: 10px;
  }
  .budget-table .col-empty {
    width: 33.33%;
    border: none;
  }
  .signatures-section {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .sig-box {
    width: 33.33%;
    min-height: 160px;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #000;
  }
  .sig-box:last-child { border-right: none; }
  .sig-header {
    text-align: center;
    font-weight: bold;
    font-size: 9px;
    padding: 6px;
    border-bottom: 1px solid #000;
    line-height: 1.3;
  }
  .sig-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 8px;
  }
  .sig-name {
    text-align: right;
    font-weight: bold;
    text-decoration: underline;
    font-size: 9px;
  }
  .abidjan-row {
    display: flex;
    border-bottom: 1px solid #000;
  }
  .abidjan-cell {
    width: 33.33%;
    padding: 4px 10px;
    font-size: 9px;
    border-right: 1px solid #000;
  }
  .abidjan-cell:last-child { border-right: none; }
  .acquit-section { display: flex; }
  .acquit-empty { 
    width: 66.66%;
    border-right: 1px solid #000;
  }
  .acquit-box {
    width: 33.33%;
    min-height: 110px;
    display: flex;
    flex-direction: column;
  }
  .acquit-header {
    text-align: center;
    font-size: 9px;
    padding: 6px;
    border-bottom: 1px solid #000;
  }
  .acquit-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 8px;
  }
  .acquit-date {
    font-size: 9px;
    text-align: left;
  }
  @media print { 
    body { padding: 0; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>
  <button class="btn-pdf" onclick="window.print()">📄 Exporter PDF</button>
  <span class="toolbar-title">Aperçu – OP ${showEditModal.numero}</span>
</div>
<div class="page-container">
<div class="inner-frame">
  <div class="header">
    <div class="header-logo">
      <img src="${LOGO_PIF2}" alt="PIF2" />
    </div>
    <div class="header-center">
      <div class="republic">REPUBLIQUE DE CÔTE D'IVOIRE</div>
      <div class="sep">------------------------</div>
      <div class="ministry">MINISTERE DES EAUX ET FORETS</div>
      <div class="sep">------------------------</div>
      <div class="project">PROJET D'INVESTISSEMENT FORESTIER 2</div>
      <div class="sep">------------------------</div>
    </div>
    <div class="header-right">
      <div style="text-align: center;">
        <img src="${ARMOIRIE}" alt="Armoirie" style="max-height: 50px; max-width: 60px; margin-bottom: 3px;" />
        <div>Union – Discipline – Travail</div>
      </div>
    </div>
  </div>
  
  <div class="op-title-section">
    <div class="op-title">ORDRE DE PAIEMENT</div>
    <div class="op-numero">N°${showEditModal.numero}</div>
  </div>
  
  <div class="body-content">
    <div class="exercice-line">
      <div>EXERCICE&nbsp;&nbsp;&nbsp;&nbsp;<strong>${exercice?.annee || ''}</strong></div>
      <div class="type-red">${editForm.type}</div>
    </div>
    
    <div class="field">
      <div class="field-title">REFERENCE DU BENEFICIAIRE</div>
    </div>
    
    <div class="field">
      BENEFICIAIRE :&nbsp;&nbsp;&nbsp;<span class="field-value">${editBeneficiaire?.nom || ''}</span>
    </div>
    
    <div class="field">
      COMPTE CONTRIBUABLE :&nbsp;&nbsp;&nbsp;<span class="field-value">${editBeneficiaire?.ncc || ''}</span>
    </div>
    
    <div class="checkbox-line">
      <span class="checkbox-label">COMPTE DE DISPONIBILITE A DEBITER :</span>
      <div class="checkbox-options">
        <span class="check-item">BAILLEUR <span class="box">${isBailleur ? 'x' : ''}</span></span>
        <span class="check-item">TRESOR <span class="box">${isTresor ? 'x' : ''}</span></span>
      </div>
    </div>
    
    <div class="checkbox-line">
      <span class="checkbox-label">MODE DE REGLEMENT :</span>
      <div class="checkbox-options">
        <span class="check-item">ESPECE <span class="box">${editForm.modeReglement === 'ESPECES' ? 'x' : ''}</span></span>
        <span class="check-item">CHEQUE <span class="box">${editForm.modeReglement === 'CHEQUE' ? 'x' : ''}</span></span>
        <span class="check-item">VIREMENT <span class="box">${editForm.modeReglement === 'VIREMENT' ? 'x' : ''}</span></span>
      </div>
    </div>
    
    <div class="field">
      REFERENCES BANCAIRES :&nbsp;&nbsp;&nbsp;<span class="field-value">${editForm.modeReglement === 'VIREMENT' ? (selectedRib.banque ? selectedRib.banque + ' - ' : '') + (selectedRib.numero || '') : ''}</span>
    </div>
    
    <div class="field-large">
      OBJET DE LA DEPENSE :&nbsp;&nbsp;&nbsp;<span class="field-value">${editForm.objet || ''}</span>
    </div>
    
    <div class="field-large">
      PIECES JUSTIFICATIVES :&nbsp;&nbsp;&nbsp;<span class="field-value">${editForm.piecesJustificatives || ''}</span>
    </div>
    
    <div class="budget-section">
      <div class="budget-row">
        <div class="col-left">MONTANT TOTAL :</div>
        <div class="col-center">
          <div class="value-box">${formatMontant(Math.abs(engagementActuel))}</div>
        </div>
        <div class="col-right"></div>
      </div>
      
      <div class="budget-row">
        <div class="col-left">IMPUTATION BUDGETAIRE :</div>
        <div class="col-center">
          <div class="value-box">${codeImputationComplet.trim()}</div>
        </div>
        <div class="col-right"></div>
      </div>
      
      <table class="budget-table">
        <tr>
          <td class="col-letter">A</td>
          <td class="col-label">Dotation budgétaire</td>
          <td class="col-amount">${formatMontant(dotation)}</td>
          <td class="col-empty"></td>
        </tr>
        <tr>
          <td class="col-letter">B</td>
          <td class="col-label">Engagements antérieurs</td>
          <td class="col-amount">${formatMontant(engagementsAnterieurs)}</td>
          <td class="col-empty"></td>
        </tr>
        <tr>
          <td class="col-letter">C</td>
          <td class="col-label">Engagement actuel</td>
          <td class="col-amount">${formatMontant(Math.abs(engagementActuel))}</td>
          <td class="col-empty"></td>
        </tr>
        <tr>
          <td class="col-letter">D</td>
          <td class="col-label">Engagements cumulés (B + C)</td>
          <td class="col-amount">${formatMontant(engagementsCumules)}</td>
          <td class="col-empty"></td>
        </tr>
        <tr>
          <td class="col-letter">E</td>
          <td class="col-label">Disponible budgétaire (A - D)</td>
          <td class="col-amount">${formatMontant(disponible)}</td>
          <td class="col-empty"></td>
        </tr>
      </table>
    </div>
  </div>
  
  <div class="signatures-section">
    <div class="sig-box">
      <div class="sig-header">VISA<br/>COORDONNATRICE</div>
      <div class="sig-content">
        <div class="sig-name">ABE-KOFFI Thérèse</div>
      </div>
    </div>
    <div class="sig-box">
      <div class="sig-header">VISA<br/>CONTRÔLEUR FINANCIER</div>
      <div class="sig-content"></div>
    </div>
    <div class="sig-box">
      <div class="sig-header">VISA AGENT<br/>COMPTABLE</div>
      <div class="sig-content"></div>
    </div>
  </div>
  
  <div class="abidjan-row">
    <div class="abidjan-cell">Abidjan, le</div>
    <div class="abidjan-cell">Abidjan, le</div>
    <div class="abidjan-cell">Abidjan, le</div>
  </div>
  
  <div class="acquit-section">
    <div class="acquit-empty"></div>
    <div class="acquit-box">
      <div class="acquit-header">ACQUIT LIBERATOIRE</div>
      <div class="acquit-content">
        <div class="acquit-date">Abidjan, le</div>
      </div>
    </div>
  </div>
</div>
</div>
</body>
</html>`;
          const printWindow = window.open('', '_blank', 'width=900,height=700');
          printWindow.document.write(printContent);
          printWindow.document.close();
        };
        
        return (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 750 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: editSource?.couleur || '#0f4c3a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, color: 'white' }}>✏️ Modifier l'OP</h2>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{showEditModal.numero}</div>
                </div>
                <button 
                  onClick={handlePrintOP}
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
                >
                  🖨️ Imprimer
                </button>
              </div>
            </div>
            <div style={{ padding: 24, maxHeight: '65vh', overflowY: 'auto' }}>
              
              {/* Type d'OP */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8, color: '#6c757d' }}>TYPE D'OP</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { value: 'PROVISOIRE', label: 'Provisoire', color: '#ff9800' },
                    { value: 'DIRECT', label: 'Direct', color: '#2196f3' },
                    { value: 'DEFINITIF', label: 'Définitif', color: '#4caf50' },
                    { value: 'ANNULATION', label: 'Annulation', color: '#f44336' }
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, type: type.value })}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 6,
                        border: 'none',
                        background: editForm.type === type.value ? type.color : '#f0f0f0',
                        color: editForm.type === type.value ? 'white' : '#555',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bénéficiaire */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>BÉNÉFICIAIRE</label>
                  <Autocomplete
                    options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || ''] }))}
                    value={editForm.beneficiaireId ? { value: editForm.beneficiaireId, label: editBeneficiaire?.nom || '' } : null}
                    onChange={(option) => setEditForm({ ...editForm, beneficiaireId: option?.value || '', ribIndex: 0 })}
                    placeholder="🔍 Rechercher un bénéficiaire..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N°CC</label>
                  <input 
                    type="text" 
                    value={editBeneficiaire?.ncc || ''} 
                    readOnly 
                    style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', padding: '10px 12px' }} 
                  />
                </div>
              </div>

              {/* Mode de règlement */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8, color: '#6c757d' }}>MODE DE RÈGLEMENT</label>
                <div style={{ display: 'flex', gap: 24 }}>
                  {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => (
                    <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        checked={editForm.modeReglement === mode}
                        onChange={() => setEditForm({ ...editForm, modeReglement: mode })}
                        style={{ width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: 13 }}>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* RIB si virement */}
              {editForm.modeReglement === 'VIREMENT' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>RIB</label>
                  {!editBeneficiaire ? (
                    <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', color: '#adb5bd', fontStyle: 'italic' }}>
                      Sélectionnez un bénéficiaire
                    </div>
                  ) : editRibs.length === 0 ? (
                    <div style={{ ...styles.input, marginBottom: 0, background: '#fff3e0', color: '#e65100' }}>
                      ⚠️ Aucun RIB enregistré
                    </div>
                  ) : editRibs.length === 1 ? (
                    <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontFamily: 'monospace' }}>
                      {editRibs[0].banque && <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: 4, marginRight: 8, fontSize: 11 }}>{editRibs[0].banque}</span>}
                      {editRibs[0].numero}
                    </div>
                  ) : (
                    <select
                      value={editForm.ribIndex || 0}
                      onChange={(e) => setEditForm({ ...editForm, ribIndex: parseInt(e.target.value) })}
                      style={{ ...styles.input, marginBottom: 0 }}
                    >
                      {editRibs.map((rib, i) => (
                        <option key={i} value={i}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Objet */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>OBJET DE LA DÉPENSE</label>
                <textarea
                  value={editForm.objet || ''}
                  onChange={(e) => setEditForm({ ...editForm, objet: e.target.value })}
                  style={{ ...styles.input, minHeight: 70, marginBottom: 0 }}
                />
              </div>

              {/* Pièces justificatives */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>PIÈCES JUSTIFICATIVES</label>
                <textarea
                  value={editForm.piecesJustificatives || ''}
                  onChange={(e) => setEditForm({ ...editForm, piecesJustificatives: e.target.value })}
                  style={{ ...styles.input, minHeight: 50, marginBottom: 0 }}
                />
              </div>

              {/* Montant et Ligne budgétaire */}
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT (FCFA) 🔐</label>
                  <MontantInput
                    value={editForm.montant || ''}
                    onChange={(val) => setEditForm({ ...editForm, montant: val })}
                    style={{ ...styles.input, fontFamily: 'monospace', textAlign: 'right', marginBottom: 0, fontSize: 16, fontWeight: 600 }}
                  />
                  <span style={{ fontSize: 10, color: '#f57f17' }}>⚠️ Protégé par mot de passe</span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>LIGNE BUDGÉTAIRE</label>
                  <Autocomplete
                    options={(editBudget?.lignes || []).map(l => ({ value: l.code, label: `${l.code} - ${l.libelle}`, searchFields: [l.code, l.libelle] }))}
                    value={editForm.ligneBudgetaire ? { value: editForm.ligneBudgetaire, label: `${editForm.ligneBudgetaire}${editLigne ? ' - ' + editLigne.libelle : ''}` } : null}
                    onChange={(option) => setEditForm({ ...editForm, ligneBudgetaire: option?.value || '' })}
                    placeholder="🔍 Rechercher une ligne..."
                  />
                </div>
              </div>

              {/* Infos budgétaires */}
              {editForm.ligneBudgetaire && (
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Dotation budgétaire</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(dotation)}</span>
                    
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements antérieurs</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(engagementsAnterieurs)}</span>
                    
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Engagement actuel</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 600, color: '#e65100' }}>+{formatMontant(engagementActuel)}</span>
                    
                    <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements cumulés</span>
                    <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(engagementsCumules)}</span>
                    
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Disponible budgétaire</span>
                    <span style={{ 
                      fontSize: 14, 
                      fontFamily: 'monospace', 
                      textAlign: 'right', 
                      fontWeight: 700,
                      color: disponible >= 0 ? '#2e7d32' : '#c62828'
                    }}>
                      {formatMontant(disponible)}
                    </span>
                  </div>
                  {disponible < 0 && editForm.type !== 'ANNULATION' && (
                    <div style={{ marginTop: 12, padding: 8, background: '#ffebee', borderRadius: 4, color: '#c62828', fontSize: 12, fontWeight: 600 }}>
                      ⚠️ Budget insuffisant
                    </div>
                  )}
                </div>
              )}

              {/* Date et TVA */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>DATE DE CRÉATION</label>
                  <input
                    type="date"
                    value={editForm.dateCreation || ''}
                    onChange={(e) => setEditForm({ ...editForm, dateCreation: e.target.value })}
                    style={{ ...styles.input, marginBottom: 0 }}
                  />
                </div>
                {['DIRECT', 'DEFINITIF'].includes(editForm.type) && (
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>TVA RÉCUPÉRABLE</label>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', height: 44 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" checked={editForm.tvaRecuperable === true} onChange={() => setEditForm({ ...editForm, tvaRecuperable: true })} />
                        <span>OUI</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" checked={editForm.tvaRecuperable === false || !editForm.tvaRecuperable} onChange={() => setEditForm({ ...editForm, tvaRecuperable: false })} />
                        <span>NON</span>
                      </label>
                      {editForm.tvaRecuperable && (
                        <MontantInput
                          value={editForm.montantTVA || ''}
                          onChange={(val) => setEditForm({ ...editForm, montantTVA: val })}
                          style={{ ...styles.input, marginBottom: 0, width: 120, fontFamily: 'monospace', textAlign: 'right' }}
                          placeholder="Montant TVA"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
              <button 
                onClick={() => { handleDeleteWithPassword(showEditModal); }} 
                style={{ ...styles.buttonSecondary, background: '#ffebee', color: '#c62828' }}
              >
                🗑️ Supprimer
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setShowEditModal(null); setEditForm({}); }} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleSaveEdit} style={{ ...styles.button, background: editSource?.couleur || '#0f4c3a' }}>
                  ✓ Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal Gestion du Circuit */}
      {showCircuitModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 750 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#e3f2fd' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#1565c0' }}>📋 Gérer le circuit</h2>
              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{showCircuitModal.numero} • {showCircuitModal.objet?.substring(0, 50)}...</div>
            </div>
            <div style={{ padding: 24, maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Statut actuel */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Statut actuel</label>
                <select
                  value={circuitForm.statut || ''}
                  onChange={(e) => setCircuitForm({ ...circuitForm, statut: e.target.value })}
                  style={{ ...styles.input, fontWeight: 600, fontSize: 14 }}
                >
                  <option value="EN_COURS">🔵 En cours</option>
                  <option value="TRANSMIS_CF">📤 Transmis CF</option>
                  <option value="DIFFERE_CF">⏸️ Différé CF</option>
                  <option value="VISE_CF">✅ Visé CF</option>
                  <option value="REJETE_CF">❌ Rejeté CF</option>
                  <option value="TRANSMIS_AC">📤 Transmis AC</option>
                  <option value="DIFFERE_AC">⏸️ Différé AC</option>
                  <option value="PAYE_PARTIEL">💰 Payé partiel</option>
                  <option value="PAYE">💰 Payé</option>
                  <option value="REJETE_AC">❌ Rejeté AC</option>
                  <option value="ARCHIVE">📦 Archivé</option>
                </select>
              </div>

              {/* Section CF - Transmission et Visa */}
              <div style={{ background: '#fff8e1', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#f57f17' }}>📤 CONTRÔLEUR FINANCIER (CF)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date transmission CF</label>
                    <input
                      type="date"
                      value={circuitForm.dateTransmissionCF || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, dateTransmissionCF: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>N° Bordereau transmission CF</label>
                    <input
                      type="text"
                      value={circuitForm.bordereauCF || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, bordereauCF: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      placeholder="BT-CF-2026-001"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date visa CF</label>
                    <input
                      type="date"
                      value={circuitForm.dateVisaCF || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, dateVisaCF: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>N° Visa CF</label>
                    <input
                      type="text"
                      value={circuitForm.numeroVisaCF || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, numeroVisaCF: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      placeholder="VISA-CF-2026-001"
                    />
                  </div>
                </div>
              </div>

              {/* Section Différé CF - Toujours visible pour correction */}
              <div style={{ background: circuitForm.dateDiffereCF || circuitForm.motifDiffereCF ? '#fff3e0' : '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16, border: circuitForm.dateDiffereCF || circuitForm.motifDiffereCF ? '2px solid #ff9800' : '1px dashed #ddd' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: circuitForm.dateDiffereCF || circuitForm.motifDiffereCF ? '#e65100' : '#999' }}>
                  ⏸️ DIFFÉRÉ CF {circuitForm.dateDiffereCF || circuitForm.motifDiffereCF ? '(renseigné)' : '(optionnel)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date différé</label>
                    <input
                      type="date"
                      value={circuitForm.dateDiffereCF || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, dateDiffereCF: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Motif du différé</label>
                    <input
                      type="text"
                      value={circuitForm.motifDiffereCF || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, motifDiffereCF: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      placeholder="Pièces manquantes, erreur de calcul..."
                    />
                  </div>
                </div>
              </div>

              {/* Section AC - Transmission et Paiement */}
              <div style={{ background: '#e8f5e9', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#2e7d32' }}>💰 AGENT COMPTABLE (AC)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date transmission AC</label>
                    <input
                      type="date"
                      value={circuitForm.dateTransmissionAC || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, dateTransmissionAC: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>N° Bordereau transmission AC</label>
                    <input
                      type="text"
                      value={circuitForm.bordereauAC || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, bordereauAC: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      placeholder="BT-AC-2026-001"
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date paiement</label>
                    <input
                      type="date"
                      value={circuitForm.datePaiement || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, datePaiement: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Référence paiement</label>
                    <input
                      type="text"
                      value={circuitForm.referencePaiement || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, referencePaiement: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      placeholder="VIR-2026-001"
                    />
                  </div>
                </div>
              </div>

              {/* Section Différé AC - Toujours visible pour correction */}
              <div style={{ background: circuitForm.dateDiffereAC || circuitForm.motifDiffereAC ? '#fff3e0' : '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16, border: circuitForm.dateDiffereAC || circuitForm.motifDiffereAC ? '2px solid #ff9800' : '1px dashed #ddd' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: circuitForm.dateDiffereAC || circuitForm.motifDiffereAC ? '#e65100' : '#999' }}>
                  ⏸️ DIFFÉRÉ AC {circuitForm.dateDiffereAC || circuitForm.motifDiffereAC ? '(renseigné)' : '(optionnel)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date différé</label>
                    <input
                      type="date"
                      value={circuitForm.dateDiffereAC || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, dateDiffereAC: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Motif du différé</label>
                    <input
                      type="text"
                      value={circuitForm.motifDiffereAC || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, motifDiffereAC: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      placeholder="RIB incorrect, montant erroné..."
                    />
                  </div>
                </div>
              </div>

              {/* Section Rejet - Toujours visible pour correction */}
              <div style={{ background: circuitForm.dateRejet || circuitForm.motifRejet ? '#ffebee' : '#fafafa', padding: 16, borderRadius: 8, marginBottom: 16, border: circuitForm.dateRejet || circuitForm.motifRejet ? '2px solid #f44336' : '1px dashed #ddd' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: circuitForm.dateRejet || circuitForm.motifRejet ? '#c62828' : '#999' }}>
                  ❌ REJET {circuitForm.dateRejet || circuitForm.motifRejet ? '(renseigné)' : '(optionnel)'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date rejet</label>
                    <input
                      type="date"
                      value={circuitForm.dateRejet || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, dateRejet: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Rejeté par</label>
                    <select
                      value={circuitForm.rejetePar || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, rejetePar: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    >
                      <option value="">--</option>
                      <option value="CF">CF</option>
                      <option value="AC">AC</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Motif du rejet</label>
                    <input
                      type="text"
                      value={circuitForm.motifRejet || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, motifRejet: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      placeholder="Dépense non éligible..."
                    />
                  </div>
                </div>
                {(circuitForm.dateRejet || circuitForm.motifRejet) && (
                  <div style={{ marginTop: 12, padding: 10, background: '#fff', borderRadius: 4, fontSize: 12, color: '#c62828' }}>
                    ⚠️ Le rejet libère le budget engagé. Pour annuler le rejet, videz les champs ci-dessus.
                  </div>
                )}
              </div>

              {/* Section Archive */}
              <div style={{ background: '#eceff1', padding: 16, borderRadius: 8 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 12, color: '#546e7a' }}>📦 ARCHIVAGE</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>Date archivage</label>
                    <input
                      type="date"
                      value={circuitForm.dateArchivage || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, dateArchivage: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, color: '#6c757d', marginBottom: 4 }}>N° Boîte / Classeur d'archive</label>
                    <input
                      type="text"
                      value={circuitForm.boiteArchive || ''}
                      onChange={(e) => setCircuitForm({ ...circuitForm, boiteArchive: e.target.value })}
                      style={{ ...styles.input, padding: '6px 8px', fontSize: 12 }}
                      placeholder="BOX-IDA-2026-001"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between' }}>
              <button 
                onClick={() => { setShowPaiementModal(showCircuitModal); setShowCircuitModal(null); setActionForm({ ...actionForm, montant: String(showCircuitModal.montant - (showCircuitModal.totalPaye || 0)) }); }} 
                style={{ ...styles.buttonSecondary, background: '#e0f2f1', color: '#00695c' }}
              >
                💰 Ajouter paiement
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { setShowCircuitModal(null); setCircuitForm({}); }} style={styles.buttonSecondary}>Annuler</button>
                <button onClick={handleSaveCircuit} style={{ ...styles.button, background: '#1565c0' }}>
                  ✓ Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mot de passe */}
      {/* ===== DRAWER APERÇU OP ===== */}
      {drawerOp && (
        <>
          {/* Overlay */}
          <div onClick={() => setDrawerOp(null)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(12,74,94,0.08)', zIndex: 90
          }} />
          {/* Panneau latéral */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
            background: 'white', zIndex: 100,
            boxShadow: '-8px 0 32px rgba(12,74,94,0.12)',
            borderRadius: '20px 0 0 20px',
            display: 'flex', flexDirection: 'column',
            animation: 'slideIn 0.3s ease'
          }}>
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #edf3f3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0c3d4d', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#0891b2" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                Aperçu OP
              </h3>
              <button onClick={() => setDrawerOp(null)} style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: '#f0f5f5', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#5f8a8b'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body - scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
              {/* En-tête OP */}
              {(() => {
                const ben = beneficiaires.find(b => b.id === drawerOp.beneficiaireId);
                const source = sources.find(s => s.id === drawerOp.sourceId);
                const msg = getDrawerMessage(drawerOp);
                const steps = buildCircuitSteps(drawerOp);
                const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';

                return (
                  <>
                    {/* Numéro + Bénéficiaire + Montant */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid #edf3f3' }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0c3d4d', marginBottom: 3 }}>{drawerOp.numero}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0c3d4d' }}>{drawerOp.beneficiaireNom || ben?.nom || 'N/A'}</div>
                        <div style={{ fontSize: 12, color: '#5f8a8b', marginTop: 2 }}>{drawerOp.objet || '-'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0891b2', fontFeatureSettings: "'tnum'" }}>{formatMontant(drawerOp.montant)}</div>
                        <div style={{ fontSize: 11, color: '#5f8a8b' }}>FCFA</div>
                      </div>
                    </div>

                    {/* Mini Frise */}
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#5f8a8b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Circuit de validation</div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 10 }}>
                      {steps.map((step, i) => {
                        const dotStyle = {
                          width: 28, height: 28, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700,
                          border: '2.5px solid',
                          ...(step.state === 'done' ? { background: '#0d9488', borderColor: '#0d9488', color: 'white' } :
                             step.state === 'current' ? { background: '#0891b2', borderColor: '#0891b2', color: 'white', boxShadow: '0 0 0 4px rgba(8,145,178,0.15)' } :
                             step.state === 'deferred' ? { background: '#f59e0b', borderColor: '#f59e0b', color: 'white' } :
                             step.state === 'rejected' ? { background: '#dc2626', borderColor: '#dc2626', color: 'white' } :
                             { background: '#f5fafa', borderColor: '#d1e0e0', color: '#a0bfbf' })
                        };
                        const dotContent = step.state === 'done' ? '✓' :
                                          step.state === 'rejected' ? '✕' :
                                          step.state === 'deferred' ? '⏸' :
                                          step.state === 'current' ? '●' : '○';
                        const connectorColor = step.state === 'done' ? '#0d9488' :
                                              step.state === 'deferred' ? '#f59e0b' :
                                              step.state === 'rejected' ? '#dc2626' : '#e2ecec';

                        return (
                          <React.Fragment key={i}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                              <div style={dotStyle}>{dotContent}</div>
                              <div style={{ fontSize: 8.5, fontWeight: 600, color: ['done', 'current'].includes(step.state) ? '#0c3d4d' : '#5f8a8b', marginTop: 4, textAlign: 'center', maxWidth: 52, lineHeight: '1.2' }}>{step.label}</div>
                              {step.date && <div style={{ fontSize: 8, color: '#0891b2', fontWeight: 500 }}>{formatDate(step.date)}</div>}
                            </div>
                            {i < steps.length - 1 && (
                              <div style={{ flex: 1, height: 2.5, background: steps[i + 1]?.state === 'done' || steps[i + 1]?.state === 'current' ? '#0d9488' : steps[i + 1]?.state === 'deferred' ? '#f59e0b' : steps[i + 1]?.state === 'rejected' ? '#dc2626' : '#e2ecec', minWidth: 10, margin: '13px 2px 0' }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Message d'alerte */}
                    {msg && (
                      <div style={{
                        padding: '11px 14px', borderRadius: 10, fontSize: 12, marginTop: 10,
                        display: 'flex', alignItems: 'flex-start', gap: 9,
                        background: msg.type === 'warning' ? '#fef3cd' : msg.type === 'danger' ? '#fee2e2' : msg.type === 'success' ? '#d5f5f0' : '#e6f6f9',
                        color: msg.type === 'warning' ? '#b45309' : msg.type === 'danger' ? '#dc2626' : msg.type === 'success' ? '#0d9488' : '#0891b2'
                      }}>
                        {msg.type === 'warning' && <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>}
                        {msg.type === 'danger' && <span style={{ fontSize: 14, flexShrink: 0 }}>🚫</span>}
                        {msg.type === 'success' && <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>}
                        {msg.type === 'info' && <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>}
                        <div>
                          {msg.title && <><strong>{msg.title}</strong>{msg.date ? ` — ${msg.date}` : ''}<br/></>}
                          <span style={{ fontSize: 12 }}>{msg.text}</span>
                        </div>
                      </div>
                    )}

                    {/* Séparateur */}
                    <div style={{ height: 1, background: '#edf3f3', margin: '16px 0' }} />

                    {/* Informations compactes */}
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#5f8a8b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Informations</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                      {[
                        { label: 'Type', value: drawerOp.type },
                        { label: 'Source', value: source?.nom || source?.sigle || '-' },
                        { label: 'Ligne budgétaire', value: drawerOp.ligneBudgetaire || '-', mono: true },
                        { label: 'Mode règlement', value: drawerOp.modeReglement || '-' },
                        { label: 'Eng. antérieur', value: formatMontant(drawerOp.engagementAnterieur || 0), mono: true },
                        { label: 'Disponible', value: formatMontant(drawerOp.disponible || 0), mono: true, color: (drawerOp.disponible || 0) >= 0 ? '#0d9488' : '#dc2626' }
                      ].map((item, i) => (
                        <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid #edf3f3' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#5f8a8b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: item.mono ? 600 : 500, color: item.color || '#0c3d4d', marginTop: 2, fontFamily: item.mono ? 'monospace' : 'inherit' }}>{item.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Bouton détail complet */}
                    <button
                      onClick={() => { setConsultOpData(drawerOp); setCurrentPage('consulterOp'); setDrawerOp(null); }}
                      style={{
                        width: '100%', padding: 12, border: 'none', borderRadius: 10,
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'inherit', background: '#0891b2', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        marginTop: 20
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/></svg>
                      Voir détail complet
                    </button>
                  </>
                );
              })()}
            </div>
          </div>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </>
      )}

      {showPasswordModal && (
        <PasswordModal
          isOpen={!!showPasswordModal}
          onClose={() => setShowPasswordModal(null)}
          onConfirm={showPasswordModal.action}
          adminPassword={projet?.adminPassword || ''}
          title={showPasswordModal.title}
          description={showPasswordModal.description}
          warningMessage={showPasswordModal.warningMessage}
          impactDetails={showPasswordModal.impactDetails}
          confirmText={showPasswordModal.confirmText}
          confirmColor={showPasswordModal.confirmColor}
        />
      )}
    </div>
  );
};


export default PageListeOP;
