import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { ARMOIRIE } from '../utils/logos';

const PageBordereaux = () => {
  const { projet, sources, exercices, beneficiaires, ops, bordereaux } = useAppContext();

  const [mainTab, setMainTab] = useState('CF');
  const [subTabCF, setSubTabCF] = useState('NOUVEAU');
  const [subTabAC, setSubTabAC] = useState('NOUVEAU');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [selectedOps, setSelectedOps] = useState([]);
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchBT, setSearchBT] = useState('');
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');
  const [dateResultat, setDateResultat] = useState(new Date().toISOString().split('T')[0]);
  const [resultatAC, setResultatAC] = useState('PAIEMENT');
  const [motifRetourAC, setMotifRetourAC] = useState('');
  const [dateResultatAC, setDateResultatAC] = useState(new Date().toISOString().split('T')[0]);
  const [paiementMontant, setPaiementMontant] = useState('');
  const [paiementReference, setPaiementReference] = useState('');
  const [datePaiement, setDatePaiement] = useState(new Date().toISOString().split('T')[0]);
  const [boiteArchivage, setBoiteArchivage] = useState('');
  const [dateReintroduction, setDateReintroduction] = useState(new Date().toISOString().split('T')[0]);
  const [expandedBT, setExpandedBT] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [showAddOps, setShowAddOps] = useState(null);

  const exerciceActifLocal = exercices.find(e => e.actif);
  const currentSrc = sources.find(s => s.id === activeSourceBT);
  const opsForSource = ops.filter(op => op.sourceId === activeSourceBT && op.exerciceId === exerciceActifLocal?.id);

  const opsEligiblesCF = opsForSource.filter(op => op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF');
  const opsTransmisCF = opsForSource.filter(op => op.statut === 'TRANSMIS_CF');
  const opsDifferesCF = opsForSource.filter(op => op.statut === 'DIFFERE_CF');
  const opsRejetesCF = opsForSource.filter(op => op.statut === 'REJETE_CF');
  const opsEligiblesAC = opsForSource.filter(op => op.statut === 'VISE_CF');
  const opsTransmisAC = opsForSource.filter(op => op.statut === 'TRANSMIS_AC' || op.statut === 'PAYE_PARTIEL');
  const opsDifferesAC = opsForSource.filter(op => op.statut === 'DIFFERE_AC');
  const opsRejetesAC = opsForSource.filter(op => op.statut === 'REJETE_AC');
  const opsFileArchive = opsForSource.filter(op => op.statut === 'PAYE');
  const opsArchives = opsForSource.filter(op => op.statut === 'ARCHIVE');

  const bordereauCF = bordereaux.filter(bt => bt.type === 'CF' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);
  const bordereauAC = bordereaux.filter(bt => bt.type === 'AC' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);

  const filterBordereaux = (btList) => btList.filter(bt => {
    if (!searchBT) return true;
    const term = searchBT.toLowerCase();
    if ((bt.numero || '').toLowerCase().includes(term)) return true;
    return bt.opsIds?.some(opId => {
      const op = ops.find(o => o.id === opId);
      const ben = beneficiaires.find(b => b.id === op?.beneficiaireId);
      return (op?.numero || '').toLowerCase().includes(term) || (ben?.nom || '').toLowerCase().includes(term) || (op?.objet || '').toLowerCase().includes(term);
    });
  });

  const filterOps = (opsList) => opsList.filter(op => {
    if (!searchBT) return true;
    const term = searchBT.toLowerCase();
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    return (op.numero || '').toLowerCase().includes(term) || (ben?.nom || '').toLowerCase().includes(term) || (op.objet || '').toLowerCase().includes(term);
  });

  const toggleOp = (opId) => setSelectedOps(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  const toggleAll = (opsList) => {
    const filtered = filterOps(opsList);
    if (selectedOps.length === filtered.length && filtered.length > 0) setSelectedOps([]);
    else setSelectedOps(filtered.map(op => op.id));
  };
  const totalSelected = selectedOps.reduce((sum, id) => sum + (ops.find(o => o.id === id)?.montant || 0), 0);

  const genererNumeroBT = (typeBT) => {
    const prefix = typeBT === 'CF' ? 'BT-CF' : 'BT-AC';
    const sigleProjet = projet?.sigle || 'PROJET';
    const sigleSrc = currentSrc?.sigle || 'SRC';
    const annee = exerciceActifLocal?.annee || new Date().getFullYear();
    const existants = bordereaux.filter(bt => bt.type === typeBT && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);
    return `${prefix}-${String(existants.length + 1).padStart(4, '0')}/${sigleProjet}-${sigleSrc}/${annee}`;
  };

  // === ACTIONS ===

  const handleCreateBordereau = async (typeBT) => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }
    const numero = genererNumeroBT(typeBT);
    if (!window.confirm(`Créer le bordereau ${numero} avec ${selectedOps.length} OP pour un total de ${formatMontant(totalSelected)} F ?`)) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'bordereaux'), {
        numero, type: typeBT, sourceId: activeSourceBT, exerciceId: exerciceActifLocal.id,
        dateCreation: new Date().toISOString().split('T')[0], dateTransmission: null,
        opsIds: selectedOps, nbOps: selectedOps.length, totalMontant: totalSelected,
        statut: 'EN_COURS', observations: observations.trim(), createdAt: new Date().toISOString()
      });
      const btField = typeBT === 'CF' ? 'bordereauCF' : 'bordereauAC';
      for (const opId of selectedOps) await updateDoc(doc(db, 'ops', opId), { [btField]: numero, updatedAt: new Date().toISOString() });
      alert(`Bordereau ${numero} créé.`);
      setSelectedOps([]); setObservations('');
      if (typeBT === 'CF') setSubTabCF('BORDEREAUX'); else setSubTabAC('BORDEREAUX');
    } catch (error) { alert('Erreur : ' + error.message); }
    setSaving(false);
  };

  const handleTransmettre = async (bt) => {
    if (!editDate || !/^\d{4}-\d{2}-\d{2}$/.test(editDate)) { alert('Date invalide.'); return; }
    const label = bt.type === 'CF' ? 'au CF' : "à l'AC";
    if (!window.confirm(`Transmettre ${bt.numero} ${label} le ${editDate} ?`)) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'bordereaux', bt.id), { dateTransmission: editDate, statut: 'ENVOYE', updatedAt: new Date().toISOString() });
      const newStatut = bt.type === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC';
      const dateField = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      for (const opId of bt.opsIds) await updateDoc(doc(db, 'ops', opId), { statut: newStatut, [dateField]: editDate, updatedAt: new Date().toISOString() });
      alert(`Bordereau transmis ${label}.`); setEditDate('');
    } catch (error) { alert('Erreur : ' + error.message); }
    setSaving(false);
  };

  const handleAddOpToBT = async (bt, opId) => {
    if (bt.statut !== 'EN_COURS') { alert('Bordereau déjà transmis.'); return; }
    try {
      const newOpsIds = [...bt.opsIds, opId];
      const newTotal = newOpsIds.reduce((sum, id) => sum + (ops.find(x => x.id === id)?.montant || 0), 0);
      await updateDoc(doc(db, 'bordereaux', bt.id), { opsIds: newOpsIds, nbOps: newOpsIds.length, totalMontant: newTotal, updatedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'ops', opId), { [bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC']: bt.numero, updatedAt: new Date().toISOString() });
      setShowAddOps(null);
    } catch (error) { alert('Erreur : ' + error.message); }
  };

  const handleRemoveOpFromBT = async (bt, opId) => {
    if (bt.statut !== 'EN_COURS') return;
    if (bt.opsIds.length <= 1) { alert('Le bordereau doit contenir au moins 1 OP.'); return; }
    if (!window.confirm('Retirer cet OP ?')) return;
    try {
      const newOpsIds = bt.opsIds.filter(id => id !== opId);
      const newTotal = newOpsIds.reduce((sum, id) => sum + (ops.find(x => x.id === id)?.montant || 0), 0);
      await updateDoc(doc(db, 'bordereaux', bt.id), { opsIds: newOpsIds, nbOps: newOpsIds.length, totalMontant: newTotal, updatedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'ops', opId), { [bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC']: null, updatedAt: new Date().toISOString() });
    } catch (error) { alert('Erreur : ' + error.message); }
  };

  const handleDeleteBordereau = async (bt) => {
    const pwd = window.prompt('Mot de passe requis :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) { if (pwd !== null) alert('Mot de passe incorrect'); return; }
    if (!window.confirm(`Supprimer ${bt.numero} ?`)) return;
    try {
      const prevStatut = bt.type === 'CF' ? (bt.statut === 'EN_COURS' ? null : 'EN_COURS') : (bt.statut === 'EN_COURS' ? null : 'VISE_CF');
      const dateField = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      const btField = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';
      for (const opId of bt.opsIds) {
        const upd = { [btField]: null, updatedAt: new Date().toISOString() };
        if (prevStatut) { upd.statut = prevStatut; upd[dateField] = null; }
        await updateDoc(doc(db, 'ops', opId), upd);
      }
      await deleteDoc(doc(db, 'bordereaux', bt.id));
      alert('Bordereau supprimé.');
      if (expandedBT === bt.id) setExpandedBT(null);
    } catch (error) { alert('Erreur : ' + error.message); }
  };

  const handleRetourCF = async () => {
    if (selectedOps.length === 0) { alert('Sélectionnez au moins un OP.'); return; }
    if ((resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && !motifRetour.trim()) { alert('Le motif est obligatoire.'); return; }
    const labelR = resultatCF === 'VISE' ? 'Visé' : resultatCF === 'DIFFERE' ? 'Différé' : 'Rejeté';
    if (!window.confirm(`Marquer ${selectedOps.length} OP comme "${labelR}" ?`)) return;
    setSaving(true);
    try {
      let upd = { updatedAt: new Date().toISOString() };
      if (resultatCF === 'VISE') { upd.statut = 'VISE_CF'; upd.dateVisaCF = dateResultat; }
      else if (resultatCF === 'DIFFERE') { upd.statut = 'DIFFERE_CF'; upd.dateDiffere = dateResultat; upd.motifDiffere = motifRetour.trim(); }
      else { upd.statut = 'REJETE_CF'; upd.dateRejet = dateResultat; upd.motifRejet = motifRetour.trim(); }
      for (const opId of selectedOps) await updateDoc(doc(db, 'ops', opId), upd);
      alert(`${selectedOps.length} OP marqués "${labelR}".`);
      setSelectedOps([]); setMotifRetour('');
    } catch (error) { alert('Erreur : ' + error.message); }
    setSaving(false);
  };

  const handleRetourAC = async () => {
    if (selectedOps.length === 0) { alert('Sélectionnez au moins un OP.'); return; }
    if (!motifRetourAC.trim()) { alert('Le motif est obligatoire.'); return; }
    const labelR = resultatAC === 'DIFFERE' ? 'Différé AC' : 'Rejeté AC';
    if (!window.confirm(`Marquer ${selectedOps.length} OP comme "${labelR}" ?`)) return;
    setSaving(true);
    try {
      let upd = { updatedAt: new Date().toISOString() };
      if (resultatAC === 'DIFFERE') { upd.statut = 'DIFFERE_AC'; upd.dateDiffere = dateResultatAC; upd.motifDiffere = motifRetourAC.trim(); }
      else { upd.statut = 'REJETE_AC'; upd.dateRejet = dateResultatAC; upd.motifRejet = motifRetourAC.trim(); }
      for (const opId of selectedOps) await updateDoc(doc(db, 'ops', opId), upd);
      alert(`${selectedOps.length} OP marqués "${labelR}".`);
      setSelectedOps([]); setMotifRetourAC('');
    } catch (error) { alert('Erreur : ' + error.message); }
    setSaving(false);
  };

  const handlePaiement = async (opId) => {
    const op = ops.find(o => o.id === opId);
    if (!op) return;
    const montant = parseFloat(paiementMontant);
    if (!montant || montant <= 0) { alert('Montant invalide.'); return; }
    if (!datePaiement) { alert('Date requise.'); return; }
    const paiements = op.paiements || [];
    const dejaPaye = paiements.reduce((s, p) => s + (p.montant || 0), 0);
    const reste = (op.montant || 0) - dejaPaye;
    if (montant > reste + 1) { alert(`Le montant dépasse le reste (${formatMontant(reste)} F).`); return; }
    const newPaiements = [...paiements, { date: datePaiement, montant, reference: paiementReference.trim(), createdAt: new Date().toISOString() }];
    const totalPaye = newPaiements.reduce((s, p) => s + (p.montant || 0), 0);
    const solde = (op.montant || 0) - totalPaye < 1;
    if (!window.confirm(`Paiement de ${formatMontant(montant)} F ?\n\nTotal : ${formatMontant(totalPaye)} / ${formatMontant(op.montant)}\n${solde ? '→ Soldé → Archive auto' : '→ Partiel'}`)) return;
    setSaving(true);
    try {
      const upd = { paiements: newPaiements, totalPaye, datePaiement, updatedAt: new Date().toISOString() };
      if (solde) { upd.statut = 'ARCHIVE'; upd.dateArchivage = datePaiement; } else { upd.statut = 'PAYE_PARTIEL'; }
      await updateDoc(doc(db, 'ops', opId), upd);
      alert(solde ? 'OP soldé et archivé.' : `Paiement partiel. Reste : ${formatMontant((op.montant || 0) - totalPaye)} F`);
      setPaiementMontant(''); setPaiementReference('');
    } catch (error) { alert('Erreur : ' + error.message); }
    setSaving(false);
  };

  const handleAnnulerPaiement = async (opId) => {
    const op = ops.find(o => o.id === opId);
    const paiements = op?.paiements || [];
    if (paiements.length === 0) return;
    const pwd = window.prompt('Mot de passe requis :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) { if (pwd !== null) alert('Mot de passe incorrect'); return; }
    const dernier = paiements[paiements.length - 1];
    if (!window.confirm(`Annuler paiement de ${formatMontant(dernier.montant)} F du ${dernier.date} ?`)) return;
    setSaving(true);
    try {
      const newP = paiements.slice(0, -1);
      const totalPaye = newP.reduce((s, p) => s + (p.montant || 0), 0);
      const upd = { paiements: newP, totalPaye, statut: newP.length > 0 ? 'PAYE_PARTIEL' : 'TRANSMIS_AC', updatedAt: new Date().toISOString() };
      if (newP.length === 0) upd.datePaiement = null;
      if (op.statut === 'ARCHIVE') upd.dateArchivage = null;
      await updateDoc(doc(db, 'ops', opId), upd);
      alert('Paiement annulé.');
    } catch (error) { alert('Erreur : ' + error.message); }
    setSaving(false);
  };

  const handleReintroduire = async (opIds, date, type = 'CF') => {
    if (!date) { alert('Date requise.'); return; }
    if (!window.confirm(`Réintroduire ${opIds.length} OP ?`)) return;
    setSaving(true);
    try {
      for (const opId of opIds) {
        const op = ops.find(o => o.id === opId);
        const hist = [...(op?.historiqueDifferes || []), { dateDiffere: op?.dateDiffere, motifDiffere: op?.motifDiffere, dateReintroduction: date, type }];
        const upd = { statut: type === 'CF' ? 'EN_COURS' : 'TRANSMIS_AC', dateReintroduction: date, historiqueDifferes: hist, updatedAt: new Date().toISOString() };
        if (type === 'CF') { upd.bordereauCF = null; upd.dateTransmissionCF = null; }
        await updateDoc(doc(db, 'ops', opId), upd);
      }
      alert(`${opIds.length} OP réintroduit(s).`); setSelectedOps([]);
    } catch (error) { alert('Erreur : ' + error.message); }
    setSaving(false);
  };

  const handleArchiver = async () => {
    if (selectedOps.length === 0 || !boiteArchivage.trim()) return;
    if (!window.confirm(`Archiver ${selectedOps.length} OP dans "${boiteArchivage}" ?`)) return;
    setSaving(true);
    try {
      for (const opId of selectedOps) await updateDoc(doc(db, 'ops', opId), { statut: 'ARCHIVE', boiteArchivage: boiteArchivage.trim(), dateArchivage: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() });
      alert(`${selectedOps.length} OP archivés.`); setSelectedOps([]); setBoiteArchivage('');
    } catch (error) { alert('Erreur : ' + error.message); }
    setSaving(false);
  };

  // === IMPRESSION ===
  const handlePrintBordereau = (bt) => {
    const src = sources.find(s => s.id === bt.sourceId);
    const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const pc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${bt.numero}</title><style>@page{size:A4;margin:10mm}@media print{.toolbar{display:none!important}}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Century Gothic',sans-serif;font-size:11px;background:#e0e0e0}.toolbar{background:#1a1a2e;padding:12px 20px;display:flex;gap:12px;align-items:center;position:sticky;top:0;z-index:100}.toolbar button{padding:8px 20px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;background:#2196F3;color:white}.toolbar-title{color:rgba(255,255,255,0.7);margin-left:auto;font-size:12px}.page-container{width:210mm;min-height:297mm;margin:20px auto;background:white;padding:12mm;box-shadow:0 2px 10px rgba(0,0,0,0.3)}.header{display:flex;justify-content:space-between;margin-bottom:8px;padding-bottom:8px;border-bottom:2px solid #1a1a2e}.header-left{display:flex;align-items:center;gap:10px}.header-left img{width:55px}.header-left .info{font-size:9px;line-height:1.4}.header-right{text-align:right;font-size:9px}.bt-title{text-align:center;margin:15px 0;font-size:16px;font-weight:bold;text-transform:uppercase;text-decoration:underline}.bt-numero{text-align:center;font-size:13px;font-weight:bold;margin-bottom:5px}.bt-date{text-align:center;font-size:11px;margin-bottom:15px}table{width:100%;border-collapse:collapse;margin-bottom:15px}th{background:#1a1a2e;color:white;padding:6px 8px;font-size:9px;text-align:left}td{padding:5px 8px;font-size:10px;border-bottom:1px solid #ddd}tr:nth-child(even){background:#f8f8f8}.total-row{font-weight:bold;background:#e8f5e9!important;font-size:11px}.footer{margin-top:30px;display:flex;justify-content:space-between}.sign-block{width:45%;text-align:center}.sign-block .title{font-weight:bold;font-size:10px;margin-bottom:5px}.sign-block .line{border-bottom:1px dotted #333;height:60px}.accuse{margin-top:30px;padding:10px;border:1px dashed #999;font-size:10px}.accuse .title{font-weight:bold;margin-bottom:8px}</style></head><body><div class="toolbar"><button onclick="window.print()">Imprimer</button><span class="toolbar-title">${bt.numero}</span></div><div class="page-container"><div class="header"><div class="header-left"><img src="${ARMOIRIE}" alt=""/><div class="info"><div style="font-weight:bold">RÉPUBLIQUE DE CÔTE D'IVOIRE</div><div>Union - Discipline - Travail</div><div style="margin-top:4px;font-weight:bold">${projet?.ministere || ''}</div><div style="font-weight:bold">${projet?.nomProjet || ''}</div></div></div><div class="header-right"><div style="font-weight:bold;font-size:11px">${src?.nom || ''}</div><div>${src?.sigle || ''}</div></div></div><div class="bt-title">Bordereau de Transmission ${bt.type === 'CF' ? 'au Contrôleur Financier' : "à l'Agent Comptable"}</div><div class="bt-numero">${bt.numero}</div><div class="bt-date">Date : ${bt.dateTransmission || bt.dateCreation}</div><div style="margin-bottom:15px;font-size:11px"><strong>De :</strong> ${projet?.titreCoordonnateur || 'Le Coordonnateur'}<br/><strong>À :</strong> ${bt.type === 'CF' ? 'Monsieur le Contrôleur Financier' : "Monsieur l'Agent Comptable"}${bt.observations ? '<br/><strong>Objet :</strong> ' + bt.observations : ''}</div><table><thead><tr><th style="width:35px">N°</th><th style="width:130px">N° OP</th><th>BÉNÉFICIAIRE</th><th>OBJET</th><th style="width:65px">LIGNE</th><th style="width:100px;text-align:right">MONTANT</th></tr></thead><tbody>${btOps.map((op, i) => { const ben = beneficiaires.find(b => b.id === op.beneficiaireId); return `<tr><td>${i+1}</td><td style="font-family:monospace;font-weight:bold;font-size:9px">${op.numero}</td><td>${op.beneficiaireNom || ben?.nom || 'N/A'}</td><td>${op.objet || '-'}</td><td style="font-family:monospace">${op.ligneBudgetaire || '-'}</td><td style="text-align:right;font-family:monospace;font-weight:bold">${Number(op.montant || 0).toLocaleString('fr-FR')}</td></tr>`; }).join('')}<tr class="total-row"><td colspan="5" style="text-align:right">TOTAL (${btOps.length} OP)</td><td style="text-align:right;font-family:monospace">${Number(bt.totalMontant || 0).toLocaleString('fr-FR')}</td></tr></tbody></table><p style="font-size:10px;margin-bottom:20px">Arrêté le présent bordereau à la somme de <strong>${Number(bt.totalMontant || 0).toLocaleString('fr-FR')} FCFA</strong> pour <strong>${btOps.length}</strong> ordre(s) de paiement.</p><div class="footer"><div class="sign-block"><div class="title">${projet?.titreCoordonnateur || 'Le Coordonnateur'}</div><div class="line"></div><div style="font-size:9px;margin-top:4px">${projet?.coordonnateur || ''}</div></div><div class="sign-block"><div class="title">${bt.type === 'CF' ? 'Le Contrôleur Financier' : "L'Agent Comptable"}</div><div class="line"></div></div></div><div class="accuse"><div class="title">Accusé de réception</div><div>Reçu le : ____/____/________ à ____h____</div><div style="margin-top:5px">Nombre de dossiers : ________</div><div style="margin-top:5px">Nom et signature : _______________________________</div></div></div></body></html>`;
    const pw = window.open('', '_blank', 'width=900,height=700'); pw.document.write(pc); pw.document.close();
  };

  // === COMPOSANTS ===
  const Badge = ({ bg, color, children }) => <span style={{ background: bg, color, padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>;
  const EmptyState = ({ icon = '📭', text }) => <div style={{ textAlign: 'center', padding: 40, color: '#999' }}><div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div><p>{text}</p></div>;
  const SubTabBtn = ({ active, label, count, color, onClick }) => (
    <button onClick={onClick} style={{ padding: '9px 16px', borderRadius: 6, border: 'none', background: active ? color : '#f5f5f5', color: active ? 'white' : '#666', fontWeight: 600, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
      {label}{count !== undefined && <span style={{ background: active ? 'rgba(255,255,255,0.25)' : '#ddd', padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{count}</span>}
    </button>
  );

  const OPTable = ({ opsList, showCheckbox = true, extraColumns = [] }) => {
    const filtered = filterOps(opsList);
    return (
      <>
        <input type="text" placeholder="Rechercher OP..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...styles.input, marginBottom: 12, maxWidth: 400 }} />
        {filtered.length === 0 ? <EmptyState text="Aucun OP" /> : (
          <div style={{ maxHeight: 450, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 8 }}>
            <table style={{ ...styles.table, marginBottom: 0 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}><tr>
                {showCheckbox && <th style={{ ...styles.th, width: 36 }}><input type="checkbox" checked={selectedOps.length === filtered.length && filtered.length > 0} onChange={() => toggleAll(opsList)} /></th>}
                <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={styles.th}>OBJET</th><th style={{ ...styles.th, width: 70 }}>LIGNE</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th>
                {extraColumns.map(col => <th key={col.key} style={{ ...styles.th, width: col.width || 100, textAlign: col.align || 'left' }}>{col.label}</th>)}
              </tr></thead>
              <tbody>{filtered.map(op => {
                const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                const checked = selectedOps.includes(op.id);
                return (
                  <tr key={op.id} onClick={() => showCheckbox && toggleOp(op.id)} style={{ cursor: showCheckbox ? 'pointer' : 'default', background: checked ? '#e3f2fd' : 'transparent' }}>
                    {showCheckbox && <td style={styles.td}><input type="checkbox" checked={checked} onChange={() => toggleOp(op.id)} /></td>}
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                    <td style={{ ...styles.td, fontSize: 12 }}>{op.beneficiaireNom || ben?.nom || 'N/A'}</td>
                    <td style={{ ...styles.td, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire || '-'}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                    {extraColumns.map(col => <td key={col.key} style={{ ...styles.td, fontSize: 11, textAlign: col.align || 'left', ...(col.style || {}) }}>{col.render ? col.render(op) : (op[col.key] || '-')}</td>)}
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  // === LIGNE BORDEREAU COMPACTE ===
  const BordereauLine = ({ bt }) => {
    const isExpanded = expandedBT === bt.id;
    const isPrep = bt.statut === 'EN_COURS';
    const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const availableOps = bt.type === 'CF'
      ? opsForSource.filter(op => (op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF') && !bt.opsIds.includes(op.id))
      : opsForSource.filter(op => op.statut === 'VISE_CF' && !bt.opsIds.includes(op.id));
    return (
      <div style={{ marginBottom: 2 }}>
        <div onClick={() => { setExpandedBT(isExpanded ? null : bt.id); setEditDate(bt.dateTransmission || ''); setShowAddOps(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isExpanded ? '#e6f6f9' : isPrep ? '#fffde7' : 'white', borderRadius: isExpanded ? '10px 10px 0 0' : 10, border: isExpanded ? '1px solid #0891b2' : isPrep ? '1px dashed #f59e0b' : '1px solid #e0e0e0', borderBottom: isExpanded ? 'none' : undefined, cursor: 'pointer', transition: 'all 0.2s' }}>
          <span style={{ fontSize: 11, color: '#5f8a8b', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, minWidth: 200 }}>{bt.numero}</span>
          <span style={{ fontSize: 12, color: '#5f8a8b', minWidth: 90 }}>{bt.dateTransmission || bt.dateCreation}</span>
          <Badge bg={isPrep ? '#fef3cd' : '#d5f5f0'} color={isPrep ? '#b45309' : '#0d9488'}>{isPrep ? 'En cours' : 'Transmis'}</Badge>
          <span style={{ fontSize: 12, color: '#5f8a8b' }}>{bt.nbOps} OP</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, marginLeft: 'auto' }}>{formatMontant(bt.totalMontant)} F</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 8 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => handlePrintBordereau(bt)} title="Imprimer" style={{ background: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>🖨️</button>
            {(isPrep || bt.statut === 'ENVOYE') && <button onClick={() => handleDeleteBordereau(bt)} title="Supprimer" style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>🗑️</button>}
          </div>
        </div>
        {isExpanded && (
          <div style={{ border: '1px solid #0891b2', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16, background: 'white' }}>
            {isPrep && (
              <div style={{ background: '#fef3cd', borderRadius: 8, padding: 12, marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#b45309' }}>Date de transmission :</span>
                <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ ...styles.input, marginBottom: 0, width: 180 }} />
                {editDate && <button onClick={() => handleTransmettre(bt)} disabled={saving} style={{ ...styles.button, padding: '8px 20px', fontSize: 13, background: '#2e7d32', marginBottom: 0 }}>{saving ? '...' : 'Transmettre'}</button>}
              </div>
            )}
            {bt.observations && <div style={{ fontSize: 12, color: '#5f8a8b', marginBottom: 12 }}>Observations : {bt.observations}</div>}
            <table style={{ ...styles.table, fontSize: 11 }}>
              <thead><tr><th style={{ ...styles.th, width: 30 }}>N°</th><th style={{ ...styles.th, width: 120 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={styles.th}>OBJET</th><th style={{ ...styles.th, width: 100, textAlign: 'right' }}>MONTANT</th>{isPrep && <th style={{ ...styles.th, width: 50, textAlign: 'center' }}>⚙️</th>}</tr></thead>
              <tbody>{btOps.map((op, i) => {
                const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                return (<tr key={op.id}><td style={styles.td}>{i + 1}</td><td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td><td style={{ ...styles.td, fontSize: 11 }}>{op.beneficiaireNom || ben?.nom || 'N/A'}</td><td style={{ ...styles.td, fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td><td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>{isPrep && <td style={{ ...styles.td, textAlign: 'center' }}><button onClick={() => handleRemoveOpFromBT(bt, op.id)} style={{ background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>✕</button></td>}</tr>);
              })}</tbody>
            </table>
            {isPrep && (
              <div style={{ marginTop: 10 }}>
                <button onClick={() => setShowAddOps(showAddOps === bt.id ? null : bt.id)} style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>{showAddOps === bt.id ? '✕ Fermer' : '➕ Ajouter un OP'}</button>
                {showAddOps === bt.id && (
                  <div style={{ marginTop: 8, padding: 12, background: '#e8f5e9', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {availableOps.length === 0 ? <span style={{ fontSize: 12, color: '#999' }}>Aucun OP disponible</span> :
                      availableOps.map(op => {
                        const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                        return (<div key={op.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #c8e6c9' }}><span style={{ fontSize: 11 }}><strong style={{ fontFamily: 'monospace' }}>{op.numero}</strong> — {op.beneficiaireNom || ben?.nom || 'N/A'} — {formatMontant(op.montant)} F</span><button onClick={() => handleAddOpToBT(bt, op.id)} style={{ background: '#2e7d32', color: 'white', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>+ Ajouter</button></div>);
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // === SUIVI DIFFÉRÉS/REJETÉS ===
  const SuiviSection = ({ differes, rejetes, type, onReintroduire }) => (
    <>
      {differes.length > 0 && (
        <div style={{ ...styles.card, marginTop: 16, border: '2px solid #f59e0b' }}>
          <h3 style={{ margin: '0 0 12px', color: '#b45309', fontSize: 15 }}>⏸ Différés {type} ({differes.length})</h3>
          <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
            <table style={styles.table}><thead><tr>
              <th style={{ ...styles.th, width: 36 }}><input type="checkbox" checked={selectedOps.length === differes.length && differes.length > 0} onChange={() => { if (selectedOps.length === differes.length) setSelectedOps([]); else setSelectedOps(differes.map(op => op.id)); }} /></th>
              <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 90 }}>DATE</th><th style={styles.th}>MOTIF</th>
            </tr></thead><tbody>{differes.map(op => {
              const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
              const checked = selectedOps.includes(op.id);
              return (<tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: checked ? '#fef3cd' : 'transparent' }}>
                <td style={styles.td}><input type="checkbox" checked={checked} onChange={() => toggleOp(op.id)} /></td>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td>
                <td style={{ ...styles.td, fontSize: 12 }}>{op.beneficiaireNom || ben?.nom || 'N/A'}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                <td style={{ ...styles.td, fontSize: 12 }}>{op.dateDiffere || '-'}</td>
                <td style={{ ...styles.td, fontSize: 11 }}>{op.motifDiffere || '-'}</td>
              </tr>);
            })}</tbody></table>
          </div>
          {selectedOps.length > 0 && selectedOps.some(id => differes.find(op => op.id === id)) && (
            <div style={{ marginTop: 12, padding: 12, background: '#fef3cd', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Date réintroduction</label><input type="date" value={dateReintroduction} onChange={e => setDateReintroduction(e.target.value)} style={{ ...styles.input, marginBottom: 0 }} /></div>
              <button onClick={() => onReintroduire(selectedOps, dateReintroduction)} disabled={saving} style={{ ...styles.button, padding: '10px 24px', background: '#f59e0b', marginBottom: 0 }}>{saving ? '...' : `Réintroduire (${selectedOps.length})`}</button>
            </div>
          )}
        </div>
      )}
      {rejetes.length > 0 && (
        <div style={{ ...styles.card, marginTop: 16, border: '2px solid #dc2626' }}>
          <h3 style={{ margin: '0 0 12px', color: '#dc2626', fontSize: 15 }}>✕ Rejetés {type} ({rejetes.length})</h3>
          <div style={{ overflowX: 'auto', maxHeight: 300, overflowY: 'auto' }}>
            <table style={styles.table}><thead><tr>
              <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 90 }}>DATE</th><th style={styles.th}>MOTIF</th>
            </tr></thead><tbody>{rejetes.map(op => {
              const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
              return (<tr key={op.id} style={{ background: '#fef2f2' }}>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td>
                <td style={{ ...styles.td, fontSize: 12 }}>{op.beneficiaireNom || ben?.nom || 'N/A'}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#dc2626' }}>{formatMontant(op.montant)}</td>
                <td style={{ ...styles.td, fontSize: 12 }}>{op.dateRejet || '-'}</td>
                <td style={{ ...styles.td, fontSize: 11 }}>{op.motifRejet || '-'}</td>
              </tr>);
            })}</tbody></table>
          </div>
        </div>
      )}
    </>
  );

  // === RENDU PRINCIPAL ===
  const changeTab = (tab) => { setMainTab(tab); setSelectedOps([]); setSearchBT(''); setExpandedBT(null); };
  const changeSubTab = (setter, val) => { setter(val); setSelectedOps([]); setSearchBT(''); setExpandedBT(null); };

  return (
    <div>
      <div style={{ background: '#1a1a2e', color: 'white', padding: '20px 24px', borderRadius: '10px 10px 0 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Circuit de validation</h1>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '16px 0', flexWrap: 'wrap' }}>
        {sources.map(src => (
          <button key={src.id} onClick={() => { setActiveSourceBT(src.id); setSelectedOps([]); setExpandedBT(null); }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: activeSourceBT === src.id ? (src.couleur || '#0f4c3a') : '#f0f0f0', color: activeSourceBT === src.id ? 'white' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>{src.sigle}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[{ key: 'CF', label: 'Contrôle Financier', color: '#1565c0' }, { key: 'AC', label: 'Agent Comptable', color: '#2e7d32' }, { key: 'ARCHIVES', label: 'Archives', color: '#795548' }].map(tab => (
          <button key={tab.key} onClick={() => changeTab(tab.key)}
            style={{ flex: 1, padding: '14px 12px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: mainTab === tab.key ? tab.color : '#e0e0e0', color: mainTab === tab.key ? 'white' : '#666', borderRadius: 8 }}>{tab.label}</button>
        ))}
      </div>

      {/* CF */}
      {mainTab === 'CF' && (<div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <SubTabBtn active={subTabCF === 'NOUVEAU'} label="Nouveau BT" count={opsEligiblesCF.length} color="#1565c0" onClick={() => changeSubTab(setSubTabCF, 'NOUVEAU')} />
          <SubTabBtn active={subTabCF === 'BORDEREAUX'} label="Bordereaux" count={bordereauCF.length} color="#0d47a1" onClick={() => changeSubTab(setSubTabCF, 'BORDEREAUX')} />
          <SubTabBtn active={subTabCF === 'RETOUR'} label="Retour CF" count={opsTransmisCF.length} color="#e65100" onClick={() => changeSubTab(setSubTabCF, 'RETOUR')} />
          <SubTabBtn active={subTabCF === 'SUIVI'} label="Suivi" count={opsDifferesCF.length + opsRejetesCF.length} color="#c62828" onClick={() => changeSubTab(setSubTabCF, 'SUIVI')} />
        </div>

        {subTabCF === 'NOUVEAU' && (<div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#1565c0' }}>Sélectionner les OP pour un nouveau bordereau au CF</h3>
          <OPTable opsList={opsEligiblesCF} extraColumns={[{ key: 'statut', label: 'STATUT', width: 80, render: (op) => <Badge bg={op.statut === 'DIFFERE_CF' ? '#fef3cd' : '#e3f2fd'} color={op.statut === 'DIFFERE_CF' ? '#b45309' : '#1565c0'}>{op.statut === 'DIFFERE_CF' ? 'Différé' : 'En cours'}</Badge> }]} />
          {selectedOps.length > 0 && (<div style={{ marginTop: 16, padding: 16, background: '#e3f2fd', borderRadius: 8, border: '1px solid #bbdefb' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{selectedOps.length} OP — Total : <span style={{ color: '#1565c0' }}>{formatMontant(totalSelected)} F</span><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#666', marginLeft: 16 }}>N° : {genererNumeroBT('CF')}</span></div>
            <textarea placeholder="Observations (facultatif)..." value={observations} onChange={e => setObservations(e.target.value)} style={{ ...styles.input, minHeight: 50, resize: 'vertical', marginBottom: 12 }} />
            <button onClick={() => handleCreateBordereau('CF')} disabled={saving} style={{ ...styles.button, padding: '14px', fontSize: 15, background: '#1565c0', width: '100%' }}>{saving ? 'Création...' : `Créer le bordereau (${selectedOps.length} OP)`}</button>
          </div>)}
        </div>)}

        {subTabCF === 'BORDEREAUX' && (<div style={styles.card}>
          <input type="text" placeholder="Rechercher bordereau ou OP..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...styles.input, marginBottom: 16, maxWidth: 400 }} />
          {filterBordereaux(bordereauCF).length === 0 ? <EmptyState text="Aucun bordereau CF" /> : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>{filterBordereaux(bordereauCF).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(bt => <BordereauLine key={bt.id} bt={bt} />)}</div>
          )}
        </div>)}

        {subTabCF === 'RETOUR' && (<div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#e65100' }}>En attente de retour du CF ({opsTransmisCF.length})</h3>
          {opsTransmisCF.length === 0 ? <EmptyState text="Aucun OP en attente" /> : (<>
            <OPTable opsList={opsTransmisCF} extraColumns={[{ key: 'dateTransmissionCF', label: 'TRANSMIS LE', width: 100 }, { key: 'bordereauCF', label: 'N° BT', width: 120, style: { fontFamily: 'monospace', fontSize: 9 } }]} />
            {selectedOps.length > 0 && selectedOps.some(id => opsTransmisCF.find(op => op.id === id)) && (<div style={{ marginTop: 16, padding: 16, background: '#fff3e0', borderRadius: 8, border: '1px solid #ffe0b2' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Retour CF — {selectedOps.length} OP — {formatMontant(totalSelected)} F</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 250 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Résultat</label>
                  <div style={{ display: 'flex', gap: 6 }}>{[{ val: 'VISE', label: '✅ Visé', color: '#2e7d32', bg: '#e8f5e9' }, { val: 'DIFFERE', label: '⏸ Différé', color: '#e65100', bg: '#fff3e0' }, { val: 'REJETE', label: '✕ Rejeté', color: '#c62828', bg: '#ffebee' }].map(opt => (
                    <button key={opt.val} onClick={() => setResultatCF(opt.val)} style={{ flex: 1, padding: '10px 8px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: resultatCF === opt.val ? `3px solid ${opt.color}` : '2px solid #ddd', background: resultatCF === opt.val ? opt.bg : 'white', color: resultatCF === opt.val ? opt.color : '#999' }}>{opt.label}</button>
                  ))}</div>
                </div>
                <div style={{ flex: 1, minWidth: 180 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Date</label><input type="date" value={dateResultat} onChange={e => setDateResultat(e.target.value)} style={{ ...styles.input, marginBottom: 0 }} /></div>
              </div>
              {(resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && (<div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#c62828' }}>Motif (obligatoire) *</label><textarea value={motifRetour} onChange={e => setMotifRetour(e.target.value)} placeholder="Saisir le motif..." style={{ ...styles.input, minHeight: 60, resize: 'vertical', marginBottom: 0 }} /></div>)}
              <button onClick={handleRetourCF} disabled={saving} style={{ ...styles.button, padding: '14px', fontSize: 15, width: '100%', background: resultatCF === 'VISE' ? '#2e7d32' : resultatCF === 'DIFFERE' ? '#e65100' : '#c62828' }}>{saving ? '...' : `Valider (${selectedOps.length} OP)`}</button>
            </div>)}
          </>)}
        </div>)}

        {subTabCF === 'SUIVI' && (<div>
          {opsDifferesCF.length === 0 && opsRejetesCF.length === 0 ? <div style={styles.card}><EmptyState text="Aucun OP différé ou rejeté" /></div> :
            <SuiviSection differes={opsDifferesCF} rejetes={opsRejetesCF} type="CF" onReintroduire={(ids, date) => handleReintroduire(ids, date, 'CF')} />}
        </div>)}
      </div>)}

      {/* AC */}
      {mainTab === 'AC' && (<div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <SubTabBtn active={subTabAC === 'NOUVEAU'} label="Nouveau BT" count={opsEligiblesAC.length} color="#2e7d32" onClick={() => changeSubTab(setSubTabAC, 'NOUVEAU')} />
          <SubTabBtn active={subTabAC === 'BORDEREAUX'} label="Bordereaux" count={bordereauAC.length} color="#1b5e20" onClick={() => changeSubTab(setSubTabAC, 'BORDEREAUX')} />
          <SubTabBtn active={subTabAC === 'PAIEMENT'} label="Paiements" count={opsTransmisAC.length} color="#6a1b9a" onClick={() => changeSubTab(setSubTabAC, 'PAIEMENT')} />
          <SubTabBtn active={subTabAC === 'SUIVI'} label="Suivi" count={opsDifferesAC.length + opsRejetesAC.length} color="#c62828" onClick={() => changeSubTab(setSubTabAC, 'SUIVI')} />
        </div>

        {subTabAC === 'NOUVEAU' && (<div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#2e7d32' }}>Sélectionner les OP visés pour un bordereau à l'AC</h3>
          <OPTable opsList={opsEligiblesAC} extraColumns={[{ key: 'dateVisaCF', label: 'VISA CF', width: 100 }]} />
          {selectedOps.length > 0 && (<div style={{ marginTop: 16, padding: 16, background: '#e8f5e9', borderRadius: 8, border: '1px solid #c8e6c9' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{selectedOps.length} OP — Total : <span style={{ color: '#2e7d32' }}>{formatMontant(totalSelected)} F</span></div>
            <textarea placeholder="Observations..." value={observations} onChange={e => setObservations(e.target.value)} style={{ ...styles.input, minHeight: 50, resize: 'vertical', marginBottom: 12 }} />
            <button onClick={() => handleCreateBordereau('AC')} disabled={saving} style={{ ...styles.button, padding: '14px', fontSize: 15, background: '#2e7d32', width: '100%' }}>{saving ? '...' : `Créer le bordereau (${selectedOps.length} OP)`}</button>
          </div>)}
        </div>)}

        {subTabAC === 'BORDEREAUX' && (<div style={styles.card}>
          <input type="text" placeholder="Rechercher bordereau ou OP..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...styles.input, marginBottom: 16, maxWidth: 400 }} />
          {filterBordereaux(bordereauAC).length === 0 ? <EmptyState text="Aucun bordereau AC" /> : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>{filterBordereaux(bordereauAC).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(bt => <BordereauLine key={bt.id} bt={bt} />)}</div>
          )}
        </div>)}

        {subTabAC === 'PAIEMENT' && (<div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#6a1b9a' }}>OP chez l'AC — Paiements ({opsTransmisAC.length})</h3>
          {opsTransmisAC.length === 0 ? <EmptyState text="Aucun OP en attente" /> : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>{opsTransmisAC.map(op => {
              const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
              const paiements = op.paiements || [];
              const totalPaye = paiements.reduce((s, p) => s + (p.montant || 0), 0);
              const reste = (op.montant || 0) - totalPaye;
              return (<div key={op.id} style={{ border: '1px solid #e0e0e0', borderRadius: 10, padding: 14, marginBottom: 10, background: op.statut === 'PAYE_PARTIEL' ? '#faf5ff' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div><span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>{op.numero}</span><span style={{ fontSize: 12, marginLeft: 12, color: '#5f8a8b' }}>{op.beneficiaireNom || ben?.nom || 'N/A'}</span></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{formatMontant(op.montant)} F</div>{totalPaye > 0 && <div style={{ fontSize: 11, color: '#6a1b9a' }}>Payé : {formatMontant(totalPaye)} — Reste : <strong style={{ color: reste > 0 ? '#c62828' : '#2e7d32' }}>{formatMontant(reste)}</strong></div>}</div>
                </div>
                {paiements.length > 0 && (<div style={{ marginBottom: 10, fontSize: 11, background: '#f5f0ff', borderRadius: 6, padding: 8 }}>
                  {paiements.map((p, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: i < paiements.length - 1 ? '1px solid #e8e0f0' : 'none' }}><span>{p.date} — {p.reference || 'Sans réf.'}</span><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(p.montant)} F</span></div>)}
                </div>)}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div><label style={{ display: 'block', fontSize: 10, fontWeight: 600, marginBottom: 3 }}>Date</label><input type="date" value={datePaiement} onChange={e => setDatePaiement(e.target.value)} style={{ ...styles.input, marginBottom: 0, width: 140, fontSize: 12 }} /></div>
                  <div><label style={{ display: 'block', fontSize: 10, fontWeight: 600, marginBottom: 3 }}>Montant</label><input type="number" value={paiementMontant} onChange={e => setPaiementMontant(e.target.value)} placeholder={String(reste)} style={{ ...styles.input, marginBottom: 0, width: 130, fontSize: 12 }} /></div>
                  <div><label style={{ display: 'block', fontSize: 10, fontWeight: 600, marginBottom: 3 }}>Référence</label><input type="text" value={paiementReference} onChange={e => setPaiementReference(e.target.value)} placeholder="VIR-..." style={{ ...styles.input, marginBottom: 0, width: 130, fontSize: 12 }} /></div>
                  <button onClick={() => handlePaiement(op.id)} disabled={saving} style={{ ...styles.button, padding: '8px 16px', background: '#6a1b9a', marginBottom: 0, fontSize: 12 }}>{saving ? '...' : 'Payer'}</button>
                  {paiements.length > 0 && <button onClick={() => handleAnnulerPaiement(op.id)} disabled={saving} style={{ ...styles.button, padding: '8px 12px', background: '#78909c', marginBottom: 0, fontSize: 11 }}>Annuler dernier</button>}
                </div>
                {op.statut === 'TRANSMIS_AC' && (<div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e0e0e0', display: 'flex', gap: 8 }}>
                  <button onClick={() => { setResultatAC('DIFFERE'); setSelectedOps([op.id]); }} style={{ padding: '6px 14px', border: '1px solid #f59e0b', background: '#fef3cd', color: '#b45309', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>⏸ Différer</button>
                  <button onClick={() => { setResultatAC('REJETE'); setSelectedOps([op.id]); }} style={{ padding: '6px 14px', border: '1px solid #dc2626', background: '#fee2e2', color: '#dc2626', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✕ Rejeter</button>
                </div>)}
              </div>);
            })}</div>
          )}
          {selectedOps.length > 0 && (resultatAC === 'DIFFERE' || resultatAC === 'REJETE') && selectedOps.some(id => opsTransmisAC.find(op => op.id === id)) && (
            <div style={{ marginTop: 16, padding: 16, background: resultatAC === 'DIFFERE' ? '#fef3cd' : '#fee2e2', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: resultatAC === 'DIFFERE' ? '#b45309' : '#dc2626' }}>{resultatAC === 'DIFFERE' ? '⏸ Différer' : '✕ Rejeter'} — {selectedOps.length} OP</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}><div style={{ minWidth: 180 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Date</label><input type="date" value={dateResultatAC} onChange={e => setDateResultatAC(e.target.value)} style={{ ...styles.input, marginBottom: 0 }} /></div></div>
              <div style={{ marginBottom: 12 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#c62828' }}>Motif (obligatoire) *</label><textarea value={motifRetourAC} onChange={e => setMotifRetourAC(e.target.value)} placeholder="Saisir le motif..." style={{ ...styles.input, minHeight: 60, resize: 'vertical', marginBottom: 0 }} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleRetourAC} disabled={saving} style={{ ...styles.button, flex: 1, padding: '12px', background: resultatAC === 'DIFFERE' ? '#f59e0b' : '#dc2626' }}>{saving ? '...' : 'Valider'}</button>
                <button onClick={() => { setSelectedOps([]); setMotifRetourAC(''); }} style={{ ...styles.buttonSecondary, padding: '12px 20px' }}>Annuler</button>
              </div>
            </div>
          )}
        </div>)}

        {subTabAC === 'SUIVI' && (<div>
          {opsDifferesAC.length === 0 && opsRejetesAC.length === 0 ? <div style={styles.card}><EmptyState text="Aucun OP différé ou rejeté par l'AC" /></div> :
            <SuiviSection differes={opsDifferesAC} rejetes={opsRejetesAC} type="AC" onReintroduire={(ids, date) => handleReintroduire(ids, date, 'AC')} />}
        </div>)}
      </div>)}

      {/* ARCHIVES */}
      {mainTab === 'ARCHIVES' && (<div>
        <div style={styles.card}>
          <h3 style={{ margin: '0 0 16px', color: '#795548' }}>OP Payés — à archiver ({opsFileArchive.length})</h3>
          <OPTable opsList={opsFileArchive} extraColumns={[{ key: 'datePaiement', label: 'PAYÉ LE', width: 100 }, { key: 'totalPaye', label: 'TOTAL PAYÉ', width: 110, align: 'right', render: (op) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2e7d32' }}>{formatMontant(op.totalPaye || op.montant)}</span> }]} />
          {selectedOps.length > 0 && (<div style={{ marginTop: 16, padding: 16, background: '#efebe9', borderRadius: 8, border: '1px solid #d7ccc8' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Archiver {selectedOps.length} OP</div>
            <div style={{ marginBottom: 16, maxWidth: 400 }}><label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Boîte d'archivage</label><input type="text" value={boiteArchivage} onChange={e => setBoiteArchivage(e.target.value)} placeholder="Ex: BOX-2025-001" style={{ ...styles.input, marginBottom: 0 }} /></div>
            <button onClick={handleArchiver} disabled={saving || !boiteArchivage.trim()} style={{ ...styles.button, padding: '14px', fontSize: 15, background: '#795548', width: '100%', opacity: !boiteArchivage.trim() ? 0.5 : 1 }}>{saving ? '...' : `Archiver ${selectedOps.length} OP`}</button>
          </div>)}
        </div>
        {opsArchives.length > 0 && (<div style={{ ...styles.card, marginTop: 16 }}>
          <h3 style={{ margin: '0 0 16px', color: '#5d4037' }}>OP Archivés ({opsArchives.length})</h3>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}><table style={styles.table}><thead><tr>
            <th style={{ ...styles.th, width: 130 }}>N° OP</th><th style={styles.th}>BÉNÉFICIAIRE</th><th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th><th style={{ ...styles.th, width: 120 }}>BOÎTE</th><th style={{ ...styles.th, width: 100 }}>ARCHIVÉ LE</th>
          </tr></thead><tbody>{opsArchives.map(op => {
            const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
            return (<tr key={op.id}><td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 600, fontSize: 10 }}>{op.numero}</td><td style={{ ...styles.td, fontSize: 12 }}>{op.beneficiaireNom || ben?.nom || 'N/A'}</td><td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td><td style={{ ...styles.td, fontWeight: 700, color: '#795548' }}>{op.boiteArchivage || '-'}</td><td style={{ ...styles.td, fontSize: 12 }}>{op.dateArchivage || '-'}</td></tr>);
          })}</tbody></table></div>
        </div>)}
      </div>)}
    </div>
  );
};

export default PageBordereaux;
