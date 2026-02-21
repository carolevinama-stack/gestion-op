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

  // LOGIQUE DE CALCUL : Somme chronologique de TOUT ce qui précède (rejets inclus)
  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      return true;
    });

    const sorted = [...baseOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const cumulParLigne = {};
    
    const withCalculations = sorted.map(op => {
      const lb = op.ligneBudgetaire;
      const budgetSource = budgets.find(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId);
      const dotation = budgetSource?.lignes?.find(l => l.code === lb)?.dotation || 0;
      
      const engagementAnterieur = cumulParLigne[lb] || 0;
      cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (op.montant || 0);

      return { ...op, dotationLigne: dotation, engagementAnterieur, disponible: dotation - cumulParLigne[lb] };
    });

    return withCalculations.filter(op => {
      if (filters.search && !`${op.numero} ${getBenNom(op)}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
      if (filters.dateDebut && op.dateCreation < filters.dateDebut) return false;
      if (filters.dateFin && op.dateCreation > filters.dateFin) return false;
      return true;
    }).reverse();
  }, [ops, activeSource, filters, exerciceActif, budgets, beneficiaires]);

  return (
    <div style={styles.main}>
      <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
      
      <div style={styles.tabs}>
        <div onClick={() => setActiveSource('ALL')} style={activeSource === 'ALL' ? styles.tabActive : styles.tab}>CUMUL GÉNÉRAL</div>
        {sources.map(s => <div key={s.id} onClick={() => setActiveSource(s.id)} style={activeSource === s.id ? styles.tabActive : styles.tab}>{s.sigle}</div>)}
      </div>

      <div style={styles.card}>
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.label}>Recherche</label>
            <input type="text" style={styles.input} placeholder="N°, bénéficiaire..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          <div>
            <label style={styles.label}>Type</label>
            <select style={styles.input} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tous</option>
              <option value="DIRECT">Direct</option>
              <option value="PROVISOIRE">Provisoire</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Ligne</label>
            <input type="text" style={styles.input} placeholder="Code" value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
          </div>
          <div>
            <label style={styles.label}>Du</label>
            <input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
          </div>
          <div>
            <label style={styles.label}>Au</label>
            <input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
          </div>
          <button style={styles.buttonSecondary} onClick={() => setFilters({search:'', type:'', ligneBudgetaire:'', dateDebut:'', dateFin:''})}>Réinitialiser</button>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={styles.stickyTh}>N° OP</th>
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
              <th style={styles.stickyTh}></th>
            </tr>
          </thead>
          <tbody>
            {displayOps.map((op, i) => (
              <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                <td style={styles.td}>{op.numero}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{getBenNom(op)}</td>
                <td style={styles.td}>{op.ligneBudgetaire}</td>
                {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right' }}>{formatMontant(op.dotationLigne)}</td>}
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(op.montant)}</td>
                {activeSource !== 'ALL' && (
                  <>
                    <td style={{ ...styles.td, textAlign: 'right', color: '#666' }}>{formatMontant(op.engagementAnterieur)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, color: op.disponible < 0 ? '#C43E3E' : '#2E9940' }}>{formatMontant(op.disponible)}</td>
                  </>
                )}
                <td style={{ ...styles.td, textAlign: 'center' }}>{op.statut}</td>
                <td style={styles.td}><button onClick={(e) => { e.stopPropagation(); setPreviewOp(op); }}>👁️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PageListeOP;
