import React from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant, exportToCSV } from '../utils/formatters';

const PageHistoriqueBudget = () => {
  const { historiqueParams, sources, exercices, budgets, setCurrentPage } = useAppContext();
  const { sourceId, exerciceId } = historiqueParams;
  
  const currentSourceObj = sources.find(s => s.id === sourceId);
  const currentExerciceObj = exercices.find(e => e.id === exerciceId);
  
  const allBudgetsForSourceExercice = budgets
    .filter(b => b.sourceId === sourceId && b.exerciceId === exerciceId)
    .sort((a, b) => (a.version || 1) - (b.version || 1));
  
  const latestVersion = allBudgetsForSourceExercice[allBudgetsForSourceExercice.length - 1];

  const getTotaux = (budget) => {
    if (!budget || !budget.lignes) return { dotation: 0 };
    return {
      dotation: budget.lignes.reduce((sum, l) => sum + (l.dotation || 0), 0)
    };
  };

  const getVersionLabel = (budget) => {
    if (!budget) return '';
    const v = budget.version || 1;
    if (v === 1) return 'Budget Initial';
    return `V${v}`;
  };

  const exportHistorique = () => {
    if (allBudgetsForSourceExercice.length === 0) return;

    const now = new Date().toLocaleDateString('fr-FR');
    let csv = `HISTORIQUE DES VERSIONS BUDGETAIRES - ${currentSourceObj?.nom || ''}\n`;
    csv += `Exercice: ${currentExerciceObj?.annee || ''}\n`;
    csv += `Date d'export: ${now}\n\n`;
    
    csv += `DATE;`;
    allBudgetsForSourceExercice.forEach(budget => {
      csv += `${budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('fr-FR') : '-'};`;
    });
    csv += `\n`;

    csv += `LIGNE;`;
    allBudgetsForSourceExercice.forEach((budget, index) => {
      csv += `${getVersionLabel(budget)}${index > 0 ? ' (variation)' : ''};`;
    });
    csv += `DOTATION FINALE\n`;

    const allLignes = new Map();
    allBudgetsForSourceExercice.forEach(budget => {
      (budget.lignes || []).forEach(ligne => {
        if (!allLignes.has(ligne.code)) {
          allLignes.set(ligne.code, ligne.libelle);
        }
      });
    });

    Array.from(allLignes.keys()).sort().forEach(code => {
      csv += `${code};`;
      
      let prevDotation = 0;
      allBudgetsForSourceExercice.forEach((budget, index) => {
        const ligne = (budget.lignes || []).find(l => l.code === code);
        const dotation = ligne?.dotation || 0;
        
        if (index === 0) {
          csv += `${dotation};`;
        } else {
          const variation = dotation - prevDotation;
          csv += `${variation === 0 ? '' : (variation > 0 ? '+' : '') + variation};`;
        }
        prevDotation = dotation;
      });
      
      const lastBudget = allBudgetsForSourceExercice[allBudgetsForSourceExercice.length - 1];
      const lastLigne = (lastBudget?.lignes || []).find(l => l.code === code);
      csv += `${lastLigne?.dotation || 0}\n`;
    });

    csv += `TOTAL;`;
    let prevTotal = 0;
    allBudgetsForSourceExercice.forEach((budget, index) => {
      const total = (budget.lignes || []).reduce((sum, l) => sum + (l.dotation || 0), 0);
      if (index === 0) {
        csv += `${total};`;
      } else {
        const variation = total - prevTotal;
        csv += `${variation === 0 ? '' : (variation > 0 ? '+' : '') + variation};`;
      }
      prevTotal = total;
    });
    csv += `${getTotaux(latestVersion).dotation}\n`;

    const filename = `Historique_Budget_${currentSourceObj?.sigle || 'Source'}_${currentExerciceObj?.annee || ''}.csv`;
    exportToCSV(csv, filename);
  };

  if (!sourceId || !exerciceId) {
    return (
      <div>
        <button onClick={() => setCurrentPage('budget')} style={{ ...styles.buttonSecondary, marginBottom: 20 }}>
          ← Retour au budget
        </button>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ color: '#6c757d' }}>Aucune donnée à afficher</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <button onClick={() => setCurrentPage('budget')} style={{ ...styles.buttonSecondary, padding: '8px 16px', marginBottom: 12 }}>
            ← Retour au budget
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>📜 Historique des versions</h1>
          <p style={{ color: '#6c757d', marginTop: 8 }}>
            <span style={{ 
              display: 'inline-block', 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              background: currentSourceObj?.couleur || '#0f4c3a',
              marginRight: 8
            }}></span>
            {currentSourceObj?.nom} - Exercice {currentExerciceObj?.annee}
          </p>
        </div>
        <button onClick={exportHistorique} style={{ ...styles.button, background: '#1565c0' }}>
          📥 Exporter Excel
        </button>
      </div>

      <div style={{ ...styles.card, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {allBudgetsForSourceExercice.map((budget) => (
            <div key={budget.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 12, 
                height: 12, 
                borderRadius: '50%', 
                background: budget.id === latestVersion?.id ? '#4caf50' : currentSourceObj?.couleur || '#0f4c3a' 
              }}></div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>
                  {getVersionLabel(budget)}
                  {budget.id === latestVersion?.id && <span style={{ color: '#4caf50', marginLeft: 4 }}>(actif)</span>}
                </div>
                <div style={{ fontSize: 11, color: '#6c757d' }}>
                  {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('fr-FR') : '-'}
                  {budget.motifRevision && ` - ${budget.motifRevision}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ ...styles.th, borderBottom: 'none', minWidth: 150 }}>DATE</th>
                {allBudgetsForSourceExercice.map(budget => (
                  <th key={budget.id} style={{ ...styles.th, textAlign: 'right', borderBottom: 'none', minWidth: 120 }}>
                    {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString('fr-FR') : '-'}
                  </th>
                ))}
                <th style={{ ...styles.th, textAlign: 'right', borderBottom: 'none', minWidth: 140, background: '#e8f5e9' }}></th>
              </tr>
              <tr>
                <th style={{ ...styles.th, minWidth: 150 }}>LIGNE</th>
                {allBudgetsForSourceExercice.map((budget, index) => (
                  <th key={budget.id} style={{ 
                    ...styles.th, 
                    textAlign: 'right', 
                    minWidth: 120,
                    background: budget.id === latestVersion?.id ? '#e8f5e9' : '#f8f9fa'
                  }}>
                    {getVersionLabel(budget)}
                    {index > 0 && <div style={{ fontSize: 9, fontWeight: 400, color: '#6c757d' }}>(variation)</div>}
                  </th>
                ))}
                <th style={{ ...styles.th, textAlign: 'right', minWidth: 140, background: currentSourceObj?.couleur || '#0f4c3a', color: 'white' }}>
                  DOTATION FINALE
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const allLignes = new Map();
                allBudgetsForSourceExercice.forEach(budget => {
                  (budget.lignes || []).forEach(ligne => {
                    if (!allLignes.has(ligne.code)) {
                      allLignes.set(ligne.code, ligne.libelle);
                    }
                  });
                });

                return Array.from(allLignes.keys()).sort().map(code => {
                  const valuesPerVersion = allBudgetsForSourceExercice.map((budget, index) => {
                    const ligne = (budget.lignes || []).find(l => l.code === code);
                    const dotation = ligne?.dotation || 0;
                    
                    let variation = null;
                    if (index > 0) {
                      const prevBudget = allBudgetsForSourceExercice[index - 1];
                      const prevLigne = (prevBudget.lignes || []).find(l => l.code === code);
                      variation = dotation - (prevLigne?.dotation || 0);
                    }
                    
                    return { dotation, variation, isLatest: budget.id === latestVersion?.id };
                  });

                  const dotationFinale = valuesPerVersion[valuesPerVersion.length - 1]?.dotation || 0;

                  return (
                    <tr key={code}>
                      <td style={styles.td}>
                        <code style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                          {code}
                        </code>
                        <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>{allLignes.get(code)}</div>
                      </td>
                      {valuesPerVersion.map((item, index) => (
                        <td key={index} style={{ 
                          ...styles.td, 
                          textAlign: 'right', 
                          fontFamily: 'monospace',
                          background: item.isLatest ? '#f1f8e9' : 'transparent'
                        }}>
                          {index === 0 ? (
                            <span style={{ fontWeight: 500 }}>{formatMontant(item.dotation)}</span>
                          ) : (
                            item.variation === 0 ? (
                              <span style={{ color: '#bdbdbd' }}>-</span>
                            ) : (
                              <span style={{ 
                                color: item.variation > 0 ? '#2e7d32' : '#c62828',
                                fontWeight: 600
                              }}>
                                {item.variation > 0 ? '+' : ''}{formatMontant(item.variation)}
                              </span>
                            )
                          )}
                        </td>
                      ))}
                      <td style={{ 
                        ...styles.td, 
                        textAlign: 'right', 
                        fontFamily: 'monospace', 
                        fontWeight: 700,
                        background: '#e8f5e9',
                        color: currentSourceObj?.couleur || '#0f4c3a'
                      }}>
                        {formatMontant(dotationFinale)}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8f9fa' }}>
                <td style={{ ...styles.td, fontWeight: 700 }}>TOTAL</td>
                {allBudgetsForSourceExercice.map((budget, index) => {
                  const totalDotation = (budget.lignes || []).reduce((sum, l) => sum + (l.dotation || 0), 0);
                  
                  let variation = null;
                  if (index > 0) {
                    const prevBudget = allBudgetsForSourceExercice[index - 1];
                    const prevTotal = (prevBudget.lignes || []).reduce((sum, l) => sum + (l.dotation || 0), 0);
                    variation = totalDotation - prevTotal;
                  }

                  return (
                    <td key={budget.id} style={{ 
                      ...styles.td, 
                      textAlign: 'right', 
                      fontFamily: 'monospace', 
                      fontWeight: 700,
                      background: budget.id === latestVersion?.id ? '#e8f5e9' : '#f8f9fa'
                    }}>
                      {index === 0 ? (
                        formatMontant(totalDotation)
                      ) : (
                        variation === 0 ? (
                          <span style={{ color: '#bdbdbd' }}>-</span>
                        ) : (
                          <span style={{ color: variation > 0 ? '#2e7d32' : '#c62828' }}>
                            {variation > 0 ? '+' : ''}{formatMontant(variation)}
                          </span>
                        )
                      )}
                    </td>
                  );
                })}
                <td style={{ 
                  ...styles.td, 
                  textAlign: 'right', 
                  fontFamily: 'monospace', 
                  fontWeight: 700,
                  fontSize: 16,
                  background: currentSourceObj?.couleur || '#0f4c3a',
                  color: 'white'
                }}>
                  {formatMontant(getTotaux(latestVersion).dotation)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PageHistoriqueBudget;
