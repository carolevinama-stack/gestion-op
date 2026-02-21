import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import PasswordModal from '../components/PasswordModal';

const Badge = React.memo(({ bg, color, children }) => (
  <span style={{ ...styles.badge, background: bg, color }}>
    {children}
  </span>
));

const PageListeOP = () => {
  const { projet, sources, exercices, exerciceActif, beneficiaires, budgets, ops, setOps, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL'); 
  const [activeTab, setActiveTab] = useState('CUMUL_OP'); 
  const [filters, setFilters] = useState({ type: '', statut: '', search: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(null);

  const currentExerciceId = exerciceActif?.id;

  const typeColors = { PROVISOIRE: '#E8B931', DIRECT: '#D4722A', DEFINITIF: '#2E9940', ANNULATION: '#C43E3E' };
  
  const statutConfig = {
    EN_COURS: { bg: '#E8F5E9', color: '#D4722A', label: 'En cours' },
    TRANSMIS_CF: { bg: '#FFF8E1', color: '#C5961F', label: 'Transmis CF' },
    VISE_CF: { bg: '#E8F5E9', color: '#2E9940', label: 'Visé CF' },
    PAYE: { bg: '#E8F5E9', color: '#1B6B2E', label: 'Payé' },
    REJETE_CF: { bg: '#FFEBEE', color: '#C43E3E', label: 'Rejeté CF' },
    REJETE_AC: { bg: '#FFEBEE', color: '#C43E3E', label: 'Rejeté AC' },
    SUPPRIME: { bg: '#F5F5F5', color: '#999', label: 'Supprimé' }
  };

  // Récupération sécurisée du nom du bénéficiaire
  const getBenNom = (op) => {
    if (op.beneficiaireNom) return op.beneficiaireNom;
    const b = beneficiaires.find(x => x.id === op.beneficiaireId);
    return b ? b.nom : 'Inconnu';
  };

  // Filtrage des données
  const filteredOps = useMemo(() => {
    return ops.filter(op => {
      if (op.exerciceId !== currentExerciceId) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      
      // Gestion corbeille
      if (activeTab === 'CORBEILLE') {
        if (op.statut !== 'SUPPRIME') return false;
      } else {
        if (op.statut === 'SUPPRIME') return false;
      }

      if (filters.type && op.type !== filters.type) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        return op.numero?.toLowerCase().includes(s) || getBenNom(op).toLowerCase().includes(s);
      }
      return true;
    });
  }, [ops, currentExerciceId, activeSource, activeTab, filters, beneficiaires]);

  // Calcul budgétaire ligne par ligne
  const displayOps = useMemo(() => {
    const lines = filteredOps.map(op => ({ ...op, isRejetLine: false }));
    
    // Ajout des lignes miroirs pour les rejets (Piste d'audit)
    filteredOps.forEach(op => {
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
  }, [filteredOps, budgets]);

  return (
    <div style={styles.pageContainer}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Journal des Engagements</h1>
        <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
      </div>

      {/* Onglets Sources */}
      <div style={styles.tabs}>
        <div onClick={() => setActiveSource('ALL')} style={activeSource === 'ALL' ? styles.tabActive : styles.tab}>CUMUL GÉNÉRAL</div>
        {sources.map(s => (
          <div key={s.id} onClick={() => setActiveSource(s.id)} style={activeSource === s.id ? { ...styles.tabActive, color: s.couleur, borderColor: s.couleur } : styles.tab}>
            {s.sigle}
          </div>
        ))}
      </div>

      {/* Barre d'outils compacte */}
      <div style={{ ...styles.card, display: 'flex', gap: 12, padding: '10px 16px' }}>
        <input type="text" placeholder="Rechercher un OP ou bénéficiaire..." style={styles.input} onChange={e => setFilters({...filters, search: e.target.value})} />
        <select style={{ ...styles.select, width: 180 }} onChange={e => setFilters({...filters, type: e.target.value})}>
          <option value="">Tous les types</option>
          <option value="PROVISOIRE">Provisoire</option>
          <option value="DIRECT">Direct</option>
          <option value="DEFINITIF">Définitif</option>
        </select>
        <button onClick={() => setActiveTab(activeTab === 'CORBEILLE' ? 'CUMUL_OP' : 'CORBEILLE')} style={{ ...styles.buttonSecondary, borderColor: activeTab === 'CORBEILLE' ? '#C43E3E' : '#e0e0e0', color: activeTab === 'CORBEILLE' ? '#C43E3E' : '#333' }}>
          {activeTab === 'CORBEILLE' ? 'Quitter Corbeille' : 'Corbeille'}
        </button>
      </div>

      {/* Tableau des OP */}
      <div style={styles.card}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>N° OP</th>
              <th style={styles.th}>Bénéficiaire</th>
              <th style={styles.th}>Objet</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Dotation</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Montant</th>
              {activeSource !== 'ALL' && (
                <>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Engag. Ant.</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Disponible</th>
                </>
              )}
              <th style={{ ...styles.th, textAlign: 'center' }}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {displayOps.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: 30, color: '#999' }}>Aucune donnée à afficher</td></tr>
            ) : displayOps.map((op, i) => {
              const st = statutConfig[op.statut] || { color: '#333', bg: '#EEE', label: op.statut };
              return (
                <tr key={i} onClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ cursor: 'pointer' }}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.isRejetLine ? op.displayNumero : op.numero}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{getBenNom(op)}</td>
                  <td style={{ ...styles.td, color: '#666', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(op.dotationLigne)}</td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showPasswordModal && <PasswordModal isOpen={!!showPasswordModal} onClose={() => setShowPasswordModal(null)} onConfirm={showPasswordModal.action} adminPassword={projet?.adminPassword || ''} />}
    </div>
  );
};

export default PageListeOP;
