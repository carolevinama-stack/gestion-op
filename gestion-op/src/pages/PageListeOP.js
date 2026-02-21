import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import PasswordModal from '../components/PasswordModal';

const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ ...styles.badge, background: bg, color, whiteSpace: 'nowrap', fontSize: '10px', padding: '2px 8px' }}>
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
    <div style={{ padding: '0 20px', maxWidth: '100%', color: '#000', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* SECTION FIXE DU HAUT */}
      <div style={{ flexShrink: 0 }}>
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

        {/* BARRE DE FILTRES COMPACTE SUR UNE SEULE LIGNE */}
        <div style={{ ...styles.card, display: 'flex', gap: '8px', alignItems: 'flex-end', padding: '10px 15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Recherche</label>
            <input type="text" placeholder="N°, bénéficiaire..." style={{ ...styles.input, padding: '6px 10px' }} value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          <div style={{ width: '110px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Type</label>
            <select style={{ ...styles.select, padding: '6px 10px' }} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tous</option>
              <option value="PROVISOIRE">Provisoire</option>
              <option value="DIRECT">Direct</option>
              <option value="DEFINITIF">Définitif</option>
            </select>
          </div>
          <div style={{ width: '70px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Ligne</label>
            <input type="text" placeholder="Code" style={{ ...styles.input, padding: '6px 10px' }} value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
          </div>
          <div style={{ width: '120px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Du</label>
            <input type="date" style={{ ...styles.input, padding: '6px 10px' }} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
          </div>
          <div style={{ width: '120px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Au</label>
            <input type="date" style={{ ...styles.input, padding: '6px 10px' }} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
          </div>
          <div style={{ width: '110px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Statut</label>
            <select style={{ ...styles.select, padding: '6px 10px' }} value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})}>
              <option value="">Tous</option>
              {Object.entries(statutConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setActiveTab(activeTab === 'CORBEILLE' ? 'CUMUL_OP' : 'CORBEILLE')} 
            style={{ ...styles.buttonSecondary, padding: '6px 12px', height: '31px', background: activeTab === 'CORBEILLE' ? '#FFEBEE' : '#f5f5f5' }}
            title={activeTab === 'CORBEILLE' ? 'Sortir de la corbeille' : 'Voir la corbeille'}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* TABLEAU AVEC SCROLL INTERNE ET EN-TÊTE FIXE */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '20px' }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
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
                <th style={{ ...styles.th, width: '30px', borderBottom: '2px solid #ccc' }}></th>
              </tr>
            </thead>
            <tbody>
              {displayOps.map((op, i) => {
                const st = statutConfig[op.statut] || { color: '#333', bg: '#EEE', label: op.statut };
                return (
                  <tr 
                    key={i} 
                    onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} 
                    style={{ borderBottom: '1px solid #eee', cursor: 'pointer', background: i % 2 === 0 ? '#fff' : '#fafafa' }}
                  >
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }}>{op.isRejetLine ? op.displayNumero : op.numero}</td>
                    <td style={{ ...styles.td, fontSize: '10px', fontWeight: 700, color: op.isRejetLine ? '#C43E3E' : typeColors[op.type] }}>{op.isRejetLine ? 'REJET' : op.type}</td>
                    <td style={{ ...styles.td, fontWeight: 600, fontSize: '11px' }}>{getBenNom(op)}</td>
                    <td style={{ ...styles.td, color: '#666', fontSize: '11px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet}</td>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '11px' }}>{op.ligneBudgetaire}</td>
                    {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontSize: '11px' }}>{formatMontant(op.dotationLigne)}</td>}
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: op.isRejetLine ? '#C43E3E' : '#000', fontSize: '11px' }}>{formatMontant(op.montant)}</td>
                    {activeSource !== 'ALL' && (
                      <>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#666', fontSize: '11px' }}>{formatMontant(op.engagementAnterieur)}</td>
                        <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: op.disponible < 0 ? '#C43E3E' : '#2E9940', fontSize: '11px' }}>{formatMontant(op.disponible)}</td>
                      </>
                    )}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <Badge bg={op.isRejetLine ? '#FFEBEE' : st.bg} color={op.isRejetLine ? '#C43E3E' : st.color}>{op.isRejetLine ? 'REJET' : st.label}</Badge>
                    </td>
                    <td style={styles.td}>
                      <button onClick={(e) => { e.stopPropagation(); setPreviewOp(op); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4722A" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CIRCUIT AVEC DÉTAILS */}
      {previewOp && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: '450px', padding: 0 }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F9FA' }}>
              <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 800 }}>Détails & Circuit OP</h2>
              <button onClick={() => setPreviewOp(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px', padding: '15px', background: '#F8F9FA', borderRadius: '10px', border: '1px solid #eee' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#1B6B2E' }}>{previewOp.numero}</div>
                <div style={{ color: '#D4722A', fontSize: '18px', fontWeight: 900, marginTop: '5px' }}>{formatMontant(previewOp.montant)} F</div>
                <div style={{ fontSize: '12px', marginTop: '5px', fontWeight: 600 }}>{getBenNom(previewOp)}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {buildCircuitSteps(previewOp).map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '4px', width: '10px', height: '10px', borderRadius: '50%', background: step.active ? '#2E9940' : '#DDD', border: step.active ? '2px solid #C8E6C9' : 'none' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: step.active ? 700 : 400, color: step.active ? '#000' : '#999' }}>{step.label}</div>
                      {step.active && step.date && <div style={{ fontSize: '11px', color: '#666' }}>le {new Date(step.date).toLocaleDateString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => { setConsultOpData(previewOp); setCurrentPage('consulterOp'); setPreviewOp(null); }} 
                style={{ ...styles.button, width: '100%', background: '#D4722A', marginTop: '25px', fontWeight: 800 }}
              >
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
