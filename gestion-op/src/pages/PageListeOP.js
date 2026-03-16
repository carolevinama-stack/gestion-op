import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// Palette de couleurs
const P = {
  bg:'#F6F4F1', card:'#FFFFFF', green:'#2E9940', greenDark:'#1B6B2E', greenLight:'#E8F5E9',
  olive:'#5D6A55', oliveDark:'#4A5A42', gold:'#C5961F', goldLight:'#FFF8E1', goldBorder:'#E8B931',
  red:'#C43E3E', redLight:'#FFEBEE', orange:'#D4722A',
  border:'#E2DFD8', text:'#3A3A3A', textSec:'#7A7A7A', textMuted:'#A0A0A0',
};

const I = {
  download: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  trash: (c=P.red, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  close: (c='#fff', s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" x1="6" x2="18" y2="18"></line></svg>,
  filter: (c='#666', s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
};

const PageListeOP = () => {
  const { sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [activeTab, setActiveTab] = useState('TOUS'); // 'TOUS' ou 'PAYES'
  
  const [filters, setFilters] = useState({ types: [], search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statuts: [] });
  const [showStatutFilter, setShowStatutFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const filterRef = useRef(null);
  const typeRef = useRef(null);

  const [previewOpId, setPreviewOpId] = useState(null);
  const [modalSuppression, setModalSuppression] = useState(false);

  const getBenNom = (op) => op.beneficiaireNom || beneficiaires?.find(b => b.id === op.beneficiaireId)?.nom || 'N/A';
  const getSrcSigle = (srcId) => sources?.find(s => s.id === srcId)?.sigle || 'SRC';

  const formatDate = (dateString) => {
    if (!dateString) return null;
    if (dateString.length >= 10) {
      const [year, month, day] = dateString.substring(0, 10).split('-');
      if (year && month && day) return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) setShowStatutFilter(false);
      if (typeRef.current && !typeRef.current.contains(event.target)) setShowTypeFilter(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const opsSupprimes = useMemo(() => ops.filter(op => op.exerciceId === exerciceActif?.id && op.statut === 'SUPPRIME'), [ops, exerciceActif]);

  const allStatuts = [
    { id: 'EN_COURS', label: 'En cours' }, { id: 'TRANSMIS_CF', label: 'Transmis CF' },
    { id: 'VISE_CF', label: 'Visé CF' }, { id: 'DIFFERE_CF', label: 'Différé CF' },
    { id: 'REJETE_CF', label: 'Rejeté CF' }, { id: 'TRANSMIS_AC', label: 'Transmis AC' },
    { id: 'DIFFERE_AC', label: 'Différé AC' }, { id: 'REJETE_AC', label: 'Rejeté AC' },
    { id: 'PAYE_PARTIEL', label: 'Payé Partiel' }, { id: 'PAYE', label: 'Payé (Soldé)' },
    { id: 'ARCHIVE', label: 'Archivé' }, { id: 'ANNULE', label: 'Annulé' }
  ];

  const allTypes = [
    { id: 'DIRECT', label: 'Direct' }, { id: 'PROVISOIRE', label: 'Provisoire' },
    { id: 'DEFINITIF', label: 'Définitif' }, { id: 'ANNULATION', label: 'Annulation' },
    { id: 'REJET', label: 'Rejet' }
  ];

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (op.statut === 'SUPPRIME') return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      
      // LOGIQUE ONGLETS
      if (activeTab === 'PAYES') {
          const hasPaiement = (op.paiements || []).length > 0;
          if (!hasPaiement) return false;
      }
      return true;
    });

    const sorted = [...baseOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const cumulParLigne = {};
    
    const withCalculations = sorted.map(op => {
      const lb = op.ligneBudgetaire;
      const budgetSource = budgets.find(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId);
      const dotation = budgetSource?.lignes?.find(l => l.code === lb)?.dotation || 0;
      const engagementAnterieur = cumulParLigne[lb] || 0;
      cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (op.montant || 0);

      // Calcul des montants payés pour l'onglet dédié
      const totalPaye = (op.paiements || []).reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
      const solde = (Number(op.montant) || 0) - totalPaye;
      const refs = (op.paiements || []).map(p => p.reference).filter(Boolean).join(', ');

      return { ...op, dotationLigne: dotation, engagementAnterieur, disponible: dotation - cumulParLigne[lb], totalPaye, solde, refs };
    });

    return withCalculations.filter(op => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!`${op.numero} ${getBenNom(op)} ${op.objet || ''}`.toLowerCase().includes(s)) return false;
      }
      if (filters.types.length > 0 && !filters.types.includes(op.type)) return false;
      if (filters.statuts.length > 0 && !filters.statuts.includes(op.statut)) return false;
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
      if (filters.dateDebut && (op.dateCreation || '') < filters.dateDebut) return false;
      if (filters.dateFin && (op.dateCreation || '') > filters.dateFin) return false;
      return true;
    }).reverse();
  }, [ops, activeSource, activeTab, filters, exerciceActif, budgets, beneficiaires]);

  const totalMontantAffichage = useMemo(() => {
    return displayOps.reduce((sum, op) => sum + (Number(op.montant) || 0), 0);
  }, [displayOps]);

  const livePreviewOp = useMemo(() => ops.find(o => o.id === previewOpId), [ops, previewOpId]);

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const exportData = displayOps.map(op => ({
        'N° OP': op.numero, 'Type': op.type, 'Bénéficiaire': getBenNom(op), 'Montant': Number(op.montant || 0)
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Export");
      XLSX.writeFile(wb, "Export_OP.xlsx");
    } catch (err) { alert(err.message); }
  };

  const thStyle = {
    ...styles.th, fontSize: 12, color: P.textSec, textTransform: 'uppercase', 
    padding: '12px 10px', background: '#FAFAF8', position: 'sticky', top: 0, zIndex: 10
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <div style={{display:'flex', gap:10}}>
          <button onClick={() => setModalSuppression(true)} style={{padding:'8px 12px',background:P.redLight,border:`1px solid ${P.red}33`,borderRadius:8,cursor:'pointer'}}>{I.trash(P.red, 18)}</button>
          <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
        </div>
      </div>

      {/* ONGLET DE NAVIGATION */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${P.border}`, marginBottom: 20 }}>
        <button onClick={() => setActiveTab('TOUS')} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'TOUS' ? `3px solid ${P.green}` : 'none', cursor: 'pointer', fontWeight: 700, color: activeTab === 'TOUS' ? P.green : P.textSec }}>TOUS LES OP</button>
        <button onClick={() => setActiveTab('PAYES')} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'PAYES' ? `3px solid ${P.green}` : 'none', cursor: 'pointer', fontWeight: 700, color: activeTab === 'PAYES' ? P.green : P.textSec }}>OP PAYÉS</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={() => setActiveSource('ALL')} style={{padding:'8px 20px',borderRadius:10,border:activeSource==='ALL'?`2px solid ${P.text}`:'2px solid transparent',background:activeSource==='ALL'?P.card:'#EDEAE5',color:activeSource==='ALL'?P.text:P.textSec,fontWeight:700,cursor:'pointer',fontSize:13}}>CUMUL GENERAL</button>
          {sources.map(s => (
            <button key={s.id} onClick={() => setActiveSource(s.id)} style={{padding:'8px 20px',borderRadius:10,border:activeSource===s.id?`2px solid ${s.couleur}`:'2px solid transparent',background:activeSource===s.id?s.couleur:'#EDEAE5',color:activeSource===s.id?'#fff':P.textSec,fontWeight:700,cursor:'pointer',fontSize:13}}>{s.sigle}</button>
          ))}
        </div>
        <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', padding: '8px', background: P.greenDark, border: 'none', borderRadius: 10, cursor: 'pointer', width: 40, height: 40 }}>{I.download('#fff', 18)}</button>
      </div>

      <div style={{ ...styles.card, background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Recherche globale</label>
            <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="N°, bénéficiaire..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>

          <div style={{ width: '130px', position: 'relative' }} ref={typeRef}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Type (Multi)</label>
            <button type="button" onClick={() => setShowTypeFilter(!showTypeFilter)} style={{...styles.input, marginBottom: 0, textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '38px'}}>
              <span style={{fontSize: 10}}>{filters.types.length === 0 ? 'Tous' : `${filters.types.length} sél.`}</span>
              {I.filter()}
            </button>
            {showTypeFilter && (
              <div style={{position: 'absolute', top: '105%', left: 0, width: '180px', background: '#fff', border: `1px solid ${P.border}`, borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, padding: 10}}>
                {allTypes.map(t => (
                  <label key={t.id} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer', fontSize: 12}}>
                    <input type="checkbox" checked={filters.types.includes(t.id)} onChange={() => {
                        const newTypes = filters.types.includes(t.id) ? filters.types.filter(i => i !== t.id) : [...filters.types, t.id];
                        setFilters({...filters, types: newTypes});
                    }} /> {t.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: '80px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Ligne</label>
            <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="Code" value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
          </div>
          <div style={{ width: '115px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Du</label>
            <input type="date" style={{...styles.input, marginBottom: 0}} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
          </div>
          <div style={{ width: '115px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Au</label>
            <input type="date" style={{...styles.input, marginBottom: 0}} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
          </div>

          <div style={{ width: '150px', position: 'relative' }} ref={filterRef}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Statut (Multi)</label>
            <button type="button" onClick={() => setShowStatutFilter(!showStatutFilter)} style={{...styles.input, marginBottom: 0, textAlign: 'left', background: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '38px'}}>
              <span style={{fontSize: 10}}>{filters.statuts.length === 0 ? 'Tous' : `${filters.statuts.length} sél.`}</span>
              {I.filter()}
            </button>
            {showStatutFilter && (
              <div style={{position: 'absolute', top: '105%', left: 0, width: '200px', background: '#fff', border: `1px solid ${P.border}`, borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, padding: 10, maxHeight: '250px', overflowY: 'auto'}}>
                {allStatuts.map(s => (
                  <label key={s.id} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer', fontSize: 12}}>
                    <input type="checkbox" checked={filters.statuts.includes(s.id)} onChange={() => {
                        const newStatuts = filters.statuts.includes(s.id) ? filters.statuts.filter(i => i !== s.id) : [...filters.statuts, s.id];
                        setFilters({...filters, statuts: newStatuts});
                    }} /> {s.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button style={{height:38, padding:'0 12px', background:'#f5f5f5', border:'1px solid #ddd', borderRadius:8}} onClick={() => setFilters({search:'', types:[], ligneBudgetaire:'', dateDebut:'', dateFin:'', statuts:[]})}>Effacer</button>
        </div>
      </div>

      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'auto', maxHeight: '65vh' }}>
        <table style={{...styles.table, borderCollapse:'separate', borderSpacing:0}}>
          <colgroup>
            <col style={{ width: '10%' }} /><col style={{ width: '7%' }} /><col style={{ width: '15%' }} /><col style={{ width: '20%' }} /><col style={{ width: '5%' }} />
            {activeTab === 'PAYES' ? (
                <><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '15%' }} /></>
            ) : (
                <>{activeSource !== 'ALL' && <col style={{ width: '10%' }} />}<col style={{ width: '10%' }} />{activeSource !== 'ALL' && <><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /></>}</>
            )}
            <col style={{ width: '10%' }} /><col style={{ width: '3%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>N° OP</th><th style={thStyle}>Type</th><th style={thStyle}>Bénéficiaire</th><th style={thStyle}>Objet</th><th style={thStyle}>Ligne</th>
              {activeTab === 'PAYES' ? (
                  <><th style={{...thStyle, textAlign:'right'}}>Montant</th><th style={{...thStyle, textAlign:'right'}}>Mtt Payé</th><th style={{...thStyle, textAlign:'right'}}>Solde</th><th style={thStyle}>Réf.</th></>
              ) : (
                  <>
                    {activeSource !== 'ALL' && <th style={{...thStyle, textAlign: 'right'}}>Dotation</th>}
                    <th style={{...thStyle, textAlign: 'right'}}>Montant</th>
                    {activeSource !== 'ALL' && <><th style={{...thStyle, textAlign: 'right'}}>Engag. Ant.</th><th style={{...thStyle, textAlign: 'right'}}>Disponible</th></>}
                    <th style={{...thStyle, textAlign: 'center'}}>Statut</th>
                  </>
              )}
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {displayOps.map((op, i) => (
              <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.numero}</td>
                <td style={{ ...styles.td, fontSize: '10px' }}>{op.type}</td>
                <td style={{ ...styles.td, fontWeight: 600, fontSize: 12 }}>{getBenNom(op)}</td>
                <td style={{ ...styles.td, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.objet}</td>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire}</td>
                
                {activeTab === 'PAYES' ? (
                  <>
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(op.montant)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: P.greenDark, fontWeight: 700 }}>{formatMontant(op.totalPaye)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', color: op.solde > 0 ? P.red : P.text, fontWeight: 700 }}>{formatMontant(op.solde)}</td>
                    <td style={{ ...styles.td, fontSize: 10, maxWidth: 100, overflow:'hidden', textOverflow:'ellipsis' }} title={op.refs}>{op.refs || '-'}</td>
                  </>
                ) : (
                  <>
                    {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontSize: 12 }}>{formatMontant(op.dotationLigne)}</td>}
                    <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(op.montant)}</td>
                    {activeSource !== 'ALL' && <><td style={{ ...styles.td, textAlign: 'right', fontSize: 12 }}>{formatMontant(op.engagementAnterieur)}</td><td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{formatMontant(op.disponible)}</td></>}
                    <td style={{ ...styles.td, textAlign: 'center', fontSize: '10px', fontWeight: 700 }}>{op.statut.replace('_', ' ')}</td>
                  </>
                )}
                <td style={styles.td}><button onClick={(e) => { e.stopPropagation(); setPreviewOpId(op.id); }} style={{ border: 'none', background: 'none' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P.orange} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></button></td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{position:'sticky', bottom:0, background:'#eee', fontWeight:800}}>
              <tr>
                  <td colSpan={activeTab === 'PAYES' ? 5 : (activeSource !== 'ALL' ? 6 : 5)} style={{padding:12, textAlign:'right'}}>TOTAL DES MONTANTS AFFICHÉS :</td>
                  <td style={{padding:12, textAlign:'right', fontSize:14}}>{formatMontant(totalMontantAffichage)} F</td>
                  <td colSpan={activeTab === 'PAYES' ? 4 : (activeSource !== 'ALL' ? 4 : 2)}></td>
              </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default PageListeOP;
