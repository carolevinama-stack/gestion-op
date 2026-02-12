import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant, exportToCSV } from '../utils/formatters';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc } from 'firebase/firestore';
import MontantInput from '../components/MontantInput';
import Autocomplete from '../components/Autocomplete';
import PasswordModal from '../components/PasswordModal';

// ==================== PAGE BUDGET ====================
const PageBudget = () => {
  const { sources, exerciceActif, exercices, budgets, setBudgets, ops, lignesBudgetaires, activeBudgetSource, setActiveBudgetSource, setCurrentPage, setHistoriqueParams } = useAppContext();
  // Utiliser la source globale ou la première source par défaut
  const activeSource = activeBudgetSource || sources[0]?.id || null;
  const setActiveSource = (sourceId) => setActiveBudgetSource(sourceId);
  
  const [showAnterieur, setShowAnterieur] = useState(false);
  const [selectedExercice, setSelectedExercice] = useState(exerciceActif?.id || null);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedLigne, setSelectedLigne] = useState('');
  const [budgetLignes, setBudgetLignes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [motifRevision, setMotifRevision] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);

  const PASSWORD_CORRECTION = 'admin';

  // Obtenir le budget actuel pour la source et l'exercice sélectionnés
  const currentExerciceId = showAnterieur ? selectedExercice : exerciceActif?.id;
  const currentExerciceObj = exercices.find(e => e.id === currentExerciceId);
  const currentSourceObj = sources.find(s => s.id === activeSource);

  // Obtenir tous les budgets pour cette source/exercice (toutes versions)
  const allBudgetsForSourceExercice = budgets
    .filter(b => b.sourceId === activeSource && b.exerciceId === currentExerciceId)
    .sort((a, b) => (b.version || 1) - (a.version || 1));

  // Budget actif = dernière version
  const currentBudget = selectedVersion 
    ? allBudgetsForSourceExercice.find(b => b.id === selectedVersion)
    : allBudgetsForSourceExercice[0];
  
  const latestVersion = allBudgetsForSourceExercice[0];
  const isLatestVersion = !selectedVersion || selectedVersion === latestVersion?.id;

  // Calculer les engagements par ligne (depuis les OP)
  const getEngagementLigne = (ligneCode) => {
    return ops
      .filter(op => 
        op.sourceId === activeSource && 
        op.exerciceId === currentExerciceId &&
        op.ligneBudgetaire === ligneCode &&
        ['DIRECT', 'DEFINITIF', 'PROVISOIRE'].includes(op.type) &&
        op.statut !== 'REJETE' &&
        op.statut !== 'REJETE_CF' &&
        op.statut !== 'REJETE_AC' &&
        op.statut !== 'ANNULE'
      )
      .reduce((sum, op) => sum + (op.montant || 0), 0);
  };

  // Ouvrir modal création (budget initial)
  const openCreateModal = () => {
    setBudgetLignes([]);
    setSelectedLigne('');
    setShowModal(true);
  };

  // Ouvrir modal correction (avec mot de passe)
  const openCorrectionModal = () => {
    setPassword('');
    setShowPasswordModal(true);
  };

  // Vérifier mot de passe et ouvrir édition
  const verifyPasswordAndEdit = () => {
    if (password === PASSWORD_CORRECTION) {
      setShowPasswordModal(false);
      setBudgetLignes(currentBudget.lignes.map(l => ({ ...l })));
      setSelectedLigne('');
      setShowModal(true);
    } else {
      alert('Mot de passe incorrect');
    }
  };

  // Ouvrir modal nouvelle révision
  const openRevisionModal = () => {
    setMotifRevision('');
    setShowRevisionModal(true);
  };

  // Créer une nouvelle révision
  const createRevision = async () => {
    if (!motifRevision.trim()) {
      alert('Veuillez indiquer le motif de la révision');
      return;
    }

    setSaving(true);
    try {
      const newVersion = (latestVersion?.version || 1) + 1;
      const revisionData = {
        sourceId: activeSource,
        exerciceId: currentExerciceId,
        version: newVersion,
        lignes: latestVersion.lignes.map(l => ({ ...l })),
        motifRevision: motifRevision.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'budgets'), revisionData);
      setBudgets([...budgets, { id: docRef.id, ...revisionData }]);
      setShowRevisionModal(false);
      
      // Ouvrir l'édition de la nouvelle version
      setBudgetLignes(revisionData.lignes);
      setSelectedLigne('');
      setSelectedVersion(docRef.id);
      setShowModal(true);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la révision');
    }
    setSaving(false);
  };

  // Ajouter une ligne au budget (depuis le select)
  const addLigne = () => {
    if (!selectedLigne) return;
    const ligne = lignesBudgetaires.find(l => l.code === selectedLigne);
    if (!ligne) return;
    if (budgetLignes.find(l => l.code === ligne.code)) {
      alert('Cette ligne existe déjà dans le budget');
      return;
    }
    setBudgetLignes([...budgetLignes, { code: ligne.code, libelle: ligne.libelle, dotation: 0 }]);
    setSelectedLigne('');
  };

  // Supprimer une ligne du budget
  const removeLigne = (code) => {
    const engagement = getEngagementLigne(code);
    if (engagement > 0) {
      alert(`Impossible de supprimer cette ligne.\n\nElle a des engagements de ${formatMontant(engagement)} FCFA.\n\nVous devez d'abord supprimer ou modifier les OP imputés sur cette ligne.`);
      return;
    }
    setBudgetLignes(budgetLignes.filter(l => l.code !== code));
  };

  // Modifier la dotation d'une ligne
  const updateDotation = (code, dotation) => {
    const engagement = getEngagementLigne(code);
    const newDotation = parseInt(dotation) || 0;
    
    if (newDotation < engagement) {
      alert(`⚠️ Attention\n\nLa dotation (${formatMontant(newDotation)}) est inférieure aux engagements (${formatMontant(engagement)}).\n\nCela créera un disponible négatif.`);
    }
    
    setBudgetLignes(budgetLignes.map(l => 
      l.code === code ? { ...l, dotation: newDotation } : l
    ));
  };

  // Sauvegarder le budget
  const handleSave = async () => {
    if (budgetLignes.length === 0) {
      alert('Veuillez ajouter au moins une ligne budgétaire');
      return;
    }

    setSaving(true);
    try {
      const budgetData = {
        sourceId: activeSource,
        exerciceId: currentExerciceId,
        lignes: budgetLignes,
        updatedAt: new Date().toISOString()
      };

      if (currentBudget && isLatestVersion) {
        // Mise à jour (correction)
        await updateDoc(doc(db, 'budgets', currentBudget.id), budgetData);
        setBudgets(budgets.map(b => b.id === currentBudget.id ? { ...b, ...budgetData } : b));
      } else if (!currentBudget) {
        // Création budget initial
        budgetData.version = 1;
        budgetData.createdAt = new Date().toISOString();
        const docRef = await addDoc(collection(db, 'budgets'), budgetData);
        setBudgets([...budgets, { id: docRef.id, ...budgetData }]);
      }

      setShowModal(false);
      setSelectedVersion(null);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la sauvegarde');
    }
    setSaving(false);
  };

  // Calculer les totaux
  const getTotaux = (budget) => {
    if (!budget || !budget.lignes) return { dotation: 0, engagement: 0, disponible: 0 };
    
    let totalDotation = 0;
    let totalEngagement = 0;

    budget.lignes.forEach(ligne => {
      totalDotation += ligne.dotation || 0;
      totalEngagement += getEngagementLigne(ligne.code);
    });

    return {
      dotation: totalDotation,
      engagement: totalEngagement,
      disponible: totalDotation - totalEngagement
    };
  };

  const totaux = getTotaux(currentBudget);

  // Lignes disponibles (de la bibliothèque, non encore dans le budget)
  const lignesDisponibles = lignesBudgetaires.filter(l => 
    !budgetLignes.find(bl => bl.code === l.code)
  );

  // Label de version
  const getVersionLabel = (budget) => {
    if (!budget) return '';
    const v = budget.version || 1;
    if (v === 1) return 'Budget Initial (v1)';
    return `Révision ${v - 1} (v${v})`;
  };

  // Export du suivi budgétaire
  const exportSuiviBudgetaire = () => {
    if (!currentBudget || !currentBudget.lignes) return;

    const now = new Date().toLocaleDateString('fr-FR');
    let csv = `SUIVI BUDGETAIRE - ${currentSourceObj?.nom || ''}\n`;
    csv += `Exercice: ${currentExerciceObj?.annee || ''}\n`;
    csv += `Version: ${getVersionLabel(currentBudget)}\n`;
    csv += `Date d'export: ${now}\n\n`;
    
    csv += `Code;Libellé;Dotation;Engagements;Disponible;Taux (%)\n`;
    
    currentBudget.lignes.forEach(ligne => {
      const engagement = getEngagementLigne(ligne.code);
      const disponible = (ligne.dotation || 0) - engagement;
      const taux = ligne.dotation > 0 ? ((engagement / ligne.dotation) * 100).toFixed(1) : '0';
      csv += `${ligne.code};${ligne.libelle};${ligne.dotation || 0};${engagement};${disponible};${taux}\n`;
    });
    
    csv += `\nTOTAL;;${totaux.dotation};${totaux.engagement};${totaux.disponible};${totaux.dotation > 0 ? ((totaux.engagement / totaux.dotation) * 100).toFixed(1) : '0'}\n`;

    const filename = `Suivi_Budget_${currentSourceObj?.sigle || 'Source'}_${currentExerciceObj?.annee || ''}_v${currentBudget.version || 1}.csv`;
    exportToCSV(csv, filename);
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>💰 Budget</h1>
      
      {/* Onglets Sources */}
      <div style={styles.sourceTabs}>
        {sources.length === 0 ? (
          <div style={{ color: '#6c757d', fontSize: 14 }}>
            Aucune source configurée. <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Configurer les sources</span>
          </div>
        ) : (
          sources.map(source => (
            <div
              key={source.id}
              onClick={() => { setActiveSource(source.id); setSelectedVersion(null); }}
              style={activeSource === source.id 
                ? { ...styles.sourceTabActive, background: source.couleur || '#0f4c3a', borderColor: source.couleur || '#0f4c3a' }
                : styles.sourceTab
              }
            >
              {source.sigle || source.nom}
            </div>
          ))
        )}
      </div>

      {sources.length > 0 && activeSource && (
        <>
          {/* Sélection exercice + Version */}
          <div style={{ ...styles.card, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: 13, color: '#6c757d' }}>Exercice : </span>
                  <strong style={{ fontSize: 18, color: '#0f4c3a' }}>{currentExerciceObj?.annee || 'Non défini'}</strong>
                  {!showAnterieur && exerciceActif && <span style={{ ...styles.badge, background: '#e8f5e9', color: '#2e7d32', marginLeft: 8 }}>Actif</span>}
                </div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input 
                    type="checkbox" 
                    checked={showAnterieur} 
                    onChange={(e) => {
                      setShowAnterieur(e.target.checked);
                      if (!e.target.checked) setSelectedExercice(exerciceActif?.id);
                      setSelectedVersion(null);
                    }}
                  />
                  Consulter exercices antérieurs
                </label>

                {showAnterieur && (
                  <select 
                    value={selectedExercice || ''} 
                    onChange={(e) => { setSelectedExercice(e.target.value); setSelectedVersion(null); }}
                    style={{ padding: '8px 12px', borderRadius: 6, border: '2px solid #e9ecef', fontSize: 14 }}
                  >
                    {exercices.map(ex => (
                      <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Boutons actions */}
              {!showAnterieur && exerciceActif && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {!currentBudget ? (
                    <button onClick={openCreateModal} style={styles.button}>
                      ➕ Créer le budget initial
                    </button>
                  ) : (
                    <>
                      <button onClick={openCorrectionModal} style={{ ...styles.buttonSecondary, background: '#fff3e0', color: '#e65100' }}>
                        🔐 Correction
                      </button>
                      <button onClick={openRevisionModal} style={styles.button}>
                        📝 Nouvelle révision
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Affichage version actuelle */}
            {currentBudget && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ ...styles.badge, background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', fontSize: 13 }}>
                    {getVersionLabel(currentBudget)}
                  </span>
                  {!isLatestVersion && (
                    <span style={{ ...styles.badge, background: '#ffebee', color: '#c62828' }}>🔒 Version archivée</span>
                  )}
                  {currentBudget.motifRevision && (
                    <span style={{ fontSize: 13, color: '#6c757d', fontStyle: 'italic' }}>
                      "{currentBudget.motifRevision}"
                    </span>
                  )}
                </div>
                
                {allBudgetsForSourceExercice.length > 1 && (
                  <button onClick={() => {
                    setHistoriqueParams({ sourceId: activeSource, exerciceId: currentExerciceId });
                    setCurrentPage('historique');
                  }} style={{ ...styles.buttonSecondary, padding: '6px 12px', fontSize: 12 }}>
                    📜 Historique ({allBudgetsForSourceExercice.length} versions)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats rapides */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div style={styles.card}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>💰 Dotation totale</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: currentSourceObj?.couleur || '#0f4c3a', fontFamily: 'monospace' }}>
                {formatMontant(totaux.dotation)}
              </div>
            </div>
            <div style={styles.card}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>📝 Engagements</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#f0b429', fontFamily: 'monospace' }}>
                {formatMontant(totaux.engagement)}
              </div>
            </div>
            <div style={styles.card}>
              <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 4 }}>✅ Disponible</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: totaux.disponible >= 0 ? '#06d6a0' : '#dc3545', fontFamily: 'monospace' }}>
                {formatMontant(totaux.disponible)}
              </div>
            </div>
          </div>

          {/* Tableau du budget */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                Lignes budgétaires - {currentSourceObj?.nom} ({currentExerciceObj?.annee})
              </h3>
              {currentBudget && currentBudget.lignes && currentBudget.lignes.length > 0 && (
                <button onClick={exportSuiviBudgetaire} style={{ ...styles.buttonSecondary, padding: '8px 16px', fontSize: 12, background: '#e3f2fd', color: '#1565c0' }}>
                  📥 Exporter Excel
                </button>
              )}
            </div>

            {!currentBudget || !currentBudget.lignes || currentBudget.lignes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>
                <div style={{ fontSize: 50, marginBottom: 16 }}>📊</div>
                <p>Aucun budget défini pour cette source et cet exercice</p>
                {lignesBudgetaires.length === 0 && (
                  <p style={{ fontSize: 13, color: '#adb5bd', marginTop: 8 }}>
                    ⚠️ Vous devez d'abord importer vos lignes budgétaires dans les <span style={{ color: '#0f4c3a', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setCurrentPage('parametres')}>Paramètres</span>
                  </p>
                )}
                {!showAnterieur && exerciceActif && lignesBudgetaires.length > 0 && (
                  <button onClick={openCreateModal} style={{ ...styles.button, marginTop: 16 }}>
                    ➕ Créer le budget initial
                  </button>
                )}
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>CODE</th>
                    <th style={styles.th}>LIBELLÉ</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>DOTATION</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>ENGAGEMENTS</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>DISPONIBLE</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>TAUX</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBudget.lignes.map(ligne => {
                    const engagement = getEngagementLigne(ligne.code);
                    const disponible = (ligne.dotation || 0) - engagement;
                    const taux = ligne.dotation > 0 ? ((engagement / ligne.dotation) * 100).toFixed(1) : 0;
                    
                    return (
                      <tr key={ligne.code}>
                        <td style={styles.td}>
                          <code style={{ background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', padding: '4px 10px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                            {ligne.code}
                          </code>
                        </td>
                        <td style={styles.td}>{ligne.libelle}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                          {formatMontant(ligne.dotation)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#f0b429' }}>
                          {formatMontant(engagement)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: disponible >= 0 ? '#06d6a0' : '#dc3545' }}>
                          {formatMontant(disponible)}
                        </td>
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <div style={{ 
                            background: taux >= 100 ? '#ffebee' : taux >= 80 ? '#fff3e0' : '#e8f5e9',
                            color: taux >= 100 ? '#c62828' : taux >= 80 ? '#e65100' : '#2e7d32',
                            padding: '4px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'inline-block'
                          }}>
                            {taux}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8f9fa', fontWeight: 600 }}>
                    <td colSpan={2} style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                      {formatMontant(totaux.dotation)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#f0b429', fontWeight: 700 }}>
                      {formatMontant(totaux.engagement)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: totaux.disponible >= 0 ? '#06d6a0' : '#dc3545', fontWeight: 700 }}>
                      {formatMontant(totaux.disponible)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <div style={{ 
                        background: '#e3f2fd',
                        color: '#1565c0',
                        padding: '4px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'inline-block'
                      }}>
                        {totaux.dotation > 0 ? ((totaux.engagement / totaux.dotation) * 100).toFixed(1) : 0}%
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal Création/Modification Budget */}
      {showModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 800 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: currentSourceObj?.couleur || '#0f4c3a', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {currentBudget ? `✏️ Modifier - ${getVersionLabel(currentBudget)}` : '➕ Créer le budget initial'} - {currentSourceObj?.nom} ({currentExerciceObj?.annee})
              </h2>
            </div>
            
            <div style={{ padding: 24 }}>
              {/* Ajouter une ligne via Autocomplete */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  ➕ Ajouter une ligne depuis la bibliothèque
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Autocomplete
                      options={lignesDisponibles.map(ligne => ({
                        value: ligne.code,
                        label: `${ligne.code} - ${ligne.libelle}`,
                        searchFields: [ligne.code, ligne.libelle]
                      }))}
                      value={selectedLigne ? 
                        lignesDisponibles.filter(x => x.code === selectedLigne).map(l => ({
                          value: l.code,
                          label: `${l.code} - ${l.libelle}`
                        }))[0] || null
                      : null}
                      onChange={(option) => setSelectedLigne(option?.value || '')}
                      placeholder="🔍 Rechercher par code ou libellé..."
                      noOptionsMessage="Aucune ligne disponible"
                      accentColor={currentSourceObj?.couleur || '#0f4c3a'}
                    />
                  </div>
                  <button 
                    onClick={addLigne} 
                    disabled={!selectedLigne}
                    style={{ 
                      ...styles.button, 
                      opacity: selectedLigne ? 1 : 0.5,
                      cursor: selectedLigne ? 'pointer' : 'not-allowed'
                    }}
                  >
                    ➕ Ajouter
                  </button>
                </div>
                {lignesBudgetaires.length === 0 && (
                  <p style={{ fontSize: 12, color: '#c62828', marginTop: 8 }}>
                    ⚠️ Aucune ligne dans la bibliothèque. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setShowModal(false); setCurrentPage('parametres'); }}>Importer des lignes</span>
                  </p>
                )}
              </div>

              {/* Lignes du budget */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Lignes du budget ({budgetLignes.length})
                </label>
                
                {budgetLignes.length === 0 ? (
                  <div style={{ padding: 24, background: '#f8f9fa', borderRadius: 8, textAlign: 'center', color: '#6c757d' }}>
                    Aucune ligne ajoutée. Sélectionnez une ligne dans la liste ci-dessus.
                  </div>
                ) : (
                  <div style={{ background: '#f8f9fa', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ ...styles.th, width: 100 }}>CODE</th>
                          <th style={styles.th}>LIBELLÉ</th>
                          <th style={{ ...styles.th, width: 180 }}>DOTATION (FCFA)</th>
                          <th style={{ ...styles.th, width: 120, textAlign: 'right' }}>ENGAGÉ</th>
                          <th style={{ ...styles.th, width: 60 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetLignes.map(ligne => {
                          const engagement = getEngagementLigne(ligne.code);
                          return (
                            <tr key={ligne.code}>
                              <td style={styles.td}>
                                <code style={{ background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>
                                  {ligne.code}
                                </code>
                              </td>
                              <td style={{ ...styles.td, fontSize: 13 }}>{ligne.libelle}</td>
                              <td style={styles.td}>
                                <MontantInput
                                  value={ligne.dotation || ''}
                                  onChange={(val) => updateDotation(ligne.code, val)}
                                  placeholder="0"
                                  style={{ 
                                    width: '100%', 
                                    padding: '8px 10px', 
                                    border: '2px solid #e9ecef', 
                                    borderRadius: 6, 
                                    fontFamily: 'monospace',
                                    textAlign: 'right',
                                    fontSize: 14,
                                    boxSizing: 'border-box'
                                  }}
                                />
                              </td>
                              <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: engagement > 0 ? '#f0b429' : '#adb5bd', fontSize: 13 }}>
                                {formatMontant(engagement)}
                              </td>
                              <td style={{ ...styles.td, textAlign: 'center' }}>
                                <button
                                  onClick={() => removeLigne(ligne.code)}
                                  title={engagement > 0 ? 'Impossible de supprimer (engagements existants)' : 'Supprimer'}
                                  style={{ 
                                    padding: '4px 8px', 
                                    background: engagement > 0 ? '#f5f5f5' : '#ffebee', 
                                    color: engagement > 0 ? '#bdbdbd' : '#c62828', 
                                    border: 'none', 
                                    borderRadius: 4, 
                                    cursor: engagement > 0 ? 'not-allowed' : 'pointer',
                                    fontSize: 14
                                  }}
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#e9ecef' }}>
                          <td colSpan={2} style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                          <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, textAlign: 'right', paddingRight: 16 }}>
                            {formatMontant(budgetLignes.reduce((sum, l) => sum + (l.dotation || 0), 0))}
                          </td>
                          <td style={{ ...styles.td, fontFamily: 'monospace', color: '#f0b429', textAlign: 'right' }}>
                            {formatMontant(budgetLignes.reduce((sum, l) => sum + getEngagementLigne(l.code), 0))}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => { setShowModal(false); setSelectedVersion(null); }} style={styles.buttonSecondary}>Annuler</button>
              <button 
                onClick={handleSave} 
                disabled={saving || budgetLignes.length === 0}
                style={{ 
                  ...styles.button, 
                  background: currentSourceObj?.couleur || '#0f4c3a',
                  opacity: saving || budgetLignes.length === 0 ? 0.6 : 1,
                  cursor: saving || budgetLignes.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Enregistrement...' : '✓ Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mot de passe */}
      {showPasswordModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 400 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: '#e65100', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>🔐 Correction du budget</h2>
            </div>
            <div style={{ padding: 24 }}>
              <p style={{ marginBottom: 16, color: '#555' }}>
                Vous allez modifier le budget actuel. Cette action nécessite un mot de passe administrateur.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Mot de passe</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPasswordAndEdit()}
                  placeholder="Entrez le mot de passe"
                  style={styles.input}
                  autoFocus
                />
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowPasswordModal(false)} style={styles.buttonSecondary}>Annuler</button>
              <button onClick={verifyPasswordAndEdit} style={{ ...styles.button, background: '#e65100' }}>✓ Valider</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvelle révision */}
      {showRevisionModal && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 500 }}>
            <div style={{ padding: 24, borderBottom: '1px solid #e9ecef', background: currentSourceObj?.couleur || '#0f4c3a', color: 'white' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>📝 Créer une nouvelle révision</h2>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: '#fff3e0', padding: 16, borderRadius: 8, marginBottom: 20 }}>
                <strong style={{ color: '#e65100' }}>⚠️ Information importante</strong>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#555' }}>
                  Une nouvelle révision (v{(latestVersion?.version || 1) + 1}) sera créée. 
                  La version actuelle ({getVersionLabel(latestVersion)}) sera archivée et ne pourra plus être modifiée.
                </p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Motif de la révision *</label>
                <textarea 
                  value={motifRevision} 
                  onChange={(e) => setMotifRevision(e.target.value)}
                  placeholder="Ex: Augmentation suite avenant, Report exercice N-1, etc."
                  style={{ ...styles.input, minHeight: 80, resize: 'vertical' }}
                />
              </div>
            </div>
            <div style={{ padding: 24, borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setShowRevisionModal(false)} style={styles.buttonSecondary}>Annuler</button>
              <button 
                onClick={() => {
                  if (!motifRevision.trim()) {
                    alert('Le motif de la révision est obligatoire');
                    return;
                  }
                  createRevision();
                }} 
                disabled={saving || !motifRevision.trim()}
                style={{ 
                  ...styles.button, 
                  background: currentSourceObj?.couleur || '#0f4c3a',
                  opacity: saving || !motifRevision.trim() ? 0.6 : 1,
                  cursor: saving || !motifRevision.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? 'Création...' : '✓ Créer la révision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default PageBudget;
