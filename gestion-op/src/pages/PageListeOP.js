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
  filter: (c='#666', s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
  info: (c=P.orange, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
};

const PageListeOP = () => {
  const { sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [activeTab, setActiveTab] = useState('TOUS');
  
  const [filters, setFilters] = useState({ types: [], search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statuts: [] });
  const [showStatutFilter, setShowStatutFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const filterRef = useRef(null);
  const typeRef = useRef(null);

  const [previewOpId, setPreviewOpId] = useState(null);
  const [modalSuppression, setModalSuppression] = useState(false);

const getBenNom = (op) => op.beneficiaireNom || 'N/A';
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

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (op.statut === 'SUPPRIME') return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
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
      const dotation = op.dotationFigee ?? budgetSource?.lignes?.find(l => l.code === lb)?.dotation ?? 0;
      const engagementAnterieur = cumulParLigne[lb] || 0;
      cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (op.montant || 0);

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
        'N° OP': op.numero,
        'Type': op.type,
        'Bénéficiaire': getBenNom(op),
        'Objet': op.objet || '',
        'ligne': op.ligneBudgetaire,
        'dotation': Number(op.dotationLigne || 0),
        'Montant': Number(op.montant || 0),
        'engagemen anterieur': Number(op.engagementAnterieur || 0),
        'date op': formatDate(op.dateCreation)
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-ajustement de la largeur des colonnes pour que ce soit propre
      const colWidths = Object.keys(exportData[0]).map(key => ({
        wch: Math.max(key.length + 5, 15)
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Liste_OP");
      
      XLSX.writeFile(wb, `Export_OP_${activeSource !== 'ALL' ? getSrcSigle(activeSource) : 'GENERAL'}.xlsx`);
    } catch (err) { 
      alert("Erreur lors de l'exportation : " + err.message); 
    }
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
              <span style={{fontSize: 10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{filters.types.length === 0 ? 'Tous' : `${filters.types.length} sél.`}</span>
              {I.filter()}
            </button>
            {showTypeFilter && (
              <div style={{position: 'absolute', top: '105%', left: 0, width: '180px', background: '#fff', border: `1px solid ${P.border}`, borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, padding: 10}}>
                {['DIRECT', 'PROVISOIRE', 'DEFINITIF', 'ANNULATION', 'REJET'].map(t => (
                  <label key={t} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer', fontSize: 12}}>
                    <input type="checkbox" checked={filters.types.includes(t)} onChange={() => {
                        const next = filters.types.includes(t) ? filters.types.filter(i => i !== t) : [...filters.types, t];
                        setFilters({...filters, types: next});
                    }} /> {t}
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
              <span style={{fontSize: 10, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{filters.statuts.length === 0 ? 'Tous' : `${filters.statuts.length} sél.`}</span>
              {I.filter()}
            </button>
            {showStatutFilter && (
              <div style={{position: 'absolute', top: '105%', left: 0, width: '200px', background: '#fff', border: `1px solid ${P.border}`, borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, padding: 10, maxHeight: '250px', overflowY: 'auto'}}>
                {['EN_COURS', 'TRANSMIS_CF', 'VISE_CF', 'DIFFERE_CF', 'REJETE_CF', 'TRANSMIS_AC', 'DIFFERE_AC', 'REJETE_AC', 'PAYE_PARTIEL', 'PAYE', 'ARCHIVE', 'ANNULE'].map(s => (
                  <label key={s} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', cursor: 'pointer', fontSize: 12}}>
                    <input type="checkbox" checked={filters.statuts.includes(s)} onChange={() => {
                        const next = filters.statuts.includes(s) ? filters.statuts.filter(i => i !== s) : [...filters.statuts, s];
                        setFilters({...filters, statuts: next});
                    }} /> {s.replace('_', ' ')}
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
                <td style={{ ...styles.td, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={op.objet}>{op.objet || '-'}</td>
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
                <td style={styles.td}>
                  <button onClick={(e) => { e.stopPropagation(); setPreviewOpId(op.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                    {I.info()}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot style={{position:'sticky', bottom:0, background:'#eee', fontWeight:800}}>
              <tr>
                  <td colSpan={activeTab === 'PAYES' ? 5 : (activeSource !== 'ALL' ? 6 : 5)} style={{padding:12, textAlign:'right'}}>TOTAL :</td>
                  <td style={{padding:12, textAlign:'right', fontSize:14}}>{formatMontant(totalMontantAffichage)} F</td>
                  <td colSpan={activeTab === 'PAYES' ? 4 : (activeSource !== 'ALL' ? 4 : 2)}></td>
              </tr>
          </tfoot>
        </table>
      </div>

      {/* MODALE D'APERÇU DÉTAILLÉ */}
      {livePreviewOp && (
        <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,.5)', backdropFilter:'blur(3px)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'#fff', borderRadius:16, width:450, boxShadow:'0 20px 60px rgba(0,0,0,.3)', overflow:'hidden'}}>
            <div style={{padding:'16px 20px', borderBottom:'1px solid #eee', background:'#FAFAF8', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span style={{fontWeight:800, fontSize:13, color:P.oliveDark, letterSpacing:1}}>SUIVI DÉTAILLÉ DE L'OP</span>
              <button onClick={() => setPreviewOpId(null)} style={{border:'none', background:'none', cursor:'pointer'}}>{I.close(P.textMuted, 20)}</button>
            </div>
            
            <div style={{padding:'24px', maxHeight:'80vh', overflowY:'auto'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20}}>
                 <div>
                    <div style={{fontSize:11, color:P.textMuted, fontWeight:700, marginBottom:4}}>RÉFÉRENCE</div>
                    <div style={{fontFamily:'monospace', fontWeight:800, fontSize:18, color:P.text}}>{livePreviewOp.numero}</div>
                 </div>
                 <div style={{background:P.greenLight, padding:'6px 12px', borderRadius:8, color:P.greenDark, fontSize:11, fontWeight:700}}>
                    {livePreviewOp.statut.replace('_', ' ')}
                 </div>
              </div>

              <div style={{background:'#F9F9F9', border:'1px solid #EEE', borderRadius:10, padding:16, marginBottom:20}}>
                 <div style={{fontSize:12, marginBottom:10}}><b>Bénéficiaire :</b> {getBenNom(livePreviewOp)}</div>
                 <div style={{fontSize:12, marginBottom:10}}><b>Objet :</b> {livePreviewOp.objet || '-'}</div>
                 <div style={{fontSize:12}}><b>Montant Total :</b> {formatMontant(livePreviewOp.montant)} F</div>
              </div>
              
              <div style={{background:'#fff', border:'1px solid #EEE', borderRadius:10, padding:16, marginBottom:20}}>
                 <div style={{fontSize:11, color:P.textMuted, fontWeight:800, marginBottom:10, borderBottom:'1px solid #eee', paddingBottom:5}}>CHRONOLOGIE DES ÉTAPES</div>
                 {[
                   { label: 'Saisie le', date: livePreviewOp.dateCreation },
                   { label: 'Transmis au CF', date: livePreviewOp.dateTransmissionCF },
                   { label: 'Visé par CF', date: livePreviewOp.dateVisaCF, color: P.greenDark },
                   { label: 'Transmis à l\'AC', date: livePreviewOp.dateTransmissionAC },
                   { label: 'Mis en Paiement', date: livePreviewOp.datePaiement, color: P.gold }
                 ].map((step, idx) => (
                   <div key={idx} style={{display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:12}}>
                      <span style={{color:'#666', fontWeight:600}}>{step.label} :</span>
                      <span style={{fontWeight:700, color: step.color || P.text}}>{formatDate(step.date) || 'En attente'}</span>
                   </div>
                 ))}
              </div>

              {(livePreviewOp.motifRejet || livePreviewOp.motifDiffere) && (
                 <div style={{background:P.redLight, border:`1px solid ${P.red}44`, borderRadius:10, padding:12, marginBottom:20}}>
                    <div style={{fontSize:11, color:P.red, fontWeight:800, marginBottom:4}}>MOTIF DE BLOCAGE</div>
                    <div style={{fontSize:12, color:P.red, fontStyle:'italic'}}>{livePreviewOp.motifRejet || livePreviewOp.motifDiffere}</div>
                 </div>
              )}

              {(() => {
                  const pTab = livePreviewOp.paiements || [];
                  const tPaye = pTab.reduce((s, p) => s + (p.montant || 0), 0);
                  const reste = (Number(livePreviewOp.montant) || 0) - tPaye;
                  if (tPaye > 0) {
                    return (
                      <div style={{background:P.greenLight, border:`1px solid ${P.green}33`, borderRadius:10, padding:16, marginBottom:20}}>
                        <div style={{fontSize:11, color:P.greenDark, fontWeight:800, marginBottom:8}}>SITUATION DES PAIEMENTS</div>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5}}><span>Déjà payé :</span><span style={{fontWeight:800}}>{formatMontant(tPaye)} F</span></div>
                        {reste > 0 && <div style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5, color: P.red}}><span>Reste à payer :</span><span style={{fontWeight:800}}>{formatMontant(reste)} F</span></div>}
                        <div style={{fontSize:11, marginTop:8, paddingTop:8, borderTop:'1px dashed #ccc', color:'#666'}}><b>Réf. :</b> {pTab.map(p => p.reference).filter(Boolean).join(' / ') || 'N/A'}</div>
                      </div>
                    );
                  }
                  return null;
              })()}

              <button onClick={() => { setConsultOpData(livePreviewOp); setCurrentPage('consulterOp'); setPreviewOpId(null); }} style={{width:'100%', padding:'12px', background:P.orange, color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer'}}>
                 Ouvrir le dossier complet
              </button>
            </div>
          </div>
        </div>
      )}

    {/* MODALE DE LA CORBEILLE (OP SUPPRIMÉS) */}
      {modalSuppression && (
        <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,.5)', backdropFilter:'blur(3px)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:P.card, borderRadius:16, width:1000, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 50px rgba(0,0,0,0.3)'}}>
            <div style={{padding:'16px 20px', background:P.red, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{color:'#fff', margin:0, fontSize:16, fontWeight:800}}>CORBEILLE — HISTORIQUE DES SUPPRESSIONS</h3>
              <button onClick={() => setModalSuppression(false)} style={{background:'none', border:'none', cursor:'pointer'}}>{I.close('#fff', 22)}</button>
            </div>
            <div style={{padding:20, overflowY:'auto'}}>
              {opsSupprimes.length === 0 ? <p style={{textAlign:'center', padding:40, color:P.textMuted}}>La corbeille est vide.</p> : (
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr>
                      <th style={thStyle}>N° OP</th>
                      <th style={thStyle}>Date Suppr.</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Bénéficiaire</th>
                      <th style={thStyle}>Objet</th>
                      <th style={thStyle}>Ligne</th>
                      <th style={{...thStyle, textAlign:'right'}}>Montant</th>
                      <th style={thStyle}>Motif</th>
                    </tr>
                  </thead>
                 <tbody>
  {opsSupprimes.map(op => (
    {/* --- C'EST ICI QU'IL FAUT COLLER --- */}
      {modalSuppression && (
        <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,.5)', backdropFilter:'blur(3px)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:P.card, borderRadius:16, width:1100, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 50px rgba(0,0,0,0.3)'}}>
            
            <div style={{padding:'16px 20px', background:P.red, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{color:'#fff', margin:0, fontSize:16, fontWeight:800}}>CORBEILLE — HISTORIQUE DES SUPPRESSIONS</h3>
              <button onClick={() => setModalSuppression(false)} style={{background:'none', border:'none', cursor:'pointer'}}>{I.close('#fff', 22)}</button>
            </div>
            
            <div style={{padding:20, overflowY:'auto'}}>
              {opsSupprimes.length === 0 ? (
                <p style={{textAlign:'center', padding:40, color:P.textMuted}}>La corbeille est vide.</p>
              ) : (
                <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                  <thead>
                    <tr>
                      <th style={thStyle}>N° OP</th>
                      <th style={thStyle}>Date Suppr.</th>
                      <th style={thStyle}>Bénéficiaire</th>
                      <th style={thStyle}>Objet</th>
                      <th style={thStyle}>Ligne</th>
                      <th style={{...thStyle, textAlign:'right'}}>Montant</th>
                      <th style={thStyle}>Auteur</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                  {opsSupprimes.map((op) => (
                    <tr key={op.id} style={{borderBottom:'1px solid #eee'}}>
                      <td style={{...styles.td, fontFamily:'monospace', fontWeight:700}}>{op.numero}</td>
                      <td style={{...styles.td, color: P.textSec}}>{formatDate(op.updatedAt)}</td>
                      <td style={styles.td}>{op.type}</td>
                      <td style={{...styles.td, fontWeight:600}}>{getBenNom(op)}</td>
                      <td style={{...styles.td, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={op.objet}>{op.objet || '-'}</td>
                      <td style={{...styles.td, fontFamily:'monospace'}}>{op.ligneBudgetaire || '-'}</td>
                      <td style={{...styles.td, textAlign:'right', fontWeight:700, color:P.red}}>{formatMontant(op.montant)}</td>
                      <td style={{...styles.td, fontWeight:700, color:P.oliveDark}}>{op.supprimePar || 'Admin'}</td>
                      <td style={styles.td}>
                        <button 
                          onClick={() => handleRestaurerOP(op)}
                          style={{padding:'6px 12px', background:P.green, color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:10}}
                        >
                          RESTAURER
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              )}
            </div>
            
            <div style={{padding:'15px 20px', background:'#f9f9f9', borderTop:`1px solid ${P.border}`, textAlign:'right'}}>
              <button onClick={() => setModalSuppression(false)} style={{padding:'8px 20px', background:P.textSec, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700}}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div> // <-- C'est le DIV qui ferme toute la page
  ); // <-- C'est la fin du return
}; // <-- C'est la fin du composant PageListeOP

export default PageListeOP;
