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

  return (
    <div style={styles.main}> {/* Force le contenu à droite de la sidebar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
      </div>

      {/* FILTRES AVEC LARGEURS FIXES ET ESPACEMENT */}
      <div style={styles.card}>
        <div style={styles.filterGrid}>
          <div style={styles.groupRecherche}>
            <label style={styles.label}>Recherche</label>
            <input type="text" style={styles.input} placeholder="N°, bénéficiaire..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          <div style={styles.groupType}>
            <label style={styles.label}>Type</label>
            <select style={styles.input} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tous</option>
              <option value="DIRECT">Direct</option>
              <option value="PROVISOIRE">Provisoire</option>
            </select>
          </div>
          <div style={styles.groupLigne}>
            <label style={styles.label}>Ligne</label>
            <input type="text" style={styles.input} placeholder="Code" value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
          </div>
          <div style={styles.groupDate}>
            <label style={styles.label}>Du (Date)</label>
            <input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
          </div>
          <div style={styles.groupDate}>
            <label style={styles.label}>Au (Date)</label>
            <input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
          </div>
          <div style={styles.groupStatut}>
            <label style={styles.label}>Statut</label>
            <select style={styles.input} value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})}>
              <option value="">Tous les statuts</option>
              <option value="EN_COURS">En cours</option>
              <option value="PAYE">Payé</option>
            </select>
          </div>
          {/* Bouton corbeille uniquement icône */}
          <button style={{...styles.buttonSecondary, padding: '8px'}} title="Corbeille">🗑️</button>
        </div>
      </div>

      {/* TABLEAU AVEC EN-TÊTE FIGÉ */}
      <div style={styles.tableWrapper}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
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
            {/* ... ton rendu de lignes ici ... */}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PageListeOP;
