import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { ARMOIRIE } from '../utils/logos';

const PageBordereaux = () => {
  const { projet, sources, exercices, beneficiaires, ops, setOps, bordereaux, setBordereaux } = useAppContext();
  const [activeTab, setActiveTab] = useState('NOUVEAU_CF');
  const [selectedOps, setSelectedOps] = useState([]);
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [dateBordereau, setDateBordereau] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchBT, setSearchBT] = useState('');
  const [editBtId, setEditBtId] = useState(null);
  const [editBtNumero, setEditBtNumero] = useState('');

  const exerciceActifLocal = exercices.find(e => e.actif);
  const currentSrc = sources.find(s => s.id === activeSourceBT);

  // OP éligibles pour transmission CF : statut CREE, source et exercice actifs
  const opsEligiblesCF = ops.filter(op =>
    op.statut === 'CREE' &&
    op.sourceId === activeSourceBT &&
    op.exerciceId === exerciceActifLocal?.id &&
    !['PROVISOIRE'].includes(op.type)
  );

  // OP éligibles pour transmission AC : statut VISE_CF
  const opsEligiblesAC = ops.filter(op =>
    op.statut === 'VISE_CF' &&
    op.sourceId === activeSourceBT &&
    op.exerciceId === exerciceActifLocal?.id
  );

  const opsEligibles = activeTab === 'NOUVEAU_CF' ? opsEligiblesCF : activeTab === 'NOUVEAU_AC' ? opsEligiblesAC : [];

  // Filtrer par recherche
  const opsFiltered = opsEligibles.filter(op => {
    if (!searchBT) return true;
    const term = searchBT.toLowerCase();
    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
    return (op.numero || '').toLowerCase().includes(term) ||
      (ben?.nom || '').toLowerCase().includes(term) ||
      (op.objet || '').toLowerCase().includes(term);
  });

  // Toggle sélection d'un OP
  const toggleOp = (opId) => {
    setSelectedOps(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  };

  // Sélectionner/Désélectionner tout
  const toggleAll = () => {
    if (selectedOps.length === opsFiltered.length) {
      setSelectedOps([]);
    } else {
      setSelectedOps(opsFiltered.map(op => op.id));
    }
  };

  // Générer le numéro du bordereau
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

  // Total des OP sélectionnés
  const totalSelected = selectedOps.reduce((sum, id) => {
    const op = ops.find(o => o.id === id);
    return sum + (op?.montant || 0);
  }, 0);

  // Créer le bordereau
  const handleCreateBordereau = async () => {
    if (selectedOps.length === 0) { alert('Veuillez sélectionner au moins un OP.'); return; }
    const typeBT = activeTab === 'NOUVEAU_CF' ? 'CF' : 'AC';
    const numero = genererNumeroBT(typeBT);

    if (!window.confirm(`Créer le bordereau ${numero} avec ${selectedOps.length} OP pour un total de ${formatMontant(totalSelected)} F ?\n\nLes OP seront transmis au ${typeBT}.`)) return;

    setSaving(true);
    try {
      const btData = {
        numero,
        type: typeBT,
        sourceId: activeSourceBT,
        exerciceId: exerciceActifLocal.id,
        dateCreation: dateBordereau,
        opsIds: selectedOps,
        nbOps: selectedOps.length,
        totalMontant: totalSelected,
        statut: 'ENVOYE',
        observations: observations.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'bordereaux'), btData);

      // Mettre à jour chaque OP : statut + référence bordereau + date transmission
      const newStatut = typeBT === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC';
      const dateField = typeBT === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
      const btField = typeBT === 'CF' ? 'bordereauCF' : 'bordereauAC';

      for (const opId of selectedOps) {
        await updateDoc(doc(db, 'ops', opId), {
          statut: newStatut,
          [dateField]: dateBordereau,
          [btField]: numero,
          updatedAt: new Date().toISOString()
        });
      }

      alert(`✅ Bordereau ${numero} créé avec succès !\n${selectedOps.length} OP transmis au ${typeBT}.`);
      setSelectedOps([]);
      setObservations('');
      setActiveTab(typeBT === 'CF' ? 'LISTE_CF' : 'LISTE_AC');
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
    setSaving(false);
  };

  // Imprimer un bordereau
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

  // Supprimer un bordereau (seulement si statut ENVOYE)
  const handleDeleteBordereau = async (bt) => {
    if (bt.statut !== 'ENVOYE') {
      alert('❌ Impossible de supprimer un bordereau déjà réceptionné ou traité.');
      return;
    }
    
    const pwd = window.prompt('🔒 Mot de passe requis pour supprimer :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    
    if (!window.confirm(`Supprimer le bordereau ${bt.numero} ?\n\nLes ${bt.nbOps} OP concernés reviendront au statut précédent.`)) return;
    
    try {
      // Remettre les OP au statut précédent
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
      
      // Supprimer le bordereau
      await deleteDoc(doc(db, 'bordereaux', bt.id));
      alert(`✅ Bordereau ${bt.numero} supprimé. Les OP sont revenus au statut ${previousStatut}.`);
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  // Modifier la date d'un bordereau (seulement si statut ENVOYE)
  const handleModifyBordereauDate = async (bt) => {
    if (bt.statut !== 'ENVOYE') {
      alert('❌ Impossible de modifier un bordereau déjà réceptionné ou traité.');
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
      
      // Mettre à jour le bordereau
      await updateDoc(doc(db, 'bordereaux', bt.id), {
        dateCreation: newDate,
        updatedAt: new Date().toISOString()
      });
      
      // Mettre à jour la date sur tous les OP
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

  // Modifier le numéro d'un bordereau (protégé par mot de passe admin)
  const handleStartEditBtNumero = (bt) => {
    const pwd = window.prompt('🔒 Mot de passe admin requis :');
    if (pwd !== (projet?.motDePasseAdmin || 'admin123')) {
      if (pwd !== null) alert('❌ Mot de passe incorrect');
      return;
    }
    setEditBtId(bt.id);
    setEditBtNumero(bt.numero || '');
  };

  const handleSaveBtNumero = async (bt) => {
    const newNum = editBtNumero.trim();
    if (!newNum) { alert('Le numéro ne peut pas être vide.'); return; }
    if (newNum === bt.numero) { setEditBtId(null); return; }
    // Vérifier doublon
    const doublon = bordereaux.find(b => b.numero === newNum && b.id !== bt.id && b.type === bt.type);
    if (doublon) { alert('⛔ Ce numéro de bordereau existe déjà : ' + newNum); return; }
    try {
      const oldNum = bt.numero;
      const btField = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';

      // 1. Mettre à jour le bordereau
      await updateDoc(doc(db, 'bordereaux', bt.id), { numero: newNum, updatedAt: new Date().toISOString() });

      // 2. Mettre à jour tous les OP de ce bordereau
      for (const opId of (bt.opsIds || [])) {
        await updateDoc(doc(db, 'ops', opId), { [btField]: newNum, updatedAt: new Date().toISOString() });
      }

      // 3. Mettre à jour localement
      setBordereaux(prev => prev.map(b => b.id === bt.id ? { ...b, numero: newNum } : b));
      setOps(prev => prev.map(o => (bt.opsIds || []).includes(o.id) ? { ...o, [btField]: newNum } : o));

      setEditBtId(null);
      alert('✅ N° Bordereau modifié : ' + oldNum + ' → ' + newNum + '\n(' + (bt.opsIds?.length || 0) + ' OP mis à jour)');
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  // Bordereaux filtrés par type
  const bordereauCF = bordereaux.filter(bt => bt.type === 'CF' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);
  const bordereauAC = bordereaux.filter(bt => bt.type === 'AC' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActifLocal?.id);
  const listeBT = activeTab === 'LISTE_CF' ? bordereauCF : activeTab === 'LISTE_AC' ? bordereauAC : [];

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

      {/* Sous-onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'NOUVEAU_CF', label: '➕ Nouveau BT au CF', color: '#1565c0' },
          { key: 'NOUVEAU_AC', label: '➕ Nouveau BT à l\'AC', color: '#2e7d32' },
          { key: 'LISTE_CF', label: '📤 BT au CF', count: bordereauCF.length },
          { key: 'LISTE_AC', label: '💰 BT à l\'AC', count: bordereauAC.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedOps([]); }}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: activeTab === tab.key ? (tab.color || '#0f4c3a') : '#f0f0f0', color: activeTab === tab.key ? 'white' : '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
            {tab.label} {tab.count !== undefined && <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10, fontSize: 11, marginLeft: 4 }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Création de bordereau */}
      {(activeTab === 'NOUVEAU_CF' || activeTab === 'NOUVEAU_AC') && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: activeTab === 'NOUVEAU_CF' ? '#1565c0' : '#2e7d32' }}>
              {activeTab === 'NOUVEAU_CF' ? '📤 Transmission au Contrôleur Financier' : '💰 Transmission à l\'Agent Comptable'}
            </h3>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Date :</label>
              <input type="date" value={dateBordereau} onChange={e => setDateBordereau(e.target.value)}
                style={{ ...styles.input, marginBottom: 0, width: 160 }} />
            </div>
          </div>

          <input type="text" placeholder="🔍 Rechercher un OP..." value={searchBT} onChange={e => setSearchBT(e.target.value)}
            style={{ ...styles.input, marginBottom: 12 }} />

          {opsFiltered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
              <p>Aucun OP {activeTab === 'NOUVEAU_CF' ? 'à transmettre au CF' : 'visé par le CF à transmettre à l\'AC'} pour cette source</p>
            </div>
          ) : (
            <>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.th, width: 40 }}>
                      <input type="checkbox" checked={selectedOps.length === opsFiltered.length && opsFiltered.length > 0} onChange={toggleAll} />
                    </th>
                    <th style={{ ...styles.th, width: 140 }}>N° OP</th>
                    <th style={styles.th}>BÉNÉFICIAIRE</th>
                    <th style={styles.th}>OBJET</th>
                    <th style={{ ...styles.th, width: 70 }}>LIGNE</th>
                    <th style={{ ...styles.th, width: 110, textAlign: 'right' }}>MONTANT</th>
                  </tr>
                </thead>
                <tbody>
                  {opsFiltered.map(op => {
                    const ben = beneficiaires.find(b => b.id === op.beneficiaireId);
                    const checked = selectedOps.includes(op.id);
                    return (
                      <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: checked ? '#e3f2fd' : 'transparent' }}>
                        <td style={styles.td}><input type="checkbox" checked={checked} onChange={() => toggleOp(op.id)} /></td>
                        <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{op.numero}</td>
                        <td style={{ ...styles.td, fontSize: 12 }}>{ben?.nom || 'N/A'}</td>
                        <td style={{ ...styles.td, fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet || '-'}</td>
                        <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire || '-'}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(op.montant)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {selectedOps.length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>
                      {selectedOps.length} OP sélectionné(s) — Total : <span style={{ color: '#0f4c3a' }}>{formatMontant(totalSelected)} F</span>
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#666' }}>
                      N° : {genererNumeroBT(activeTab === 'NOUVEAU_CF' ? 'CF' : 'AC')}
                    </span>
                  </div>
                  <textarea placeholder="Observations (facultatif)..." value={observations} onChange={e => setObservations(e.target.value)}
                    style={{ ...styles.input, minHeight: 60, resize: 'vertical', marginBottom: 12 }} />
                  <button onClick={handleCreateBordereau} disabled={saving}
                    style={{ ...styles.button, padding: '14px 40px', fontSize: 16, background: activeTab === 'NOUVEAU_CF' ? '#1565c0' : '#2e7d32', width: '100%' }}>
                    {saving ? 'Création en cours...' : `📨 Créer le bordereau et transmettre au ${activeTab === 'NOUVEAU_CF' ? 'CF' : 'AC'}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Liste des bordereaux */}
      {(activeTab === 'LISTE_CF' || activeTab === 'LISTE_AC') && (
        <div style={styles.card}>
          {listeBT.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
              <p>Aucun bordereau {activeTab === 'LISTE_CF' ? 'au CF' : 'à l\'AC'} pour cette source</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: 200 }}>N° BORDEREAU</th>
                  <th style={{ ...styles.th, width: 100 }}>DATE</th>
                  <th style={{ ...styles.th, width: 60, textAlign: 'center' }}>NB OP</th>
                  <th style={{ ...styles.th, width: 130, textAlign: 'right' }}>TOTAL</th>
                  <th style={styles.th}>OBSERVATIONS</th>
                  <th style={{ ...styles.th, width: 100 }}>STATUT</th>
                  <th style={{ ...styles.th, width: 160, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {listeBT.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).map(bt => {
                  const statutBT = bt.statut === 'ENVOYE' ? { bg: '#fff3e0', color: '#e65100', label: 'Envoyé' }
                    : bt.statut === 'RECEPTIONNE' ? { bg: '#e3f2fd', color: '#1565c0', label: 'Réceptionné' }
                    : { bg: '#e8f5e9', color: '#2e7d32', label: 'Traité' };
                  return (
                    <tr key={bt.id}>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}>
                        {editBtId === bt.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input value={editBtNumero} onChange={e => setEditBtNumero(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSaveBtNumero(bt); if (e.key === 'Escape') setEditBtId(null); }} style={{ ...styles.input, marginBottom: 0, fontSize: 11, fontFamily: 'monospace', fontWeight: 700, padding: '4px 8px', width: 150 }} autoFocus />
                            <button onClick={() => handleSaveBtNumero(bt)} style={{ border: 'none', background: '#1b5e20', color: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>✓</button>
                            <button onClick={() => setEditBtId(null)} style={{ border: 'none', background: '#999', color: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>✕</button>
                          </div>
                        ) : (
                          <span>{bt.numero}</span>
                        )}
                      </td>
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
                          <button onClick={() => handleStartEditBtNumero(bt)} title="Modifier le numéro"
                            style={{ background: '#f3e5f5', color: '#6a1b9a', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                            🔢
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
