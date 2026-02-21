import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

const PageBordereaux = () => {
  const { ops, sources, exerciceActif, bordereaux, updateBordereau, createBordereau, setConsultOpData, setCurrentPage } = useAppContext();
  
  // Rétablissement des onglets obligatoires
  const [activeTab, setActiveTab] = useState('CREATION'); 
  const [selectedSource, setSelectedSource] = useState(sources[0]?.id || '');
  const [selectedOps, setSelectedOps] = useState([]);

  // Logique de tri des bordereaux par étape du circuit
  const filteredBordereaux = useMemo(() => {
    return bordereaux.filter(b => {
      if (b.exerciceId !== exerciceActif?.id) return false;
      if (activeTab === 'CF') return b.statut === 'TRANSMIS_CF';
      if (activeTab === 'AC') return b.statut === 'TRANSMIS_AC';
      if (activeTab === 'ARCHIVE') return ['PAYE', 'ARCHIVE'].includes(b.statut);
      return true;
    });
  }, [bordereaux, activeTab, exerciceActif]);

  // Liste des OPs prêts à être mis en bordereau (Source spécifique + non affectés)
  const opsDisponibles = useMemo(() => {
    return ops.filter(op => 
      op.exerciceId === exerciceActif?.id && 
      op.sourceId === selectedSource && 
      !op.bordereauId &&
      !['ANNULE', 'SUPPRIME'].includes(op.statut)
    );
  }, [ops, selectedSource, exerciceActif]);

  const handleToggleOp = (id) => {
    setSelectedOps(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleActionBordereau = async (bordereau, nouveauStatut) => {
    await updateBordereau(bordereau.id, { ...bordereau, statut: nouveauStatut });
  };

  return (
    <div style={styles.main}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Bordereaux de Transmission</h1>
      </div>

      {/* NAVIGATION DU CIRCUIT DE VALIDATION */}
      <div style={styles.tabs}>
        <div onClick={() => setActiveTab('CREATION')} style={activeTab === 'CREATION' ? styles.tabActive : styles.tab}>ÉDITION (NOUVEAU)</div>
        <div onClick={() => setActiveTab('CF')} style={activeTab === 'CF' ? styles.tabActive : styles.tab}>CONTRÔLE FINANCIER</div>
        <div onClick={() => setActiveTab('AC')} style={activeTab === 'AC' ? styles.tabActive : styles.tab}>AGENCE COMPTABLE</div>
        <div onClick={() => setActiveTab('ARCHIVE')} style={activeTab === 'ARCHIVE' ? styles.tabActive : styles.tab}>ARCHIVES</div>
      </div>

      <div style={styles.card}>
        {activeTab === 'CREATION' ? (
          <>
            <div style={{ marginBottom: 20, display: 'flex', gap: 20, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Source de Financement</label>
                <select style={styles.select} value={selectedSource} onChange={(e) => {setSelectedSource(e.target.value); setSelectedOps([]);}}>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.sigle} - {s.nom}</option>)}
                </select>
              </div>
              <button 
                style={{ ...styles.button, background: selectedOps.length > 0 ? '#1B6B2E' : '#ccc' }}
                disabled={selectedOps.length === 0}
                onClick={() => {/* Appel vers createBordereau */}}
              >
                GÉNÉRER BORDEREAU ({selectedOps.length} OP)
              </button>
            </div>

            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ ...styles.stickyTh, width: 40 }}>Sél.</th>
                    <th style={styles.stickyTh}>N° OP</th>
                    <th style={styles.stickyTh}>Bénéficiaire</th>
                    <th style={styles.stickyTh}>Objet</th>
                    <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {opsDisponibles.map(op => (
                    <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={styles.td}>
                        <input type="checkbox" checked={selectedOps.includes(op.id)} onChange={() => handleToggleOp(op.id)} />
                      </td>
                      <td style={{ ...styles.td, fontWeight: 700 }}>{op.numero}</td>
                      <td style={styles.td}>{op.beneficiaireNom}</td>
                      <td style={{ ...styles.td, fontSize: 11 }}>{op.objet}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(op.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* VUES CIRCUIT (CF / AC / ARCHIVE) */
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.stickyTh}>N° Bordereau</th>
                  <th style={styles.stickyTh}>Date Édition</th>
                  <th style={styles.stickyTh}>Source</th>
                  <th style={{ ...styles.stickyTh, textAlign: 'center' }}>Nb OP</th>
                  <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Montant Total</th>
                  <th style={{ ...styles.stickyTh, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBordereaux.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{b.numero}</td>
                    <td style={styles.td}>{b.dateCreation}</td>
                    <td style={styles.td}>{sources.find(s => s.id === b.sourceId)?.sigle}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>{b.opsIds?.length}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(b.total)}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button style={styles.buttonIcon}>Consulter</button>
                        <button style={styles.buttonIcon}>Imprimer</button>
                        {activeTab === 'CF' && (
                          <button style={{ ...styles.buttonIcon, color: '#1B6B2E' }} onClick={() => handleActionBordereau(b, 'TRANSMIS_AC')}>Transmettre AC</button>
                        )}
                        {activeTab === 'AC' && (
                          <button style={{ ...styles.buttonIcon, color: '#1B6B2E' }} onClick={() => handleActionBordereau(b, 'ARCHIVE')}>Archiver</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PageBordereaux;
