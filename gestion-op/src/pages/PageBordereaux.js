import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { ARMOIRIE } from '../utils/logos';

const PageBordereaux = () => {
  const { projet, sources, exercices, beneficiaires, ops, bordereaux } = useAppContext();
  const [activeTab, setActiveTab] = useState('NOUVEAU_CF');
  const [selectedOps, setSelectedOps] = useState([]);
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [dateBordereau, setDateBordereau] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchBT, setSearchBT] = useState('');

  // États pour retour CF
  const [dateRetourCF, setDateRetourCF] = useState(new Date().toISOString().split('T')[0]);
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');
  const [dateResultat, setDateResultat] = useState(new Date().toISOString().split('T')[0]);

  // États pour paiement AC
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);

  // États pour archivage
  const [boiteArchivage, setBoiteArchivage] = useState('');

  const exerciceActifLocal = exercices.find(e => e.actif);
  const currentSrc = sources.find(s => s.id === activeSourceBT);

  // ============================================================
  // FILTRES OP PAR STATUT
  // ============================================================

  // Onglet 1 : OP éligibles pour BT au CF (statut CREE + DIFFERE pour re-soumission)
  const opsEligiblesCF = ops.filter(op =>
    (op.statut === 'CREE' || op.statut === 'DIFFERE') &&
    op.sourceId === activeSourceBT &&
    op.exerciceId === exerciceActifLocal?.id
  );

  // Onglet 2 : OP transmis au CF (en attente retour)
  const opsTransmisCF = ops.filter(op =>
    op.statut === 'TRANSMIS_CF' &&
    op.sourceId === activeSourceBT &&
    op.exerciceId === exerciceActifLocal?.id
  );

  // Onglet 3 : OP visés par le CF, éligibles pour BT à l'AC
  const opsEligiblesAC = ops.filter(op =>
    op.statut === 'VISE_CF' &&
    op.sourceId === activeSourceBT &&
    op.exerciceId === exerciceActifLocal?.id
  );

  // Onglet 4 : OP transmis à l'AC (en attente paiement)
  const opsTransmisAC = ops.filter(op =>
    op.statut === 'TRANSMIS_AC' &&
    op.sourceId === activeSourceBT &&
    op.exerciceId === exerciceActifLocal?.id
  );

  // Onglet 5 : OP payés, à archiver
  const opsAArchiver = ops.filter(op =>
    op.statut === 'PAYE' &&
    op.sourceId === activeSourceBT &&
    op.exerciceId === exerciceActifLocal?.id
  );

  // Sélecteur d'OP selon onglet actif
  const getOpsForTab = () => {
    switch (activeTab) {
      case 'NOUVEAU_CF': return opsEligiblesCF;
      case 'TRANSMIS_CF': return opsTransmisCF;
      case 'NOUVEAU_AC': return opsEligiblesAC;
      case 'TRANSMIS_AC': return opsTransmisAC;
      case 'ARCHIVER': return opsAArchiver;
      default: return [];
    }
  };

  const currentOps = getOpsForTab();

  // Filtrer par recherche
  const opsFiltered = currentOps.filter(op => {
    if (!searchBT) return true;
    const term = searchBT.toLowerCase();
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    return (op.numero || '').toLowerCase().includes(term) ||
      (ben?.nom || '').toLowerCase().includes(term) ||
      (op.objet || '').toLowerCase().includes(term);
  });

  // Toggle sélection
  const toggleOp = (opId) => {
    setSelectedOps(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  };

  const toggleAll = () => {
    if (selectedOps.length === opsFiltered.length) {
      setSelectedOps([]);
    } else {
      setSelectedOps(opsFiltered.map(op => op.id));
    }
  };

  // Total des OP sélectionnés
  const totalSelected = selectedOps.reduce((sum, id) => {
    const op = ops.find(o => o.id === id);
    return sum + (op?.montant || 0);
  }, 0);

  // ============================================================
  // GÉNÉRATION NUMÉRO BORDEREAU
  // ============================================================
  const genererNumeroBT = (typeBT) => {
    const prefix = typeBT === 'CF' ? 'BT-CF' : 'BT-AC';
    const sigleProjet = projet?.sigle || 'PROJET';
    const sigleSrc = currentSrc?.sigle || 'SRC';
    const annee = exerciceActifLocal?.annee || new Date().getFullYear();
    const existants = bordereaux.filter(bt =>
      bt.type === typeBT &&
      bt.sourceId === activeSourceBT &&
      bt.exerciceId === exerciceActifLocal?.id
    );
    const nextNum = existants.length + 1;
    return `${prefix}-${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSrc}/${annee}`;
  };

  // ============================================================
  // ACTION 1 : CRÉER BORDEREAU CF
  // ============================================================
  const handleCreateBordereauCF = async () => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }
    const numero = genererNumeroBT('CF');

    if (!window.confirm(`Créer le bordereau ${numero} avec ${selectedOps.length} OP pour un total de ${formatMontant(totalSelected)} F ?\n\nLes OP seront transmis au CF.`)) return;

    setSaving(true);
    try {
      const btData = {
        numero,
        type: 'CF',
        sourceId: activeSourceBT,
        exerciceId: exerciceActifLocal.id,
        dateCreation: dateBordereau,
        dateTransmission: dateBordereau,
        opsIds: selectedOps,
        nbOps: selectedOps.length,
        totalMontant: totalSelected,
        statut: 'ENVOYE',
        observations: observations.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bordereaux'), btData);

      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: 'TRANSMIS_CF',
          dateTransmissionCF: dateBordereau,
          bordereauCF: numero,
          updatedAt: new Date().toISOString()
        });
      }

      alert(`✅ Bordereau ${numero} créé avec succès !\n${selectedOps.length} OP transmis au CF.`);
      setSelectedOps([]);
      setObservations('');
      setActiveTab('TRANSMIS_CF');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ============================================================
  // ACTION 2 : RETOUR DU CF (Visé / Différé / Rejeté)
  // ============================================================
  const handleRetourCF = async () => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }

    const labelResultat = resultatCF === 'VISE' ? 'Visé' : resultatCF === 'DIFFERE' ? 'Différé' : 'Rejeté';
    const msg = `Marquer ${selectedOps.length} OP comme "${labelResultat}" ?\n\nDate retour CF : ${dateRetourCF}${motifRetour ? '\nMotif : ' + motifRetour : ''}`;
    
    if (!window.confirm(msg)) return;

    setSaving(true);
    try {
      let newStatut;
      let updateData = {
        dateRetourCF,
        resultatCF,
        updatedAt: new Date().toISOString()
      };

      if (resultatCF === 'VISE') {
        newStatut = 'VISE_CF';
        updateData.dateVisaCF = dateResultat;
      } else if (resultatCF === 'DIFFERE') {
        newStatut = 'DIFFERE';
        updateData.dateDiffere = dateResultat;
        updateData.motifDiffere = motifRetour.trim();
      } else {
        newStatut = 'REJETE';
        updateData.dateRejet = dateResultat;
        updateData.motifRejet = motifRetour.trim();
      }

      updateData.statut = newStatut;

      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), updateData);
      }

      alert(`✅ ${selectedOps.length} OP marqués comme "${labelResultat}".`);
      setSelectedOps([]);
      setMotifRetour('');
      if (resultatCF === 'VISE') setActiveTab('NOUVEAU_AC');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ============================================================
  // ACTION 3 : CRÉER BORDEREAU AC
  // ============================================================
  const handleCreateBordereauAC = async () => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }
    const numero = genererNumeroBT('AC');

    if (!window.confirm(`Créer le bordereau ${numero} avec ${selectedOps.length} OP pour un total de ${formatMontant(totalSelected)} F ?\n\nLes OP seront transmis à l'AC.`)) return;

    setSaving(true);
    try {
      const btData = {
        numero,
        type: 'AC',
        sourceId: activeSourceBT,
        exerciceId: exerciceActifLocal.id,
        dateCreation: dateBordereau,
        dateTransmission: dateBordereau,
        opsIds: selectedOps,
        nbOps: selectedOps.length,
        totalMontant: totalSelected,
        statut: 'ENVOYE',
        observations: observations.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bordereaux'), btData);

      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: 'TRANSMIS_AC',
          dateTransmissionAC: dateBordereau,
          bordereauAC: numero,
          updatedAt: new Date().toISOString()
        });
      }

      alert(`✅ Bordereau ${numero} créé avec succès !\n${selectedOps.length} OP transmis à l'AC.`);
      setSelectedOps([]);
      setObservations('');
      setActiveTab('TRANSMIS_AC');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ============================================================
  // ACTION 4 : MARQUER PAYÉ
  // ============================================================
  const handleMarquerPaye = async () => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }

    if (!window.confirm(`Marquer ${selectedOps.length} OP comme payés ?\n\nDate de paiement : ${datePaiement}`)) return;

    setSaving(true);
    try {
      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: 'PAYE',
          datePaiement,
          updatedAt: new Date().toISOString()
        });
      }
      alert(`✅ ${selectedOps.length} OP marqués comme payés.`);
      setSelectedOps([]);
      setActiveTab('ARCHIVER');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ============================================================
  // ACTION 5 : ARCHIVER
  // ============================================================
  const handleArchiver = async () => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }
    if (!boiteArchivage.trim()) { alert('Veuillez renseigner le numéro de boîte d\'archivage.'); return; }

    if (!window.confirm(`Archiver ${selectedOps.length} OP dans la boîte "${boiteArchivage}" ?`)) return;

    setSaving(true);
    try {
      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: 'ARCHIVE',
          boiteArchivage: boiteArchivage.trim(),
          dateArchivage: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString()
        });
      }
      alert(`✅ ${selectedOps.length} OP archivés dans la boîte "${boiteArchivage}".`);
      setSelectedOps([]);
      setBoiteArchivage('');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ============================================================
  // MODIFICATION / SUPPRESSION BORDEREAU
  // ============================================================
  const handleDeleteBordereau = async (bt) => {
    if (bt.statut !== 'ENVOYE') {
      alert('❌ Impossible de supprimer un bordereau déjà traité.');
      return;
    }
    const pwd = window.prompt('🔒 Mot de passe requis pour supprimer :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    if (!window.confirm(`Supprimer le bordereau ${bt.numero} ?\n\nLes ${bt.nbOps} OP reviendront au statut précédent.`)) return;

    try {
      const previousStatut = bt.type === 'CF' ? 'CREE' : 'VISE_CF';
      const dateField = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      const btField = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';

      for (const opId of bt.opsIds) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: previousStatut,
          [dateField]: null,
          [btField]: null,
          updatedAt: new Date().toISOString()
        });
      }
      await deleteDoc(doc(db, 'bordereaux', bt.id));
      alert(`✅ Bordereau ${bt.numero} supprimé. Les OP sont revenus au statut ${previousStatut}.`);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  const handleModifyBordereauDate = async (bt) => {
    if (bt.statut !== 'ENVOYE') {
      alert('❌ Impossible de modifier un bordereau déjà traité.');
      return;
    }
    const pwd = window.prompt('🔒 Mot de passe requis pour modifier :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    const newDate = window.prompt('Nouvelle date de transmission (AAAA-MM-JJ) :', bt.dateCreation);
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      if (newDate !== null) alert('Format de date invalide. Utilisez AAAA-MM-JJ.');
      return;
    }
    try {
      const dateField = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      await updateDoc(doc(db, 'bordereaux', bt.id), {
        dateCreation: newDate,
        dateTransmission: newDate,
        updatedAt: new Date().toISOString()
      });
      for (const opId of bt.opsIds) {
        await updateDoc(doc(db, 'ops', opId), {
          [dateField]: newDate,
          updatedAt: new Date().toISOString()
        });
      }
      alert(`✅ Date du bordereau modifiée au ${newDate}.`);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  // ============================================================
  // ANNULER RETOUR CF (remettre en TRANSMIS_CF)
  // ============================================================
  const handleAnnulerRetourCF = async () => {
    if (selectedOps.length === 0) { alert('Sélectionnez au moins un OP.'); return; }
    const pwd = window.prompt('🔒 Mot de passe requis :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    if (!window.confirm(`Remettre ${selectedOps.length} OP en "Transmis au CF" ?\nCette action annule le visa/différé/rejet.`)) return;

    setSaving(true);
    try {
      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: 'TRANSMIS_CF',
          resultatCF: null,
          dateRetourCF: null,
          dateVisaCF: null,
          dateDiffere: null,
          motifDiffere: null,
          dateRejet: null,
          motifRejet: null,
          updatedAt: new Date().toISOString()
        });
      }
      alert(`✅ ${selectedOps.length} OP remis en "Transmis au CF".`);
      setSelectedOps([]);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ============================================================
  // ANNULER PAIEMENT (remettre en TRANSMIS_AC)
  // ============================================================
  const handleAnnulerPaiement = async () => {
    if (selectedOps.length === 0) { alert('Sélectionnez au moins un OP.'); return; }
    const pwd = window.prompt('🔒 Mot de passe requis :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    if (!window.confirm(`Annuler le paiement de ${selectedOps.length} OP et les remettre en "Transmis à l'AC" ?`)) return;

    setSaving(true);
    try {
      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: 'TRANSMIS_AC',
          datePaiement: null,
          updatedAt: new Date().toISOString()
        });
      }
      alert(`✅ ${selectedOps.length} OP remis en "Transmis à l'AC".`);
      setSelectedOps([]);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ============================================================
  // IMPRESSION BORDEREAU
  // ============================================================
  const handlePrintBordereau = (bt) => {
    const src = sources.find(s => s.id === bt.sourceId);
    const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const printContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${bt.numero}</title>
<style>
@page { size: A4; margin: 10mm; }
@media print { .toolbar { display: none !important; } body { background: #fff !important; padding: 0 !important; } .page-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; } }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Century Gothic', 'Trebuchet MS', sans-serif; font-size: 11px; background: #e0e0e0; }
.toolbar { background: #1a1a2e; padding: 12px 20px; display: flex; gap: 12px; align-items: center; position: sticky; top: 0; z-index: 100; }
.toolbar button { padding: 8px 20px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-print { background: #2196F3; color: white; }
.btn-pdf { background: #4CAF50; color: white; }
.toolbar-title { color: rgba(255,255,255,0.7); margin-left: auto; font-size: 12px; }
.page-container { width: 210mm; min-height: 297mm; margin: 20px auto; background: white; padding: 12mm; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid #1a1a2e; }
.header-left { display: flex; align-items: center; gap: 10px; }
.header-left img { width: 55px; height: auto; }
.header-left .info { font-size: 9px; line-height: 1.4; }
.header-right { text-align: right; font-size: 9px; }
.bt-title { text-align: center; margin: 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase; text-decoration: underline; }
.bt-numero { text-align: center; font-size: 13px; font-weight: bold; margin-bottom: 5px; }
.bt-date { text-align: center; font-size: 11px; margin-bottom: 15px; }
.bt-dest { margin-bottom: 15px; font-size: 11px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
th { background: #1a1a2e; color: white; padding: 6px 8px; font-size: 9px; text-align: left; }
td { padding: 5px 8px; font-size: 10px; border-bottom: 1px solid #ddd; }
tr:nth-child(even) { background: #f8f8f8; }
.total-row { font-weight: bold; background: #e8f5e9 !important; font-size: 11px; }
.footer { margin-top: 30px; display: flex; justify-content: space-between; }
.footer .sign-block { width: 45%; text-align: center; }
.footer .sign-block .title { font-weight: bold; font-size: 10px; margin-bottom: 5px; }
.footer .sign-block .line { border-bottom: 1px dotted #333; height: 60px; }
.accuse { margin-top: 30px; padding: 10px; border: 1px dashed #999; font-size: 10px; }
.accuse .title { font-weight: bold; margin-bottom: 8px; }
</style></head><body>
<div class="toolbar">
<button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>
<button class="btn-pdf" onclick="window.print()">📄 Exporter PDF</button>
<span class="toolbar-title">Aperçu – ${bt.numero}</span>
</div>
<div class="page-container">
<div class="header">
  <div class="header-left">
    <img src="${ARMOIRIE}" alt="Armoirie" />
    <div class="info">
      <div style="font-weight:bold">RÉPUBLIQUE DE CÔTE D'IVOIRE</div>
      <div>Union - Discipline - Travail</div>
      <div style="margin-top:4px;font-weight:bold">${projet?.ministere || ''}</div>
      <div style="font-weight:bold">${projet?.nomProjet || ''}</div>
    </div>
  </div>
  <div class="header-right">
    <div style="font-weight:bold;font-size:11px">${src?.nom || ''}</div>
    <div>${src?.sigle || ''}</div>
  </div>
</div>

<div class="bt-title">Bordereau de Transmission ${bt.type === 'CF' ? 'au Contrôleur Financier' : "à l'Agent Comptable"}</div>
<div class="bt-numero">${bt.numero}</div>
<div class="bt-date">Date : ${bt.dateCreation}</div>

<div class="bt-dest">
  <strong>De :</strong> ${projet?.titreCoordonnateur || 'Le Coordonnateur'} - ${projet?.nomProjet || ''}<br/>
  <strong>À :</strong> ${bt.type === 'CF' ? 'Monsieur le Contrôleur Financier' : "Monsieur l'Agent Comptable"}
  ${bt.observations ? '<br/><strong>Objet :</strong> ' + bt.observations : ''}
</div>

<table>
  <thead>
    <tr>
      <th style="width:35px">N°</th>
      <th style="width:130px">N° OP</th>
      <th>BÉNÉFICIAIRE</th>
      <th>OBJET</th>
      <th style="width:65px">LIGNE</th>
      <th style="width:100px;text-align:right">MONTANT (FCFA)</th>
      <th style="width:50px;text-align:center">PJ</th>
    </tr>
  </thead>
  <tbody>
    ${btOps.map((op, i) => {
      const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
      return `<tr>
        <td>${i + 1}</td>
        <td style="font-family:monospace;font-weight:bold;font-size:9px">${op.numero}</td>
        <td>${ben?.nom || 'N/A'}</td>
        <td>${op.objet || '-'}</td>
        <td style="font-family:monospace">${op.ligneBudgetaire || '-'}</td>
        <td style="text-align:right;font-family:monospace;font-weight:bold">${Number(op.montant || 0).toLocaleString('fr-FR')}</td>
        <td style="text-align:center">${op.piecesJustificatives ? '✓' : '-'}</td>
      </tr>`;
    }).join('')}
    <tr class="total-row">
      <td colspan="5" style="text-align:right">TOTAL (${btOps.length} OP)</td>
      <td style="text-align:right;font-family:monospace">${Number(bt.totalMontant || 0).toLocaleString('fr-FR')}</td>
      <td></td>
    </tr>
  </tbody>
</table>

<p style="font-size:10px;margin-bottom:20px">Arrêté le présent bordereau à la somme de <strong>${Number(bt.totalMontant || 0).toLocaleString('fr-FR')} FCFA</strong> pour <strong>${btOps.length}</strong> ordre(s) de paiement.</p>

<div class="footer">
  <div class="sign-block">
    <div class="title">${projet?.titreCoordonnateur || 'Le Coordonnateur'}</div>
    <div class="line"></div>
    <div style="font-size:9px;margin-top:4px">${projet?.coordonnateur || ''}</div>
  </div>
  <div class="sign-block">
    <div class="title">${bt.type === 'CF' ? 'Le Contrôleur Financier' : "L'Agent Comptable"}</div>
    <div class="line"></div>
  </div>
</div>

<div class="accuse">
  <div class="title">📎 Accusé de réception</div>
  <div>Reçu le : ____/____/________ à ____h____</div>
  <div style="margin-top:5px">Nombre de dossiers reçus : ________</div>
  <div style="margin-top:5px">Nom et signature : _______________________________</div>
</div>
</div>
</body></html>`;
    const pw = window.open('', '_blank', 'width=900,height=700');
    pw.document.write(printContent);
    pw.document.close();
  };

  // ============================================================
  // BORDEREAUX POUR HISTORIQUE
  // ============================================================
  const bordereauCF = bordereaux.filter(bt => bt.type === 'CF' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);
  const bordereauAC = bordereaux.filter(bt => bt.type === 'AC' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);
  const allBT = [...bordereauCF, ...bordereauAC].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  // ============================================================
  // CONFIGURATION DES ONGLETS
  // ============================================================
  const tabs = [
    { key: 'NOUVEAU_CF', label: '➕ Nouveau BT au CF', color: '#1565c0', count: opsEligiblesCF.length },
    { key: 'TRANSMIS_CF', label: '📤 OP Transmis au CF', color: '#e65100', count: opsTransmisCF.length },
    { key: 'NOUVEAU_AC', label: '➕ Nouveau BT à l\'AC', color: '#2e7d32', count: opsEligiblesAC.length },
    { key: 'TRANSMIS_AC', label: '💰 OP Transmis à l\'AC', color: '#6a1b9a', count: opsTransmisAC.length },
    { key: 'ARCHIVER', label: '📦 À Archiver', color: '#795548', count: opsAArchiver.length },
    { key: 'HISTORIQUE', label: '📋 Historique BT', color: '#455a64', count: allBT.length },
  ];

  // ============================================================
  // COMPOSANT TABLE OP RÉUTILISABLE
  // ============================================================
  const renderOPTable = (showCheckbox = true, extraColumns = []) => (
    <>
      <input type="text" placeholder="🔍 Rechercher un OP..." value={searchBT} onChange={e => setSearchBT(e.target.value)}
        style={{ ...styles.input, marginBottom: 12 }} />

      {opsFiltered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <p>Aucun OP dans cette catégorie pour cette source</p>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {showCheckbox && (
                <th style={{ ...styles.th, width: 40 }}>
                  <input type="checkbox" checked={selectedOps.length === opsFiltered.length && opsFiltered.length > 0} onChange={toggleAll} />
                </th>
              )}
              <th style={{ ...styles.th, width: 140 }}>N° OP</th>
              <th style={styles.th}>BÉNÉFICIAIRE</th>
              <th style={styles.th}>OBJET</th>
              <th style={{ ...styles.th, width: 70 }}>LIGNE</th>
              <th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th>
              {extraColumns.map(col => (
                <th key={col.key} style={{ ...styles.th, width: col.width || 100, textAlign: col.align || 'left' }}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opsFiltered.map(op => {
              const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
              const checked = selectedOps.includes(op.id);
              return (
                <tr key={op.id} onClick={() => showCheckbox && toggleOp(op.id)} 
                  style={{ cursor: showCheckbox ? 'pointer' : 'default', background: checked ? '#e3f2fd' : 'transparent' }}>
                  {showCheckbox && (
                    <td style={styles.td}><input type="checkbox" checked={checked} onChange={() => toggleOp(op.id)} /></td>
                  )}
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 12 }}>{ben?.nom || 'N/A'}</td>
                  <td style={{ ...styles.td, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire || '-'}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                  {extraColumns.map(col => (
                    <td key={col.key} style={{ ...styles.td, fontSize: 11, textAlign: col.align || 'left', ...col.style }}>
                      {col.render ? col.render(op) : (op[col.key] || '-')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );

  // ============================================================
  // RENDU
  // ============================================================
  return (
    <div>
      {/* En-tête */}
      <div style={{ background: '#1a1a2e', color: 'white', padding: '20px 24px', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📨 Bordereaux de Transmission</h1>
      </div>

      {/* Onglets source */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 0', flexWrap: 'wrap' }}>
        {sources.map(src => (
          <button key={src.id} onClick={() => { setActiveSourceBT(src.id); setSelectedOps([]); }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: activeSourceBT === src.id ? (src.couleur || '#0f4c3a') : '#f0f0f0', color: activeSourceBT === src.id ? 'white' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            {src.sigle}
          </button>
        ))}
      </div>

      {/* Sous-onglets workflow */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedOps([]); setSearchBT(''); }}
            style={{ 
              padding: '10px 14px', borderRadius: 8, border: 'none', 
              background: activeTab === tab.key ? tab.color : '#f0f0f0', 
              color: activeTab === tab.key ? 'white' : '#555', 
              fontWeight: 600, cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s'
            }}>
            {tab.label}
            <span style={{ 
              background: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : '#ddd', 
              padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              color: activeTab === tab.key ? 'white' : '#666'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* ONGLET 1 : NOUVEAU BT AU CF */}
      {/* ============================================================ */}
      {activeTab === 'NOUVEAU_CF' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#1565c0' }}>📤 Créer un bordereau de transmission au CF</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Date transmission :</label>
              <input type="date" value={dateBordereau} onChange={e => setDateBordereau(e.target.value)}
                style={{ ...styles.input, marginBottom: 0, width: 160 }} />
            </div>
          </div>

          {renderOPTable(true, [
            { key: 'statut', label: 'STATUT', width: 80, render: (op) => (
              <span style={{ 
                background: op.statut === 'DIFFERE' ? '#fff3e0' : '#e8f5e9', 
                color: op.statut === 'DIFFERE' ? '#e65100' : '#2e7d32',
                padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 600 
              }}>
                {op.statut === 'DIFFERE' ? 'Différé' : 'Créé'}
              </span>
            )}
          ])}

          {selectedOps.length > 0 && (
            <div style={{ marginTop: 16, padding: 16, background: '#e3f2fd', borderRadius: 8, border: '1px solid #bbdefb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {selectedOps.length} OP sélectionné(s) — Total : <span style={{ color: '#1565c0' }}>{formatMontant(totalSelected)} F</span>
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                  N° : {genererNumeroBT('CF')}
                </span>
              </div>
              <textarea placeholder="Observations (facultatif)..." value={observations} onChange={e => setObservations(e.target.value)}
                style={{ ...styles.input, minHeight: 50, resize: 'vertical', marginBottom: 12 }} />
              <button onClick={handleCreateBordereauCF} disabled={saving}
                style={{ ...styles.button, padding: '14px 40px', fontSize: 15, background: '#1565c0', width: '100%' }}>
                {saving ? 'Création en cours...' : `📨 Créer le bordereau et transmettre au CF (${selectedOps.length} OP)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET 2 : OP TRANSMIS AU CF */}
      {/* ============================================================ */}
      {activeTab === 'TRANSMIS_CF' && (
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#e65100' }}>📤 OP Transmis au CF — Renseigner le retour</h3>

          {renderOPTable(true, [
            { key: 'dateTransmissionCF', label: 'TRANSMIS LE', width: 100 },
            { key: 'bordereauCF', label: 'N° BT', width: 130, style: { fontFamily: 'monospace', fontSize: 9 } },
          ])}

          {selectedOps.length > 0 && (
            <div style={{ marginTop: 16, padding: 16, background: '#fff3e0', borderRadius: 8, border: '1px solid #ffe0b2' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                Retour CF pour {selectedOps.length} OP sélectionné(s) — {formatMontant(totalSelected)} F
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date retour CF</label>
                  <input type="date" value={dateRetourCF} onChange={e => setDateRetourCF(e.target.value)}
                    style={{ ...styles.input, marginBottom: 0 }} />
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Résultat</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { val: 'VISE', label: '✅ Visé', color: '#2e7d32', bg: '#e8f5e9' },
                      { val: 'DIFFERE', label: '⏳ Différé', color: '#e65100', bg: '#fff3e0' },
                      { val: 'REJETE', label: '❌ Rejeté', color: '#c62828', bg: '#ffebee' },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setResultatCF(opt.val)}
                        style={{ 
                          flex: 1, padding: '10px 8px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          border: resultatCF === opt.val ? `3px solid ${opt.color}` : '2px solid #ddd',
                          background: resultatCF === opt.val ? opt.bg : 'white',
                          color: resultatCF === opt.val ? opt.color : '#999'
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    {resultatCF === 'VISE' ? 'Date visa' : resultatCF === 'DIFFERE' ? 'Date différé' : 'Date rejet'}
                  </label>
                  <input type="date" value={dateResultat} onChange={e => setDateResultat(e.target.value)}
                    style={{ ...styles.input, marginBottom: 0 }} />
                </div>
              </div>

              {(resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Motif du {resultatCF === 'DIFFERE' ? 'différé' : 'rejet'}
                  </label>
                  <textarea value={motifRetour} onChange={e => setMotifRetour(e.target.value)}
                    placeholder={`Indiquez le motif du ${resultatCF === 'DIFFERE' ? 'différé' : 'rejet'}...`}
                    style={{ ...styles.input, minHeight: 60, resize: 'vertical', marginBottom: 0 }} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleRetourCF} disabled={saving}
                  style={{ 
                    ...styles.button, flex: 1, padding: '14px', fontSize: 15,
                    background: resultatCF === 'VISE' ? '#2e7d32' : resultatCF === 'DIFFERE' ? '#e65100' : '#c62828'
                  }}>
                  {saving ? 'Enregistrement...' : `Valider le retour (${selectedOps.length} OP)`}
                </button>
                <button onClick={handleAnnulerRetourCF} disabled={saving}
                  style={{ ...styles.button, padding: '14px', background: '#78909c', fontSize: 13, minWidth: 160 }}>
                  ↩️ Annuler retour
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET 3 : NOUVEAU BT À L'AC */}
      {/* ============================================================ */}
      {activeTab === 'NOUVEAU_AC' && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: '#2e7d32' }}>💰 Créer un bordereau de transmission à l'AC</h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Date transmission :</label>
              <input type="date" value={dateBordereau} onChange={e => setDateBordereau(e.target.value)}
                style={{ ...styles.input, marginBottom: 0, width: 160 }} />
            </div>
          </div>

          {renderOPTable(true, [
            { key: 'dateVisaCF', label: 'VISA CF', width: 100 },
          ])}

          {selectedOps.length > 0 && (
            <div style={{ marginTop: 16, padding: 16, background: '#e8f5e9', borderRadius: 8, border: '1px solid #c8e6c9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>
                  {selectedOps.length} OP sélectionné(s) — Total : <span style={{ color: '#2e7d32' }}>{formatMontant(totalSelected)} F</span>
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                  N° : {genererNumeroBT('AC')}
                </span>
              </div>
              <textarea placeholder="Observations (facultatif)..." value={observations} onChange={e => setObservations(e.target.value)}
                style={{ ...styles.input, minHeight: 50, resize: 'vertical', marginBottom: 12 }} />
              <button onClick={handleCreateBordereauAC} disabled={saving}
                style={{ ...styles.button, padding: '14px 40px', fontSize: 15, background: '#2e7d32', width: '100%' }}>
                {saving ? 'Création en cours...' : `💰 Créer le bordereau et transmettre à l'AC (${selectedOps.length} OP)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET 4 : OP TRANSMIS À L'AC */}
      {/* ============================================================ */}
      {activeTab === 'TRANSMIS_AC' && (
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#6a1b9a' }}>💰 OP Transmis à l'AC — Renseigner le paiement</h3>

          {renderOPTable(true, [
            { key: 'dateTransmissionAC', label: 'TRANSMIS LE', width: 100 },
            { key: 'bordereauAC', label: 'N° BT AC', width: 130, style: { fontFamily: 'monospace', fontSize: 9 } },
          ])}

          {selectedOps.length > 0 && (
            <div style={{ marginTop: 16, padding: 16, background: '#f3e5f5', borderRadius: 8, border: '1px solid #e1bee7' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                Paiement de {selectedOps.length} OP — {formatMontant(totalSelected)} F
              </div>
              <div style={{ marginBottom: 16, maxWidth: 300 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date de paiement</label>
                <input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)}
                  style={{ ...styles.input, marginBottom: 0 }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleMarquerPaye} disabled={saving}
                  style={{ ...styles.button, flex: 1, padding: '14px', fontSize: 15, background: '#6a1b9a' }}>
                  {saving ? 'Enregistrement...' : `✅ Marquer comme payé (${selectedOps.length} OP)`}
                </button>
                <button onClick={handleAnnulerPaiement} disabled={saving}
                  style={{ ...styles.button, padding: '14px', background: '#78909c', fontSize: 13, minWidth: 160 }}>
                  ↩️ Annuler paiement
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET 5 : OP À ARCHIVER */}
      {/* ============================================================ */}
      {activeTab === 'ARCHIVER' && (
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#795548' }}>📦 OP payés — Attribuer une boîte d'archivage</h3>

          {renderOPTable(true, [
            { key: 'datePaiement', label: 'PAYÉ LE', width: 100 },
          ])}

          {selectedOps.length > 0 && (
            <div style={{ marginTop: 16, padding: 16, background: '#efebe9', borderRadius: 8, border: '1px solid #d7ccc8' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                Archiver {selectedOps.length} OP — {formatMontant(totalSelected)} F
              </div>
              <div style={{ marginBottom: 16, maxWidth: 400 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Numéro / Nom de la boîte d'archivage</label>
                <input type="text" value={boiteArchivage} onChange={e => setBoiteArchivage(e.target.value)}
                  placeholder="Ex: BOX-2025-001, Boîte A3..."
                  style={{ ...styles.input, marginBottom: 0 }} />
              </div>
              <button onClick={handleArchiver} disabled={saving || !boiteArchivage.trim()}
                style={{ ...styles.button, padding: '14px 40px', fontSize: 15, background: '#795548', width: '100%', opacity: !boiteArchivage.trim() ? 0.5 : 1 }}>
                {saving ? 'Archivage en cours...' : `📦 Archiver ${selectedOps.length} OP dans "${boiteArchivage || '...'}"`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ONGLET 6 : HISTORIQUE DES BORDEREAUX */}
      {/* ============================================================ */}
      {activeTab === 'HISTORIQUE' && (
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#455a64' }}>📋 Historique des bordereaux</h3>

          {allBT.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
              <p>Aucun bordereau pour cette source</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: 60 }}>TYPE</th>
                  <th style={{ ...styles.th, width: 200 }}>N° BORDEREAU</th>
                  <th style={{ ...styles.th, width: 100 }}>DATE</th>
                  <th style={{ ...styles.th, width: 60, textAlign: 'center' }}>NB OP</th>
                  <th style={{ ...styles.th, width: 130, textAlign: 'right' }}>TOTAL</th>
                  <th style={styles.th}>OBSERVATIONS</th>
                  <th style={{ ...styles.th, width: 100 }}>STATUT</th>
                  <th style={{ ...styles.th, width: 120, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {allBT.map(bt => {
                  const typeBadge = bt.type === 'CF' 
                    ? { bg: '#e3f2fd', color: '#1565c0', label: 'CF' }
                    : { bg: '#e8f5e9', color: '#2e7d32', label: 'AC' };
                  const statutBT = bt.statut === 'ENVOYE' ? { bg: '#fff3e0', color: '#e65100', label: 'Envoyé' }
                    : bt.statut === 'RECEPTIONNE' ? { bg: '#e3f2fd', color: '#1565c0', label: 'Réceptionné' }
                    : { bg: '#e8f5e9', color: '#2e7d32', label: 'Traité' };
                  return (
                    <tr key={bt.id}>
                      <td style={styles.td}>
                        <span style={{ background: typeBadge.bg, color: typeBadge.color, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{typeBadge.label}</span>
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{bt.numero}</td>
                      <td style={{ ...styles.td, fontSize: 12 }}>{bt.dateCreation}</td>
                      <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>{bt.nbOps}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(bt.totalMontant)}</td>
                      <td style={{ ...styles.td, fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bt.observations || '-'}</td>
                      <td style={styles.td}>
                        <span style={{ background: statutBT.bg, color: statutBT.color, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{statutBT.label}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => handlePrintBordereau(bt)} title="Imprimer"
                            style={{ background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                            🖨️
                          </button>
                          {bt.statut === 'ENVOYE' && (
                            <>
                              <button onClick={() => handleModifyBordereauDate(bt)} title="Modifier la date"
                                style={{ background: '#fff3e0', color: '#e65100', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                                ✏️
                              </button>
                              <button onClick={() => handleDeleteBordereau(bt)} title="Supprimer"
                                style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default PageBordereaux;
