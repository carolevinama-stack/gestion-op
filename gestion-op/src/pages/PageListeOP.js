import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase'; // Importation de la base de données
import { doc, updateDoc } from 'firebase/firestore'; // Importation des outils de mise à jour
import { styles } from '../utils/styles';
import { formatMontant, sanitizeForExport, formatNumeroOp } from '../utils/formatters';

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
  info: (c=P.orange, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>,
  restore: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>,
  search: (c=P.textMuted, s=15) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  chevronLeft: (c=P.textSec, s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  chevronRight: (c=P.textSec, s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
};

const ModalAlert = ({ data, onClose }) => {
  if (!data) return null;
  const color = data.type === 'error' ? P.red : P.green;
  return <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.4)', backdropFilter:'blur(4px)', zIndex:20000, display:'flex', alignItems:'center', justifyContent:'center'}}>
    <div style={{background:'white', borderRadius:16, padding:24, width:420, boxShadow:'0 10px 40px rgba(0,0,0,.2)'}}>
      <h3 style={{color, margin:'0 0 12px', textAlign:'center'}}>{data.title}</h3>
      <p style={{color:'#444', fontSize:14, marginBottom:24, whiteSpace:'pre-line', textAlign:'center', lineHeight:1.5}}>{data.message}</p>
      <div style={{display:'flex', justifyContent:'center'}}>
        <button onClick={onClose} style={{padding:'10px 32px', borderRadius:8, border:'none', background:color, color:'white', cursor:'pointer', fontWeight:700, minWidth:120}}>OK</button>
      </div>
    </div>
  </div>;
};

const PageListeOP = () => {
  const { sources, exerciceActif, exercices, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData, permissions, projet } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [activeTab, setActiveTab] = useState('TOUS');
  const [showAnterieur, setShowAnterieur] = useState(false);
  const [selectedExercice, setSelectedExercice] = useState(exerciceActif?.id || null);
  const currentExerciceId = showAnterieur ? selectedExercice : exerciceActif?.id;
  
  const [filters, setFilters] = useState({ types: [], search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statuts: [] });
  const [showStatutFilter, setShowStatutFilter] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const filterRef = useRef(null);
  const typeRef = useRef(null);

  const [previewOpId, setPreviewOpId] = useState(null);
  const [modalSuppression, setModalSuppression] = useState(false);
  const [corbeilleSearch, setCorbeilleSearch] = useState('');
  const [corbeillePage, setCorbeillePage] = useState(1);
  const [corbeilleSource, setCorbeilleSource] = useState('ALL');
  const [opARestaurer, setOpARestaurer] = useState(null);
  const [pwdRestaurer, setPwdRestaurer] = useState('');
  const [pwdRestaurerErr, setPwdRestaurerErr] = useState('');
  const [alertData, setAlertData] = useState(null);
  const notify = (type, title, message) => setAlertData({ type, title, message });
  const CORBEILLE_PAGE_SIZE = 50;
  const [pageOP, setPageOP] = useState(1);
  const OP_PAGE_SIZE = 50;

const getBenNom = (op) => op.beneficiaireNom || 'N/A';

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

  const opsSupprimes = useMemo(() => {
    return ops
      .filter(op => op.exerciceId === exerciceActif?.id && op.statut === 'SUPPRIME')
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }, [ops, exerciceActif]);

  const opsSupprimesParSource = useMemo(() => {
    const counts = {};
    opsSupprimes.forEach(op => { counts[op.sourceId] = (counts[op.sourceId] || 0) + 1; });
    return counts;
  }, [opsSupprimes]);

  const opsSupprimesFiltres = useMemo(() => {
    let list = opsSupprimes;
    if (corbeilleSource !== 'ALL') list = list.filter(op => op.sourceId === corbeilleSource);
    if (corbeilleSearch) {
      const s = corbeilleSearch.toLowerCase();
      list = list.filter(op => `${op.numero} ${getBenNom(op)} ${op.objet || ''}`.toLowerCase().includes(s));
    }
    return list;
  }, [opsSupprimes, corbeilleSource, corbeilleSearch]);

  const opsSupprimesPage = useMemo(() => {
    const start = (corbeillePage - 1) * CORBEILLE_PAGE_SIZE;
    return opsSupprimesFiltres.slice(start, start + CORBEILLE_PAGE_SIZE);
  }, [opsSupprimesFiltres, corbeillePage]);

  const corbeilleTotalPages = Math.max(1, Math.ceil(opsSupprimesFiltres.length / CORBEILLE_PAGE_SIZE));

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== currentExerciceId) return false;
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
  }, [ops, activeSource, activeTab, filters, currentExerciceId, budgets, beneficiaires]);

  const totalMontantAffichage = useMemo(() => {
    return displayOps.reduce((sum, op) => sum + (Number(op.montant) || 0), 0);
  }, [displayOps]);

  useEffect(() => { setPageOP(1); }, [activeSource, activeTab, filters, currentExerciceId]);

  const totalPagesOP = Math.max(1, Math.ceil(displayOps.length / OP_PAGE_SIZE));
  const displayOpsPage = useMemo(() => displayOps.slice((pageOP - 1) * OP_PAGE_SIZE, pageOP * OP_PAGE_SIZE), [displayOps, pageOP]);

  const livePreviewOp = useMemo(() => ops.find(o => o.id === previewOpId), [ops, previewOpId]);
  // --- FONCTION DE RESTAURATION (À COLLER AVANT LE RETOUR) ---
  const handleRestaurerOP = async (op) => {
    try {
      // On met à jour le statut dans Firebase
      const opRef = doc(db, 'ops', op.id);
      await updateDoc(opRef, {
        statut: 'EN_COURS', // Il revient au début du circuit
        updatedAt: new Date().toISOString(),
        motifSuppression: null,
        supprimePar: null
      });
      
      notify('success', 'Restauré', `L'OP ${op.numero} a été restauré avec succès.`);
    } catch (err) {
      console.error(err);
      notify('error', 'Erreur', "Erreur lors de la restauration : " + err.message);
    }
  };

  const demanderRestauration = (op) => {
    setOpARestaurer(op);
    setPwdRestaurer('');
    setPwdRestaurerErr('');
  };

  const confirmerRestauration = () => {
    if (!projet?.motDePasseAdmin) {
      setPwdRestaurerErr('Mot de passe non configuré. Contactez un administrateur.');
      return;
    }
    if (pwdRestaurer !== projet.motDePasseAdmin) {
      setPwdRestaurerErr('Mot de passe incorrect');
      return;
    }
    const op = opARestaurer;
    setOpARestaurer(null);
    setPwdRestaurer('');
    setPwdRestaurerErr('');
    handleRestaurerOP(op);
  };

  const buildExportRow = (op) => {
    const paiements = op.paiements || [];
    const totalPaye = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0);
    const solde = (Number(op.montant) || 0) - totalPaye;
    const refs = paiements.map(p => p.reference).filter(Boolean).join(', ');
    const datesPaiement = paiements.map(p => formatDate(p.date)).filter(Boolean).join(', ');
    return {
      'N° OP': op.numero,
      'Type': op.type,
      'Date création': formatDate(op.dateCreation) || '',
      'Bénéficiaire': sanitizeForExport(getBenNom(op)),
      'Objet': sanitizeForExport(op.objet || ''),
      'Ligne budgétaire': op.ligneBudgetaire || '',
      'Dotation': Number(op.dotationFigee || 0),
      'Montant': Number(op.montant || 0),
      'Mode règlement': op.modeReglement || '',
      'Montant TVA': Number(op.montantTVA || 0),
      'OP provisoire rattaché': sanitizeForExport(op.opProvisoireNumero || ''),
      'Statut': op.statut || '',
      'N° Bordereau CF': op.bordereauCF || '',
      'Date transmission CF': formatDate(op.dateTransmissionCF) || '',
      'Date différé CF': formatDate(op.dateDiffere) || '',
      'Date rejet CF': formatDate(op.dateRejet) || '',
      'Date visa CF': formatDate(op.dateVisaCF) || '',
      'Motif CF': sanitizeForExport(op.motifRejet || op.motifDiffere || ''),
      'N° Bordereau AC': op.bordereauAC || '',
      'Date transmission AC': formatDate(op.dateTransmissionAC) || '',
      'Montant total payé': totalPaye,
      'Solde restant': solde,
      'Références paiement': sanitizeForExport(refs),
      'Dates paiement': datesPaiement,
      'Date archivage': formatDate(op.dateArchivage) || '',
      'Référence boîte': op.boiteArchivage || ''
    };
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');

      const opsExercice = ops.filter(op => op.exerciceId === currentExerciceId && op.statut !== 'SUPPRIME');
      const wb = XLSX.utils.book_new();

      sources.forEach(src => {
        const opsSource = opsExercice
          .filter(op => op.sourceId === src.id)
          .sort((a, b) => (a.numero || '').localeCompare(b.numero || ''));
        const rows = opsSource.map(buildExportRow);
        const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
        if (rows.length) {
          const colWidths = Object.keys(rows[0]).map(key => ({ wch: Math.max(key.length + 3, 14) }));
          ws['!cols'] = colWidths;
        }
        const sheetName = (src.sigle || src.nom || 'Source').replace(/[:\\/?*[\]]/g, '').substring(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Source');
      });

      const annee = (showAnterieur ? exercices.find(e => e.id === selectedExercice) : exerciceActif)?.annee || '';
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      XLSX.writeFile(wb, `Export_Complet_OP_${annee}_${dateStr}.xlsx`);
    } catch (err) {
      notify('error', 'Erreur', "Erreur lors de l'exportation : " + err.message);
    }
  };

  const thStyle = {
    ...styles.th, fontSize: 12, color: P.textSec, textTransform: 'uppercase', 
    padding: '12px 10px', background: '#FAFAF8', position: 'sticky', top: 0, zIndex: 10
  };

  return (
    <div>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <div style={{display:'flex', gap:10}}>
          <button onClick={() => { setModalSuppression(true); setCorbeilleSearch(''); setCorbeillePage(1); setCorbeilleSource('ALL'); }} style={{padding:'8px 12px',background:P.redLight,border:`1px solid ${P.red}33`,borderRadius:8,cursor:'pointer'}}>{I.trash(P.red, 18)}</button>
          <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${P.border}`, marginBottom: 20 }}>
        <button onClick={() => setActiveTab('TOUS')} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'TOUS' ? `3px solid ${P.green}` : 'none', cursor: 'pointer', fontWeight: 700, color: activeTab === 'TOUS' ? P.green : P.textSec }}>TOUS LES OP</button>
        <button onClick={() => setActiveTab('PAYES')} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'PAYES' ? `3px solid ${P.green}` : 'none', cursor: 'pointer', fontWeight: 700, color: activeTab === 'PAYES' ? P.green : P.textSec }}>OP PAYÉS</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 13, color: P.textSec }}>Exercice : </span>
          <strong style={{ fontSize: 15, color: P.green }}>{(showAnterieur ? exercices.find(e => e.id === selectedExercice) : exerciceActif)?.annee || 'Non défini'}</strong>
          {!showAnterieur && exerciceActif && <span style={{ background: P.greenLight, color: P.green, padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700, marginLeft: 8 }}>Actif</span>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: P.textSec }}>
          <input type="checkbox" checked={showAnterieur} onChange={(e) => { setShowAnterieur(e.target.checked); if (!e.target.checked) setSelectedExercice(exerciceActif?.id); }} style={{ accentColor: P.green }} />
          Exercices antérieurs
        </label>
        {showAnterieur && (
          <select value={selectedExercice || ''} onChange={(e) => setSelectedExercice(e.target.value)} style={{ ...styles.input, marginBottom: 0, width: 'auto', padding: '8px 12px' }}>
            {exercices.map(ex => <option key={ex.id} value={ex.id}>{ex.annee}{ex.actif ? ' (actif)' : ''}</option>)}
          </select>
        )}
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
            {displayOpsPage.map((op, i) => (
              <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700 }}>{formatNumeroOp(op.numero)}</td>
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
      {totalPagesOP > 1 && (
        <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:16}}>
          <button onClick={() => setPageOP(p => Math.max(1, p - 1))} disabled={pageOP <= 1} title="Page précédente" style={{width:32, height:32, padding:0, borderRadius:6, border:`1px solid ${P.border}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: pageOP <= 1 ? 'not-allowed' : 'pointer', opacity: pageOP <= 1 ? 0.4 : 1}}>{I.chevronLeft()}</button>
          <span style={{fontSize:12, color:P.textSec, fontWeight:600}}>Page {pageOP} / {totalPagesOP}</span>
          <button onClick={() => setPageOP(p => Math.min(totalPagesOP, p + 1))} disabled={pageOP >= totalPagesOP} title="Page suivante" style={{width:32, height:32, padding:0, borderRadius:6, border:`1px solid ${P.border}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: pageOP >= totalPagesOP ? 'not-allowed' : 'pointer', opacity: pageOP >= totalPagesOP ? 0.4 : 1}}>{I.chevronRight()}</button>
        </div>
      )}

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
                    <div style={{fontFamily:'monospace', fontWeight:800, fontSize:18, color:P.text}}>{formatNumeroOp(livePreviewOp.numero)}</div>
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
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'#fff', borderRadius:16, width:1100, maxHeight:'85vh', display:'flex', flexDirection:'column', overflow:'hidden'}}>
            <div style={{padding:20, background:P.red, color:'#fff', display:'flex', justifyContent:'space-between'}}>
              <b>CORBEILLE (OP SUPPRIMÉS) — {opsSupprimes.length}</b>
              <button onClick={() => setModalSuppression(false)} style={{color:'#fff', background:'none', border:'none', cursor:'pointer'}}>FERMER</button>
            </div>
            <div style={{padding:'14px 20px 0', display:'flex', flexWrap:'wrap', gap:15, alignItems:'flex-end', justifyContent:'space-between'}}>
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                <button onClick={() => { setCorbeilleSource('ALL'); setCorbeillePage(1); }} style={{padding:'6px 14px',borderRadius:8,border:corbeilleSource==='ALL'?`2px solid ${P.text}`:'2px solid transparent',background:corbeilleSource==='ALL'?'#fff':'#EDEAE5',color:corbeilleSource==='ALL'?P.text:P.textSec,fontWeight:700,cursor:'pointer',fontSize:12, display:'flex', alignItems:'center', gap:6}}>
                  TOUTES SOURCES <span style={{background:corbeilleSource==='ALL'?P.border:'#fff', padding:'1px 7px', borderRadius:10, fontSize:10, fontWeight:700}}>{opsSupprimes.length}</span>
                </button>
                {sources.map(s => (
                  <button key={s.id} onClick={() => { setCorbeilleSource(s.id); setCorbeillePage(1); }} style={{padding:'6px 14px',borderRadius:8,border:corbeilleSource===s.id?`2px solid ${s.couleur}`:'2px solid transparent',background:corbeilleSource===s.id?s.couleur:'#EDEAE5',color:corbeilleSource===s.id?'#fff':P.textSec,fontWeight:700,cursor:'pointer',fontSize:12, display:'flex', alignItems:'center', gap:6}}>
                    {s.sigle} <span style={{background:corbeilleSource===s.id?'rgba(255,255,255,.3)':'#fff', padding:'1px 7px', borderRadius:10, fontSize:10, fontWeight:700}}>{opsSupprimesParSource[s.id] || 0}</span>
                  </button>
                ))}
              </div>
              <div style={{position:'relative', maxWidth:320, flex:'1 1 240px'}}>
                <span style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)'}}>{I.search()}</span>
                <input
                  type="text"
                  placeholder="Rechercher (N°, bénéficiaire, objet)..."
                  value={corbeilleSearch}
                  onChange={e => { setCorbeilleSearch(e.target.value); setCorbeillePage(1); }}
                  style={{...styles.input, marginBottom:0, paddingLeft:32, height:36, fontSize:12}}
                />
              </div>
            </div>
            <div style={{padding:20, overflowY:'auto'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:11}}>
                <thead>
                  <tr style={{background:'#f5f5f5'}}>
                    <th style={styles.td}>N° OP</th>
                    <th style={styles.td}>Date Suppr.</th>
                    <th style={styles.td}>Bénéficiaire</th>
                    <th style={styles.td}>Objet</th>
                    <th style={{...styles.td, textAlign:'right'}}>Montant</th>
                    <th style={styles.td}>Auteur</th>
                    <th style={styles.td}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {opsSupprimesPage.map((op) => (
                    <tr key={op.id} style={{borderBottom:'1px solid #eee'}}>
                      <td style={styles.td}><b>{formatNumeroOp(op.numero)}</b></td>
                      <td style={styles.td}>{formatDate(op.updatedAt)}</td>
                      <td style={styles.td}>{getBenNom(op)}</td>
                      <td style={{...styles.td, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={op.objet}>{op.objet || '-'}</td>
                      <td style={{...styles.td, textAlign:'right', color:P.red}}><b>{formatMontant(op.montant)}</b></td>
                      <td style={{...styles.td, fontWeight:700}}>{op.supprimePar || 'Admin'}</td>
                      <td style={styles.td}>
                        {permissions.canDelete && (
                        <button
                          onClick={() => demanderRestauration(op)}
                          title={`Restaurer l'OP ${op.numero}`}
                          style={{width:30, height:30, padding:0, background:P.green, color:'#fff', border:'none', borderRadius:6, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}
                        >
                          {I.restore('#fff', 15)}
                        </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {opsSupprimesPage.length === 0 && (
                    <tr><td colSpan={7} style={{...styles.td, textAlign:'center', color:P.textMuted, padding:20}}>Aucun OP supprimé{corbeilleSearch ? ' pour cette recherche' : ''}.</td></tr>
                  )}
                </tbody>
              </table>
              {corbeilleTotalPages > 1 && (
                <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:12, marginTop:16}}>
                  <button onClick={() => setCorbeillePage(p => Math.max(1, p - 1))} disabled={corbeillePage <= 1} title="Page précédente" style={{width:32, height:32, padding:0, borderRadius:6, border:`1px solid ${P.border}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: corbeillePage <= 1 ? 'not-allowed' : 'pointer', opacity: corbeillePage <= 1 ? 0.4 : 1}}>{I.chevronLeft()}</button>
                  <span style={{fontSize:12, color:P.textSec, fontWeight:600}}>Page {corbeillePage} / {corbeilleTotalPages}</span>
                  <button onClick={() => setCorbeillePage(p => Math.min(corbeilleTotalPages, p + 1))} disabled={corbeillePage >= corbeilleTotalPages} title="Page suivante" style={{width:32, height:32, padding:0, borderRadius:6, border:`1px solid ${P.border}`, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor: corbeillePage >= corbeilleTotalPages ? 'not-allowed' : 'pointer', opacity: corbeillePage >= corbeilleTotalPages ? 0.4 : 1}}>{I.chevronRight()}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFIRMATION MOT DE PASSE POUR RESTAURATION */}
      {opARestaurer && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:10000, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'#fff', borderRadius:16, width:420, boxShadow:'0 20px 60px rgba(0,0,0,.2)', overflow:'hidden'}}>
            <div style={{padding:'16px 20px', background:P.gold, color:'#fff'}}><b>CONFIRMER LA RESTAURATION</b></div>
            <div style={{padding:20}}>
              <p style={{fontSize:13, color:P.text, marginBottom:16}}>Confirmez le mot de passe administrateur pour restaurer l'OP <b>{opARestaurer.numero}</b>.</p>
              <input
                type="password"
                autoFocus
                placeholder="Mot de passe administrateur"
                value={pwdRestaurer}
                onChange={e => { setPwdRestaurer(e.target.value); setPwdRestaurerErr(''); }}
                onKeyDown={e => e.key === 'Enter' && confirmerRestauration()}
                style={{...styles.input, marginBottom:0}}
              />
              {pwdRestaurerErr && <div style={{color:P.red, fontSize:12, marginTop:8}}>{pwdRestaurerErr}</div>}
            </div>
            <div style={{padding:'16px 20px', borderTop:`1px solid ${P.border}`, display:'flex', justifyContent:'flex-end', gap:10}}>
              <button onClick={() => { setOpARestaurer(null); setPwdRestaurer(''); setPwdRestaurerErr(''); }} style={{padding:'8px 16px', background:'#f5f5f5', border:`1px solid ${P.border}`, borderRadius:8, cursor:'pointer'}}>Annuler</button>
              <button onClick={confirmerRestauration} style={{padding:'8px 16px', background:P.green, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:700}}>Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {livePreviewOp && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{background:'#fff', borderRadius:16, width:450, padding:20}}>
            <h3>{livePreviewOp.numero}</h3>
            <p><b>Bénéficiaire:</b> {getBenNom(livePreviewOp)}</p>
            <p><b>Montant:</b> {formatMontant(livePreviewOp.montant)} F</p>
            <button onClick={() => setPreviewOpId(null)} style={{width:'100%', padding:10, background:P.orange, color:'#fff', border:'none', borderRadius:8}}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageListeOP;
