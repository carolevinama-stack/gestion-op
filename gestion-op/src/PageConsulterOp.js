import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import Autocomplete from '../components/Autocomplete';

const PageConsulterOp = () => {
  const { sources, beneficiaires, budgets, ops, exerciceActif, exercices, projet, consultOpData, setConsultOpData, setCurrentPage } = useAppContext();
  const [selectedOp, setSelectedOp] = useState(null);
  const [activeSource, setActiveSource] = useState(sources[0]?.id || null);

  useEffect(() => {
    if (consultOpData) {
      setSelectedOp(consultOpData);
      if (consultOpData.sourceId) setActiveSource(consultOpData.sourceId);
      setConsultOpData(null);
    }
  }, [consultOpData]);

  const currentSourceObj = sources.find(s => s.id === (selectedOp?.sourceId || activeSource));
  const selectedBeneficiaire = selectedOp ? beneficiaires.find(b => b.id === selectedOp.beneficiaireId) : null;
  
  const getBeneficiaireRibs = (ben) => {
    if (!ben) return [];
    if (ben.ribs && ben.ribs.length > 0) return ben.ribs;
    if (ben.rib) return [{ banque: '', numero: ben.rib }];
    return [];
  };
  const beneficiaireRibs = getBeneficiaireRibs(selectedBeneficiaire);
  const selectedRib = selectedOp?.rib 
    ? (typeof selectedOp.rib === 'object' ? selectedOp.rib : beneficiaireRibs.find(r => r.numero === selectedOp.rib))
    : beneficiaireRibs[0] || null;

  const currentBudget = budgets
    .filter(b => b.sourceId === (selectedOp?.sourceId || activeSource) && b.exerciceId === (selectedOp?.exerciceId || exerciceActif?.id))
    .sort((a, b) => (b.version || 1) - (a.version || 1))[0];
  const selectedLigne = currentBudget?.lignes?.find(l => l.code === selectedOp?.ligneBudgetaire);

  const getDotation = () => selectedLigne?.dotation || 0;
  const getEngagementsAnterieurs = () => {
    if (!selectedOp?.ligneBudgetaire) return 0;
    return ops
      .filter(op => 
        op.sourceId === selectedOp.sourceId && 
        op.exerciceId === selectedOp.exerciceId &&
        op.ligneBudgetaire === selectedOp.ligneBudgetaire &&
        ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
        !['REJETE', 'ANNULE'].includes(op.statut)
      )
      .reduce((sum, op) => sum + (op.montant || 0), 0);
  };

  const opsOptions = ops
    .filter(op => op.exerciceId === exerciceActif?.id)
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map(op => {
      const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
      const src = sources.find(s => s.id === op.sourceId);
      return {
        value: op.id,
        label: `${op.numero} — ${ben?.nom || 'N/A'} — ${formatMontant(op.montant)} F — ${src?.sigle || ''}`,
        searchFields: [op.numero, ben?.nom || '', ben?.ncc || '', String(op.montant), op.objet || '', src?.sigle || '']
      };
    });

  const handleSelectOp = (option) => {
    if (!option) { setSelectedOp(null); return; }
    const op = ops.find(o => o.id === option.value);
    if (op) {
      setSelectedOp(op);
      if (op.sourceId) setActiveSource(op.sourceId);
    }
  };

  const handleDuplicate = () => {
    if (!selectedOp) return;
    setConsultOpData({ ...selectedOp, _duplicate: true });
    setCurrentPage('nouvelOp');
  };

  const statutConfig = {
    CREE: { bg: '#e3f2fd', color: '#1565c0', label: 'Créé', icon: '🔵' },
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
  const statutInfo = statutConfig[selectedOp?.statut] || { bg: '#f5f5f5', color: '#666', label: selectedOp?.statut || '', icon: '⚪' };

  const typeColors = { PROVISOIRE: '#ff9800', DIRECT: '#2196f3', DEFINITIF: '#4caf50', ANNULATION: '#f44336' };

  const handlePrint = () => {
    if (!selectedOp) return;
    const ben = selectedBeneficiaire;
    const src = currentSourceObj;
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
.op-title { font-weight: bold; text-decoration: underline; font-size: 11px; }
.op-numero { font-size: 10px; margin-top: 2px; }
.body-content { padding: 12px 15px; border-bottom: 1px solid #000; }
.exercice-line { display: flex; justify-content: space-between; margin-bottom: 10px; }
.type-red { color: #c00; font-weight: bold; }
.field { margin-bottom: 8px; }
.field-title { text-decoration: underline; font-size: 10px; margin-bottom: 6px; }
.field-value { font-weight: bold; }
.field-large { margin: 15px 0; min-height: 45px; line-height: 1.6; }
.checkbox-line { display: flex; align-items: center; margin-bottom: 8px; }
.checkbox-label { min-width: 230px; }
.checkbox-options { display: flex; gap: 50px; }
.check-item { display: flex; align-items: center; gap: 6px; }
.box { width: 18px; height: 14px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; }
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
  <span class="toolbar-title">OP ${selectedOp.numero} — ${ben?.nom || ''}</span>
</div>
<div class="page-container"><div class="inner-frame">
  <div class="header">
    <div class="header-logo">${projet?.logoGauche ? '<img src="' + projet.logoGauche + '" />' : ''}</div>
    <div class="header-center">
      <div class="republic">REPUBLIQUE DE CÔTE D'IVOIRE</div>
      <div class="sep">Union — Discipline — Travail</div>
      <div class="sep">————————</div>
      ${projet?.ministere ? '<div class="ministry">' + projet.ministere + '</div>' : ''}
      <div class="project">${projet?.nom || ''}</div>
      ${src?.nom ? '<div style="font-size:9px;margin-top:2px">' + src.nom + '</div>' : ''}
    </div>
    <div class="header-right">${projet?.logoDroite ? '<img src="' + projet.logoDroite + '" style="max-height:75px;max-width:100%" />' : ''}</div>
  </div>
  <div class="op-title-section">
    <div class="op-title">${isBailleur ? 'DEMANDE DE PAIEMENT' : 'ORDRE DE PAIEMENT'}</div>
    <div class="op-numero"><strong>${selectedOp.numero}</strong> — ${selectedOp.type}</div>
  </div>
  <div class="body-content">
    <div class="exercice-line">
      <div><strong>Exercice :</strong> ${exercices.find(e => e.id === selectedOp.exerciceId)?.annee || ''}</div>
      <div><strong>Source :</strong> ${src?.sigle || ''}</div>
      <div><strong>Date :</strong> ${selectedOp.dateCreation || ''}</div>
    </div>
    <div class="field"><div class="field-title">Bénéficiaire</div><div class="field-value">${ben?.nom || 'N/A'}</div></div>
    ${ben?.ncc ? '<div class="field"><div class="field-title">N° Compte Contribuable</div><div class="field-value">' + ben.ncc + '</div></div>' : ''}
    <div class="checkbox-line">
      <span class="checkbox-label">Mode de règlement :</span>
      <div class="checkbox-options">
        <div class="check-item"><div class="box">${selectedOp.modeReglement === 'ESPECES' ? '✕' : ''}</div> Espèces</div>
        <div class="check-item"><div class="box">${selectedOp.modeReglement === 'CHEQUE' ? '✕' : ''}</div> Chèque</div>
        <div class="check-item"><div class="box">${selectedOp.modeReglement === 'VIREMENT' ? '✕' : ''}</div> Virement</div>
      </div>
    </div>
    ${selectedOp.modeReglement === 'VIREMENT' && ribDisplay ? '<div class="field"><div class="field-title">Références bancaires (RIB)</div><div class="field-value">' + (banqueDisplay ? banqueDisplay + ' — ' : '') + ribDisplay + '</div></div>' : ''}
    <div class="field"><div class="field-title">Imputation budgétaire</div><div class="field-value">${codeImputationComplet}</div></div>
    <div class="field-large"><div class="field-title">Objet de la dépense</div><div class="field-value">${selectedOp.objet || ''}</div></div>
    ${selectedOp.piecesJustificatives ? '<div class="field"><div class="field-title">Pièces justificatives</div><div>' + selectedOp.piecesJustificatives + '</div></div>' : ''}
    <div style="margin-top:15px">
      <table class="budget-table">
        <tr><td class="col-letter">A</td><td class="col-label">Dotation</td><td class="col-amount">${formatMontant(getDotation())}</td><td class="col-empty"></td></tr>
        <tr><td class="col-letter">B</td><td class="col-label">Engagements cumulés</td><td class="col-amount">${formatMontant(engagementsCumules)}</td><td class="col-empty"></td></tr>
        <tr><td class="col-letter">C</td><td class="col-label">Disponible (A-B)</td><td class="col-amount">${formatMontant(getDotation() - engagementsCumules)}</td><td class="col-empty"></td></tr>
        <tr><td class="col-letter">D</td><td class="col-label"><strong>Montant ordonnancé</strong></td><td class="col-amount"><strong>${formatMontant(selectedOp.montant)}</strong></td><td class="col-empty"></td></tr>
      </table>
    </div>
    ${selectedOp.tvaRecuperable && selectedOp.montantTVA ? '<div style="margin-top:8px;font-size:10px">TVA récupérable : <strong>' + formatMontant(selectedOp.montantTVA) + ' FCFA</strong></div>' : ''}
    ${selectedOp.opProvisoireNumero ? '<div style="margin-top:8px;font-size:10px">Réf. OP Provisoire : <strong>' + selectedOp.opProvisoireNumero + '</strong></div>' : ''}
  </div>
  <div class="signatures-section">
    <div class="sig-box"><div class="sig-header">L'ORDONNATEUR</div><div class="sig-content"><div class="sig-name">${projet?.ordonnateur || ''}</div></div></div>
    <div class="sig-box"><div class="sig-header">LE CONTRÔLEUR FINANCIER</div><div class="sig-content"><div class="sig-name">${projet?.controleurFinancier || ''}</div></div></div>
    <div class="sig-box"><div class="sig-header">L'AGENT COMPTABLE</div><div class="sig-content"><div class="sig-name">${projet?.agentComptable || ''}</div></div></div>
  </div>
  <div class="abidjan-row"><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div><div class="abidjan-cell">Abidjan, le</div></div>
  <div class="acquit-section"><div class="acquit-empty"></div><div class="acquit-box"><div class="acquit-header">ACQUIT LIBERATOIRE</div><div class="acquit-content"><div class="acquit-date">Abidjan, le</div></div></div></div>
</div></div></body></html>`;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <div>
      <div style={{ 
        background: currentSourceObj?.couleur || '#1565c0', 
        color: 'white', 
        padding: '20px 24px', 
        borderRadius: '10px 10px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          🔍 CONSULTER UN OP
        </h1>
        {selectedOp && (
          <span style={{ 
            padding: '6px 14px', 
            background: statutInfo.bg, 
            color: statutInfo.color, 
            borderRadius: 8, 
            fontWeight: 700, 
            fontSize: 13 
          }}>
            {statutInfo.icon} {statutInfo.label}
          </span>
        )}
      </div>

      <div style={{ ...styles.card, borderRadius: '0 0 10px 10px', padding: 0 }}>
        <div style={{ padding: 24 }}>
          
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 8, color: '#6c757d' }}>RECHERCHER UN OP (par N°, bénéficiaire, objet ou montant)</label>
            <Autocomplete
              options={opsOptions}
              value={selectedOp ? opsOptions.find(o => o.value === selectedOp.id) || null : null}
              onChange={handleSelectOp}
              placeholder="🔍 Tapez le N° OP, le nom du bénéficiaire, le montant..."
              noOptionsMessage="Aucun OP trouvé"
              accentColor={currentSourceObj?.couleur || '#1565c0'}
            />
          </div>

          {!selectedOp ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#adb5bd' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>🔍</div>
              <h2 style={{ color: '#6c757d', marginBottom: 8 }}>Sélectionnez un OP à consulter</h2>
              <p>Utilisez le champ de recherche ci-dessus pour trouver un OP par son numéro, bénéficiaire, objet ou montant.</p>
            </div>
          ) : (
            <div style={{ pointerEvents: 'none', opacity: 0.9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 20, pointerEvents: 'auto' }}>
                <div style={{ width: 300 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N° OP</label>
                  <input 
                    type="text" 
                    value={selectedOp.numero || ''} 
                    readOnly 
                    style={{ ...styles.input, marginBottom: 0, background: '#e3f2fd', fontWeight: 700, fontFamily: 'monospace', fontSize: 16, border: '2px solid #1565c0' }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span style={{ 
                    padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                    background: typeColors[selectedOp.type] || '#666', color: '#fff'
                  }}>
                    {selectedOp.type}
                  </span>
                  <span style={{ 
                    padding: '8px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13,
                    background: currentSourceObj?.couleur || '#666', color: '#fff'
                  }}>
                    {currentSourceObj?.sigle || ''}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>BÉNÉFICIAIRE</label>
                  <input type="text" value={selectedBeneficiaire?.nom || 'N/A'} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>N°CC</label>
                  <input type="text" value={selectedBeneficiaire?.ncc || ''} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 10, color: '#6c757d' }}>MODE DE RÈGLEMENT</label>
                <div style={{ display: 'flex', gap: 30 }}>
                  {['ESPECES', 'CHEQUE', 'VIREMENT'].map(mode => (
                    <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="radio" checked={selectedOp.modeReglement === mode} readOnly style={{ width: 18, height: 18 }} />
                      <span style={{ fontSize: 14 }}>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedOp.modeReglement === 'VIREMENT' && selectedRib && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>RÉFÉRENCES BANCAIRES (RIB)</label>
                  <div style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {(typeof selectedRib === 'object' && selectedRib.banque) && (
                      <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '4px 10px', borderRadius: 4, fontWeight: 600, fontSize: 12 }}>
                        {selectedRib.banque}
                      </span>
                    )}
                    <span>{typeof selectedRib === 'object' ? selectedRib.numero : selectedRib}</span>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>OBJET DE LA DÉPENSE</label>
                <textarea value={selectedOp.objet || ''} readOnly style={{ ...styles.input, marginBottom: 0, minHeight: 80, resize: 'none', background: '#f8f9fa' }} />
              </div>

              {selectedOp.piecesJustificatives && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>PIÈCES JUSTIFICATIVES</label>
                  <textarea value={selectedOp.piecesJustificatives || ''} readOnly style={{ ...styles.input, marginBottom: 0, minHeight: 60, resize: 'none', background: '#f8f9fa' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>MONTANT (FCFA)</label>
                  <input type="text" value={formatMontant(selectedOp.montant)} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa', fontFamily: 'monospace', fontSize: 16, textAlign: 'right', fontWeight: 700 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>LIGNE BUDGÉTAIRE</label>
                  <input type="text" value={selectedOp.ligneBudgetaire ? `${selectedOp.ligneBudgetaire}${selectedLigne ? ' - ' + selectedLigne.libelle : ''}` : ''} readOnly style={{ ...styles.input, marginBottom: 0, background: '#f8f9fa' }} />
                </div>
              </div>

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
                  {['DIRECT', 'DEFINITIF'].includes(selectedOp.type) && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>TVA RÉCUPÉRABLE</label>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedOp.tvaRecuperable ? 'OUI' : 'NON'}</span>
                      {selectedOp.tvaRecuperable && selectedOp.montantTVA && (
                        <span style={{ marginLeft: 12, fontFamily: 'monospace' }}>— {formatMontant(selectedOp.montantTVA)} FCFA</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedOp.opProvisoireNumero && (
                <div style={{ marginBottom: 20, padding: 16, background: selectedOp.type === 'ANNULATION' ? '#ffebee' : '#e8f5e9', borderRadius: 8 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#6c757d' }}>
                    OP PROVISOIRE {selectedOp.type === 'ANNULATION' ? 'ANNULÉ' : 'RÉGULARISÉ'}
                  </label>
                  <input type="text" value={selectedOp.opProvisoireNumero} readOnly style={{ ...styles.input, marginBottom: 0, background: '#fff', fontFamily: 'monospace', fontWeight: 600 }} />
                </div>
              )}
            </div>
          )}

          {selectedOp && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '2px solid #1565c0', marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ padding: '10px 16px', background: '#e3f2fd', color: '#1565c0', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                  🔍 {selectedOp.numero}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handlePrint}
                  style={{ ...styles.buttonSecondary, padding: '14px 24px', fontSize: 14 }}
                >
                  🖨️ Imprimer
                </button>
                <button
                  onClick={handleDuplicate}
                  style={{ ...styles.button, padding: '14px 24px', fontSize: 14, background: '#ff9800' }}
                >
                  📋 Dupliquer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageConsulterOp;
