import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

const PageBordereaux = () => {
  const { ops, sources, exerciceActif, bordereaux, updateBordereau, createBordereau, setConsultOpData, setCurrentPage } = useAppContext();
  
  // Rétablissement des onglets indispensables au circuit PIF 2
  const [activeTab, setActiveTab] = useState('CREATION'); 
  const [selectedSource, setSelectedSource] = useState(sources[0]?.id || '');
  const [selectedOps, setSelectedOps] = useState([]);

  // Filtrage des bordereaux selon l'étape du circuit
  const filteredBordereaux = useMemo(() => {
    return bordereaux.filter(b => {
      if (b.exerciceId !== exerciceActif?.id) return false;
      if (activeTab === 'CF') return b.statut === 'TRANSMIS_CF';
      if (activeTab === 'AC') return b.statut === 'TRANSMIS_AC';
      if (activeTab === 'ARCHIVE') return ['PAYE', 'ARCHIVE'].includes(b.statut);
      return true;
    });
  }, [bordereaux, activeTab, exerciceActif]);

  // Liste des OPs disponibles (Source filtrée + non affectés à un bordereau)
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
        <h1 style={styles.title}>Gestion des Bordereaux de Transmission</h1>
      </div>

      {/* Onglets du circuit de validation - Rétablis selon votre besoin métier */}
      <div style={styles.tabs}>
        <div onClick={() => setActiveTab('CREATION')} style={activeTab === 'CREATION' ? styles.tabActive : styles.tab}>EDITION (NOUVEAU)</div>
        <div onClick={() => setActiveTab('CF')} style={activeTab === 'CF' ? styles.tabActive : styles.tab}>CONTROLE FINANCIER (CF)</div>
        <div onClick={() => setActiveTab('AC')} style={activeTab === 'AC' ? styles.tabActive : styles.tab}>AGENCE COMPTABLE (AC)</div>
        <div onClick={() => setActiveTab('ARCHIVE')} style={activeTab === 'ARCHIVE' ? styles.tabActive : styles.tab}>ARCHIVES</div>
      </div>

      {activeTab === 'CREATION' ? (
        <>
          <div style={styles.card}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={styles.label}>Source de Financement</label>
                <select style={styles.select} value={selectedSource} onChange={(e) => {setSelectedSource(e.target.value); setSelectedOps([]);}}>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.sigle} - {s.nom}</option>)}
                </select>
              </div>
              <button 
                style={{ ...styles.button, background: selectedOps.length > 0 ? '#1B6B2E' : '#999' }}
                disabled={selectedOps.length === 0}
                onClick={() => {}} // Action de création
              >
                GENERER BORDEREAU ({selectedOps.length} OP)
              </button>
            </div>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <colgroup>
                <col style={{ width: '5%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '35%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={styles.stickyTh}></th>
                  <th style={styles.stickyTh}>N° OP</th>
                  <th style={styles.stickyTh}>Bénéficiaire</th>
                  <th style={styles.stickyTh}>Ligne</th>
                  <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Montant</th>
                  <th style={styles.stickyTh}>Date Saisie</th>
                </tr>
              </thead>
              <tbody>
                {opsDisponibles.map(op => (
                  <tr key={op.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedOps.includes(op.id)} onChange={() => handleToggleOp(op.id)} />
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700, fontFamily: 'monospace' }}>{op.numero}</td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{op.beneficiaireNom}</td>
                    <td style={{ ...styles.td, fontFamily: 'monospace' }}>{op.ligneBudgetaire}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(op.montant)}</td>
                    <td style={styles.td}>{op.dateCreation}</td>
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
            <colgroup>
              <col style={{ width: '15%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '25%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={styles.stickyTh}>N° Bordereau</th>
                <th style={styles.stickyTh}>Date Edition</th>
                <th style={styles.stickyTh}>Source</th>
                <th style={{ ...styles.stickyTh, textAlign: 'center' }}>Nb OP</th>
                <th style={{ ...styles.stickyTh, textAlign: 'right' }}>Total</th>
                <th style={{ ...styles.stickyTh, textAlign: 'center' }}>Statut</th>
                <th style={{ ...styles.stickyTh, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBordereaux.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ ...styles.td, fontWeight: 700 }}>{b.numero}</td>
                  <td style={styles.td}>{b.dateCreation}</td>
                  <td style={styles.td}>{sources.find(s => s.id === b.sourceId)?.sigle}</td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>{b.opsIds?.length}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(b.total)}</td>
                  <td style={{ ...styles.td, textAlign: 'center', fontSize: '11px' }}>{b.statut}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button style={styles.buttonIcon} title="Consulter">Détails</button>
                      <button style={styles.buttonIcon} title="Imprimer">Imprimer</button>
                      {activeTab === 'CF' && (
                        <button style={{ ...styles.buttonIcon, color: '#1B6B2E', fontWeight: 700 }} onClick={() => handleActionBordereau(b, 'TRANSMIS_AC')}>Transmettre AC</button>
                      )}
                      {activeTab === 'AC' && (
                        <button style={{ ...styles.buttonIcon, color: '#1B6B2E', fontWeight: 700 }} onClick={() => handleActionBordereau(b, 'ARCHIVE')}>Archiver / Payé</button>
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
  );
};

export default PageBordereaux;
