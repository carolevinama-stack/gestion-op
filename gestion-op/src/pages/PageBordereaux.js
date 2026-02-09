import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { ARMOIRIE } from '../utils/logos';

const PageBordereaux = () => {
  const { projet, sources, exercices, beneficiaires, ops, bordereaux } = useAppContext();

  // Navigation
  const [mainTab, setMainTab] = useState('CF');
  const [subTabCF, setSubTabCF] = useState('NOUVEAU');
  const [subTabAC, setSubTabAC] = useState('NOUVEAU');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);

  // Sélection et formulaire
  const [selectedOps, setSelectedOps] = useState([]);
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchBT, setSearchBT] = useState('');

  // Retour CF
  const [dateRetourCF, setDateRetourCF] = useState(new Date().toISOString().split('T')[0]);
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');
  const [dateResultat, setDateResultat] = useState(new Date().toISOString().split('T')[0]);

  // Paiement / Archives
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [boiteArchivage, setBoiteArchivage] = useState('');

  // Édition bordereau
  const [editingBT, setEditingBT] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [showAddOps, setShowAddOps] = useState(null);

  const exerciceActifLocal = exercices.find(e => e.actif);
  const currentSrc = sources.find(s => s.id === activeSourceBT);

  // ================================================================
  // FILTRES OP PAR STATUT
  // ================================================================
  const opsForSource = ops.filter(op => op.sourceId === activeSourceBT && op.exerciceId === exerciceActifLocal?.id);

  // CF - Nouveau BT : OP créés + différés
  const opsEligiblesCF = opsForSource.filter(op => op.statut === 'CREE' || op.statut === 'DIFFERE');
  // CF - Transmis au CF (en attente retour)
  const opsTransmisCF = opsForSource.filter(op => op.statut === 'TRANSMIS_CF');
  // AC - Nouveau BT : OP visés par le CF
  const opsEligiblesAC = opsForSource.filter(op => op.statut === 'VISE_CF');
  // AC - Transmis à l'AC
  const opsTransmisAC = opsForSource.filter(op => op.statut === 'TRANSMIS_AC');
  // Archives : OP transmis AC (pas encore archivés) + OP payés
  const opsFileArchive = opsForSource.filter(op => op.statut === 'TRANSMIS_AC' || op.statut === 'PAYE');
  // OP déjà archivés
  const opsArchives = opsForSource.filter(op => op.statut === 'ARCHIVE');

  // Bordereaux par type
  const bordereauCF = bordereaux.filter(bt => bt.type === 'CF' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);
  const bordereauAC = bordereaux.filter(bt => bt.type === 'AC' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);

  // BT CF sans date de transmission (en préparation)
  const btCFEnPrep = bordereauCF.filter(bt => !bt.dateTransmission || bt.statut === 'PREPARATION');
  // BT AC sans date de transmission
  const btACEnPrep = bordereauAC.filter(bt => !bt.dateTransmission || bt.statut === 'PREPARATION');

  // Recherche
  const filterOps = (opsList) => opsList.filter(op => {
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
  const toggleAll = (opsList) => {
    const filtered = filterOps(opsList);
    if (selectedOps.length === filtered.length && filtered.length > 0) {
      setSelectedOps([]);
    } else {
      setSelectedOps(filtered.map(op => op.id));
    }
  };
  const totalSelected = selectedOps.reduce((sum, id) => {
    const op = ops.find(o => o.id === id);
    return sum + (op?.montant || 0);
  }, 0);

  // ================================================================
  // GÉNÉRATION NUMÉRO BORDEREAU
  // ================================================================
  const genererNumeroBT = (typeBT) => {
    const prefix = typeBT === 'CF' ? 'BT-CF' : 'BT-AC';
    const sigleProjet = projet?.sigle || 'PROJET';
    const sigleSrc = currentSrc?.sigle || 'SRC';
    const annee = exerciceActifLocal?.annee || new Date().getFullYear();
    const existants = bordereaux.filter(bt =>
      bt.type === typeBT && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id
    );
    const nextNum = existants.length + 1;
    return `${prefix}-${String(nextNum).padStart(4, '0')}/${sigleProjet}-${sigleSrc}/${annee}`;
  };

  // ================================================================
  // ACTION : CRÉER BORDEREAU (CF ou AC) - SANS DATE DE TRANSMISSION
  // ================================================================
  const handleCreateBordereau = async (typeBT) => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }
    const numero = genererNumeroBT(typeBT);
    const label = typeBT === 'CF' ? 'Contrôleur Financier' : "l'Agent Comptable";

    if (!window.confirm(`Créer le bordereau ${numero} avec ${selectedOps.length} OP pour un total de ${formatMontant(totalSelected)} F ?\n\nLe bordereau sera en préparation jusqu'à la saisie de la date de transmission.`)) return;

    setSaving(true);
    try {
      const btData = {
        numero,
        type: typeBT,
        sourceId: activeSourceBT,
        exerciceId: exerciceActifLocal.id,
        dateCreation: new Date().toISOString().split('T')[0],
        dateTransmission: null,
        opsIds: selectedOps,
        nbOps: selectedOps.length,
        totalMontant: totalSelected,
        statut: 'PREPARATION',
        observations: observations.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bordereaux'), btData);

      // Marquer les OP comme inclus dans un bordereau (mais pas encore transmis)
      const btField = typeBT === 'CF' ? 'bordereauCF' : 'bordereauAC';
      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), {
          [btField]: numero,
          updatedAt: new Date().toISOString()
        });
      }

      alert(`✅ Bordereau ${numero} créé en préparation.\n${selectedOps.length} OP inclus.\n\nRenseignez la date de transmission pour finaliser l'envoi.`);
      setSelectedOps([]);
      setObservations('');
      if (typeBT === 'CF') setSubTabCF('BORDEREAUX');
      else setSubTabAC('BORDEREAUX');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ================================================================
  // ACTION : SAISIR DATE TRANSMISSION → OP passent en TRANSMIS
  // ================================================================
  const handleTransmettre = async (bt, dateTransmission) => {
    if (!dateTransmission || !/^\d{4}-\d{2}-\d{2}$/.test(dateTransmission)) {
      alert('Veuillez saisir une date valide.'); return;
    }
    const label = bt.type === 'CF' ? 'au CF' : "à l'AC";
    if (!window.confirm(`Transmettre le bordereau ${bt.numero} ${label} en date du ${dateTransmission} ?\n\n${bt.nbOps} OP seront marqués comme transmis.`)) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'bordereaux', bt.id), {
        dateTransmission,
        statut: 'ENVOYE',
        updatedAt: new Date().toISOString()
      });

      const newStatut = bt.type === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC';
      const dateField = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';

      for (const opId of bt.opsIds) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: newStatut,
          [dateField]: dateTransmission,
          updatedAt: new Date().toISOString()
        });
      }

      alert(`✅ Bordereau ${bt.numero} transmis ${label} le ${dateTransmission}.`);
      setEditingBT(null);
      setEditDate('');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ================================================================
  // ACTION : AJOUTER UN OP AU BORDEREAU
  // ================================================================
  const handleAddOpToBT = async (bt, opId) => {
    if (bt.statut !== 'PREPARATION') { alert('❌ Ce bordereau est déjà transmis.'); return; }
    const op = ops.find(o => o.id === opId);
    if (!op) return;

    try {
      const newOpsIds = [...bt.opsIds, opId];
      const newTotal = newOpsIds.reduce((sum, id) => {
        const o = ops.find(x => x.id === id);
        return sum + (o?.montant || 0);
      }, 0);

      await updateDoc(doc(db, 'bordereaux', bt.id), {
        opsIds: newOpsIds,
        nbOps: newOpsIds.length,
        totalMontant: newTotal,
        updatedAt: new Date().toISOString()
      });

      const btField = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';
      await updateDoc(doc(db, 'ops', opId), {
        [btField]: bt.numero,
        updatedAt: new Date().toISOString()
      });

      alert(`✅ OP ${op.numero} ajouté au bordereau.`);
      setShowAddOps(null);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  // ================================================================
  // ACTION : RETIRER UN OP DU BORDEREAU
  // ================================================================
  const handleRemoveOpFromBT = async (bt, opId) => {
    if (bt.statut !== 'PREPARATION') { alert('❌ Ce bordereau est déjà transmis.'); return; }
    if (bt.opsIds.length <= 1) { alert('❌ Le bordereau doit contenir au moins 1 OP. Supprimez le bordereau si nécessaire.'); return; }
    
    const op = ops.find(o => o.id === opId);
    if (!window.confirm(`Retirer l'OP ${op?.numero || ''} du bordereau ${bt.numero} ?`)) return;

    try {
      const newOpsIds = bt.opsIds.filter(id => id !== opId);
      const newTotal = newOpsIds.reduce((sum, id) => {
        const o = ops.find(x => x.id === id);
        return sum + (o?.montant || 0);
      }, 0);

      await updateDoc(doc(db, 'bordereaux', bt.id), {
        opsIds: newOpsIds,
        nbOps: newOpsIds.length,
        totalMontant: newTotal,
        updatedAt: new Date().toISOString()
      });

      const btField = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';
      await updateDoc(doc(db, 'ops', opId), {
        [btField]: null,
        updatedAt: new Date().toISOString()
      });

      alert(`✅ OP retiré du bordereau.`);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  // ================================================================
  // ACTION : SUPPRIMER BORDEREAU
  // ================================================================
  const handleDeleteBordereau = async (bt) => {
    const pwd = window.prompt('🔒 Mot de passe requis pour supprimer :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    if (!window.confirm(`Supprimer le bordereau ${bt.numero} ?\n\nLes ${bt.nbOps} OP reviendront au statut précédent.`)) return;

    try {
      const previousStatut = bt.type === 'CF' ? (bt.statut === 'PREPARATION' ? null : 'CREE') : (bt.statut === 'PREPARATION' ? null : 'VISE_CF');
      const dateField = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      const btField = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';

      for (const opId of bt.opsIds) {
        const updateData = { [btField]: null, updatedAt: new Date().toISOString() };
        if (previousStatut) {
          updateData.statut = previousStatut;
          updateData[dateField] = null;
        }
        await updateDoc(doc(db, 'ops', opId), updateData);
      }
      await deleteDoc(doc(db, 'bordereaux', bt.id));
      alert(`✅ Bordereau ${bt.numero} supprimé.`);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  // ================================================================
  // ACTION : RETOUR CF (Visé / Différé / Rejeté)
  // ================================================================
  const handleRetourCF = async () => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }
    const labelResultat = resultatCF === 'VISE' ? 'Visé' : resultatCF === 'DIFFERE' ? 'Différé' : 'Rejeté';
    if (!window.confirm(`Marquer ${selectedOps.length} OP comme "${labelResultat}" ?\nDate : ${dateResultat}${motifRetour ? '\nMotif : ' + motifRetour : ''}`)) return;

    setSaving(true);
    try {
      let updateData = { dateRetourCF, resultatCF, updatedAt: new Date().toISOString() };

      if (resultatCF === 'VISE') {
        updateData.statut = 'VISE_CF';
        updateData.dateVisaCF = dateResultat;
      } else if (resultatCF === 'DIFFERE') {
        updateData.statut = 'DIFFERE';
        updateData.dateDiffere = dateResultat;
        updateData.motifDiffere = motifRetour.trim();
      } else {
        updateData.statut = 'REJETE';
        updateData.dateRejet = dateResultat;
        updateData.motifRejet = motifRetour.trim();
      }

      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), updateData);
      }

      alert(`✅ ${selectedOps.length} OP marqués comme "${labelResultat}".`);
      setSelectedOps([]);
      setMotifRetour('');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ================================================================
  // ACTION : MARQUER PAYÉ
  // ================================================================
  const handleMarquerPaye = async () => {
    if (selectedOps.length === 0) { alert('Sélectionnez au moins un OP.'); return; }
    if (!window.confirm(`Marquer ${selectedOps.length} OP comme payés ?\nDate : ${datePaiement}`)) return;

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
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ================================================================
  // ACTION : ARCHIVER
  // ================================================================
  const handleArchiver = async () => {
    if (selectedOps.length === 0) { alert('Sélectionnez au moins un OP.'); return; }
    if (!boiteArchivage.trim()) { alert('Renseignez le numéro de boîte d\'archivage.'); return; }
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
      alert(`✅ ${selectedOps.length} OP archivés dans "${boiteArchivage}".`);
      setSelectedOps([]);
      setBoiteArchivage('');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ================================================================
  // ANNULATIONS
  // ================================================================
  const handleAnnulerAction = async (opsIds, newStatut, fieldsToNull = []) => {
    const pwd = window.prompt('🔒 Mot de passe requis :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    if (!window.confirm(`Annuler l'action pour ${opsIds.length} OP ?`)) return;

    setSaving(true);
    try {
      for (const opId of opsIds) {
        const updateData = { statut: newStatut, updatedAt: new Date().toISOString() };
        fieldsToNull.forEach(f => { updateData[f] = null; });
        await updateDoc(doc(db, 'ops', opId), updateData);
      }
      alert(`✅ ${opsIds.length} OP mis à jour.`);
      setSelectedOps([]);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // ================================================================
  // IMPRESSION BORDEREAU
  // ================================================================
  const handlePrintBordereau = (bt) => {
    const src = sources.find(s => s.id === bt.sourceId);
    const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const printContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${bt.numero}</title>
<style>
@page { size: A4; margin: 10mm; }
@media print { .toolbar { display: none !important; } body { background: #fff !important; } .page-container { box-shadow: none !important; margin: 0 !important; width: 100% !important; } }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Century Gothic', 'Trebuchet MS', sans-serif; font-size: 11px; background: #e0e0e0; }
.toolbar { background: #1a1a2e; padding: 12px 20px; display: flex; gap: 12px; align-items: center; position: sticky; top: 0; z-index: 100; }
.toolbar button { padding: 8px 20px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-print { background: #2196F3; color: white; }
.toolbar-title { color: rgba(255,255,255,0.7); margin-left: auto; font-size: 12px; }
.page-container { width: 210mm; min-height: 297mm; margin: 20px auto; background: white; padding: 12mm; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 2px solid #1a1a2e; }
.header-left { display: flex; align-items: center; gap: 10px; }
.header-left img { width: 55px; }
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
<div class="bt-date">Date : ${bt.dateTransmission || bt.dateCreation}</div>
<div class="bt-dest">
  <strong>De :</strong> ${projet?.titreCoordonnateur || 'Le Coordonnateur'} - ${projet?.nomProjet || ''}<br/>
  <strong>À :</strong> ${bt.type === 'CF' ? 'Monsieur le Contrôleur Financier' : "Monsieur l'Agent Comptable"}
  ${bt.observations ? '<br/><strong>Objet :</strong> ' + bt.observations : ''}
</div>
<table>
  <thead><tr>
    <th style="width:35px">N°</th><th style="width:130px">N° OP</th><th>BÉNÉFICIAIRE</th><th>OBJET</th>
    <th style="width:65px">LIGNE</th><th style="width:100px;text-align:right">MONTANT (FCFA)</th>
  </tr></thead>
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
      </tr>`;
    }).join('')}
    <tr class="total-row">
      <td colspan="5" style="text-align:right">TOTAL (${btOps.length} OP)</td>
      <td style="text-align:right;font-family:monospace">${Number(bt.totalMontant || 0).toLocaleString('fr-FR')}</td>
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
</div></body></html>`;
    const pw = window.open('', '_blank', 'width=900,height=700');
    pw.document.write(printContent);
    pw.document.close();
  };

  // ================================================================
  // COMPOSANTS RÉUTILISABLES
  // ================================================================
  const Badge = ({ bg, color, children }) => (
    <span style={{ background: bg, color, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>
  );

  const EmptyState = ({ icon = '📭', text }) => (
    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
      <p>{text}</p>
    </div>
  );

  const SubTabBtn = ({ active, label, count, color, onClick }) => (
    <button onClick={onClick}
      style={{
        padding: '9px 16px', borderRadius: 6, border: 'none',
        background: active ? color : '#f5f5f5',
        color: active ? 'white' : '#666',
        fontWeight: 600, cursor: 'pointer', fontSize: 12,
        display: 'flex', alignItems: 'center', gap: 6
      }}>
      {label}
      {count !== undefined && (
        <span style={{
          background: active ? 'rgba(255,255,255,0.25)' : '#ddd',
          padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700
        }}>{count}</span>
      )}
    </button>
  );

  // Table d'OP réutilisable
  const OPTable = ({ opsList, showCheckbox = true, extraColumns = [] }) => {
    const filtered = filterOps(opsList);
    return (
      <>
        <input type="text" placeholder="🔍 Rechercher..." value={searchBT} onChange={e => setSearchBT(e.target.value)}
          style={{ ...styles.input, marginBottom: 12, maxWidth: 400 }} />
        {filtered.length === 0 ? (
          <EmptyState text="Aucun OP dans cette catégorie" />
        ) : (
          <div style={{ maxHeight: 450, overflowY: 'auto', overflowX: 'auto', border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <table style={{ ...styles.table, marginBottom: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  {showCheckbox && (
                    <th style={{ ...styles.th, width: 36 }}>
                      <input type="checkbox" checked={selectedOps.length === filtered.length && filtered.length > 0} onChange={() => toggleAll(opsList)} />
                    </th>
                  )}
                  <th style={{ ...styles.th, width: 130 }}>N° OP</th>
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
                {filtered.map(op => {
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
                      <td style={{ ...styles.td, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire || '-'}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                      {extraColumns.map(col => (
                        <td key={col.key} style={{ ...styles.td, fontSize: 11, textAlign: col.align || 'left', ...(col.style || {}) }}>
                          {col.render ? col.render(op) : (op[col.key] || '-')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  // Carte bordereau pour la section "Bordereaux"
  const BordereauCard = ({ bt }) => {
    const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const isPrep = bt.statut === 'PREPARATION';
    const isEditing = editingBT === bt.id;
    // OP disponibles pour ajout (même source, même exercice, statut compatible)
    const availableOps = bt.type === 'CF'
      ? opsForSource.filter(op => (op.statut === 'CREE' || op.statut === 'DIFFERE') && !bt.opsIds.includes(op.id))
      : opsForSource.filter(op => op.statut === 'VISE_CF' && !bt.opsIds.includes(op.id));

    return (
      <div style={{ border: isPrep ? '2px dashed #ff9800' : '1px solid #e0e0e0', borderRadius: 10, padding: 16, marginBottom: 12, background: isPrep ? '#fff8e1' : 'white' }}>
        {/* En-tête du bordereau */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, marginRight: 10 }}>{bt.numero}</span>
            <Badge bg={isPrep ? '#fff3e0' : '#e8f5e9'} color={isPrep ? '#e65100' : '#2e7d32'}>
              {isPrep ? '📝 En préparation' : `✅ Transmis le ${bt.dateTransmission}`}
            </Badge>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handlePrintBordereau(bt)} title="Imprimer"
              style={{ background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
              🖨️
            </button>
            {isPrep && (
              <>
                <button onClick={() => setShowAddOps(showAddOps === bt.id ? null : bt.id)} title="Ajouter un OP"
                  style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
                  ➕
                </button>
                <button onClick={() => handleDeleteBordereau(bt)} title="Supprimer"
                  style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
                  🗑️
                </button>
              </>
            )}
            {!isPrep && bt.statut === 'ENVOYE' && (
              <button onClick={() => handleDeleteBordereau(bt)} title="Supprimer"
                style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Infos résumées */}
        <div style={{ display: 'flex', gap: 20, fontSize: 13, marginBottom: 12, color: '#555' }}>
          <span>📄 {bt.nbOps} OP</span>
          <span>💰 {formatMontant(bt.totalMontant)} F</span>
          <span>📅 Créé le {bt.dateCreation}</span>
          {bt.observations && <span>📝 {bt.observations}</span>}
        </div>

        {/* Zone date de transmission pour bordereaux en préparation */}
        {isPrep && (
          <div style={{ background: '#fff3e0', borderRadius: 8, padding: 12, marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#e65100' }}>📅 Date de transmission :</span>
            <input type="date" value={editingBT === bt.id ? editDate : ''}
              onChange={e => { setEditingBT(bt.id); setEditDate(e.target.value); }}
              style={{ ...styles.input, marginBottom: 0, width: 180, minWidth: 180 }} />
            {isEditing && editDate && (
              <button onClick={() => handleTransmettre(bt, editDate)} disabled={saving}
                style={{ ...styles.button, padding: '8px 20px', fontSize: 13, background: '#2e7d32', marginBottom: 0 }}>
                {saving ? '...' : '📨 Transmettre'}
              </button>
            )}
          </div>
        )}

        {/* Liste des OP dans le bordereau */}
        <table style={{ ...styles.table, fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 30 }}>N°</th>
              <th style={{ ...styles.th, width: 120 }}>N° OP</th>
              <th style={styles.th}>BÉNÉFICIAIRE</th>
              <th style={styles.th}>OBJET</th>
              <th style={{ ...styles.th, width: 100, textAlign: 'right' }}>MONTANT</th>
              {isPrep && <th style={{ ...styles.th, width: 50, textAlign: 'center' }}>⚙️</th>}
            </tr>
          </thead>
          <tbody>
            {btOps.map((op, i) => {
              const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
              return (
                <tr key={op.id}>
                  <td style={styles.td}>{i + 1}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 11 }}>{ben?.nom || 'N/A'}</td>
                  <td style={{ ...styles.td, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                  {isPrep && (
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button onClick={() => handleRemoveOpFromBT(bt, op.id)} title="Retirer"
                        style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Zone ajout OP */}
        {showAddOps === bt.id && availableOps.length > 0 && (
          <div style={{ marginTop: 10, padding: 12, background: '#e8f5e9', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#2e7d32' }}>➕ OP disponibles à ajouter :</div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {availableOps.map(op => {
                const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                return (
                  <div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #c8e6c9' }}>
                    <span style={{ fontSize: 11 }}>
                      <strong style={{ fontFamily: 'monospace' }}>{op.numero}</strong> — {ben?.nom || 'N/A'} — {formatMontant(op.montant)} F
                    </span>
                    <button onClick={() => handleAddOpToBT(bt, op.id)}
                      style={{ background: '#2e7d32', color: 'white', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                      + Ajouter
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {showAddOps === bt.id && availableOps.length === 0 && (
          <div style={{ marginTop: 10, padding: 12, background: '#f5f5f5', borderRadius: 8, color: '#999', fontSize: 12, textAlign: 'center' }}>
            Aucun OP disponible à ajouter
          </div>
        )}
      </div>
    );
  };

  // ================================================================
  // RENDU PRINCIPAL
  // ================================================================
  const changeTab = (tab) => {
    setMainTab(tab);
    setSelectedOps([]);
    setSearchBT('');
  };

  const changeSubTab = (setter, val) => {
    setter(val);
    setSelectedOps([]);
    setSearchBT('');
  };

  return (
    <div>
      {/* EN-TÊTE */}
      <div style={{ background: '#1a1a2e', color: 'white', padding: '20px 24px', borderRadius: '10px 10px 0 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📨 Bordereaux de Transmission</h1>
      </div>

      {/* ONGLETS SOURCE */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 0', flexWrap: 'wrap' }}>
        {sources.map(src => (
          <button key={src.id} onClick={() => { setActiveSourceBT(src.id); setSelectedOps([]); }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: activeSourceBT === src.id ? (src.couleur || '#0f4c3a') : '#f0f0f0', color: activeSourceBT === src.id ? 'white' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            {src.sigle}
          </button>
        ))}
      </div>

      {/* 3 ONGLETS PRINCIPAUX */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { key: 'CF', label: '🔵 Contrôle Financier', color: '#1565c0' },
          { key: 'AC', label: '🟢 Agent Comptable', color: '#2e7d32' },
          { key: 'ARCHIVES', label: '📦 Archives', color: '#795548' },
        ].map(tab => (
          <button key={tab.key} onClick={() => changeTab(tab.key)}
            style={{
              flex: 1, padding: '14px 12px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: mainTab === tab.key ? tab.color : '#e0e0e0',
              color: mainTab === tab.key ? 'white' : '#666',
              borderRadius: 8,
              transition: 'all 0.2s'
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================ */}
      {/* ONGLET CONTRÔLE FINANCIER */}
      {/* ================================================================ */}
      {mainTab === 'CF' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <SubTabBtn active={subTabCF === 'NOUVEAU'} label="➕ Nouveau BT" count={opsEligiblesCF.length} color="#1565c0" onClick={() => changeSubTab(setSubTabCF, 'NOUVEAU')} />
            <SubTabBtn active={subTabCF === 'BORDEREAUX'} label="📋 Bordereaux" count={bordereauCF.length} color="#0d47a1" onClick={() => changeSubTab(setSubTabCF, 'BORDEREAUX')} />
            <SubTabBtn active={subTabCF === 'TRANSMIS'} label="📤 OP Transmis" count={opsTransmisCF.length} color="#e65100" onClick={() => changeSubTab(setSubTabCF, 'TRANSMIS')} />
            <SubTabBtn active={subTabCF === 'HISTORIQUE'} label="📜 Historique" count={bordereauCF.filter(b => b.statut !== 'PREPARATION').length} color="#455a64" onClick={() => changeSubTab(setSubTabCF, 'HISTORIQUE')} />
          </div>

          {/* CF > Nouveau BT */}
          {subTabCF === 'NOUVEAU' && (
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px', color: '#1565c0' }}>➕ Sélectionner les OP pour un nouveau bordereau au CF</h3>
              <OPTable opsList={opsEligiblesCF} extraColumns={[
                { key: 'statut', label: 'STATUT', width: 80, render: (op) => (
                  <Badge bg={op.statut === 'DIFFERE' ? '#fff3e0' : '#e8f5e9'} color={op.statut === 'DIFFERE' ? '#e65100' : '#2e7d32'}>
                    {op.statut === 'DIFFERE' ? 'Différé' : 'Créé'}
                  </Badge>
                )}
              ]} />
              {selectedOps.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: '#e3f2fd', borderRadius: 8, border: '1px solid #bbdefb' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                    {selectedOps.length} OP — Total : <span style={{ color: '#1565c0' }}>{formatMontant(totalSelected)} F</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#666', marginLeft: 16 }}>N° : {genererNumeroBT('CF')}</span>
                  </div>
                  <textarea placeholder="Observations (facultatif)..." value={observations} onChange={e => setObservations(e.target.value)}
                    style={{ ...styles.input, minHeight: 50, resize: 'vertical', marginBottom: 12 }} />
                  <button onClick={() => handleCreateBordereau('CF')} disabled={saving}
                    style={{ ...styles.button, padding: '14px', fontSize: 15, background: '#1565c0', width: '100%' }}>
                    {saving ? 'Création...' : `📋 Créer le bordereau (${selectedOps.length} OP)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CF > Bordereaux */}
          {subTabCF === 'BORDEREAUX' && (
            <div>
              {bordereauCF.length === 0 ? (
                <div style={styles.card}><EmptyState text="Aucun bordereau CF créé" /></div>
              ) : (
                bordereauCF.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(bt => (
                  <BordereauCard key={bt.id} bt={bt} />
                ))
              )}
            </div>
          )}

          {/* CF > OP Transmis */}
          {subTabCF === 'TRANSMIS' && (
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px', color: '#e65100' }}>📤 OP Transmis au CF — Renseigner le retour</h3>
              <OPTable opsList={opsTransmisCF} extraColumns={[
                { key: 'dateTransmissionCF', label: 'TRANSMIS LE', width: 100 },
                { key: 'bordereauCF', label: 'N° BT', width: 120, style: { fontFamily: 'monospace', fontSize: 9 } },
              ]} />
              {selectedOps.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: '#fff3e0', borderRadius: 8, border: '1px solid #ffe0b2' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                    Retour CF — {selectedOps.length} OP — {formatMontant(totalSelected)} F
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date retour CF</label>
                      <input type="date" value={dateRetourCF} onChange={e => setDateRetourCF(e.target.value)}
                        style={{ ...styles.input, marginBottom: 0, minWidth: 180 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 250 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Résultat</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        {[
                          { val: 'VISE', label: '✅ Visé', color: '#2e7d32', bg: '#e8f5e9' },
                          { val: 'DIFFERE', label: '⏳ Différé', color: '#e65100', bg: '#fff3e0' },
                          { val: 'REJETE', label: '❌ Rejeté', color: '#c62828', bg: '#ffebee' },
                        ].map(opt => (
                          <button key={opt.val} onClick={() => setResultatCF(opt.val)}
                            style={{
                              flex: 1, padding: '10px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
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
                        style={{ ...styles.input, marginBottom: 0, minWidth: 180 }} />
                    </div>
                  </div>
                  {(resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                        Motif du {resultatCF === 'DIFFERE' ? 'différé' : 'rejet'}
                      </label>
                      <textarea value={motifRetour} onChange={e => setMotifRetour(e.target.value)}
                        placeholder={`Motif du ${resultatCF === 'DIFFERE' ? 'différé' : 'rejet'}...`}
                        style={{ ...styles.input, minHeight: 60, resize: 'vertical', marginBottom: 0 }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleRetourCF} disabled={saving}
                      style={{ ...styles.button, flex: 1, padding: '14px', fontSize: 15, background: resultatCF === 'VISE' ? '#2e7d32' : resultatCF === 'DIFFERE' ? '#e65100' : '#c62828' }}>
                      {saving ? 'Enregistrement...' : `Valider (${selectedOps.length} OP)`}
                    </button>
                    <button onClick={() => handleAnnulerAction(selectedOps, 'TRANSMIS_CF', ['resultatCF', 'dateRetourCF', 'dateVisaCF', 'dateDiffere', 'motifDiffere', 'dateRejet', 'motifRejet'])}
                      disabled={saving}
                      style={{ ...styles.button, padding: '14px', background: '#78909c', fontSize: 12, minWidth: 140 }}>
                      ↩️ Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CF > Historique */}
          {subTabCF === 'HISTORIQUE' && (
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px', color: '#455a64' }}>📜 Historique des bordereaux CF</h3>
              {bordereauCF.filter(b => b.statut !== 'PREPARATION').length === 0 ? (
                <EmptyState text="Aucun bordereau transmis" />
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 190 }}>N° BORDEREAU</th>
                      <th style={{ ...styles.th, width: 100 }}>TRANSMISSION</th>
                      <th style={{ ...styles.th, width: 55, textAlign: 'center' }}>NB OP</th>
                      <th style={{ ...styles.th, width: 120, textAlign: 'right' }}>TOTAL</th>
                      <th style={styles.th}>OBSERVATIONS</th>
                      <th style={{ ...styles.th, width: 90 }}>STATUT</th>
                      <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bordereauCF.filter(b => b.statut !== 'PREPARATION').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(bt => (
                      <tr key={bt.id}>
                        <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{bt.numero}</td>
                        <td style={{ ...styles.td, fontSize: 12 }}>{bt.dateTransmission}</td>
                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>{bt.nbOps}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(bt.totalMontant)}</td>
                        <td style={{ ...styles.td, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bt.observations || '-'}</td>
                        <td style={styles.td}><Badge bg="#e3f2fd" color="#1565c0">Transmis</Badge></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <button onClick={() => handlePrintBordereau(bt)} style={{ background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🖨️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* ONGLET AGENT COMPTABLE */}
      {/* ================================================================ */}
      {mainTab === 'AC' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <SubTabBtn active={subTabAC === 'NOUVEAU'} label="➕ Nouveau BT" count={opsEligiblesAC.length} color="#2e7d32" onClick={() => changeSubTab(setSubTabAC, 'NOUVEAU')} />
            <SubTabBtn active={subTabAC === 'BORDEREAUX'} label="📋 Bordereaux" count={bordereauAC.length} color="#1b5e20" onClick={() => changeSubTab(setSubTabAC, 'BORDEREAUX')} />
            <SubTabBtn active={subTabAC === 'TRANSMIS'} label="💰 OP Transmis" count={opsTransmisAC.length} color="#6a1b9a" onClick={() => changeSubTab(setSubTabAC, 'TRANSMIS')} />
            <SubTabBtn active={subTabAC === 'HISTORIQUE'} label="📜 Historique" count={bordereauAC.filter(b => b.statut !== 'PREPARATION').length} color="#455a64" onClick={() => changeSubTab(setSubTabAC, 'HISTORIQUE')} />
          </div>

          {/* AC > Nouveau BT */}
          {subTabAC === 'NOUVEAU' && (
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px', color: '#2e7d32' }}>➕ Sélectionner les OP visés pour un bordereau à l'AC</h3>
              <OPTable opsList={opsEligiblesAC} extraColumns={[
                { key: 'dateVisaCF', label: 'VISA CF', width: 100 },
              ]} />
              {selectedOps.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: '#e8f5e9', borderRadius: 8, border: '1px solid #c8e6c9' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                    {selectedOps.length} OP — Total : <span style={{ color: '#2e7d32' }}>{formatMontant(totalSelected)} F</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#666', marginLeft: 16 }}>N° : {genererNumeroBT('AC')}</span>
                  </div>
                  <textarea placeholder="Observations (facultatif)..." value={observations} onChange={e => setObservations(e.target.value)}
                    style={{ ...styles.input, minHeight: 50, resize: 'vertical', marginBottom: 12 }} />
                  <button onClick={() => handleCreateBordereau('AC')} disabled={saving}
                    style={{ ...styles.button, padding: '14px', fontSize: 15, background: '#2e7d32', width: '100%' }}>
                    {saving ? 'Création...' : `📋 Créer le bordereau (${selectedOps.length} OP)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AC > Bordereaux */}
          {subTabAC === 'BORDEREAUX' && (
            <div>
              {bordereauAC.length === 0 ? (
                <div style={styles.card}><EmptyState text="Aucun bordereau AC créé" /></div>
              ) : (
                bordereauAC.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(bt => (
                  <BordereauCard key={bt.id} bt={bt} />
                ))
              )}
            </div>
          )}

          {/* AC > OP Transmis */}
          {subTabAC === 'TRANSMIS' && (
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px', color: '#6a1b9a' }}>💰 OP Transmis à l'AC</h3>
              <OPTable opsList={opsTransmisAC} extraColumns={[
                { key: 'dateTransmissionAC', label: 'TRANSMIS LE', width: 100 },
                { key: 'bordereauAC', label: 'N° BT', width: 120, style: { fontFamily: 'monospace', fontSize: 9 } },
              ]} />
              {selectedOps.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: '#f3e5f5', borderRadius: 8, border: '1px solid #e1bee7' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                    {selectedOps.length} OP — {formatMontant(totalSelected)} F
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 200 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date de paiement</label>
                      <input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)}
                        style={{ ...styles.input, marginBottom: 0, minWidth: 180 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleMarquerPaye} disabled={saving}
                      style={{ ...styles.button, flex: 1, padding: '14px', fontSize: 15, background: '#6a1b9a' }}>
                      {saving ? '...' : `💰 Marquer payé (${selectedOps.length} OP)`}
                    </button>
                    <button onClick={() => handleAnnulerAction(selectedOps, 'TRANSMIS_AC', ['datePaiement'])}
                      disabled={saving}
                      style={{ ...styles.button, padding: '14px', background: '#78909c', fontSize: 12, minWidth: 140 }}>
                      ↩️ Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AC > Historique */}
          {subTabAC === 'HISTORIQUE' && (
            <div style={styles.card}>
              <h3 style={{ margin: '0 0 16px', color: '#455a64' }}>📜 Historique des bordereaux AC</h3>
              {bordereauAC.filter(b => b.statut !== 'PREPARATION').length === 0 ? (
                <EmptyState text="Aucun bordereau transmis" />
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 190 }}>N° BORDEREAU</th>
                      <th style={{ ...styles.th, width: 100 }}>TRANSMISSION</th>
                      <th style={{ ...styles.th, width: 55, textAlign: 'center' }}>NB OP</th>
                      <th style={{ ...styles.th, width: 120, textAlign: 'right' }}>TOTAL</th>
                      <th style={styles.th}>OBSERVATIONS</th>
                      <th style={{ ...styles.th, width: 90 }}>STATUT</th>
                      <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bordereauAC.filter(b => b.statut !== 'PREPARATION').sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(bt => (
                      <tr key={bt.id}>
                        <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>{bt.numero}</td>
                        <td style={{ ...styles.td, fontSize: 12 }}>{bt.dateTransmission}</td>
                        <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>{bt.nbOps}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(bt.totalMontant)}</td>
                        <td style={{ ...styles.td, fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bt.observations || '-'}</td>
                        <td style={styles.td}><Badge bg="#e8f5e9" color="#2e7d32">Transmis</Badge></td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <button onClick={() => handlePrintBordereau(bt)} style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>🖨️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* ONGLET ARCHIVES */}
      {/* ================================================================ */}
      {mainTab === 'ARCHIVES' && (
        <div>
          <div style={styles.card}>
            <h3 style={{ margin: '0 0 16px', color: '#795548' }}>📦 File d'attente — OP à archiver</h3>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
              Sélectionnez les OP et attribuez un numéro de boîte d'archivage.
            </p>

            <OPTable opsList={opsFileArchive} extraColumns={[
              { key: 'statut', label: 'STATUT', width: 90, render: (op) => (
                <Badge bg={op.statut === 'PAYE' ? '#e8f5e9' : '#f3e5f5'} color={op.statut === 'PAYE' ? '#2e7d32' : '#6a1b9a'}>
                  {op.statut === 'PAYE' ? 'Payé' : 'Transmis AC'}
                </Badge>
              )},
              { key: 'datePaiement', label: 'PAYÉ LE', width: 100 },
            ]} />

            {selectedOps.length > 0 && (
              <div style={{ marginTop: 16, padding: 16, background: '#efebe9', borderRadius: 8, border: '1px solid #d7ccc8' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
                  📦 Archiver {selectedOps.length} OP — {formatMontant(totalSelected)} F
                </div>
                <div style={{ marginBottom: 16, maxWidth: 400 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Numéro / Nom de la boîte d'archivage</label>
                  <input type="text" value={boiteArchivage} onChange={e => setBoiteArchivage(e.target.value)}
                    placeholder="Ex: BOX-2025-001, Boîte A3..."
                    style={{ ...styles.input, marginBottom: 0 }} />
                </div>
                <button onClick={handleArchiver} disabled={saving || !boiteArchivage.trim()}
                  style={{ ...styles.button, padding: '14px', fontSize: 15, background: '#795548', width: '100%', opacity: !boiteArchivage.trim() ? 0.5 : 1 }}>
                  {saving ? 'Archivage...' : `📦 Archiver ${selectedOps.length} OP dans "${boiteArchivage || '...'}"`}
                </button>
              </div>
            )}
          </div>

          {/* OP déjà archivés */}
          {opsArchives.length > 0 && (
            <div style={{ ...styles.card, marginTop: 16 }}>
              <h3 style={{ margin: '0 0 16px', color: '#5d4037' }}>✅ OP Archivés ({opsArchives.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 130 }}>N° OP</th>
                      <th style={styles.th}>BÉNÉFICIAIRE</th>
                      <th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th>
                      <th style={{ ...styles.th, width: 120 }}>BOÎTE</th>
                      <th style={{ ...styles.th, width: 100 }}>ARCHIVÉ LE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opsArchives.map(op => {
                      const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                      return (
                        <tr key={op.id}>
                          <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td>
                          <td style={{ ...styles.td, fontSize: 12 }}>{ben?.nom || 'N/A'}</td>
                          <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                          <td style={{ ...styles.td, fontWeight: 700, color: '#795548' }}>{op.boiteArchivage || '-'}</td>
                          <td style={{ ...styles.td, fontSize: 12 }}>{op.dateArchivage || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PageBordereaux;
