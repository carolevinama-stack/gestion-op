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
  const [previewOp, setPreviewOp] = useState(null);

  const typeColors = { PROVISOIRE: '#E8B931', DIRECT: '#D4722A', DEFINITIF: '#2E9940', ANNULATION: '#C43E3E' };

  const getBenNom = (op) => {
    if (op.beneficiaireNom) return op.beneficiaireNom;
    const b = beneficiaires.find(x => x.id === op.beneficiaireId);
    return b ? b.nom : 'N/A';
  };

  const buildCircuitSteps = (op) => {
    if (!op) return [];
    return [
      { label: 'Création OP', active: true, date: op.dateCreation },
      { label: 'Transmission CF', active: !!op.dateTransmissionCF, date: op.dateTransmissionCF },
      { label: 'Visa CF', active: !!op.dateVisaCF, date: op.dateVisaCF },
      { label: 'Transmission AC', active: !!op.dateTransmissionAC, date: op.dateTransmissionAC },
      { label: 'Paiement', active: op.statut === 'PAYE' || op.statut === 'PAYE_PARTIEL', date: op.datePaiement }
    ];
  };

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      if (activeTab === 'CORBEILLE' ? op.statut !== 'SUPPRIME' : op.statut === 'SUPPRIME') return false;
      if (filters.type && op.type !== filters.type) return false;
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

    const cumulParLigne = {};
    const processed = lines.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')).map(line => {
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
    <div style={{ padding: '0 20px', maxWidth: '100%', color: '#000' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '15px 0' }}>
        <h1 style={{ ...styles.title, margin: 0 }}>Liste des Ordres de Paiement</h1>
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

      {/* FILTRES EN GRID POUR ÉVITER TOUTE SUPERPOSITION */}
      <div style={{ ...styles.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', alignItems: 'end', marginBottom: '20px' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={styles.label}>Recherche</label>
          <input type="text" placeholder="N°, bénéficiaire..." style={styles.input} value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
        </div>
        <div>
          <label style={styles.label}>Type</label>
          <select style={styles.select} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">Tous</option>
            <option value="PROVISOIRE">Provisoire</option>
            <option value="DIRECT">Direct</option>
            <option value="DEFINITIF">Définitif</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Ligne</label>
          <input type="text" placeholder="Code..." style={styles.input} value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
        </div>
        <div>
          <label style={styles.label}>Du (Date)</label>
          <input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
        </div>
        <div>
          <label style={styles.label}>Au (Date)</label>
          <input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
        </div>
        <button onClick={() => setActiveTab(activeTab === 'CORBEILLE' ? 'CUMUL_OP' : 'CORBEILLE')} style={{ ...styles.buttonSecondary, height: '38px' }}>
          {activeTab === 'CORBEILLE' ? 'Sortir' : '🗑️'}
        </button>
      </div>

      {/* TABLEAU AVEC SCROLL INTERNE ET EN-TÊTE FIXE */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 100, background: '#F4F4F4' }}>
              <tr>
                <th style={{ ...styles.th, borderBottom: '2px solid #ccc' }}>N° OP</th>
                <th style={{ ...styles.th, borderBottom: '2px solid #ccc' }}>Type</th>
                <th style={{ ...styles.th, borderBottom: '2px solid #ccc' }}>Bénéficiaire</th>
                <th style={{ ...styles.th, borderBottom: '2px solid #ccc' }}>Objet</th>
                <th style={{ ...styles.th, borderBottom: '2px solid #ccc' }}>Ligne</th>
                {activeSource !== 'ALL' && <th style={{ ...styles.th, textAlign: 'right', borderBottom: '2px solid #ccc' }}>Dotation</th>}
                <th style={{ ...styles.th, textAlign: 'right', borderBottom: '2px solid #ccc' }}>Montant</th>
                {activeSource !== 'ALL' && (
                  <>
                    <th style={{ ...styles.th, textAlign: 'right', borderBottom: '2px solid #ccc' }}>Engag. Ant.</th>
                    <th style={{ ...styles.th, textAlign: 'right', borderBottom: '2px solid #ccc' }}>Disponible</th>
                  </>
                )}
                <th style={{ ...styles.th, textAlign: 'center', borderBottom: '2px solid #ccc' }}>Statut</th>
                <th style={{ ...styles.th, width: '40px', borderBottom: '2px solid #ccc' }}></th>
              </tr>
            </thead>
            <tbody>
              {displayOps.map((op, i) => (
                <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.isRejetLine ? op.displayNumero : op.numero}</td>
                  <td style={{ ...styles.td, fontSize: 10, fontWeight: 700, color: op.isRejetLine ? '#C43E3E' : typeColors[op.type] }}>{op.isRejetLine ? 'REJET' : op.type}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{getBenNom(op)}</td>
                  <td style={{ ...styles.td, color: '#666', fontSize: 11, maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire}</td>
                  {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(op.dotationLigne)}</td>}
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: op.isRejetLine ? '#C43E3E' : '#000' }}>{formatMontant(op.montant)}</td>
                  {activeSource !== 'ALL' && (
                    <>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{formatMontant(op.engagementAnterieur)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: op.disponible < 0 ? '#C43E3E' : '#2E9940' }}>{formatMontant(op.disponible)}</td>
                    </>
                  )}
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <Badge bg={op.isRejetLine ? '#FFEBEE' : '#E8F5E9'} color={op.isRejetLine ? '#C43E3E' : '#2E9940'}>{op.isRejetLine ? 'REJET' : op.statut}</Badge>
                  </td>
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
      </div>

      {/* MODAL CIRCUIT COMPLET */}
      {previewOp && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: '450px' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, margin: 0 }}>Détails Circuit OP</h2>
              <button onClick={() => setPreviewOp(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px', padding: '15px', background: '#F8F9FA', borderRadius: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{previewOp.numero}</div>
                <div style={{ color: '#D4722A', fontSize: 20, fontWeight: 900, marginTop: 5 }}>{formatMontant(previewOp.montant)} F</div>
                <div style={{ fontSize: 12, marginTop: 5 }}>{getBenNom(previewOp)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {buildCircuitSteps(previewOp).map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: step.active ? '#2E9940' : '#DDD' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: step.active ? 700 : 400, color: step.active ? '#000' : '#999' }}>{step.label}</div>
                      {step.active && step.date && <div style={{ fontSize: 11, color: '#666' }}>le {new Date(step.date).toLocaleDateString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => { setConsultOpData(previewOp); setCurrentPage('consulterOp'); setPreviewOp(null); }} style={{ ...styles.button, width: '100%', background: '#D4722A', marginTop: '25px' }}>Consulter Détails Complets</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageListeOP;
