import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import PasswordModal from '../components/PasswordModal';

const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ ...styles.badge, background: bg, color, whiteSpace: 'nowrap' }}>
    {children}
  </span>
));

const PageListeOP = () => {
  const { projet, sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL'); 
  const [activeTab, setActiveTab] = useState('CUMUL_OP'); 
  const [filters, setFilters] = useState({ type: '', search: '', ligneBudgetaire: '', statut: '', dateDebut: '', dateFin: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(null);

  const typeColors = { PROVISOIRE: '#E8B931', DIRECT: '#D4722A', DEFINITIF: '#2E9940', ANNULATION: '#C43E3E' };
  const statutConfig = {
    EN_COURS: { bg: '#E8F5E9', color: '#D4722A', label: 'En cours' },
    TRANSMIS_CF: { bg: '#FFF8E1', color: '#C5961F', label: 'Transmis CF' },
    VISE_CF: { bg: '#E8F5E9', color: '#2E9940', label: 'Visé CF' },
    TRANSMIS_AC: { bg: '#E3F2FD', color: '#1976D2', label: 'Chez AC' },
    PAYE: { bg: '#E8F5E9', color: '#1B6B2E', label: 'Payé' },
    REJETE_CF: { bg: '#FFEBEE', color: '#C43E3E', label: 'Rejeté CF' },
    REJETE_AC: { bg: '#FFEBEE', color: '#C43E3E', label: 'Rejeté AC' },
    SUPPRIME: { bg: '#F5F5F5', color: '#999', label: 'Supprimé' }
  };

  const getBenNom = (op) => {
    if (op.beneficiaireNom) return op.beneficiaireNom;
    const b = beneficiaires.find(x => x.id === op.beneficiaireId);
    return b ? b.nom : 'N/A';
  };

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      if (activeTab === 'CORBEILLE' ? op.statut !== 'SUPPRIME' : op.statut === 'SUPPRIME') return false;
      
      if (filters.type && op.type !== filters.type) return false;
      if (filters.statut && op.statut !== filters.statut) return false;
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
      if (filters.dateDebut && op.dateCreation < filters.dateDebut) return false;
      if (filters.dateFin && op.dateCreation > filters.dateFin) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return op.numero?.toLowerCase().includes(s) || getBenNom(op).toLowerCase().includes(s) || (op.objet || '').toLowerCase().includes(s);
      }
      return true;
    });

    const lines = baseOps.map(op => ({ ...op, isRejetLine: false }));
    baseOps.forEach(op => {
      if (['REJETE_CF', 'REJETE_AC'].includes(op.statut)) {
        lines.push({ ...op, isRejetLine: true, displayNumero: op.numero + ' (REJET)', montant: -(op.montant || 0) });
      }
    });

    lines.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    const cumulParLigne = {};
    const processed = lines.map(line => {
      const lb = line.ligneBudgetaire;
      const budgetSource = budgets.find(b => b.sourceId === line.sourceId && b.exerciceId === line.exerciceId);
      const dotation = budgetSource?.lignes?.find(l => l.code === lb)?.dotation || 0;

      line.engagementAnterieur = cumulParLigne[lb] || 0;
      if (!['REJETE_CF', 'REJETE_AC', 'ANNULE', 'SUPPRIME'].includes(line.statut) || line.isRejetLine) {
        cumulParLigne[lb] = (cumulParLigne[lb] || 0) + line.montant;
      }
      line.dotationLigne = dotation;
      line.disponible = dotation - (cumulParLigne[lb] || 0);
      return line;
    });

    return processed.reverse();
  }, [ops, activeSource, activeTab, filters, exerciceActif, budgets, beneficiaires]);

  return (
    <div style={styles.pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
      </div>

      <div style={styles.tabs}>
        <div onClick={() => setActiveSource('ALL')} style={activeSource === 'ALL' ? styles.tabActive : styles.tab}>CUMUL OP</div>
        {sources.map(s => (
          <div key={s.id} onClick={() => setActiveSource(s.id)} style={activeSource === s.id ? { ...styles.tabActive, color: s.couleur, borderColor: s.couleur } : styles.tab}>
            {s.sigle}
          </div>
        ))}
      </div>

      {/* BARRE DE FILTRES AJUSTÉE ET COMPLÈTE */}
      <div style={{ ...styles.card, display: 'flex', gap: 10, alignItems: 'end', marginBottom: 15, flexWrap: 'nowrap' }}>
        <div style={{ flex: 2 }}>
          <label style={styles.label}>Recherche</label>
          <input type="text" placeholder="N°, bénéficiaire..." style={styles.input} value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Type</label>
          <select style={styles.select} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">Tous</option>
            <option value="PROVISOIRE">Provisoire</option>
            <option value="DIRECT">Direct</option>
            <option value="DEFINITIF">Définitif</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Ligne</label>
          <input type="text" placeholder="Code..." style={styles.input} value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Du</label>
          <input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Au</label>
          <input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Statut</label>
          <select style={styles.select} value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})}>
            <option value="">Tous</option>
            {Object.entries(statutConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <button onClick={() => setActiveTab(activeTab === 'CORBEILLE' ? 'CUMUL_OP' : 'CORBEILLE')} style={{ ...styles.buttonSecondary, padding: '10px 15px' }}>
          {activeTab === 'CORBEILLE' ? 'Sortir' : '🗑️'}
        </button>
      </div>

      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
          <table style={styles.table}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#F9F9F8' }}>
              <tr>
                <th style={styles.th}>N° OP</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Bénéficiaire</th>
                <th style={styles.th}>Objet</th>
                <th style={styles.th}>Ligne</th>
                {activeSource !== 'ALL' && <th style={{ ...styles.th, textAlign: 'right' }}>Dotation</th>}
                <th style={{ ...styles.th, textAlign: 'right' }}>Montant</th>
                {activeSource !== 'ALL' && (
                  <>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Engag. Ant.</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Disponible</th>
                  </>
                )}
                <th style={{ ...styles.th, textAlign: 'center' }}>Statut</th>
                <th style={{ ...styles.th, textAlign: 'center', width: 50 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayOps.length === 0 ? (
                <tr><td colSpan="12" style={{ textAlign: 'center', padding: 40, color: '#999' }}>Aucun enregistrement trouvé</td></tr>
              ) : displayOps.map((op, i) => {
                const st = statutConfig[op.statut] || { color: '#333', bg: '#EEE', label: op.statut };
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.isRejetLine ? op.displayNumero : op.numero}</td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: op.isRejetLine ? '#C43E3E' : typeColors[op.type] }}>
                        {op.isRejetLine ? 'REJET' : op.type}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{getBenNom(op)}</td>
                    <td style={{ ...styles.td, color: '#666', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet}</td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire}</td>
                    {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(op.dotationLigne)}</td>}
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: op.isRejetLine ? '#C43E3E' : '#000' }}>
                      {op.isRejetLine ? '-' : ''}{formatMontant(Math.abs(op.montant))}
                    </td>
                    {activeSource !== 'ALL' && (
                      <>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{formatMontant(op.engagementAnterieur)}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: op.disponible < 0 ? '#C43E3E' : '#2E9940' }}>{formatMontant(op.disponible)}</td>
                      </>
                    )}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <Badge bg={op.isRejetLine ? '#FFEBEE' : st.bg} color={op.isRejetLine ? '#C43E3E' : st.color}>
                        {op.isRejetLine ? 'REJET' : st.label}
                      </Badge>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button onClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 5 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4722A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {showPasswordModal && <PasswordModal isOpen={!!showPasswordModal} onClose={() => setShowPasswordModal(null)} onConfirm={showPasswordModal.action} adminPassword={projet?.adminPassword || ''} />}
    </div>
  );
};

export default PageListeOP;
