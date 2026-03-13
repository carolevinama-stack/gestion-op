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
  close: (c='#fff', s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x1="6" x2="6" y2="18"></line><line x1="6" x1="6" x2="18" y2="18"></line></svg>
};

const PageListeOP = () => {
  const { sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [filters, setFilters] = useState({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statut: '' });
  
  const [previewOpId, setPreviewOpId] = useState(null);
  const [modalSuppression, setModalSuppression] = useState(false); // Gestion de la corbeille

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

  // Liste des OPs supprimés pour la CORBEILLE
  const opsSupprimes = useMemo(() => {
    return ops.filter(op => op.exerciceId === exerciceActif?.id && op.statut === 'SUPPRIME');
  }, [ops, exerciceActif]);

  // Liste principale (EXCLUT LES SUPPRIMÉS)
  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (op.statut === 'SUPPRIME') return false; // Exclusion stricte des OP supprimés
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
      if (exportData.length) ws['!cols'] = Object.keys(exportData[0]).map(k => ({ wch: Math.max(k.length + 2, 15) }));
      for (let cellRef in ws) {
        if (cellRef[0] === '!') continue;
        const cell = ws[cellRef];
        if (cell.t === 'n') cell.z = '#,##0'; 
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Liste OP");
      const dRef = new Date().toISOString().split('T')[0].split('-').reverse().join('-');
      const srcName = activeSource === 'ALL' ? 'GLOBAL' : getSrcSigle(activeSource);
      XLSX.writeFile(wb, `Liste_OP_${srcName}_${dRef}.xlsx`);
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
          {/* LE BOUTON CORBEILLE */}
          <button 
            onClick={() => setModalSuppression(true)} 
            title="Corbeille (OP Supprimés)"
            style={{padding:'8px 12px',background:P.redLight,border:`1px solid ${P.red}33`,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 1px 2px rgba(0,0,0,.05)'}}
          >
            {I.trash(P.red, 18)}
          </button>
          <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={() => { setActiveSource('ALL'); setFilters({...filters, ligneBudgetaire: ''}); }} 
            style={{padding:'8px 20px',borderRadius:10,border:activeSource==='ALL'?`2px solid ${P.text}`:'2px solid transparent',background:activeSource==='ALL'?P.card:'#EDEAE5',color:activeSource==='ALL'?P.text:P.textSec,fontWeight:700,cursor:'pointer',fontSize:13,boxShadow:activeSource==='ALL'?`0 2px 8px ${P.text}22`:'none'}}>
            CUMUL GENERAL
          </button>
          {sources.map(s => {
            const isActif = activeSource === s.id;
            const srcColor = s.couleur || P.greenDark;
            return (
              <button key={s.id} onClick={() => setActiveSource(s.id)} 
                style={{padding:'8px 20px',borderRadius:10,border:isActif?`2px solid ${srcColor}`:'2px solid transparent',background:isActif?srcColor:'#EDEAE5',color:isActif?'#fff':P.textSec,fontWeight:700,cursor:'pointer',fontSize:13,boxShadow:isActif?`0 2px 8px ${srcColor}55`:'none'}}>
                {s.sigle}
              </button>
            )
          })}
        </div>
        
        <button onClick={handleExportExcel} title="Exporter la vue actuelle en Excel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: P.greenDark, border: 'none', borderRadius: 10, cursor: 'pointer', width: 40, height: 40, boxShadow: `0 2px 8px ${P.greenDark}44`, flexShrink: 0 }}>
          {I.download('#fff', 18)}
        </button>
      </div>

      <div style={{ ...styles.card, background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Recherche globale</label>
            <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="N°, bénéficiaire, montant..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          <div style={{ width: '130px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Type</label>
            <select style={{...styles.select, marginBottom: 0}} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tous les types</option>
              <option value="DIRECT">Direct</option>
              <option value="PROVISOIRE">Provisoire</option>
              <option value="DEFINITIF">Définitif</option>
              <option value="ANNULATION">Annulation</option>
              <option value="REJET">Rejet</option>
            </select>
          </div>
          <div style={{ width: '90px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Ligne Budg.</label>
            <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="Code" value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
          </div>
          <div style={{ width: '130px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Du (Date saisie)</label>
            <input type="date" style={{...styles.input, marginBottom: 0}} value={filters.dateDebut} onChange={e => setFilters({...filters, dateDebut: e.target.value})} />
          </div>
          <div style={{ width: '130px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Au</label>
            <input type="date" style={{...styles.input, marginBottom: 0}} value={filters.dateFin} onChange={e => setFilters({...filters, dateFin: e.target.value})} />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{...styles.label, fontSize: 11, color: P.textSec, fontWeight: 700}}>Statut</label>
            <select style={{...styles.select, marginBottom: 0}} value={filters.statut} onChange={e => setFilters({...filters, statut: e.target.value})}>
              <option value="">Tous les statuts</option>
              <option value="EN_COURS">En cours (Brouillon)</option>
              <option value="TRANSMIS_CF">Transmis CF</option>
              <option value="VISE_CF">Visé CF</option>
              <option value="DIFFERE_CF">Différé CF</option>
              <option value="REJETE_CF">Rejeté CF</option>
              <option value="TRANSMIS_AC">Transmis AC</option>
              <option value="DIFFERE_AC">Différé AC</option>
              <option value="REJETE_AC">Rejeté AC</option>
              <option value="PAYE_PARTIEL">Payé Partiel</option>
              <option value="PAYE">Payé (Soldé)</option>
              <option value="ARCHIVE">Archivé</option>
              <option value="ANNULE">Annulé</option>
            </select>
          </div>
          <div>
            <button style={{...styles.buttonIcon, background: '#f5f5f5', border: '1px solid #ddd', height: '38px', padding: '0 12px'}} onClick={() => setFilters({search:'', type:'', ligneBudgetaire:'', dateDebut:'', dateFin:'', statut:''})} title="Effacer les filtres">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'auto', maxHeight: '65vh' }}>
        <table style={{ ...styles.table, width: '100%', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: activeSource !== 'ALL' ? '10%' : '12%' }} />
            <col style={{ width: activeSource !== 'ALL' ? '6%' : '7%' }} />  
            <col style={{ width: activeSource !== 'ALL' ? '13%' : '18%' }} />
            <col style={{ width: activeSource !== 'ALL' ? '16%' : '28%' }} />
            <col style={{ width: activeSource !== 'ALL' ? '4%' : '5%' }} />  
            {activeSource !== 'ALL' && <col style={{ width: '10%' }} />}      
            <col style={{ width: activeSource !== 'ALL' ? '10%' : '12%' }} />
            {activeSource !== 'ALL' && <><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /></>}
            <col style={{ width: activeSource !== 'ALL' ? '8%' : '12%' }} /> 
            <col style={{ width: activeSource !== 'ALL' ? '3%' : '6%' }} />  
          </colgroup>
          <thead>
            <tr>
              <th style={{...thStyle}}>N° OP</th>
              <th style={{...thStyle}}>Type</th>
              <th style={{...thStyle}}>Bénéficiaire</th>
              <th style={{...thStyle}}>Objet</th>
              <th style={{...thStyle}}>Ligne</th>
              {activeSource !== 'ALL' && <th style={{...thStyle, textAlign: 'right'}}>Dotation</th>}
              <th style={{...thStyle, textAlign: 'right'}}>Montant</th>
              {activeSource !== 'ALL' && (
                <>
                  <th style={{...thStyle, textAlign: 'right'}}>Engag. Ant.</th>
                  <th style={{...thStyle, textAlign: 'right'}}>Disponible</th>
                </>
              )}
              <th style={{...thStyle, textAlign: 'center'}}>Statut</th>
              <th style={{...thStyle, background: '#FAFAF8'}}></th>
            </tr>
          </thead>
          <tbody>
            {displayOps.map((op, i) => {
              const isRejet = op.type === 'REJET';
              return (
                <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #eee', cursor: 'pointer', background: isRejet ? P.redLight : 'transparent' }}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, color: isRejet ? P.red : P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: '10px', fontWeight: isRejet ? 800 : 600, color: isRejet ? P.red : '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.type}</td>
                  <td style={{ ...styles.td, fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getBenNom(op)}</td>
                  <td style={{ ...styles.td, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={op.objet}>{op.objet || '-'}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.ligneBudgetaire}</td>
                  {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontSize: 12 }}>{formatMontant(op.dotationLigne)}</td>}
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800, color: op.montant < 0 ? P.red : P.greenDark }}>
                    {formatMontant(op.montant)}
                  </td>
                  {activeSource !== 'ALL' && (
                    <>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#666', fontSize: 12 }}>{formatMontant(op.engagementAnterieur)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, fontSize: 12, color: op.disponible < 0 ? P.red : P.text }}>{formatMontant(op.disponible)}</td>
                    </>
                  )}
                  <td style={{ ...styles.td, textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.statut.replace('_', ' ')}</td>
                  <td style={styles.td}>
                    <button onClick={(e) => { e.stopPropagation(); setPreviewOpId(op.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.orange} strokeWidth="2"><circle cx="12" cy="12"
