import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { LOGO_PIF2, ARMOIRIE } from '../utils/logos';
import { db } from '../firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';

// ==================== PAGE CONSULTER OP ====================
const PageConsulterOp = () => {
  const { sources, beneficiaires, budgets, ops, setOps, exerciceActif, projet, consultOpData, setConsultOpData, setCurrentPage } = useAppContext();
  const [activeSource, setActiveSource] = useState(sources[0]?.id || null);
  const [selectedOp, setSelectedOp] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Form state pour le mode édition
  const [form, setForm] = useState({
    type: 'PROVISOIRE', beneficiaireId: '', ribIndex: 0, modeReglement: 'VIREMENT',
    objet: '', piecesJustificatives: '', montant: '', ligneBudgetaire: '',
    montantTVA: '', tvaRecuperable: false, opProvisoireNumero: '', opProvisoireId: ''
  });

  // Si on vient de ListeOP ou d'ailleurs avec consultOpData
  useEffect(() => {
    if (consultOpData && !consultOpData._duplicate) {
      loadOp(consultOpData);
      if (setConsultOpData) setConsultOpData(null);
    }
  }, [consultOpData]);

  // Fermer dropdown au clic extérieur
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // OPs de la source active, triés par numéro
  const opsSource = ops
    .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id)
    .sort((a, b) => (a.numero || '').localeCompare(b.numero || ''));

  // OPs filtrés par la recherche
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

  // Index de l'OP sélectionné dans la liste source
  const currentIndex = selectedOp ? opsSource.findIndex(op => op.id === selectedOp.id) : -1;

  // Navigation
  const goToPrev = () => {
    if (currentIndex > 0) loadOp(opsSource[currentIndex - 1]);
    else if (opsSource.length > 0) loadOp(opsSource[opsSource.length - 1]); // boucler
  };
  const goToNext = () => {
    if (currentIndex < opsSource.length - 1) loadOp(opsSource[currentIndex + 1]);
    else if (opsSource.length > 0) loadOp(opsSource[0]); // boucler
  };

  // Charger un OP
  const loadOp = (op) => {
    if (!op) return;
    setSelectedOp(op);
    setIsEditMode(false);
    setSearchText(op.numero || '');
    setShowDropdown(false);
    if (op.sourceId) setActiveSource(op.sourceId);
    // Remplir le form
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    const ribs = ben?.ribs || (ben?.rib ? [{ numero: ben.rib, banque: '' }] : []);
    const ribIndex = ribs.findIndex(r => r.numero === (typeof op.rib === 'object' ? op.rib?.numero : op.rib)) || 0;
    setForm({
      type: op.type || 'PROVISOIRE',
      beneficiaireId: op.beneficiaireId || '',
      ribIndex: ribIndex >= 0 ? ribIndex : 0,
      modeReglement: op.modeReglement || 'VIREMENT',
      objet: op.objet || '',
      piecesJustificatives: op.piecesJustificatives || '',
      montant: String(op.montant || ''),
      ligneBudgetaire: op.ligneBudgetaire || '',
      montantTVA: String(op.montantTVA || ''),
      tvaRecuperable: op.tvaRecuperable || false,
      opProvisoireNumero: op.opProvisoireNumero || '',
      opProvisoireId: op.opProvisoireId || ''
    });
  };

  // Helpers
  const currentSourceObj = sources.find(s => s.id === activeSource);
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
  const getEngagementsAnterieurs = () => {
    if (!form.ligneBudgetaire) return 0;
    return ops
      .filter(op => op.sourceId === activeSource && op.exerciceId === exerciceActif?.id && op.ligneBudgetaire === form.ligneBudgetaire && ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) && !['REJETE', 'REJETE_CF', 'REJETE_AC', 'ANNULE'].includes(op.statut))
      .reduce((sum, op) => sum + (op.montant || 0), 0);
  };

  const opProvisoiresDisponibles = ops.filter(op => 
    op.sourceId === activeSource && op.exerciceId === exerciceActif?.id && op.type === 'PROVISOIRE' && !['REJETE', 'REJETE_CF', 'REJETE_AC', 'ANNULE'].includes(op.statut) &&
    !ops.find(o => o.opProvisoireId === op.id && ['DEFINITIF', 'ANNULATION'].includes(o.type))
  );

  // Statut config
  const statutConfig = {
    EN_COURS: { bg: '#e3f2fd', color: '#1565c0', label: 'En cours', icon: '🔵' },
    TRANSMIS_CF: { bg: '#fff3e0', color: '#e65100', label: 'Transmis CF', icon: '📤' },
    DIFFERE_CF: { bg: '#fff8e1', color: '#f9a825', label: 'Différé CF', icon: '⏸️' },
    RETOURNE_CF: { bg: '#e1f5fe', color: '#0277bd', label: 'Retourné CF', icon: '↩️' },
    VISE_CF: { bg: '#e8f5e9', color: '#2e7d32', label: 'Visé CF', icon: '✅' },
    REJETE_CF: { bg: '#ffebee', color: '#c62828', label: 'Rejeté CF', icon: '❌' },
    TRANSMIS_AC: { bg: '#f3e5f5', color: '#7b1fa2', label: 'Transmis AC', icon: '📤' },
    PAYE: { bg: '#e0f2f1', color: '#00695c', label: 'Payé', icon: '💰' },
    REJETE_AC: { bg: '#ffebee', color: '#c62828', label: 'Rejeté AC', icon: '❌' },
    ARCHIVE: { bg: '#eceff1', color: '#546e7a', label: 'Archivé', icon: '📦' }
  };
  const statutInfo = selectedOp ? (statutConfig[selectedOp.statut] || { bg: '#f5f5f5', color: '#666', label: selectedOp.statut || '', icon: '⚪' }) : null;
  const typeColors = { PROVISOIRE: '#ff9800', DIRECT: '#2196f3', DEFINITIF: '#4caf50', ANNULATION: '#f44336' };

  // === ACTIONS ===
  const handleModifier = () => {
    const pwd = window.prompt('🔒 Mot de passe requis pour modifier :');
    if (pwd === (projet?.motDePasseAdmin || 'admin123')) {
      setIsEditMode(true);
    } else if (pwd !== null) {
      alert('❌ Mot de passe incorrect');
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
        const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id);
        if (opsSuivants.length > 0) {
          const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
          const diff = newMontant - selectedOp.montant;
          if (!window.confirm(`⚠️ Modification de montant (${diff > 0 ? '+' : ''}${formatMontant(diff)} F) impactera :\n${numeros}\n\nContinuer ?`)) return;
        }
      }

      const updates = {
        type: form.type, beneficiaireId: form.beneficiaireId, modeReglement: form.modeReglement,
        rib: form.modeReglement === 'VIREMENT' ? (ribSel?.numero || '') : '',
        banque: form.modeReglement === 'VIREMENT' ? (ribSel?.banque || '') : '',
        objet: form.objet, piecesJustificatives: form.piecesJustificatives,
        montant: newMontant, ligneBudgetaire: form.ligneBudgetaire,
        tvaRecuperable: form.tvaRecuperable || false,
        montantTVA: form.tvaRecuperable ? (parseFloat(form.montantTVA) || 0) : 0,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'ops', selectedOp.id), updates);
      const updatedOp = { ...selectedOp, ...updates };
      setOps(ops.map(o => o.id === selectedOp.id ? updatedOp : o));
      setSelectedOp(updatedOp);
      setIsEditMode(false);
      alert(`✅ OP ${selectedOp.numero} modifié avec succès !`);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  const handleSupprimer = async () => {
    if (!selectedOp) return;
    const pwd = window.prompt('🔒 Mot de passe requis pour supprimer :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    const opsSuivants = ops.filter(o => o.sourceId === selectedOp.sourceId && o.exerciceId === selectedOp.exerciceId && o.ligneBudgetaire === selectedOp.ligneBudgetaire && (o.createdAt || '') > (selectedOp.createdAt || '') && o.id !== selectedOp.id);
    let confirmMsg = `Supprimer l'OP ${selectedOp.numero} ?`;
    if (opsSuivants.length > 0) {
      const numeros = opsSuivants.slice(0, 5).map(o => o.numero).join(', ');
      confirmMsg = `⚠️ Impact sur les OP suivants :\n${numeros}\n\nContinuer ?`;
    }
    if (window.confirm(confirmMsg)) {
      try {
        await deleteDoc(doc(db, 'ops', selectedOp.id));
        setOps(ops.filter(o => o.id !== selectedOp.id));
        alert(`✅ OP ${selectedOp.numero} supprimé.`);
        setSelectedOp(null);
        setSearchText('');
      } catch (error) {
        alert('Erreur : ' + error.message);
      }
    }
  };

  const handleDupliquer = () => {
    if (!selectedOp) return;
    setConsultOpData({ ...selectedOp, _duplicate: true });
    setCurrentPage('nouvelOp');
  };

  // === IMPRESSION ===
  const handlePrint = () => {
    if (!selectedOp) return;
    const ben = selectedBeneficiaire;
    const src = currentSourceObj;
    const engagementActuel = selectedOp.montant || 0;
    const engagementsCumules = getEngagementsAnterieurs();
    const isBailleur = src?.sigle?.includes('IDA') || src?.sigle?.includes('BAD') || src?.sigle?.includes('UE');
    const isTresor = src?.sigle?.includes('BN') || src?.sigle?.includes('TRESOR') || src?.sigle?.includes('ETAT');
    const codeImputationComplet = (src?.codeImputation || '') + ' ' + (selectedOp.ligneBudgetaire || '');
    const ribDisplay = selectedRib ? (typeof selectedRib === 'object' ? selectedRib.numero : selectedRib) : '';
    const banqueDisplay = selectedRib && typeof selectedRib === 'object' ? selectedRib.banque : '';

    const printContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>OP ${selectedOp.numero}</title>
<style>
@page { size: A4; margin: 10mm; }
@media print { .toolbar { display: none !important; } body { background: #fff !important; padding: 0 !important; } .page-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; } }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Century Gothic', 'Trebuchet MS', sans-serif; font-size: 11px; line-height: 1.4; background: #e0e0e0; }
.toolbar { background: #1a1a2e; padding: 12px 20px; display: flex; gap: 12px; align-items: center; position: sticky; top: 0; z-index: 100; }
.toolbar button { padding: 8px 20px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-print { background: #2196F3; color: #fff; }
.btn-pdf { background: #4CAF50; color: #fff; }
.toolbar-title { color: #fff; font-size: 14px; margin-left: auto; }
.page-container { width: 210mm; min-height: 297mm; margin: 20px auto; background: #fff; padding: 8mm; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
.inner-frame { border: 2px solid #000; }
.header { display: flex; border-bottom: 1px solid #000; }
.header-logo { width: 22%; padding: 8px; display: flex; align-items: center; justify-content: center; border-right: 1px solid #000; }
.header-logo img { max-height: 75px; max-width: 100%; }
.header-center { width: 56%; padding: 6px; text-align: center; border-right: 1px solid #000; }
.header-center .republic { font-weight: bold; font-size: 11px; }
.header-center .sep { font-size: 8px; letter-spacing: 0.5px; color: #333; }
.header-center .ministry { font-style: italic; font-size: 10px; }
.header-center .project { font-weight: bold; font-size: 10px; }
.header-right { width: 22%; padding: 8px; font-size: 10px; text-align: right; }
.op-title-section { text-align: center; padding: 6px 10px; border-bottom: 1px solid #000; }
.exercice-type-line { display: flex; justify-content: space-between; align-items: center; }
.exercice-type-line > div:first-child { width: 25%; text-align: left; font-size: 11px; }
.exercice-type-line > div:nth-child(2) { width: 50%; text-align: center; }
.exercice-type-line > div:last-child { width: 25%; text-align: right; }
.op-title { font-weight: bold; text-decoration: underline; font-size: 11px; }
.op-numero { font-size: 10px; margin-top: 2px; }
.body-content { padding: 12px 15px; border-bottom: 1px solid #000; }
.type-red { color: #c00; font-weight: bold; font-style: italic; }
.field { margin-bottom: 8px; }
.field-title { text-decoration: underline; font-size: 10px; margin-bottom: 6px; }
.field-value { font-weight: bold; }
.field-large { margin: 15px 0; min-height: 45px; line-height: 1.6; word-wrap: break-word; }
.checkbox-line { display: flex; align-items: center; margin-bottom: 8px; }
.checkbox-label { min-width: 230px; }
.checkbox-options { display: flex; gap: 50px; }
.check-item { display: flex; align-items: center; gap: 6px; }
.box { width: 18px; height: 14px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; }
.budget-section { margin-top: 15px; }
.budget-row { display: flex; align-items: center; margin-bottom: 8px; }
.budget-row .col-left { width: 33.33%; }
.budget-row .col-center { width: 33.33%; }
.budget-row .col-right { width: 33.33%; }
.value-box { border: 1px solid #000; padding: 4px 10px; text-align: right; font-weight: bold; white-space: nowrap; font-size: 10px; }
.budget-table { width: 100%; border-collapse: collapse; }
.budget-table td { border: 1px solid #000; padding: 4px 8px; font-size: 10px; }
.budget-table .col-letter { width: 4%; text-align: center; font-weight: bold; }
.budget-table .col-label { width: 29.33%; }
.budget-table .col-amount { width: 33.33%; text-align: right; padding-right: 10px; }
.budget-table .col-empty { width: 33.33%; border: none; }
.signatures-section { display: flex; border-bottom: 1px solid #000; }
.sig-box { width: 33.33%; min-height: 160px; display: flex; flex-direction: column; border-right: 1px solid #000; }
.sig-box:last-child { border-right: none; }
.sig-header { text-align: center; font-weight: bold; font-size: 9px; padding: 6px; border-bottom: 1px solid #000; line-height: 1.3; }
.sig-content { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: 8px; }
.sig-name { text-align: right; font-weight: bold; text-decoration: underline; font-size: 9px; }
.abidjan-row { display: flex; border-bottom: 1px solid #000; }
.abidjan-cell { width: 33.33%; padding: 4px 10px; font-size: 9px; border-right: 1px solid #000; }
.abidjan-cell:last-child { border-right: none; }
.acquit-section { display: flex; }
.acquit-empty { width: 66.66%; border-right: 1px solid #000; }
.acquit-box { width: 33.33%; min-height: 110px; display: flex; flex-direction: column; }
.acquit-header { text-align: center; font-size: 9px; padding: 6px; border-bottom: 1px solid #000; }
.acquit-content { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; padding: 8px; }
.acquit-date { font-size: 9px; text-align: left; }
</style></head><body>
<div class="toolbar">
  <button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>
  <button class="btn-pdf" onclick="window.print()">📄 Exporter PDF</button>
  <span class="toolbar-title">Aperçu – OP ${selectedOp.numero}</span>
</div>
<div class="page-container"><div class="inner-frame">
  <div class="header">
    <div class="header-logo"><img src="${LOGO_PIF2}" alt="PIF2" /></div>
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
    <div class="exercice-type-line">
      <div>EXERCICE&nbsp;&nbsp;<strong>${exerciceActif?.annee || ''}</strong></div>
      <div>
        <div class="op-title">ORDRE DE PAIEMENT</div>
        <div class="op-numero">N°${selectedOp.numero}</div>
      </div>
      <div class="type-red">${selectedOp.type}</div>
    </div>
  </div>
  <div class="body-content">
    <div class="field"><div class="field-title">REFERENCE DU BENEFICIAIRE</div></div>
    <div class="field">BENEFICIAIRE :&nbsp;&nbsp;&nbsp;<span class="field-value">${ben?.nom || ''}</span></div>
    <div class="field">COMPTE CONTRIBUABLE :&nbsp;&nbsp;&nbsp;<span class="field-value">${ben?.ncc || ''}</span></div>
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
        <span class="check-item">ESPECE <span class="box">${selectedOp.modeReglement === 'ESPECES' ? 'x' : ''}</span></span>
        <span class="check-item">CHEQUE <span class="box">${selectedOp.modeReglement === 'CHEQUE' ? 'x' : ''}</span></span>
        <span class="check-item">VIREMENT <span class="box">${selectedOp.modeReglement === 'VIREMENT' ? 'x' : ''}</span></span>
      </div>
    </div>
    <div class="field">REFERENCES BANCAIRES :&nbsp;&nbsp;&nbsp;<span class="field-value">${selectedOp.modeReglement === 'VIREMENT' ? (banqueDisplay ? banqueDisplay + ' - ' : '') + ribDisplay : ''}</span></div>
    <div class="field-large">OBJET DE LA DEPENSE :&nbsp;&nbsp;&nbsp;<span class="field-value">${selectedOp.objet || ''}</span></div>
    <div class="field-large">PIECES JUSTIFICATIVES :&nbsp;&nbsp;&nbsp;<span class="field-value">${selectedOp.piecesJustificatives || ''}</span></div>
    <div class="budget-section">
      <div class="budget-row"><div class="col-left">MONTANT TOTAL :</div><div class="col-center"><div class="value-box">${formatMontant(Math.abs(engagementActuel))}</div></div><div class="col-right"></div></div>
      <div class="budget-row"><div class="col-left">IMPUTATION BUDGETAIRE :</div><div class="col-center"><div class="value-box">${codeImputationComplet.trim()}</div></div><div class="col-right"></div></div>
      <table class="budget-table">
        <tr><td class="col-letter">A</td><td class="col-label">Dotation budgétaire</td><td class="col-amount">${formatMontant(getDotation())}</td><td class="col-empty"></td></tr>
        <tr><td class="col-letter">B</td><td class="col-label">Engagements antérieurs</td><td class="col-amount">${formatMontant(engagementsCumules)}</td><td class="col-empty"></td></tr>
        <tr><td class="col-letter">C</td><td class="col-label">Engagement actuel</td><td class="col-amount">${formatMontant(Math.abs(engagementActuel))}</td><td class="col-empty"></td></tr>
        <tr><td class="col-letter">D</td><td class="col-label">Engagements cumulés (B + C)</td><td class="col-amount">${formatMontant(engagementsCumules + engagementActuel)}</td><td class="col-empty"></td></tr>
        <tr><td class="col-letter">E</td><td class="col-label">Disponible budgétaire (A - D)</td><td class="col-amount">${formatMontant(getDotation() - engagementsCumules - engagementActuel)}</td><td class="col-empty"></td></tr>
      </table>
    </div>
  </div>
  <div class="signatures-section">
    <div class="sig-box"><div class="sig-header">VISA<br/>COORDONNATRICE</div><div class="sig-content"><div class="sig-name">ABE-KOFFI Thérèse</div></div></div>
    <div class="sig-box"><div class="sig-header">VISA<br/>CONTRÔLEUR FINANCIER</div><div class="sig-content"></div></div>
    <div class="sig-box"><div class="sig-header">VISA AGENT<br/>COMPTABLE</div><div class="sig-content"></div></div>
  </div>
  <div class="abidjan-row"><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div></div>
  <div class="acquit-section"><div class="acquit-empty"></div><div class="acquit-box"><div class="acquit-header">ACQUIT LIBERATOIRE</div><div class="acquit-content"><div class="acquit-date">Abidjan, le</div></div></div></div>
</div></div></body></html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // === RENDU ===
  const isReadOnly = selectedOp && !isEditMode;

  return (
    <div>
      {/* En-tête avec onglets sources */}
      <div style={{ background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', padding: '20px 24px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>CONSULTER OP {currentSourceObj?.sigle || ''}</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          {sources.map(source => (
            <button key={source.id} onClick={() => { setActiveSource(source.id); setSelectedOp(null); setSearchText(''); setIsEditMode(false); }}
              style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: activeSource === source.id ? 'white' : 'rgba(255,255,255,0.2)', color: activeSource === source.id ? (source.couleur || '#0f4c3a') : 'white', fontWeight: 600, cursor: 'pointer' }}>
              {source.sigle || source.nom}
            </button>
          ))}
        </div>
      </div>

      {!exerciceActif ? (
        <div style={{ ...styles.card, borderRadius: '0 0 10px 10px', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 50, marginBottom: 16 }}>⚠️</div>
          <p style={{ color: '#e65100', fontWeight: 600 }}>Aucun exercice actif</p>
        </div>
      ) : (
        <div style={{ ...styles.card, borderRadius: '0 0 10px 10px', padding: 0 }}>
          <div style={{ padding: 24 }}>

            {/* === BARRE DE RECHERCHE N° OP avec flèches === */}
            <div style={{ display: 'flex', alignItems: 'end', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: '0 0 400px', position: 'relative' }} ref={dropdownRef}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>
                  🔍 RECHERCHER UN OP
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  {/* Flèche gauche */}
                  <button onClick={goToPrev} title="OP précédent"
                    style={{ padding: '12px 10px', border: '2px solid #e9ecef', borderRight: 'none', borderRadius: '8px 0 0 8px', background: '#f8f9fa', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#0f4c3a' }}>
                    ◀
                  </button>
                  {/* Input recherche */}
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => { setSearchText(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Tapez N° OP, bénéficiaire, montant..."
                    style={{ ...styles.input, marginBottom: 0, borderRadius: 0, fontWeight: 700, fontFamily: 'monospace', fontSize: 15, borderLeft: 'none', borderRight: 'none' }}
                  />
                  {/* Flèche droite */}
                  <button onClick={goToNext} title="OP suivant"
                    style={{ padding: '12px 10px', border: '2px solid #e9ecef', borderLeft: 'none', borderRadius: '0 8px 8px 0', background: '#f8f9fa', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#0f4c3a' }}>
                    ▶
                  </button>
                </div>

                {/* Dropdown résultats */}
                {showDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '2px solid #e9ecef', borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 350, overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {opsFiltered.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Aucun OP trouvé</div>
                    ) : (
                      opsFiltered.map(op => {
                        const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                        const src = sources.find(s => s.id === op.sourceId);
                        const isSelected = selectedOp?.id === op.id;
                        return (
                          <div key={op.id} onClick={() => loadOp(op)}
                            style={{ padding: '10px 14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isSelected ? '#e3f2fd' : 'white', transition: 'background 0.15s' }}
                            onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = '#f5f5f5'; }}
                            onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'white'; }}>
                            <div>
                              <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{op.numero}</div>
                              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{ben?.nom || 'N/A'} — {(op.objet || '').substring(0, 50)}{(op.objet || '').length > 50 ? '...' : ''}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0f4c3a', fontSize: 12 }}>{formatMontant(op.montant)} F</div>
                              <div style={{ display: 'flex', gap: 4, marginTop: 3, justifyContent: 'flex-end' }}>
                                <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 600, background: typeColors[op.type] || '#999', color: '#fff' }}>{op.type}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Info compteur */}
              <div style={{ fontSize: 12, color: '#6c757d', paddingBottom: 6 }}>
                {selectedOp ? `${currentIndex + 1} / ${opsSource.length}` : `${opsSource.length} OP`}
              </div>

              {/* Statut */}
              {selectedOp && statutInfo && (
                <div style={{ padding: '10px 16px', background: statutInfo.bg, color: statutInfo.color, borderRadius: 8, fontWeight: 700, fontSize: 13, marginLeft: 'auto' }}>
                  {statutInfo.icon} {statutInfo.label}
                </div>
              )}
            </div>

            {/* === FORMULAIRE (lecture seule ou édition) === */}
            {selectedOp ? (
              <>
                <div style={isReadOnly ? { pointerEvents: 'none', opacity: 0.85 } : {}}>

                  {/* Type d'OP */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>TYPE D'OP</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[
                        { value: 'PROVISOIRE', label: 'Provisoire', color: '#ff9800' },
                        { value: 'DIRECT', label: 'Direct', color: '#2196f3' },
                        { value: 'DEFINITIF', label: 'Définitif', color: '#4caf50' },
                        { value: 'ANNULATION', label: 'Annulation', color: '#f44336' }
                      ].map(type => (
                        <button key={type.value} type="button"
                          onClick={() => setForm({ ...form, type: type.value })}
                          style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: form.type === type.value ? type.color : '#f0f0f0', color: form.type === type.value ? 'white' : '#555', fontWeight: 600, fontSize: 13, cursor: isReadOnly ? 'default' : 'pointer' }}>
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bénéficiaire + NCC */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>BÉNÉFICIAIRE</label>
                      {isEditMode ? (
                        <Autocomplete
                          options={beneficiaires.map(b => ({ value: b.id, label: b.nom, searchFields: [b.nom, b.ncc || ''] }))}
                          value={form.beneficiaireId ? { value: form.beneficiaireId, label: beneficiaires.find(b => b.id === form.beneficiaireId)?.nom || '' } : null}
                          onChange={(option) => setForm({ ...form, beneficiaireId: option?.value || '', ribIndex: 0 })}
                          placeholder="🔍 Rechercher..."
                          accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                        />
                      ) : (
                        <input type="text" value={selectedBeneficiaire?.nom || 'N/A'} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontWeight: 600 }} />
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N°CC</label>
                      <input type="text" value={selectedBeneficiaire?.ncc || ''} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} />
                    </div>
                  </div>

                  {/* Mode de règlement */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>MODE DE RÈGLEMENT</label>
                    <div style={{ display: 'flex', gap: 30 }}>
                      {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => (
                        <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="radio" checked={form.modeReglement === mode} onChange={() => isEditMode && setForm({ ...form, modeReglement: mode })} readOnly={!isEditMode} style={{ width: 18, height: 18 }} />
                          <span style={{ fontSize: 14 }}>{mode}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* RIB */}
                  {form.modeReglement === 'VIREMENT' && selectedRib && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>RÉFÉRENCES BANCAIRES (RIB)</label>
                      {isEditMode && beneficiaireRibs.length > 1 ? (
                        <select value={form.ribIndex} onChange={(e) => setForm({ ...form, ribIndex: parseInt(e.target.value) })} style={{ ...styles.input, marginBottom: 0 }}>
                          {beneficiaireRibs.map((rib, i) => <option key={i} value={i}>{rib.banque ? `${rib.banque} - ` : ''}{rib.numero}</option>)}
                        </select>
                      ) : (
                        <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {(typeof selectedRib === 'object' && selectedRib.banque) && (
                            <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>{selectedRib.banque}</span>
                          )}
                          <span>{typeof selectedRib === 'object' ? selectedRib.numero : selectedRib}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Objet */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>OBJET DE LA DÉPENSE</label>
                    <textarea value={form.objet} onChange={(e) => isEditMode && setForm({ ...form, objet: e.target.value })} readOnly={!isEditMode}
                      style={{ ...styles.input, marginBottom: 0, minHeight: 80, resize: isEditMode ? 'vertical' : 'none', background: isEditMode ? '#fff0f0' : '#f8f9fa' }} />
                  </div>

                  {/* Pièces justificatives */}
                  {(form.piecesJustificatives || isEditMode) && (
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>PIÈCES JUSTIFICATIVES</label>
                      <textarea value={form.piecesJustificatives} onChange={(e) => isEditMode && setForm({ ...form, piecesJustificatives: e.target.value })} readOnly={!isEditMode}
                        style={{ ...styles.input, marginBottom: 0, minHeight: 60, resize: isEditMode ? 'vertical' : 'none', background: isEditMode ? '#fff0f0' : '#f8f9fa' }} />
                    </div>
                  )}

                  {/* Montant + Ligne budgétaire */}
                  <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20, marginBottom: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT (FCFA)</label>
                      {isEditMode ? (
                        <MontantInput value={form.montant} onChange={(val) => setForm({ ...form, montant: val })} style={{ ...styles.input, marginBottom: 0, background: '#fff0f0', fontFamily: 'monospace', fontSize: 16, textAlign: 'right' }} placeholder="0" />
                      ) : (
                        <input type="text" value={formatMontant(selectedOp.montant)} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontFamily: 'monospace', fontSize: 16, textAlign: 'right', fontWeight: 700 }} />
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>LIGNE BUDGÉTAIRE</label>
                      {isEditMode ? (
                        <Autocomplete
                          options={(currentBudget?.lignes || []).map(l => ({ value: l.code, label: `${l.code} - ${l.libelle}`, searchFields: [l.code, l.libelle] }))}
                          value={form.ligneBudgetaire ? (currentBudget?.lignes || []).filter(x => x.code === form.ligneBudgetaire).map(l => ({ value: l.code, label: `${l.code} - ${l.libelle}` }))[0] || null : null}
                          onChange={(option) => setForm({ ...form, ligneBudgetaire: option?.value || '' })}
                          placeholder="🔍 Rechercher..."
                          accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                        />
                      ) : (
                        <input type="text" value={selectedOp.ligneBudgetaire ? `${selectedOp.ligneBudgetaire}${selectedLigne ? ' - ' + selectedLigne.libelle : ''}` : ''} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} />
                      )}
                    </div>
                  </div>

                  {/* Budget + Date + TVA */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#6c757d' }}>Dotation budgétaire</span>
                        <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getDotation())}</span>
                        <span style={{ fontSize: 12, color: '#6c757d' }}>Engagements cumulés</span>
                        <span style={{ fontSize: 13, fontFamily: 'monospace', textAlign: 'right', fontWeight: 500 }}>{formatMontant(getEngagementsAnterieurs())}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>Disponible budgétaire</span>
                        <span style={{ fontSize: 14, fontFamily: 'monospace', textAlign: 'right', fontWeight: 700, color: (getDotation() - getEngagementsAnterieurs()) >= 0 ? '#2e7d32' : '#c62828' }}>
                          {formatMontant(getDotation() - getEngagementsAnterieurs())}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>DATE DE CRÉATION</label>
                        <input type="text" value={selectedOp.dateCreation || ''} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} />
                      </div>
                      {['DIRECT', 'DEFINITIF'].includes(form.type) && (
                        <>
                          {isEditMode ? (
                            <>
                              <div style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8, color: '#6c757d' }}>TVA RÉCUPÉRABLE</label>
                                <div style={{ display: 'flex', gap: 20 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={form.tvaRecuperable === true} onChange={() => setForm({ ...form, tvaRecuperable: true })} /><span>OUI</span></label>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="radio" checked={form.tvaRecuperable === false} onChange={() => setForm({ ...form, tvaRecuperable: false })} /><span>NON</span></label>
                                </div>
                              </div>
                              {form.tvaRecuperable && (
                                <div>
                                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT TVA</label>
                                  <MontantInput value={form.montantTVA} onChange={(val) => setForm({ ...form, montantTVA: val })} style={{ ...styles.input, marginBottom: 0, fontFamily: 'monospace', textAlign: 'right' }} placeholder="0" />
                                </div>
                              )}
                            </>
                          ) : (
                            <div>
                              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>TVA RÉCUPÉRABLE</label>
                              <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedOp.tvaRecuperable ? 'OUI' : 'NON'}</span>
                              {selectedOp.tvaRecuperable && selectedOp.montantTVA && (
                                <span style={{ marginLeft: 12, fontFamily: 'monospace' }}>— {formatMontant(selectedOp.montantTVA)} FCFA</span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* OP Provisoire référencé */}
                  {selectedOp.opProvisoireNumero && (
                    <div style={{ marginBottom: 20, padding: 16, background: selectedOp.type === 'ANNULATION' ? '#ffebee' : '#e8f5e9', borderRadius: 8 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>
                        OP PROVISOIRE {selectedOp.type === 'ANNULATION' ? 'ANNULÉ' : 'RÉGULARISÉ'}
                      </label>
                      <input type="text" value={selectedOp.opProvisoireNumero} readOnly style={{ ...styles.input, marginBottom: 0, background: '#fff', fontFamily: 'monospace', fontWeight: 600 }} />
                    </div>
                  )}

                  {/* Motif de rejet si rejeté */}
                  {selectedOp.motifRejet && (
                    <div style={{ marginBottom: 20, padding: 16, background: '#ffebee', borderRadius: 8 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#c62828' }}>MOTIF DU REJET</label>
                      <div style={{ fontSize: 14, color: '#c62828', fontWeight: 500 }}>{selectedOp.motifRejet}</div>
                    </div>
                  )}

                </div>{/* Fin wrapper lecture seule */}

                {/* === BOUTONS D'ACTION === */}
                {isEditMode ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '2px solid #f57f17' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ padding: '10px 16px', background: '#fff3e0', color: '#e65100', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                        ✏️ Modification — {selectedOp.numero}
                      </span>
                      <button onClick={() => { setIsEditMode(false); loadOp(selectedOp); }} style={{ ...styles.buttonSecondary, padding: '10px 16px', fontSize: 12 }}>Annuler</button>
                    </div>
                    <button onClick={handleEnregistrerModif} style={{ ...styles.button, padding: '14px 40px', fontSize: 16, background: '#f57f17' }}>
                      💾 ENREGISTRER LES MODIFICATIONS
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '2px solid ' + (currentSourceObj?.couleur || '#1565c0') }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ padding: '10px 16px', background: '#e3f2fd', color: '#1565c0', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                        🔍 {selectedOp.numero}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleModifier} style={{ ...styles.button, padding: '12px 18px', fontSize: 13, background: '#f57f17' }}>✏️ Modifier</button>
                      <button onClick={handleSupprimer} style={{ ...styles.button, padding: '12px 18px', fontSize: 13, background: '#424242' }}>🗑️ Supprimer</button>
                      <button onClick={handleDupliquer} style={{ ...styles.button, padding: '12px 18px', fontSize: 13, background: '#ff9800' }}>📋 Dupliquer</button>
                      <button onClick={handlePrint} style={{ ...styles.button, padding: '12px 18px', fontSize: 13, background: currentSourceObj?.couleur || '#0f4c3a' }}>🖨️ Imprimer</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: '#adb5bd' }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
                <p style={{ fontSize: 16, fontWeight: 500 }}>Sélectionnez un OP pour le consulter</p>
                <p style={{ fontSize: 13 }}>Utilisez la barre de recherche ci-dessus ou les flèches pour naviguer</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageConsulterOp;
