import React, { useState, useMemo } from 'react';
import Autocomplete from '../components/Autocomplete';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, updateDoc, writeBatch, runTransaction } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import PasswordModal from '../components/PasswordModal';

const PageListeOP = () => {
  const { projet, sources, exercices, exerciceActif, beneficiaires, budgets, ops, setOps, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL'); 
  const [activeTab, setActiveTab] = useState('CUMUL_OP'); 
  const [showAnterieur, setShowAnterieur] = useState(false); 
  const [selectedExercice, setSelectedExercice] = useState(exerciceActif?.id || null);
  const [filters, setFilters] = useState({ type: '', statut: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(null);
  const [expandedBT, setExpandedBT] = useState(null);
  const [drawerOp, setDrawerOp] = useState(null);

  const currentExerciceId = showAnterieur ? selectedExercice : exerciceActif?.id;
  const currentExercice = exercices.find(e => e.id === currentExerciceId);

  const typeColors = { PROVISOIRE: '#E8B931', DIRECT: '#E8B931', DEFINITIF: '#2e7d32', ANNULATION: '#C43E3E' };
  const statutConfig = {
    EN_COURS: { bg: '#E8F5E9', color: '#D4722A', label: 'En cours' },
    CREE: { bg: '#E8F5E9', color: '#D4722A', label: 'En cours' },
    TRANSMIS_CF: { bg: '#E8B93115', color: '#E8B931', label: 'Transmis CF' },
    VISE_CF: { bg: '#E8F5E9', color: '#2e7d32', label: 'Visé CF' },
    PAYE: { bg: '#1B6B2E15', color: '#1B6B2E', label: 'Payé' },
    REJETE_CF: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté CF' },
    REJETE_AC: { bg: '#C43E3E15', color: '#C43E3E', label: 'Rejeté AC' },
    SUPPRIME: { bg: '#F7F5F2', color: '#999', label: 'Supprimé' }
  };

  // --- LOGIQUE DE RÉCUPÉRATION DU NOM DU BÉNÉFICIAIRE ---
  const getBenNom = (op) => {
    // Si le nom est en dur dans l'OP, on le prend
    if (op.beneficiaireNom) return op.beneficiaireNom;
    // Sinon on cherche dans la liste des bénéficiaires par l'ID
    const b = beneficiaires.find(x => x.id === op.beneficiaireId);
    return b ? b.nom : 'N/A';
  };

  // --- FILTRAGE ---
  const filteredOps = useMemo(() => {
    return ops.filter(op => {
      if (op.exerciceId !== currentExerciceId) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      if (op.statut === 'SUPPRIME' && activeTab !== 'CORBEILLE') return false;
      if (op.statut !== 'SUPPRIME' && activeTab === 'CORBEILLE') return false;

      if (filters.type && op.type !== filters.type) return false;
      if (filters.statut && op.statut !== filters.statut) return false;
      
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const benNom = getBenNom(op).toLowerCase();
        return op.numero?.toLowerCase().includes(s) || benNom.includes(s) || op.objet?.toLowerCase().includes(s);
      }
      return true;
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [ops, currentExerciceId, activeSource, activeTab, filters, beneficiaires]);

  // --- CALCUL DES LIGNES (AVEC DOTATION ET CUMULS) ---
  const displayOps = useMemo(() => {
    const lines = filteredOps.map(op => ({ ...op, isRejetLine: false }));
    
    // On ajoute les lignes de rejet si besoin
    filteredOps.forEach(op => {
      if (['REJETE_CF', 'REJETE_AC'].includes(op.statut)) {
        lines.push({ ...op, isRejetLine: true, displayNumero: op.numero + ' (REJET)', montant: -(op.montant || 0) });
      }
    });

    lines.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    const cumulParLigne = {};
    const processedLines = lines.map(line => {
      const lb = line.ligneBudgetaire;
      const budgetSource = budgets.find(b => b.sourceId === line.sourceId && b.exerciceId === line.exerciceId);
      const dotation = budgetSource?.lignes?.find(l => l.code === lb)?.dotation || 0;

      line.engagementAnterieur = cumulParLigne[lb] || 0;
      
      if (!['REJETE_CF', 'REJETE_AC', 'ANNULE', 'SUPPRIME'].includes(line.statut) || line.isRejetLine) {
        cumulParLigne[lb] = (cumulParLigne[lb] || 0) + line.montant;
      }

      line.dotationLigne = dotation;
      line.disponible = dotation - cumulParLigne[lb];
      return line;
    });

    return processedLines.reverse();
  }, [filteredOps, budgets]);

  const handleExport = () => {
    const headers = ['Source', 'N° OP', 'Bénéficiaire', 'Objet', 'Montant', 'Statut'];
    const rows = displayOps.map(op => [
      sources.find(s => s.id === op.sourceId)?.sigle || '',
      op.isRejetLine ? op.displayNumero : op.numero,
      getBenNom(op),
      op.objet,
      op.montant,
      op.statut
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "export_ops.csv";
    link.click();
  };

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ color: '#1B6B2E', fontSize: 20, fontWeight: 800 }}>Liste des OP ({exerciceActif?.annee})</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExport} style={styles.buttonSecondary}>Export Excel</button>
          <button onClick={() => setCurrentPage('nouvelOp')} style={{ ...styles.button, background: '#D4722A' }}>Nouvel OP</button>
        </div>
      </div>

      {/* TABS SOURCES */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 15, borderBottom: '2px solid #EEE' }}>
        <button onClick={() => setActiveSource('ALL')} style={{ padding: 10, border: 'none', background: 'none', color: activeSource === 'ALL' ? '#D4722A' : '#999', fontWeight: 700, borderBottom: activeSource === 'ALL' ? '3px solid #D4722A' : 'none' }}>CUMUL OP</button>
        {sources.map(s => (
          <button key={s.id} onClick={() => setActiveSource(s.id)} style={{ padding: 10, border: 'none', background: 'none', color: activeSource === s.id ? s.couleur : '#999', fontWeight: 700, borderBottom: activeSource === s.id ? `3px solid ${s.couleur}` : 'none' }}>{s.sigle}</button>
        ))}
      </div>

      {/* FILTRES */}
      <div style={{ background: '#FFF', padding: 15, borderRadius: 10, marginBottom: 20, display: 'flex', gap: 10 }}>
        <input type="text" placeholder="Rechercher..." onChange={e => setFilters({...filters, search: e.target.value})} style={{ ...styles.input, flex: 1, marginBottom: 0, color: '#000' }} />
        <select onChange={e => setFilters({...filters, type: e.target.value})} style={{ ...styles.input, width: 150, marginBottom: 0, color: '#000' }}>
          <option value="">Tous les types</option>
          <option value="PROVISOIRE">Provisoire</option>
          <option value="DIRECT">Direct</option>
          <option value="DEFINITIF">Définitif</option>
        </select>
      </div>

      {/* TABLEAU */}
      <div style={{ background: '#FFF', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ ...styles.table, color: '#000' }}>
          <thead>
            <tr style={{ background: '#F9F9F9' }}>
              {activeSource === 'ALL' && <th style={styles.th}>Source</th>}
              <th style={styles.th}>N° OP</th>
              <th style={styles.th}>Bénéficiaire</th>
              <th style={styles.th}>Objet</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Dotation</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Montant</th>
              {activeSource !== 'ALL' && <><th style={{ ...styles.th, textAlign: 'right' }}>Eng. Ant.</th><th style={{ ...styles.th, textAlign: 'right' }}>Disponible</th></>}
              <th style={styles.th}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {displayOps.map((op, i) => {
              const conf = statutConfig[op.statut] || { color: '#333', bg: '#EEE', label: op.statut };
              return (
                <tr key={i} onClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ cursor: 'pointer', borderBottom: '1px solid #EEE' }}>
                  {activeSource === 'ALL' && <td style={styles.td}><Badge bg={sources.find(s=>s.id===op.sourceId)?.couleur} color="#FFF">{sources.find(s=>s.id===op.sourceId)?.sigle}</Badge></td>}
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.isRejetLine ? op.displayNumero : op.numero}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{getBenNom(op)}</td>
                  <td style={{ ...styles.td, fontSize: 12, color: '#444' }}>{op.objet}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(op.dotationLigne)}</td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: op.isRejetLine ? '#C43E3E' : '#000' }}>{formatMontant(op.montant)}</td>
                  {activeSource !== 'ALL' && (
                    <>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#666' }}>{formatMontant(op.engagementAnterieur)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: op.disponible < 0 ? '#C43E3E' : '#2E9940' }}>{formatMontant(op.disponible)}</td>
                    </>
                  )}
                  <td style={styles.td}>
                    <span style={{ padding: '4px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: op.isRejetLine ? '#FFEBEE' : conf.bg, color: op.isRejetLine ? '#C43E3E' : conf.color }}>
                      {op.isRejetLine ? 'REJET' : conf.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PageListeOP;
