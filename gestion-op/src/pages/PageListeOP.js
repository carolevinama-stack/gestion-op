import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

const PageListeOP = () => {
  const { sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [filters, setFilters] = useState({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '' });
  const [previewOp, setPreviewOp] = useState(null);

  const getBenNom = (op) => op.beneficiaireNom || beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || 'N/A';

  const displayOps = useMemo(() => {
    // 1. On filtre d'abord selon la source et l'exercice pour avoir la base de calcul
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      return true;
    });

    // 2. TRI CHRONOLOGIQUE STRICT (Indispensable pour le calcul des engagements antérieurs)
    const sortedChronologically = [...baseOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    // 3. CALCUL DES CUMULS (Règle : Tout OP précédent compte, peu importe le statut)
    const cumulParLigne = {};
    const withCalculations = sortedChronologically.map(op => {
      const lb = op.ligneBudgetaire;
      const budgetSource = budgets.find(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId);
      const dotation = budgetSource?.lignes?.find(l => l.code === lb)?.dotation || 0;

      const engagementAnterieur = cumulParLigne[lb] || 0;
      // On cumule TOUT sans exception (rejets, annulations, etc.)
      cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (op.montant || 0);

      return {
        ...op,
        dotationLigne: dotation,
        engagementAnterieur: engagementAnterieur,
        disponible: dotation - cumulParLigne[lb]
      };
    });

    // 4. FILTRES D'AFFICHAGE (On applique les filtres de recherche APRÈS le calcul)
    return withCalculations.filter(op => {
      if (filters.search && !`${op.numero} ${getBenNom(op)}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
      if (filters.type && op.type !== filters.type) return false;
      if (filters.dateDebut && op.dateCreation < filters.dateDebut) return false;
      if (filters.dateFin && op.dateCreation > filters.dateFin) return false;
      return true;
    }).reverse(); // On inverse pour voir les plus récents en haut du tableau
  }, [ops, activeSource, filters, exerciceActif, budgets, beneficiaires]);

  return (
    <div style={{ ...styles.main, width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
      </div>

      <div style={styles.tabs}>
        <div onClick={() => setActiveSource('ALL')} style={activeSource === 'ALL' ? styles.tabActive : styles.tab}>CUMUL GÉNÉRAL</div>
        {sources.map(s => (
          <div key={s.id} onClick={() => setActiveSource(s.id)} style={activeSource === s.id ? { ...styles.tabActive, color: s.couleur, borderColor: s.couleur } : styles.tab}>
            {s.sigle}
          </div>
        ))}
      </div>

      {/* BARRE DE RECHERCHE AJUSTÉE - LARGEURS FIXES ET ESPACEMENT */}
      <div style={{ ...styles.card, display: 'flex', gap: '15px', alignItems: 'flex-end', overflowX: 'auto' }}>
        <div style={{ flex: '1', minWidth: '150px' }}>
          <label style={styles.label}>Recherche</label>
          <input type="text" style={styles.input} placeholder="N°, bénéficiaire..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
        </div>
        <div style={{ width: '100px' }}>
          <label style={styles.label}>Type</label>
          <select style={styles.select} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">Tous</option>
            <option value="DIRECT">Direct</option>
            <option value="PROVISOIRE">Provisoire</option>
          </select>
        </div>
        <div style={{ width: '60px' }}>
          <label style={styles.label}>Ligne</label>
          <input type="text" style={styles.input} placeholder="Code" value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
        </div>
        <div style={{ width: '125px' }}>
          <label style={styles.label}>Du</label>
          <input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
        </div>
        <div style={{ width: '125px' }}>
          <label style={styles.label}>Au</label>
          <input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
        </div>
        <button style={{ ...styles.buttonSecondary, padding: '8px 12px' }} onClick={() => setFilters({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '' })}>
          Réinitialiser
        </button>
      </div>

      {/* TABLEAU AVEC EN-TÊTE FIGÉ */}
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '68vh', overflowY: 'auto' }}>
          <table style={{ ...styles.table, borderCollapse: 'separate' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F9F9F8' }}>
              <tr>
                <th style={styles.stickyTh}>N° OP</th>
                <th style={styles.stickyTh}>Type</th>
                <th style={styles.stickyTh}>Bénéficiaire</th>
                <th style={styles.stickyTh}>Ligne</th>
                {activeSource !== 'ALL' && <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Dotation</th>}
                <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Montant</th>
                {activeSource !== 'ALL' && (
                  <>
                    <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Engag. Ant.</th>
                    <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Disponible</th>
                  </>
                )}
                <th style={{ ...styles.stickyTh, textAlign: 'center' }}>Statut</th>
                <th style={{ ...styles.stickyTh, width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {displayOps.map((op, i) => (
                <tr 
                  key={i} 
                  onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }}
                  style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                >
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 10, fontWeight: 700 }}>{op.type}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{getBenNom(op)}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace' }}>{op.ligneBudgetaire}</td>
                  {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right' }}>{formatMontant(op.dotationLigne)}</td>}
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(op.montant)}</td>
                  {activeSource !== 'ALL' && (
                    <>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#666' }}>{formatMontant(op.engagementAnterieur)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: op.disponible < 0 ? '#C43E3E' : '#2E9940' }}>{formatMontant(op.disponible)}</td>
                    </>
                  )}
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, background: '#F0F0F0', fontWeight: 700 }}>{op.statut}</span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={(e) => { e.stopPropagation(); setPreviewOp(op); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4722A" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CIRCUIT SANS EMOJIS */}
      {previewOp && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 400 }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', background: '#F8F9FA' }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>SUIVI CIRCUIT OP</span>
              <button onClick={() => setPreviewOp(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 800 }}>{previewOp.numero}</div>
                <div style={{ color: '#D4722A', fontSize: 18, fontWeight: 900, marginTop: 5 }}>{formatMontant(previewOp.montant)} F CFA</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div style={{ fontSize: 13 }}><strong>Création :</strong> {previewOp.dateCreation || 'N/A'}</div>
                <div style={{ fontSize: 13 }}><strong>Transmission CF :</strong> {previewOp.dateTransmissionCF || 'En attente'}</div>
                <div style={{ fontSize: 13 }}><strong>Visa CF :</strong> {previewOp.dateVisaCF || 'En attente'}</div>
              </div>
              <button onClick={() => { setConsultOpData(previewOp); setCurrentPage('consulterOp'); setPreviewOp(null); }} style={{ ...styles.button, width: '100%', marginTop: 25, background: '#1B6B2E' }}>
                CONSULTER FICHE COMPLÈTE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageListeOP;
