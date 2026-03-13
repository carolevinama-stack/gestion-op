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
  close: (c='#fff', s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  filter: (c='#666', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
};

const PageListeOP = () => {
  const { sources, exerciceActif, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [activeTab, setActiveTab] = useState('LISTE'); 
  const [filters, setFilters] = useState({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statuts: [] });
  const [searchPaiement, setSearchPaiement] = useState('');
  
  const [previewOpId, setPreviewOpId] = useState(null);
  const [modalSuppression, setModalSuppression] = useState(false);
  const [showStatutFilter, setShowStatutFilter] = useState(false);
  const filterRef = useRef(null);

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

  const toggleStatut = (id) => {
    setFilters(prev => ({
      ...prev,
      statuts: prev.statuts.includes(id) ? prev.statuts.filter(s => s !== id) : [...prev.statuts, id]
    }));
  };

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (op.statut === 'SUPPRIME') return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      if (activeTab === 'PAIEMENTS' && !(op.paiements && op.paiements.length > 0)) return false;
      return true;
    });

    const sorted = [...baseOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const cumulParLigne = {};
    
    const withCalculations = sorted.map(op => {
      const lb = op.ligneBudgetaire;
      const dotation = Number(op.dotationLigne || 0); // CAPTURE
      const engagementAnterieur = cumulParLigne[lb] || 0; // DYNAMIQUE
      cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (Number(op.montant) || 0);

      return { ...op, engagementAnterieur, disponible: dotation - cumulParLigne[lb] };
    });

    return withCalculations.filter(op => {
      if (activeTab === 'PAIEMENTS' && searchPaiement) {
        const s = searchPaiement.toLowerCase();
        const pDates = (op.paiements || []).map(p => formatDate(p.datePaiement)).join(' ');
        const searchStr = `${op.numero} ${op.beneficiaireNom || ''} ${op.montant} ${pDates}`.toLowerCase();
        if (!searchStr.includes(s)) return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchString = `${op.numero} ${op.beneficiaireNom || ''} ${op.objet || ''} ${op.montant}`.toLowerCase();
        if (!searchString.includes(searchLower)) return false;
      }
      if (filters.type && op.type !== filters.type) return false;
      if (filters.statuts.length > 0 && !filters.statuts.includes(op.statut)) return false;
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
      if (filters.dateDebut && (op.dateCreation || '') < filters.dateDebut) return false;
      if (filters.dateFin && (op.dateCreation || '') > filters.dateFin) return false;
      return true;
    }).reverse();
  }, [ops, activeSource, activeTab, filters, searchPaiement, exerciceActif]);

  const totalMontantAffichage = useMemo(() => {
    return displayOps.reduce((sum, op) => sum + (Number(op.montant) || 0), 0);
  }, [displayOps]);

  const livePreviewOp = useMemo(() => ops.find(o => o.id === previewOpId), [ops, previewOpId]);

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const exportData = displayOps.map(op => ({
        'N° OP': op.numero,
        'Type': op.type || '',
        'Source': getSrcSigle(op.sourceId),
        'Bénéficiaire': op.beneficiaireNom || 'N/A',
        'Objet': op.objet || '',
        'Ligne Budgétaire': op.ligneBudgetaire || '',
        'Montant': Number(op.montant || 0),
        'Statut': op.statut.replace('_', ' '),
        'Date Saisie': formatDate(op.dateCreation) || '',
      }));
      const ws = XLSX.utils.json_to_sheet(exportData.length ? exportData : [{ 'Aucune donnée': '' }]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Liste OP");
      XLSX.writeFile(wb, `Liste_OP_${activeSource}.xlsx`);
    } catch (err) { alert("Erreur lors de l'export : " + err.message); }
  };

  const thStyle = {
    ...styles.th, fontSize: 12, color: P.textSec, textTransform: 'uppercase', 
    padding: '12px 10px', background: '#FAFAF8', position: 'sticky', top: 0, zIndex: 10
  };

  const footerStyle = {
    position: 'sticky', bottom: 0, background: '#F0F0EE', borderTop: `2px solid ${P.border}`,
    zIndex: 11, fontWeight: 800, color: P.text
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <div style={{display:'flex', gap:10}}>
          <button onClick={() => setModalSuppression(true)} title="Corbeille" style={{padding:'8px 12px',background:P.redLight,border:`1px solid ${P.red}33`,borderRadius:8,cursor:'pointer'}}>
            {I.trash(P.red, 18)}
          </button>
          <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${P.border}`, marginBottom: 20, gap: 30 }}>
        <button onClick={() => setActiveTab('LISTE')} style={{ padding: '10px 5px', background: 'none', border: 'none', borderBottom: activeTab === 'LISTE' ? `3px solid ${P.green}` : '3px solid transparent', cursor: 'pointer', fontWeight: 700, color: activeTab === 'LISTE' ? P.green : P.textSec }}>LISTE DES OP</button>
        <button onClick={() => setActiveTab('PAIEMENTS')} style={{ padding: '10px 5px', background: 'none', border: 'none', borderBottom: activeTab === 'PAIEMENTS' ? `3px solid ${P.green}` : '3px solid transparent', cursor: 'pointer', fontWeight: 700, color: activeTab === 'PAIEMENTS' ? P.green : P.textSec }}>PAIEMENTS EFFECTUÉS</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={() => setActiveSource('ALL')} style={{padding:'8px 20px',borderRadius:10,border:activeSource==='ALL'?`2px solid ${P.text}`:'2px solid transparent',background:activeSource==='ALL'?P.card:'#EDEAE5',color:activeSource==='ALL'?P.text:P.textSec,fontWeight:700,cursor:'pointer',fontSize:13}}>CUMUL GENERAL</button>
          {sources.map(s => (
            <button key={s.id} onClick={() => setActiveSource(s.id)} style={{padding:'8px 20px',borderRadius:10,border:activeSource===s.id?`2px solid ${s.couleur}`:'2px solid transparent',background:activeSource===s.id?s.couleur:'#EDEAE5',color:activeSource===s.id?'#fff':P.textSec,fontWeight:700,cursor:'pointer',fontSize:13}}>{s.sigle}</button>
          ))}
        </div>
        <button onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: P.greenDark, border: 'none', borderRadius: 10, cursor: 'pointer', width: 40, height: 40 }}>{I.download('#fff', 18)}</button>
      </div>

      <div style={{ ...styles.card, background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          {activeTab === 'LISTE' ? (
            <>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Recherche globale</label>
                <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="N°, bénéficiaire..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
              </div>
              <div style={{ width: '120px' }}>
                <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Type</label>
                <select style={{...styles.select, marginBottom: 0}} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
                  <option value="">Tous</option>
                  <option value="DIRECT">Direct</option><option value="PROVISOIRE">Provisoire</option><option value="DEFINITIF">Définitif</option><option value="ANNULATION">Annulation</option>
                </select>
              </div>
              <div style={{ width: '100px' }}>
                <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Ligne Budg.</label>
                <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="Code" value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
              </div>
              <div style={{ width: '110px' }}>
                <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Du</label>
                <input type="date" style={{...styles.input, marginBottom: 0}} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
              </div>
              <div style={{ width: '110px' }}>
                <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Au</label>
                <input type="date" style={{...styles.input, marginBottom: 0}} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
              </div>
              <div style={{ width: '160px', position: 'relative' }} ref={filterRef}>
                <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Statut (Multi)</label>
                <button onClick={() => setShowStatutFilter(!showStatutFilter)} style={{...styles.input, marginBottom:0, textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', cursor:'pointer'}}>
                  <span style={{fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{filters.statuts.length === 0 ? 'Tous les statuts' : `${filters.statuts.length} sélectionnés`}</span>
                  {I.filter()}
                </button>
                {showStatutFilter && (
                  <div style={{position:'absolute', bottom:'100%', left:0, width:'220px', background:'#fff', border:`1px solid ${P.border}`, borderRadius:8, boxShadow:'0 10px 25px rgba(0,0,0,0.1)', zIndex:100, padding:10, maxHeight:'300px', overflowY:'auto'}}>
                    {allStatuts.map(s => (
                      <label key={s.id} style={{display:'flex', alignItems:'center', gap:10, padding:'6px 0', cursor:'pointer', fontSize:12}}>
                        <input type="checkbox" checked={filters.statuts.includes(s.id)} onChange={() => toggleStatut(s.id)} />
                        {s.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1 }}>
              <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Recherche dans les paiements (N° OP, Bénéficiaire, Date...)</label>
              <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="Tapez pour filtrer les règlements..." value={searchPaiement} onChange={e => setSearchPaiement(e.target.value)} />
            </div>
          )}
          <button style={{height:38, padding:'0 12px', background:'#f5f5f5', border:'1px solid #ddd', borderRadius:8, cursor:'pointer'}} onClick={() => { setFilters({search:'', type:'', ligneBudgetaire:'', dateDebut:'', dateFin:'', statuts:[]}); setSearchPaiement(''); }}>Effacer</button>
        </div>
      </div>

      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'auto', maxHeight: '55vh' }}>
        <table style={{...styles.table, borderCollapse:'separate', borderSpacing:0}}>
          <thead>
            <tr>
              <th style={thStyle}>N° OP</th>
              <th style={thStyle}>Type</th>
              <th style={{...thStyle, width:150}}>Bénéficiaire</th>
              <th style={thStyle}>Objet</th>
              <th style={thStyle}>Ligne</th>
              {activeSource !== 'ALL' && <th style={{...thStyle, textAlign: 'right'}}>Dotation</th>}
              <th style={{...thStyle, textAlign: 'right'}}>Montant</th>
              {activeSource !== 'ALL' && <th style={{...thStyle, textAlign: 'right'}}>Disponible</th>}
              <th style={{...thStyle, textAlign: 'center'}}>Statut</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {displayOps.map((op, i) => (
              <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{op.numero}</td>
                <td style={{ ...styles.td, fontSize: '10px' }}>{op.type}</td>
                <td style={{ ...styles.td, fontWeight: 600, fontSize: 12, width:150, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{op.beneficiaireNom || 'N/A'}</td>
                <td style={{ ...styles.td, fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{op.objet}</td>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire}</td>
                {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontSize: 12 }}>{formatMontant(op.dotationLigne)}</td>}
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(op.montant)}</td>
                {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{formatMontant(op.disponible)}</td>}
                <td style={{ ...styles.td, textAlign: 'center', fontSize: '10px', fontWeight: 700 }}>{op.statut.replace('_', ' ')}</td>
                <td style={styles.td}>
                  <button onClick={(e) => { e.stopPropagation(); setPreviewOpId(op.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.orange} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={activeSource !== 'ALL' ? 6 : 5} style={{...footerStyle, padding:'15px 10px', textAlign:'right'}}>SOMME DES OP AFFICHÉS :</td>
              <td style={{...footerStyle, padding:'15px 10px', textAlign:'right', fontSize:16}}>{formatMontant(totalMontantAffichage)} F</td>
              <td colSpan={activeSource !== 'ALL' ? 3 : 2} style={footerStyle}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {livePreviewOp && (
        <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,.5)', backdropFilter:'blur(3px)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:16,width:400,overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #eee',background:'#FAFAF8',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:800,fontSize:13}}>APERÇU DIRECT</span>
              <button onClick={() => setPreviewOpId(null)} style={{border:'none',background:'none',cursor:'pointer'}}>{I.close(P.textMuted, 20)}</button>
            </div>
            <div style={{padding:'24px'}}>
              <div style={{fontSize:11,color:P.textMuted,fontWeight:700,marginBottom:4}}>RÉFÉRENCE</div>
              <div style={{fontFamily:'monospace',fontWeight:800,fontSize:16,marginBottom:20}}>{livePreviewOp.numero}</div>
              <div style={{background:'#F9F9F9',borderRadius:10,padding:16,marginBottom:20, fontSize:12}}>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><span>Bénéficiaire:</span><span style={{fontWeight:700}}>{livePreviewOp.beneficiaireNom || 'N/A'}</span></div>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}><span>Montant OP:</span><span style={{fontWeight:700}}>{formatMontant(livePreviewOp.montant)} F</span></div>
                 {(livePreviewOp.paiements || []).length > 0 && (
                   <div style={{marginTop:10, borderTop:'1px dashed #ccc', paddingTop:10}}>
                     <div style={{fontWeight:800, color:P.greenDark, marginBottom:5}}>Paiement(s) effectué(s) :</div>
                     {livePreviewOp.paiements.map((p,idx) => (
                       <div key={idx} style={{display:'flex', justifyContent:'space-between', fontSize:11}}>
                         <span>{formatDate(p.datePaiement)}:</span><span>{formatMontant(p.montant)} F</span>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
              <button onClick={() => { setConsultOpData(livePreviewOp); setCurrentPage('consulterOp'); setPreviewOpId(null); }} style={{width:'100%',padding:'12px',background:P.orange,color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer'}}>Ouvrir le dossier complet</button>
            </div>
          </div>
        </div>
      )}

      {modalSuppression && (
        <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,.5)', backdropFilter:'blur(3px)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:P.card, borderRadius:16, width:1100, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.4)', overflow:'hidden'}}>
            <div style={{padding:'16px 20px', background:P.red, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h3 style={{color:'#fff', margin:0, fontSize:16, display:'flex', alignItems:'center', gap:10}}>{I.trash('#fff', 20)} Corbeille (OP Supprimés)</h3>
              <button onClick={() => setModalSuppression(false)} style={{background:'none', border:'none', cursor:'pointer'}}>{I.close('#fff', 22)}</button>
            </div>
            <div style={{padding:20, overflowY:'auto', flex:1}}>
              {opsSupprimes.length === 0 ? <p style={{textAlign:'center', padding:40, color:P.textMuted}}>La corbeille est vide.</p> : (
                <table style={{...styles.table, borderCollapse: 'collapse', width: '100%'}}>
                  <thead>
                    <tr><th style={thStyle}>N° OP</th><th style={thStyle}>Type</th><th style={thStyle}>Bénéficiaire</th><th style={thStyle}>Objet</th><th style={thStyle}>Ligne</th><th style={{...thStyle, textAlign:'right'}}>Montant</th><th style={thStyle}>Motif</th></tr>
                  </thead>
                  <tbody>
                    {opsSupprimes.map(op => (
                      <tr key={op.id} style={{background: P.redLight, borderBottom: `1px solid ${P.border}`}}>
                        <td style={{...styles.td, fontFamily:'monospace', fontWeight:700}}>{op.numero}</td>
                        <td style={styles.td}>{op.type}</td>
                        <td style={{...styles.td, fontWeight:600}}>{op.beneficiaireNom || 'N/A'}</td>
                        <td style={{...styles.td, fontSize:11}}>{op.objet}</td>
                        <td style={styles.td}>{op.ligneBudgetaire}</td>
                        <td style={{...styles.td, textAlign:'right', fontWeight:800, color:P.red}}>{formatMontant(op.montant)}</td>
                        <td style={{...styles.td, fontStyle:'italic', color:P.red}}>{op.motifSuppression || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageListeOP;
