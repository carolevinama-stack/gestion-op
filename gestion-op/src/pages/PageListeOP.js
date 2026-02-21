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
  const [previewOp, setPreviewOp] = useState(null); // Pour le modal d'aperçu

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
      { label: 'Création OP', active: true, detail: op.dateCreation },
      { label: 'Transmission au CF', active: !!op.dateTransmissionCF, detail: op.dateTransmissionCF },
      { label: 'Visa du Contrôleur Financier', active: !!op.dateVisaCF, detail: op.dateVisaCF },
      { label: 'Transmission à l\'Agent Comptable', active: !!op.dateTransmissionAC, detail: op.dateTransmissionAC },
      { label: 'Paiement effectué', active: op.statut === 'PAYE' || op.statut === 'PAYE_PARTIEL', detail: op.datePaiement }
    ];
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
    <div style={{ ...styles.pageContainer, maxWidth: '100%' }}>
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

      {/* FILTRES AJUSTÉS SUR UNE LIGNE */}
      <div style={{ ...styles.card, display: 'flex', gap: 10, alignItems: 'end', marginBottom: 15 }}>
        <div style={{ flex: 1.5 }}>
          <label style={styles.label}>Recherche</label>
          <input type="text" placeholder="N°, bénéficiaire..." style={styles.input} value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
        </div>
        <div style={{ width: 120 }}>
          <label style={styles.label}>Type</label>
          <select style={styles.select} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
            <option value="">Tous</option>
            <option value="PROVISOIRE">Provisoire</option>
            <option value="DIRECT">Direct</option>
            <option value="DEFINITIF">Définitif</option>
          </select>
        </div>
        <div style={{ width: 100 }}>
          <label style={styles.label}>Ligne</label>
          <input type="text" placeholder="Code..." style={styles.input} value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
        </div>
        <div style={{ width: 130 }}>
          <label style={styles.label}>Du</label>
          <input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
        </div>
        <div style={{ width: 130 }}>
          <label style={styles.label}>Au</label>
          <input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
        </div>
        <div style={{ width: 140 }}>
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
                <th style={{ ...styles.th, textAlign: 'center', width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {displayOps.map((op, i) => {
                const st = statutConfig[op.statut] || { color: '#333', bg: '#EEE', label: op.statut };
                return (
                  <tr 
                    key={i} 
                    onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }}
                    style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                  >
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.isRejetLine ? op.displayNumero : op.numero}</td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: op.isRejetLine ? '#C43E3E' : typeColors[op.type] }}>
                        {op.isRejetLine ? 'REJET' : op.type}
                      </span>
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{getBenNom(op)}</td>
                    <td style={{ ...styles.td, color: '#666', fontSize: 11, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet}</td>
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
                      <button onClick={(e) => { e.stopPropagation(); setPreviewOp(op); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4722A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL APERÇU CIRCUIT */}
      {previewOp && (
        <div style={styles.modal}>
          <div style={{ ...styles.modalContent, padding: 0, maxWidth: 500 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8F9FA' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1B6B2E' }}>Aperçu de l'Ordre de Paiement</h2>
              <button onClick={() => setPreviewOp(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#999' }}>✕</button>
            </div>
            
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 20, padding: 15, background: '#E8F5E9', borderRadius: 10, border: '1px solid #C8E6C9' }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1B6B2E', fontSize: 13 }}>{previewOp.numero}</div>
                <div style={{ fontWeight: 600, marginTop: 5, color: '#000' }}>{getBenNom(previewOp)}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 8, color: '#D4722A' }}>{formatMontant(previewOp.montant)} F CFA</div>
              </div>
              
              <h3 style={{ fontSize: 11, textTransform: 'uppercase', color: '#888', marginBottom: 15, letterSpacing: 0.5 }}>Circuit de validation</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {buildCircuitSteps(previewOp).map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: step.active ? '#2E9940' : '#E0E0E0', border: step.active ? '2px solid #C8E6C9' : '2px solid #F5F5F5' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: step.active ? '#000' : '#999', fontWeight: step.active ? 600 : 400 }}>{step.label}</div>
                      {step.active && step.detail && <div style={{ fontSize: 11, color: '#666' }}>le {new Date(step.detail).toLocaleDateString('fr-FR')}</div>}
                    </div>
                    {step.active && <span style={{ color: '#2E9940', fontSize: 14 }}>✓</span>}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 25, display: 'flex', gap: 10 }}>
                <button onClick={() => setPreviewOp(null)} style={styles.buttonSecondary}>Fermer</button>
                <button 
                  onClick={() => { setConsultOpData(previewOp); setCurrentPage('consulterOp'); setPreviewOp(null); }}
                  style={{ ...styles.button, flex: 1, background: '#D4722A' }}
                >
                  Détails complets
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && <PasswordModal isOpen={!!showPasswordModal} onClose={() => setShowPasswordModal(null)} onConfirm={showPasswordModal.action} adminPassword={projet?.adminPassword || ''} />}
    </div>
  );
};

export default PageListeOP;
