import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import PasswordModal from '../components/PasswordModal';

const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ ...styles.badge, background: bg, color, whiteSpace: 'nowrap', fontSize: '10px' }}>
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
      { label: 'Paiement', active: op.statut === 'PAYE', date: op.datePaiement }
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
    <div style={{ padding: '0 20px', maxWidth: '100%', display: 'flex', flexDirection: 'column', height: '100vh', color: '#000' }}>
      
      {/* SECTION HAUTE FIXE */}
      <div style={{ flexShrink: 0, background: '#F7F5F2', zIndex: 110 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '15px 0' }}>
          <h1 style={{ ...styles.title, margin: 0 }}>Liste des Ordres de Paiement</h1>
          <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
        </div>

        <div style={{ ...styles.tabs, marginBottom: 15 }}>
          <div onClick={() => setActiveSource('ALL')} style={activeSource === 'ALL' ? styles.tabActive : styles.tab}>CUMUL OP</div>
          {sources.map(s => (
            <div key={s.id} onClick={() => setActiveSource(s.id)} style={activeSource === s.id ? { ...styles.tabActive, color: s.couleur, borderColor: s.couleur } : styles.tab}>
              {s.sigle}
            </div>
          ))}
        </div>

        {/* BARRE DE RECHERCHE VERROUILLÉE (FIXE) */}
        <div style={{ ...styles.card, display: 'flex', gap: '20px', alignItems: 'flex-end', padding: '10px 15px', marginBottom: '15px' }}>
          <div style={{ width: '200px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Recherche</label>
            <input type="text" placeholder="N°, bénéficiaire..." style={styles.input} value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          <div style={{ width: '100px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Type</label>
            <select style={styles.select} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tous</option>
              <option value="PROVISOIRE">Provisoire</option>
              <option value="DIRECT">Direct</option>
              <option value="DEFINITIF">Définitif</option>
            </select>
          </div>
          <div style={{ width: '70px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Ligne</label>
            <input type="text" placeholder="Code" style={styles.input} value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
          </div>
          <div style={{ width: '125px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Du</label>
            <input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
          </div>
          <div style={{ width: '125px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Au</label>
            <input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
          </div>
          <div style={{ width: '110px' }}>
            <label style={{ ...styles.label, fontSize: '11px' }}>Statut</label>
            <select style={styles.select} value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})}>
              <option value="">Tous</option>
              <option value="PAYE">Payé</option>
              <option value="EN_COURS">En cours</option>
              <option value="REJETE_CF">Rejeté</option>
            </select>
          </div>
          <button onClick={() => setActiveTab(activeTab === 'CORBEILLE' ? 'CUMUL_OP' : 'CORBEILLE')} style={{ ...styles.buttonSecondary, padding: '8px', height: '35px' }}>
            🗑️
          </button>
        </div>
      </div>

      {/* TABLEAU AVEC EN-TÊTE RÉELLEMENT FIGÉ */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
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
              {displayOps.map((op, i) => (
                <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, fontSize: '11px' }}>{op.isRejetLine ? op.displayNumero : op.numero}</td>
                  <td style={{ ...styles.td, fontSize: '10px', fontWeight: 700, color: op.isRejetLine ? '#C43E3E' : '#2C5A7A' }}>{op.isRejetLine ? 'REJET' : op.type}</td>
                  <td style={{ ...styles.td, fontWeight: 600, fontSize: '11px' }}>{getBenNom(op)}</td>
                  <td style={{ ...styles.td, color: '#666', fontSize: '11px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '11px' }}>{op.ligneBudgetaire}</td>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4722A" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL AVEC DÉTAILS DU CIRCUIT RÉTABLIS */}
      {previewOp && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, maxWidth: '450px', padding: 0 }}>
            <div style={{ padding: '15px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F9FA' }}>
              <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 800 }}>Circuit de validation</h2>
              <button onClick={() => setPreviewOp(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '20px', padding: '15px', background: '#F8F9FA', borderRadius: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px', color: '#1B6B2E' }}>{previewOp.numero}</div>
                <div style={{ color: '#D4722A', fontSize: '18px', fontWeight: 900, marginTop: '5px' }}>{formatMontant(previewOp.montant)} F</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {buildCircuitSteps(previewOp).map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                    <div style={{ marginTop: '4px', width: '10px', height: '10px', borderRadius: '50%', background: step.active ? '#2E9940' : '#DDD' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: step.active ? 700 : 400, color: step.active ? '#000' : '#999' }}>{step.label}</div>
                      {step.active && step.date && <div style={{ fontSize: '11px', color: '#666' }}>le {new Date(step.date).toLocaleDateString()}</div>}
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
