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
    let list = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      if (filters.search && !`${op.numero} ${getBenNom(op)}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.includes(filters.ligneBudgetaire)) return false;
      if (filters.dateDebut && op.dateCreation < filters.dateDebut) return false;
      if (filters.dateFin && op.dateCreation > filters.dateFin) return false;
      return true;
    });
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [ops, activeSource, filters, exerciceActif]);

  return (
    <div style={styles.pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '15px 0' }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
      </div>

      <div style={styles.tabs}>
        <div onClick={() => setActiveSource('ALL')} style={activeSource === 'ALL' ? styles.tabActive : styles.tab}>CUMUL OP</div>
        {sources.map(s => <div key={s.id} onClick={() => setActiveSource(s.id)} style={activeSource === s.id ? styles.tabActive : styles.tab}>{s.sigle}</div>)}
      </div>

      {/* FILTRES UTILISANT LES TAILLES FIXES DU FICHIER STYLE */}
      <div style={styles.card}>
        <div style={styles.filterGrid}>
          <div style={styles.filterGroup('250px')}>
            <label style={styles.label}>Recherche</label>
            <input type="text" style={styles.input} placeholder="N°, bénéficiaire..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          <div style={styles.filterGroup('120px')}>
            <label style={styles.label}>Type</label>
            <select style={styles.select} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tous</option>
              <option value="DIRECT">Direct</option>
              <option value="PROVISOIRE">Provisoire</option>
            </select>
          </div>
          <div style={styles.filterGroup('80px')}>
            <label style={styles.label}>Ligne</label>
            <input type="text" style={styles.input} placeholder="Code" value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
          </div>
          <div style={styles.filterGroup('140px')}>
            <label style={styles.label}>Du (Date)</label>
            <input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
          </div>
          <div style={styles.filterGroup('140px')}>
            <label style={styles.label}>Au (Date)</label>
            <input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
          </div>
          <button style={styles.buttonSecondary} onClick={() => setFilters({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '' })}>Réinitialiser</button>
        </div>
      </div>

      {/* TABLEAU AVEC EN-TÊTE RÉELLEMENT FIGÉ (STICKY) */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.stickyTh}>N° OP</th>
              <th style={styles.stickyTh}>Bénéficiaire</th>
              <th style={styles.stickyTh}>Ligne</th>
              <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Montant</th>
              <th style={{ ...styles.stickyTh, textAlign: 'center' }}>Statut</th>
              <th style={styles.stickyTh}></th>
            </tr>
          </thead>
          <tbody>
            {displayOps.map((op, i) => (
              <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ cursor: 'pointer' }}>
                <td style={styles.td}>{op.numero}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{getBenNom(op)}</td>
                <td style={styles.td}>{op.ligneBudgetaire}</td>
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>{formatMontant(op.montant)}</td>
                <td style={{ ...styles.td, textAlign: 'center' }}>{op.statut}</td>
                <td style={styles.td}>
                  <button onClick={(e) => { e.stopPropagation(); setPreviewOp(op); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4722A" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CIRCUIT */}
      {previewOp && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <strong>Aperçu Circuit</strong>
              <button onClick={() => setPreviewOp(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: 15 }}>
                <strong>{previewOp.numero}</strong><br/>
                <span style={{ color: '#D4722A', fontSize: 18, fontWeight: 800 }}>{formatMontant(previewOp.montant)} F</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div>• Création : {previewOp.dateCreation}</div>
                <div>• Visa CF : {previewOp.dateVisaCF || 'En attente'}</div>
                <div>• Paiement : {previewOp.datePaiement || 'En attente'}</div>
              </div>
              <button onClick={() => { setConsultOpData(previewOp); setCurrentPage('consulterOp'); setPreviewOp(null); }} style={{ ...styles.button, width: '100%', marginTop: 20, background: '#D4722A' }}>Détails Complets</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageListeOP;
