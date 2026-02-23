import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

const PageListeOP = () => {
  const { sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [filters, setFilters] = useState({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statut: '' });
  const [previewOp, setPreviewOp] = useState(null);

  const getBenNom = (op) => op.beneficiaireNom || beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || 'N/A';

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      return true;
    });

    // Tri chronologique pour le calcul des cumuls
    const sorted = [...baseOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const cumulParLigne = {};
    
    const withCalculations = sorted.map(op => {
      const lb = op.ligneBudgetaire;
      const budgetSource = budgets.find(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId);
      const dotation = budgetSource?.lignes?.find(l => l.code === lb)?.dotation || 0;
      const engagementAnterieur = cumulParLigne[lb] || 0;
      
      // Somme chronologique totale (incluant rejets et annulations)
      cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (op.montant || 0);

      return { ...op, dotationLigne: dotation, engagementAnterieur, disponible: dotation - cumulParLigne[lb] };
    });

    // Application des filtres de recherche et des menus déroulants
    return withCalculations.filter(op => {
      // 1. Filtre Recherche (Numéro, Bénéficiaire, Montant)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        // On inclut le montant brut et formaté pour faciliter la recherche
        const searchString = `${op.numero} ${getBenNom(op)} ${op.montant} ${formatMontant(op.montant)}`.toLowerCase();
        if (!searchString.includes(searchLower)) return false;
      }
      
      // 2. Filtre Type
      if (filters.type && op.type !== filters.type) return false;
      
      // 3. Filtre Statut
      if (filters.statut && op.statut !== filters.statut) return false;
      
      // 4. Filtre Ligne Budgétaire
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
      
      // 5. Filtre Période
      if (filters.dateDebut && op.dateCreation < filters.dateDebut) return false;
      if (filters.dateFin && op.dateCreation > filters.dateFin) return false;
      
      return true;
    }).reverse();
  }, [ops, activeSource, filters, exerciceActif, budgets, beneficiaires]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
      </div>

      <div style={styles.tabs}>
        <div onClick={() => setActiveSource('ALL')} style={activeSource === 'ALL' ? styles.tabActive : styles.tab}>CUMUL GENERAL</div>
        {sources.map(s => <div key={s.id} onClick={() => setActiveSource(s.id)} style={activeSource === s.id ? styles.tabActive : styles.tab}>{s.sigle}</div>)}
      </div>

      <div style={styles.card}>
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.label}>Recherche</label>
            <input type="text" style={styles.input} placeholder="N°, bénéficiaire, montant..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          <div>
            <label style={styles.label}>Type</label>
            <select style={styles.select} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tous</option>
              <option value="DIRECT">Direct</option>
              <option value="PROVISOIRE">Provisoire</option>
              <option value="DEFINITIF">Définitif</option>
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
          <div>
            <label style={styles.label}>Statut</label>
            <select style={styles.select} value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})}>
              <option value="">Tous</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="TRANSMIS_CF">Transmis CF</option>
              <option value="VISE_CF">Visé CF</option>
              <option value="REJETE_CF">Rejeté CF</option>
              <option value="TRANSMIS_AC">Transmis AC</option>
              <option value="REJETE_AC">Rejeté AC</option>
              <option value="PAYE">Payé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>
          <button style={styles.buttonIcon} onClick={() => setFilters({search:'', type:'', ligneBudgetaire:'', dateDebut:'', dateFin:'', statut:''})}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>

      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '6%' }} />
            {activeSource !== 'ALL' && <col style={{ width: '11%' }} />}
            <col style={{ width: '11%' }} />
            {activeSource !== 'ALL' && <><col style={{ width: '11%' }} /><col style={{ width: '10%' }} /></>}
            <col style={{ width: '10%' }} />
            <col style={{ width: '3%' }} />
          </colgroup>
          <thead>
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
              <th style={styles.stickyTh}></th>
            </tr>
          </thead>
          <tbody>
            {displayOps.map((op, i) => (
              <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #ddd', cursor: 'pointer' }}>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.numero}</td>
                <td style={{ ...styles.td, fontSize: '11px', color: '#444' }}>{op.type}</td>
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
                <td style={{ ...styles.td, textAlign: 'center', fontSize: '11px' }}>{op.statut}</td>
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

      {previewOp && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: 400 }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #ddd', background: '#f8f8f8', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 800 }}>CIRCUIT DE VALIDATION</span>
              <button onClick={() => setPreviewOp(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{ fontSize: '11px', color: '#666' }}>REFERENCE OP</div>
                <div style={{ fontWeight: 800 }}>{previewOp.numero}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                <div>DATE SAISIE : {previewOp.dateCreation || '---'}</div>
                <div>VISA CF : {previewOp.dateVisaCF || 'EN ATTENTE'}</div>
                <div>PAIEMENT : {previewOp.datePaiement || 'EN ATTENTE'}</div>
              </div>
              <button onClick={() => { setConsultOpData(previewOp); setCurrentPage('consulterOp'); setPreviewOp(null); }} style={{ ...styles.button, width: '100%', marginTop: '20px', background: '#D4722A' }}>
                CONSULTER FICHE COMPLETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageListeOP;
