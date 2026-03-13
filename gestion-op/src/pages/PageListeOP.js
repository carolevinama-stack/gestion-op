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
  close: (c='#fff', s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
};

const PageListeOP = () => {
  const { sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [filters, setFilters] = useState({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statut: '' });
  
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

  const opsSupprimes = useMemo(() => {
    return ops.filter(op => op.exerciceId === exerciceActif?.id && op.statut === 'SUPPRIME');
  }, [ops, exerciceActif]);

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (op.statut === 'SUPPRIME') return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
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
      return { ...op, dotationLigne: dotation, engagementAnterieur, disponible: dotation - cumulParLigne[lb] };
    });

    return withCalculations.filter(op => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchString = `${op.numero} ${getBenNom(op)} ${op.objet || ''} ${op.montant} ${formatMontant(op.montant)}`.toLowerCase();
        if (!searchString.includes(searchLower)) return false;
      }
      if (filters.type && op.type !== filters.type) return false;
      if (filters.statut && op.statut !== filters.statut) return false;
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
      if (filters.dateDebut && (op.dateCreation || '') < filters.dateDebut) return false;
      if (filters.dateFin && (op.dateCreation || '') > filters.dateFin) return false;
      return true;
    }).reverse();
  }, [ops, activeSource, filters, exerciceActif, budgets, beneficiaires]);

  const livePreviewOp = useMemo(() => ops.find(o => o.id === previewOpId), [ops, previewOpId]);

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const exportData = displayOps.map(op => {
        const row = {
          'N° OP': op.numero,
          'Type': op.type || '',
          'Source': getSrcSigle(op.sourceId),
          'Bénéficiaire': getBenNom(op),
          'Objet': op.objet || '',
          'Ligne Budgétaire': op.ligneBudgetaire || '',
          'Montant': Number(op.montant || 0),
          'Statut': op.statut.replace('_', ' '),
          'Date Saisie': formatDate(op.dateCreation) || '',
        };
        if (activeSource !== 'ALL') {
          row['Dotation'] = Number(op.dotationLigne || 0);
          row['Engagement Antérieur'] = Number(op.engagementAnterieur || 0);
          row['Disponible'] = Number(op.disponible || 0);
        }
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(exportData.length ? exportData : [{ 'Aucune donnée': '' }]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Liste OP");
      XLSX.writeFile(wb, `Liste_OP.xlsx`);
    } catch (err) { alert("Erreur lors de l'export : " + err.message); }
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
          <button onClick={() => setModalSuppression(true)} style={{padding:'8px 12px',background:P.redLight,border:`1px solid ${P.red}33`,borderRadius:8,cursor:'pointer'}}>
            {I.trash(P.red, 18)}
          </button>
          <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
        </div>
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
          <div style={{ flex: 1, minWidth: '200px' }}><label style={{...styles.label, fontSize: 11}}>Recherche</label><input type="text" style={{...styles.input, marginBottom: 0}} value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} /></div>
          <div style={{ width: '130px' }}><label style={{...styles.label, fontSize: 11}}>Type</label><select style={styles.select} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}><option value="">Tous</option><option value="DIRECT">Direct</option><option value="PROVISOIRE">Provisoire</option></select></div>
          <div style={{ width: '130px' }}><label style={{...styles.label, fontSize: 11}}>Du</label><input type="date" style={styles.input} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} /></div>
          <div style={{ width: '130px' }}><label style={{...styles.label, fontSize: 11}}>Au</label><input type="date" style={styles.input} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} /></div>
          <button style={{height:38, padding:'0 12px', background:'#f5f5f5', border:'1px solid #ddd', borderRadius:8}} onClick={() => setFilters({search:'', type:'', ligneBudgetaire:'', dateDebut:'', dateFin:'', statut:''})}>Reset</button>
        </div>
      </div>

      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'auto', maxHeight: '65vh' }}>
        <table style={{ ...styles.table, width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: activeSource !== 'ALL' ? '10%' : '12%' }} /><col style={{ width: '7%' }} /><col style={{ width: '18%' }} /><col style={{ width: '25%' }} /><col style={{ width: '8%' }} />
            {activeSource !== 'ALL' && <col style={{ width: '10%' }} />}<col style={{ width: '12%' }} />
            {activeSource !== 'ALL' && <><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /></>}
            <col style={{ width: '10%' }} /><col style={{ width: '5%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>N° OP</th><th style={thStyle}>Type</th><th style={thStyle}>Bénéficiaire</th><th style={thStyle}>Objet</th><th style={thStyle}>Ligne</th>
              {activeSource !== 'ALL' && <th style={{...thStyle, textAlign: 'right'}}>Dotation</th>}
              <th style={{...thStyle, textAlign: 'right'}}>Montant</th>
              {activeSource !== 'ALL' && <><th style={{...thStyle, textAlign: 'right'}}>Engag. Ant.</th><th style={{...thStyle, textAlign: 'right'}}>Disponible</th></>}
              <th style={{...thStyle, textAlign: 'center'}}>Statut</th><th style={thStyle}></th>
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
                {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right' }}>{formatMontant(op.dotationLigne)}</td>}
                <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800 }}>{formatMontant(op.montant)}</td>
                {activeSource !== 'ALL' && <><td style={{ ...styles.td, textAlign: 'right' }}>{formatMontant(op.engagementAnterieur)}</td><td style={{ ...styles.td, textAlign: 'right', fontWeight: 700 }}>{formatMontant(op.disponible)}</td></>}
                <td style={{ ...styles.td, textAlign: 'center', fontSize: '10px' }}>{op.statut.replace('_', ' ')}</td>
                <td style={styles.td}><button onClick={(e) => { e.stopPropagation(); setPreviewOpId(op.id); }} style={{ border: 'none', background: 'none' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.orange} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {livePreviewOp && (
        <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,.5)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:16,width:400,padding:24}}>
            <button onClick={() => setPreviewOpId(null)} style={{float:'right'}}>{I.close(P.textMuted)}</button>
            <h3 style={{marginBottom:20}}>{livePreviewOp.numero}</h3>
            <p>Bénéficiaire : {getBenNom(livePreviewOp)}</p>
            <p>Montant : {formatMontant(livePreviewOp.montant)} F</p>
            <button onClick={() => { setConsultOpData(livePreviewOp); setCurrentPage('consulterOp'); setPreviewOpId(null); }} style={{width:'100%',padding:12,background:P.orange,color:'#fff',borderRadius:10,marginTop:20}}>Voir Détails</button>
          </div>
        </div>
      )}

      {modalSuppression && (
        <div style={{position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,.5)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:P.card, borderRadius:16, width:800, maxHeight:'85vh', padding:20, overflow:'hidden'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:20}}><h3 style={{color:P.red}}>Corbeille</h3><button onClick={() => setModalSuppression(false)}>{I.close(P.textMuted)}</button></div>
            <div style={{overflowY:'auto', maxHeight:'70vh'}}>
              {opsSupprimes.length === 0 ? <p>Vide</p> : (
                <table style={{width:'100%'}}>
                  <thead><tr><th>N° OP</th><th>Montant</th></tr></thead>
                  <tbody>{opsSupprimes.map(op => (<tr key={op.id}><td>{op.numero}</td><td>{formatMontant(op.montant)}</td></tr>))}</tbody>
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
