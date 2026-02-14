import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant, exportToCSV } from '../utils/formatters';
import { db } from '../firebase';
import { doc, deleteDoc } from 'firebase/firestore';

const PageHistoriqueBudget = () => {
  const { projet, historiqueParams, sources, exercices, budgets, setBudgets, setCurrentPage } = useAppContext();
  const { sourceId, exerciceId } = historiqueParams;
  const [expandedVersion, setExpandedVersion] = useState(null);
  
  const currentSourceObj = sources.find(s => s.id === sourceId);
  const currentExerciceObj = exercices.find(e => e.id === exerciceId);
  
  const allBudgetsForSourceExercice = budgets
    .filter(b => b.sourceId === sourceId && b.exerciceId === exerciceId)
    .sort((a, b) => (a.version || 1) - (b.version || 1));

  const getTotaux = (budget) => {
    if (!budget || !budget.lignes) return { dotation: 0 };
    return { dotation: budget.lignes.reduce((sum, l) => sum + (l.dotation || 0), 0) };
  };

  const getVersionLabel = (budget) => {
    if (!budget) return '';
    if (budget.nomVersion) return budget.nomVersion;
    const v = budget.version || 1;
    if (v === 1) return 'Budget Primitif';
    return `V${v}`;
  };

  const checkPwd = () => {
    const p = window.prompt('Mot de passe requis :');
    if (p !== (projet?.motDePasseAdmin || 'admin123')) { if (p !== null) alert('Mot de passe incorrect'); return false; }
    return true;
  };

  const handleDeleteVersion = async (budget) => {
    if (!checkPwd()) return;
    if (!window.confirm(`Supprimer définitivement "${getVersionLabel(budget)}" ?\n\nCette action est irréversible.`)) return;
    try {
      await deleteDoc(doc(db, 'budgets', budget.id));
      setBudgets(budgets.filter(b => b.id !== budget.id));
      alert('Version supprimée.');
      if (expandedVersion === budget.id) setExpandedVersion(null);
      // Si plus de versions, retour au budget
      const remaining = allBudgetsForSourceExercice.filter(b => b.id !== budget.id);
      if (remaining.length <= 1) setCurrentPage('budget');
    } catch (e) { alert('Erreur : ' + e.message); }
  };

  // Calculer les variations entre deux versions
  const getVariations = (budget, index) => {
    if (index === 0) return null;
    const prevBudget = allBudgetsForSourceExercice[index - 1];
    if (!prevBudget) return null;
    const allCodes = new Set();
    (budget.lignes || []).forEach(l => allCodes.add(l.code));
    (prevBudget.lignes || []).forEach(l => allCodes.add(l.code));
    const variations = [];
    allCodes.forEach(code => {
      const curr = (budget.lignes || []).find(l => l.code === code);
      const prev = (prevBudget.lignes || []).find(l => l.code === code);
      variations.push({ code, libelle: curr?.libelle || prev?.libelle || '', dotation: curr?.dotation || 0, dotationPrecedente: prev?.dotation || 0, variation: (curr?.dotation || 0) - (prev?.dotation || 0) });
    });
    return variations.sort((a, b) => a.code.localeCompare(b.code));
  };

  const exportHistorique = () => {
    if (allBudgetsForSourceExercice.length === 0) return;
    const now = new Date().toLocaleDateString('fr-FR');
    let csv = `HISTORIQUE DES REVISIONS - ${currentSourceObj?.nom || ''}\n`;
    csv += `Exercice: ${currentExerciceObj?.annee || ''}\nDate d'export: ${now}\n\n`;
    csv += `Révision;Montant Total;Date Validation;Motif\n`;
    allBudgetsForSourceExercice.forEach(budget => {
      csv += `${getVersionLabel(budget)};${getTotaux(budget).dotation};${budget.dateNotification || '-'};${budget.motifRevision || ''}\n`;
    });
    exportToCSV(csv, `Historique_Budget_${currentSourceObj?.sigle || 'Source'}_${currentExerciceObj?.annee || ''}.csv`);
  };

  if (!sourceId || !exerciceId) {
    return <div>
      <button onClick={() => setCurrentPage('budget')} style={{ ...styles.buttonSecondary, marginBottom: 20 }}>← Retour au budget</button>
      <div style={{ textAlign: 'center', padding: 60 }}><p style={{ color: '#6c757d' }}>Aucune donnée à afficher</p></div>
    </div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button onClick={() => setCurrentPage('budget')} style={{ ...styles.buttonSecondary, padding: '8px 16px', marginBottom: 12 }}>← Retour au budget</button>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📜 Historique des révisions</h1>
          <p style={{ color: '#6c757d', marginTop: 8 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: currentSourceObj?.couleur || '#0f4c3a', marginRight: 8 }}></span>
            {currentSourceObj?.nom} - Exercice {currentExerciceObj?.annee}
          </p>
        </div>
        <button onClick={exportHistorique} style={{ ...styles.button, background: '#1565c0' }}>📥 Exporter</button>
      </div>

      {/* Tableau des versions — scrollable */}
      <div style={{ ...styles.card, maxHeight: '75vh', overflow: 'auto' }}>
        <table style={{ ...styles.table, minWidth: 700 }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
            <tr>
              <th style={{ ...styles.th, minWidth: 200 }}>BUDGET</th>
              <th style={{ ...styles.th, textAlign: 'right', minWidth: 160 }}>MONTANT TOTAL</th>
              <th style={{ ...styles.th, minWidth: 130 }}>DATE VALIDATION</th>
              <th style={styles.th}>MOTIF</th>
              <th style={{ ...styles.th, width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {allBudgetsForSourceExercice.map((budget, index) => {
              const total = getTotaux(budget).dotation;
              const isExpanded = expandedVersion === budget.id;
              const variations = getVariations(budget, index);
              const prevTotal = index > 0 ? getTotaux(allBudgetsForSourceExercice[index - 1]).dotation : 0;
              const totalVariation = index > 0 ? total - prevTotal : 0;
              const isLast = index === allBudgetsForSourceExercice.length - 1;

              return (
                <React.Fragment key={budget.id}>
                  <tr onClick={() => setExpandedVersion(isExpanded ? null : budget.id)}
                    style={{ cursor: 'pointer', background: isExpanded ? '#e8f5e9' : 'transparent', transition: 'background 0.15s' }}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, color: '#5f8a8b', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: currentSourceObj?.couleur || '#0f4c3a' }}>{getVersionLabel(budget)}</div>
                          {isLast && <span style={{ fontSize: 10, background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>Version active</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14 }}>{formatMontant(total)}</span>
                      {index > 0 && totalVariation !== 0 && (
                        <div style={{ fontSize: 11, color: totalVariation > 0 ? '#2e7d32' : '#c62828', fontWeight: 600, fontFamily: 'monospace' }}>
                          {totalVariation > 0 ? '+' : ''}{formatMontant(totalVariation)}
                        </div>
                      )}
                    </td>
                    <td style={{ ...styles.td, fontSize: 13 }}>
                      {budget.dateNotification || (budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('fr-FR') : '-')}
                    </td>
                    <td style={{ ...styles.td, fontSize: 12, color: '#666', fontStyle: budget.motifRevision ? 'normal' : 'italic' }}>
                      {budget.motifRevision || '-'}
                    </td>
                    <td style={styles.td} onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleDeleteVersion(budget)} title="Supprimer cette version"
                        style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: '#ffebee', color: '#c62828', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>🗑️</button>
                    </td>
                  </tr>

                  {/* Détail déplié — lignes budgétaires + variations */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} style={{ padding: 0, border: 'none' }}>
                        <div style={{ margin: '0 16px 16px', background: '#fafffe', border: '1px solid #c8e6c9', borderRadius: 8, overflow: 'hidden' }}>
                          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                            <table style={{ ...styles.table, marginBottom: 0 }}>
                              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr style={{ background: '#e8f5e9' }}>
                                  <th style={{ ...styles.th, width: 100 }}>CODE</th>
                                  <th style={styles.th}>LIBELLÉ</th>
                                  <th style={{ ...styles.th, textAlign: 'right', width: 150 }}>MONTANT</th>
                                  {index > 0 && <th style={{ ...styles.th, textAlign: 'right', width: 150 }}>VARIATION</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {index === 0 ? (
                                  (budget.lignes || []).sort((a, b) => a.code.localeCompare(b.code)).map(ligne => (
                                    <tr key={ligne.code}>
                                      <td style={styles.td}>
                                        <code style={{ background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{ligne.code}</code>
                                      </td>
                                      <td style={{ ...styles.td, fontSize: 12 }}>{ligne.libelle}</td>
                                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(ligne.dotation)}</td>
                                    </tr>
                                  ))
                                ) : (
                                  variations && variations.map(v => (
                                    <tr key={v.code} style={{ background: v.variation !== 0 ? (v.variation > 0 ? '#f1f8e9' : '#fef2f2') : 'transparent' }}>
                                      <td style={styles.td}>
                                        <code style={{ background: currentSourceObj?.couleur || '#0f4c3a', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{v.code}</code>
                                      </td>
                                      <td style={{ ...styles.td, fontSize: 12 }}>{v.libelle}</td>
                                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatMontant(v.dotation)}</td>
                                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: v.variation > 0 ? '#2e7d32' : v.variation < 0 ? '#c62828' : '#bdbdbd' }}>
                                        {v.variation === 0 ? '-' : `${v.variation > 0 ? '+' : ''}${formatMontant(v.variation)}`}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                              <tfoot style={{ position: 'sticky', bottom: 0 }}>
                                <tr style={{ background: '#e8f5e9', fontWeight: 700 }}>
                                  <td colSpan={2} style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatMontant(total)}</td>
                                  {index > 0 && <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: totalVariation > 0 ? '#2e7d32' : totalVariation < 0 ? '#c62828' : '#bdbdbd' }}>
                                    {totalVariation === 0 ? '-' : `${totalVariation > 0 ? '+' : ''}${formatMontant(totalVariation)}`}
                                  </td>}
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PageHistoriqueBudget;
