import React, { useState, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, runTransaction, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { ARMOIRIE, LOGO_PIF2 } from '../utils/logos';

// ============================================================
// PALETTE & ICÔNES
// ============================================================
const P = {
  bg:'#F6F4F1', card:'#FFFFFF', green:'#2E9940', greenDark:'#1B6B2E', greenLight:'#E8F5E9',
  olive:'#5D6A55', oliveDark:'#4A5A42', gold:'#C5961F', goldLight:'#FFF8E1', goldBorder:'#E8B931',
  red:'#C43E3E', redLight:'#FFEBEE', orange:'#D4722A',
  border:'#E2DFD8', text:'#000000', textSec:'#333333', textMuted:'#666666',
};

const I = {
  print:(c=P.greenDark,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  settings:(c=P.textSec,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>,
  trash:(c=P.red,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  undo:(c=P.gold,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.69 3L3 13"/></svg>,
  check:(c='#fff',s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  close:(c=P.textMuted,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevron:(c=P.green,s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  plus:(c='#fff',s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  archive:(c=P.olive,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  search:(c=P.textMuted,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  lock:(c=P.red,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  warn:(c=P.gold,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  fileText:(c=P.textMuted,s=40)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  minusCircle:(c=P.red,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  plusCircle:(c=P.green,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
};

// ============================================================
// COMPOSANTS UI
// ============================================================
const Badge=React.memo(({bg,color,children})=><span style={{background:bg,color,padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',letterSpacing:.3}}>{children}</span>);
const Empty=React.memo(({text})=><div style={{textAlign:'center',padding:50,color:P.textMuted}}><div style={{marginBottom:12,opacity:.5}}>{I.fileText(P.textMuted,40)}</div><p style={{fontSize:14,margin:0}}>{text}</p></div>);
const STab=React.memo(({active,label,count,color,onClick})=><button onClick={onClick} style={{padding:'10px 18px',borderRadius:10,border:active?`2px solid ${color}`:'2px solid transparent',background:active?color:P.card,color:active?'#fff':P.textSec,fontWeight:600,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:6,transition:'all .2s',boxShadow:active?`0 4px 12px ${color}33`:'0 1px 3px rgba(0,0,0,.06)'}}>{label}{count!==undefined&&<span style={{background:active?'rgba(255,255,255,.25)':P.border,padding:'1px 7px',borderRadius:10,fontSize:10,fontWeight:700}}>{count}</span>}</button>);
const IBtn=React.memo(({icon,title,bg,onClick,disabled,size=30})=><button onClick={onClick} disabled={disabled} title={title} style={{width:size,height:size,borderRadius:8,border:'none',background:bg||P.greenLight,display:'flex',alignItems:'center',justifyContent:'center',cursor:disabled?'not-allowed':'pointer',opacity:disabled?.4:1,transition:'all .15s',padding:0}}>{icon}</button>);
const ActionBtn=React.memo(({label,icon,color,onClick,disabled,count})=><button onClick={onClick} disabled={disabled} style={{padding:'10px 20px',background:color,color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:13,cursor:disabled?'not-allowed':'pointer',display:'inline-flex',alignItems:'center',gap:8,opacity:disabled?.5:1,boxShadow:`0 4px 12px ${color}33`,transition:'all .2s',minHeight:40}}>{icon}{label}{count!==undefined&&<span style={{background:'rgba(255,255,255,.25)',padding:'2px 8px',borderRadius:6,fontSize:11}}>{count}</span>}</button>);

const Modal=React.memo(({title,titleColor,onClose,children,width=540})=><><div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.25)',backdropFilter:'blur(3px)',zIndex:200}}/><div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width,maxWidth:'92vw',maxHeight:'88vh',background:P.card,borderRadius:16,zIndex:201,boxShadow:'0 20px 60px rgba(0,0,0,.2)',display:'flex',flexDirection:'column',overflow:'hidden'}}><div style={{padding:'16px 22px',background:titleColor||P.green,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}><h3 style={{fontSize:16,fontWeight:700,color:'#fff',margin:0}}>{title}</h3><button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'none',background:'rgba(255,255,255,.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{I.close('#fff',16)}</button></div><div style={{flex:1,overflowY:'auto',padding:'20px 22px'}}>{children}</div></div></>);

const ModalAlert = ({ data, onClose }) => {
  const [val, setVal] = useState('');
  if (!data) return null;
  const isConfirm = data.type === 'confirm';
  const color = data.type === 'error' ? P.red : isConfirm ? P.gold : P.green;
  
  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(4px)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{background:'white',borderRadius:20,padding:24,width:400,textAlign:'center',boxShadow:'0 10px 40px rgba(0,0,0,.2)'}}>
      <h3 style={{color,margin:'0 0 10px'}}>{data.title}</h3>
      <p style={{color:'#666',fontSize:14,marginBottom:20,whiteSpace:'pre-line'}}>{data.message}</p>
      
      {(data.showInput || data.showPwd) && (
        <div style={{marginBottom:20,textAlign:'left'}}>
          {data.inputLabel && <label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4,color:'#000'}}>{data.inputLabel}</label>}
          <input type={data.showPwd ? "password" : "text"} autoFocus value={val} onChange={e=>setVal(e.target.value)} 
            style={{width:'100%',padding:10,borderRadius:8,border:'1px solid #ccc',boxSizing:'border-box',color:'#000'}} 
            placeholder={data.showPwd ? "Mot de passe..." : "Saisir ici..."}
          />
        </div>
      )}

      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        {isConfirm && <button onClick={onClose} style={{padding:'10px 20px',borderRadius:8,border:'1px solid #ccc',background:'white',cursor:'pointer',fontWeight:600,color:'#000'}}>Annuler</button>}
        <button onClick={() => { 
          if(isConfirm && (data.showInput || data.showPwd) && !val) return; 
          if(isConfirm) data.onConfirm(val); 
          setVal(''); 
          onClose(); 
        }} style={{padding:'10px 20px',borderRadius:8,border:'none',background:color,color:'white',cursor:'pointer',fontWeight:600,flex:isConfirm?1:'0 0 100%'}}>
          {isConfirm ? 'Confirmer' : 'OK'}
        </button>
      </div>
    </div>
  </div>;
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const PageBordereaux = () => {
  const { projet, sources, exercices, beneficiaires, ops, setOps, bordereaux, setBordereaux } = useAppContext();
  const [mainTab, setMainTab] = useState('CF');
  const [subTabCF, setSubTabCF] = useState('NOUVEAU');
  const [subTabAC, setSubTabAC] = useState('NOUVEAU');
  const [subTabSuiviCF, setSubTabSuiviCF] = useState('DIFFERES');
  const [subTabSuiviAC, setSubTabSuiviAC] = useState('DIFFERES');
  const [subTabArch, setSubTabArch] = useState('A_ARCHIVER');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [selectedOps, setSelectedOps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchBT, setSearchBT] = useState('');
  const [searchSuivi, setSearchSuivi] = useState('');
  const [searchArch, setSearchArch] = useState('');
  
  const [alertData, setAlertData] = useState(null); 
  const [modalRetourCF, setModalRetourCF] = useState(false);
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');
  const [modalPaiement, setModalPaiement] = useState(null);
  const [resultatAC, setResultatAC] = useState('DIFFERE');
  const [motifRetourAC, setMotifRetourAC] = useState('');
  const [paiementMontant, setPaiementMontant] = useState('');
  const [paiementReference, setPaiementReference] = useState('');
  const [boiteModalPaiement, setBoiteModalPaiement] = useState('');
  const [modalArchive, setModalArchive] = useState(false);
  const [boiteArchivage, setBoiteArchivage] = useState('');
  const [modalEditBT, setModalEditBT] = useState(null);
  const [editBtNumero, setEditBtNumero] = useState('');
  const [expandedBT, setExpandedBT] = useState(null);

  const dateRefs = useRef({});
  const setDateRef = (key, el) => { if (el) dateRefs.current['_' + key] = el };
  const readDate = (key) => dateRefs.current['_' + key]?.value || '';

  const notify = (type, title, message) => setAlertData({ type, title, message });
  const ask = (title, message, onConfirm, showPwd = false, showInput = false, inputLabel = '') => {
    setAlertData({ type: 'confirm', title, message, onConfirm, showPwd, showInput, inputLabel });
  };

  const exerciceActif = exercices.find(e => e.actif);
  const currentSrc = sources.find(s => s.id === activeSourceBT);
  
  // On ignore systématiquement les éléments supprimés (Corbeille)
  const opsForSource = useMemo(() => {
    return ops.filter(op => op.sourceId === activeSourceBT && op.exerciceId === exerciceActif?.id && op.statut !== 'SUPPRIME');
  }, [ops, activeSourceBT, exerciceActif]);

  const opsEligiblesCF = useMemo(() => opsForSource.filter(op => (op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF') && !op.bordereauCF), [opsForSource]);
  const opsTransmisCF = useMemo(() => opsForSource.filter(op => op.statut === 'TRANSMIS_CF'), [opsForSource]);
  const opsDifferesCF = useMemo(() => opsForSource.filter(op => op.statut === 'DIFFERE_CF'), [opsForSource]);
  const opsRejetesCF = useMemo(() => opsForSource.filter(op => op.statut === 'REJETE_CF'), [opsForSource]);
  
  const opsEligiblesAC = useMemo(() => opsForSource.filter(op => op.statut === 'VISE_CF' && !op.bordereauAC && op.statut !== 'ANNULE'), [opsForSource]);
  const opsTransmisAC = useMemo(() => opsForSource.filter(op => (op.statut === 'TRANSMIS_AC' || op.statut === 'PAYE_PARTIEL') && op.statut !== 'ANNULE'), [opsForSource]);
  const opsDifferesAC = useMemo(() => opsForSource.filter(op => op.statut === 'DIFFERE_AC'), [opsForSource]);
  const opsRejetesAC = useMemo(() => opsForSource.filter(op => op.statut === 'REJETE_AC'), [opsForSource]);
  
  const opsAArchiver = useMemo(() => opsForSource.filter(op => op.statut === 'PAYE' || op.statut === 'ANNULE'), [opsForSource]);
  const opsArchives = useMemo(() => opsForSource.filter(op => op.statut === 'ARCHIVE'), [opsForSource]);
  
  const bordereauCF = useMemo(() => bordereaux.filter(bt => bt.type === 'CF' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActif?.id && bt.statut !== 'SUPPRIME'), [bordereaux, activeSourceBT, exerciceActif]);
  const bordereauAC = useMemo(() => bordereaux.filter(bt => bt.type === 'AC' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActif?.id && bt.statut !== 'SUPPRIME'), [bordereaux, activeSourceBT, exerciceActif]);

  const getBen = (op) => op?.beneficiaireNom || beneficiaires.find(b => b.id === op?.beneficiaireId)?.nom || 'N/A';
  
  const isOpLockedForCF = (op) => ['VISE_CF','TRANSMIS_AC','PAYE_PARTIEL','PAYE','ARCHIVE','ANNULE','DIFFERE_AC','REJETE_AC'].includes(op.statut);
  const isOpLockedForAC = (op) => ['PAYE','ARCHIVE'].includes(op.statut);
  const isBordereauLocked = (bt) => {
    if (!bt.opsIds) return false;
    if (bt.type === 'CF') return bt.opsIds.some(id => { const op = ops.find(o => o.id === id); return op && isOpLockedForCF(op); });
    if (bt.type === 'AC') return bt.opsIds.some(id => { const op = ops.find(o => o.id === id); return op && isOpLockedForAC(op); });
    return false;
  };

  const checkPwd = (callback) => {
    ask("Sécurité", "Veuillez saisir le mot de passe administrateur :", (pwd) => {
      if(pwd === (projet?.motDePasseAdmin || 'admin123')) callback();
      else notify('error', 'Erreur', 'Mot de passe incorrect');
    }, true);
  };

  const genNumeroBT = async (typeBT) => {
    const pf = typeBT === 'CF' ? 'BT-CF' : 'BT-AC';
    const sp = projet?.sigle || 'PROJET'; const ss = currentSrc?.sigle || 'SRC';
    const a = exerciceActif?.annee || new Date().getFullYear();
    const cId = `${typeBT}_${activeSourceBT}_${exerciceActif?.id}`;
    const cRef = doc(db, 'compteurs', cId);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(cRef); const next = (snap.exists() ? (snap.data().count || 0) : 0) + 1;
      tx.set(cRef, { count: next, type: typeBT, sourceId: activeSourceBT, exerciceId: exerciceActif?.id });
      return `${pf}-${String(next).padStart(4, '0')}/${sp}-${ss}/${a}`;
    });
  };

  const chgTab = (t) => { setMainTab(t); setSelectedOps([]); setSearchBT(''); setExpandedBT(null); setSearchSuivi(''); setSearchArch(''); };
  const chgSub = (fn, v) => { fn(v); setSelectedOps([]); setSearchBT(''); setExpandedBT(null); setSearchSuivi(''); };

  // ================================================================
  // ACTIONS (BATCHES & TRANSACTION)
  // ================================================================
  const handleCreateBordereau = async (typeBT) => {
    if (selectedOps.length === 0) { notify('error', 'Erreur', 'Sélectionnez au moins un OP.'); return; }
    const bf = typeBT === 'CF' ? 'bordereauCF' : 'bordereauAC';
    const eligibles = typeBT === 'CF' ? ['EN_COURS', 'DIFFERE_CF'] : ['VISE_CF'];
    
    ask('Confirmation', `Créer un bordereau pour ${selectedOps.length} OP ?`, async () => {
      setSaving(true);
      try {
        const num = await genNumeroBT(typeBT);
        const batch = writeBatch(db);
        const btRef = doc(collection(db, 'bordereaux'));
        
        const totalBT = selectedOps.reduce((s, id) => s + (ops.find(o => o.id === id)?.montant || 0), 0);

        batch.set(btRef, {
          numero: num, type: typeBT, sourceId: activeSourceBT, exerciceId: exerciceActif.id,
          dateCreation: new Date().toISOString().split('T')[0], dateTransmission: null,
          opsIds: selectedOps, nbOps: selectedOps.length, totalMontant: totalBT,
          statut: 'EN_COURS', createdAt: new Date().toISOString()
        });

        selectedOps.forEach(opId => {
          batch.update(doc(db, 'ops', opId), { [bf]: num, updatedAt: new Date().toISOString() });
        });

        await batch.commit();
        notify('success', 'Succès', `${num} créé.`);
        setSelectedOps([]);
        if (typeBT === 'CF') setSubTabCF('BORDEREAUX'); else setSubTabAC('BORDEREAUX');
      } catch (e) { notify('error', 'Erreur', e.message); }
      setSaving(false);
    });
  };

  const handleTransmettre = async (bt) => {
    const d = readDate('trans_' + bt.id); if (!d) { notify('error', 'Erreur', 'Saisissez une date.'); return; }
    ask('Confirmation', `Transmettre le bordereau ${bt.numero} le ${d} ?`, async () => {
      setSaving(true);
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'bordereaux', bt.id), { dateTransmission: d, statut: 'ENVOYE', updatedAt: new Date().toISOString() });
        const ns = bt.type === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC';
        const df = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
        bt.opsIds.forEach(opId => {
          batch.update(doc(db, 'ops', opId), { statut: ns, [df]: d, updatedAt: new Date().toISOString() });
        });
        await batch.commit();
        notify('success', 'Transmis', 'Bordereau transmis.');
      } catch (e) { notify('error', 'Erreur', e.message); }
      setSaving(false);
    });
  };

  const handleAnnulerTransmission = async (bt) => {
    if (isBordereauLocked(bt)) { notify('error', 'Bloqué', "Impossible d'annuler : des OP ont déjà avancé dans le circuit."); return; }
    checkPwd(async () => {
      ask('Annulation', `Annuler la transmission de ${bt.numero} ?`, async () => {
        setSaving(true);
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'bordereaux', bt.id), { dateTransmission: null, statut: 'EN_COURS', updatedAt: new Date().toISOString() });
          const prevSt = bt.type === 'CF' ? 'EN_COURS' : 'VISE_CF';
          const df = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
          bt.opsIds.forEach(opId => {
            batch.update(doc(db, 'ops', opId), { statut: prevSt, [df]: null, updatedAt: new Date().toISOString() });
          });
          await batch.commit();
          notify('success', 'Annulé', 'Transmission annulée.');
          setModalEditBT(null);
        } catch (e) { notify('error', 'Erreur', e.message); }
        setSaving(false);
      });
    });
  };

  const handleRetourCF = async () => {
    if (selectedOps.length === 0) { notify('error', 'Erreur', 'Sélectionnez des OP.'); return; }
    const d = readDate('retourCF'); if (!d) { notify('error', 'Erreur', 'Date requise.'); return; }
    if ((resultatCF === 'DIFFERE' || resultatCF === 'REJETE') && !motifRetour.trim()) { notify('error', 'Erreur', 'Motif obligatoire.'); return; }
    
    const exec = async () => {
      ask('Confirmation', `Valider la décision "${resultatCF}" pour ${selectedOps.length} OP ?`, async () => {
        setSaving(true);
        try {
          const batch = writeBatch(db);
          for (const opId of selectedOps) {
            const op = ops.find(o => o.id === opId);
            let upd = { updatedAt: new Date().toISOString() };
            
            if (resultatCF === 'VISE') {
              if (op.type === 'ANNULATION') {
                upd.statut = 'ANNULE'; upd.dateVisaCF = d; upd.dateArchivage = d; 
                if (op.opProvisoireId) {
                  batch.update(doc(db, 'ops', op.opProvisoireId), { statut: 'ANNULE', dateAnnulation: d, updatedAt: new Date().toISOString() });
                }
              } else {
                upd.statut = 'VISE_CF'; upd.dateVisaCF = d;
              }
            } else if (resultatCF === 'DIFFERE') {
              upd.statut = 'DIFFERE_CF'; upd.dateDiffere = d; upd.motifDiffere = motifRetour.trim();
            } else {
              upd.statut = 'REJETE_CF'; upd.dateRejet = d; upd.motifRejet = motifRetour.trim();
            }
            batch.update(doc(db, 'ops', opId), upd);
          }
          await batch.commit();
          notify('success', 'Succès', 'Décision enregistrée.');
          setSelectedOps([]); setModalRetourCF(false);
        } catch (e) { notify('error', 'Erreur', e.message); }
        setSaving(false);
      });
    };
    if (resultatCF === 'REJETE') checkPwd(exec); else exec();
  };

  const handleDeleteBordereau = async (bt) => {
    if (isBordereauLocked(bt)) { notify('error', 'Bloqué', "Action impossible car des OP ont déjà été traités."); return; }
    checkPwd(() => {
      ask('Suppression', `Mettre le bordereau ${bt.numero} à la corbeille ?\nLes OP seront libérés.`, async () => {
        setSaving(true);
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'bordereaux', bt.id), { statut: 'SUPPRIME', dateSuppression: new Date().toISOString(), updatedAt: new Date().toISOString() });
          const ps = bt.type === 'CF' ? 'EN_COURS' : 'VISE_CF';
          const bf = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';
          const df = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
          bt.opsIds.forEach(opId => {
            batch.update(doc(db, 'ops', opId), { [bf]: null, statut: ps, [df]: null, updatedAt: new Date().toISOString() });
          });
          await batch.commit();
          notify('success', 'Corbeille', 'Bordereau mis à la corbeille.');
          setModalEditBT(null);
        } catch (e) { notify('error', 'Erreur', e.message); }
        setSaving(false);
      });
    });
  };

  const handlePaiement = async (opId) => {
    const op = ops.find(o => o.id === opId); if (!op) return;
    const m = parseFloat(paiementMontant); if (isNaN(m) || m <= 0) { notify('error', 'Erreur', 'Montant invalide.'); return; }
    const d = readDate('paiement'); if (!d) { notify('error', 'Erreur', 'Date requise.'); return; }
    
    ask('Paiement', `Enregistrer un paiement de ${formatMontant(m)} F ?`, async () => {
      setSaving(true);
      try {
        const paiem = op.paiements || [];
        const nP = [...paiem, { date: d, montant: m, reference: paiementReference.trim(), createdAt: new Date().toISOString() }];
        const tot = nP.reduce((s, p) => s + (p.montant || 0), 0);
        const solde = (op.montant || 0) - tot < 1;
        await updateDoc(doc(db, 'ops', opId), { paiements: nP, totalPaye: tot, datePaiement: d, statut: solde ? 'PAYE' : 'PAYE_PARTIEL', updatedAt: new Date().toISOString() });
        notify('success', 'Paiement', solde ? 'OP soldé.' : 'Paiement enregistré.');
        setPaiementMontant(''); setPaiementReference(''); setModalPaiement(null);
      } catch (e) { notify('error', 'Erreur', e.message); }
      setSaving(false);
    });
  };

  const handleAnnulerRetour = async (opId, statut) => {
    checkPwd(() => {
      ask('Annulation', "Annuler le dernier statut et revenir à l'étape précédente ?", async () => {
        setSaving(true);
        const dest = ['DIFFERE_AC', 'REJETE_AC'].includes(statut) ? 'TRANSMIS_AC' : 'TRANSMIS_CF';
        try {
          await updateDoc(doc(db, 'ops', opId), { statut: dest, dateVisaCF: null, dateDiffere: null, motifDiffere: null, dateRejet: null, motifRejet: null, updatedAt: new Date().toISOString() });
          notify('success', 'OK', 'Retour arrière effectué.');
        } catch (e) { notify('error', 'Erreur', e.message); }
        setSaving(false);
      });
    });
  };

  // === RENDU UI ===
  const iS = { ...styles.input, marginBottom: 0, width: '100%', color: '#000000' };
  const thS = { ...styles.th, fontSize: 11, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: .5, background: '#FAFAF8' };
  const crd = { ...styles.card, background: '#FFF', borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)' };

  const renderBordereaux = (btList) => (
    <div style={crd}>
      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 16 }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>{I.search('#999', 16)}</div>
        <input type="text" placeholder="Rechercher un bordereau..." value={searchBT} onChange={e => setSearchBT(e.target.value)} style={{ ...iS, paddingLeft: 40, borderRadius: 10 }} />
      </div>
      {btList.length === 0 ? <Empty text="Aucun bordereau actif" /> :
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {btList.filter(b => b.numero.toLowerCase().includes(searchBT.toLowerCase())).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(bt => {
            const isExp = expandedBT === bt.id;
            return (
              <div key={bt.id} style={{ marginBottom: 4 }}>
                <div onClick={() => setExpandedBT(isExp ? null : bt.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: isExp ? '#F0F7F2' : '#FFF', borderRadius: 12, border: `1px solid ${isExp ? P.green : P.border}`, cursor: 'pointer' }}>
                  <span style={{ transform: isExp ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>{I.chevron(P.green)}</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#000' }}>{bt.numero}</span>
                  <Badge bg={bt.statut === 'EN_COURS' ? P.goldLight : P.greenLight} color={bt.statut === 'EN_COURS' ? P.gold : P.greenDark}>{bt.statut === 'EN_COURS' ? 'Brouillon' : 'Transmis'}</Badge>
                  <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#000' }}>{formatMontant(bt.totalMontant)} F</span>
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16 }} onClick={e => e.stopPropagation()}>
                    <IBtn icon={I.print(P.greenDark)} onClick={() => handlePrintBordereau(bt)} />
                    <IBtn icon={I.settings(P.textSec)} onClick={() => handleOpenEditBT(bt)} />
                  </div>
                </div>
                {isExp && (
                  <div style={{ padding: 16, border: `1px solid ${P.green}`, borderTop: 'none', background: '#FFF', borderRadius: '0 0 12px 12px' }}>
                    {bt.statut === 'EN_COURS' && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, background: '#FFF8E1', padding: 10, borderRadius: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Date transmission :</label>
                        <input type="date" ref={el => setDateRef('trans_' + bt.id, el)} style={{ ...iS, width: 150 }} />
                        <ActionBtn label="Transmettre" color={P.greenDark} onClick={() => handleTransmettre(bt)} />
                      </div>
                    )}
                    <table style={{ width: '100%', fontSize: 11 }}>
                      <tbody>
                        {bt.opsIds.map((id, idx) => {
                          const op = ops.find(o => o.id === id);
                          return op ? <tr key={id}><td style={{ padding: 4 }}>{idx + 1}.</td><td style={{ fontWeight: 700 }}>{op.numero}</td><td>{getBen(op)}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMontant(op.montant)} F</td></tr> : null;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      }
    </div>
  );

  const handleOpenEditBT = (bt) => { setEditBtNumero(bt.numero); setModalEditBT(bt); };

  const handlePrintBordereau = (bt) => {
    const btOps = bt.opsIds.map(id => ops.find(o => o.id === id)).filter(Boolean);
    const rows = btOps.map((op, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${getBen(op)}</td><td>${op.objet || '-'}</td><td style="text-align:center;font-family:monospace;font-weight:bold">${op.numero}</td><td style="text-align:center">1</td><td style="text-align:right;font-weight:bold">${Number(op.montant).toLocaleString('fr-FR')}</td></tr>`).join('');
    const html = `<html><head><style>body{font-family:sans-serif;font-size:12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:8px}th{background:#eee}</style></head><body><h2 style="text-align:center">BORDEREAU ${bt.numero}</h2><table><thead><tr><th>N°</th><th>Bénéficiaire</th><th>Objet</th><th>N° OP</th><th>Ex.</th><th>Montant</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank'); w.document.write(html); w.document.close();
  };

  return (
    <div className="bordereaux-page">
      <style>{` .bordereaux-page input, .bordereaux-page select, .bordereaux-page textarea { color: #000000 !important; } `}</style>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />

      <h1 style={{ fontSize: 22, fontWeight: 700, color: P.greenDark, marginBottom: 16 }}>Bordereaux de transmission</h1>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {sources.map(s => <button key={s.id} onClick={() => setActiveSourceBT(s.id)} style={{ padding: '10px 20px', borderRadius: 10, border: activeSourceBT === s.id ? `2px solid ${s.couleur}` : '1px solid #ddd', background: activeSourceBT === s.id ? s.couleur : '#fff', color: activeSourceBT === s.id ? '#fff' : '#666', fontWeight: 700, cursor: 'pointer' }}>{s.sigle}</button>)}
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        <button onClick={() => chgTab('CF')} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: mainTab === 'CF' ? P.greenDark : '#E0E0E0', color: mainTab === 'CF' ? '#FFF' : '#666', fontWeight: 700, cursor: 'pointer' }}>CONTRÔLE FINANCIER</button>
        <button onClick={() => chgTab('AC')} style={{ flex: 1, padding: 14, borderRadius: 10, border: 'none', background: mainTab === 'AC' ? P.orange : '#E0E0E0', color: mainTab === 'AC' ? '#FFF' : '#666', fontWeight: 700, cursor: 'pointer' }}>AGENT COMPTABLE</button>
      </div>

      {mainTab === 'CF' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <STab active={subTabCF === 'NOUVEAU'} label="Nouveau BT" count={opsEligiblesCF.length} color={P.greenDark} onClick={() => chgSub(setSubTabCF, 'NOUVEAU')} />
            <STab active={subTabCF === 'BORDEREAUX'} label="Mes Bordereaux" count={bordereauCF.length} color={P.green} onClick={() => chgSub(setSubTabCF, 'BORDEREAUX')} />
            <STab active={subTabCF === 'RETOUR'} label="Traitement Visa" count={opsTransmisCF.length} color={P.gold} onClick={() => chgSub(setSubTabCF, 'RETOUR')} />
          </div>
          {subTabCF === 'NOUVEAU' && (
            <div style={crd}>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead><tr><th style={thS}><input type="checkbox" onChange={() => toggleAll(opsEligiblesCF)} /></th><th style={thS}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={{ ...thS, textAlign: 'right' }}>MONTANT</th></tr></thead>
                  <tbody>
                    {opsEligiblesCF.map(op => (
                      <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', background: selectedOps.includes(op.id) ? '#F0F7F2' : '#FFF' }}>
                        <td style={{ padding: 10 }}><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly /></td>
                        <td style={{ padding: 10, fontFamily: 'monospace', fontWeight: 700 }}>{op.numero}</td>
                        <td style={{ padding: 10 }}>{getBen(op)}</td>
                        <td style={{ padding: 10, textAlign: 'right', fontWeight: 700 }}>{formatMontant(op.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selectedOps.length > 0 && <div style={{ marginTop: 16 }}><ActionBtn label="Générer Bordereau" color={P.greenDark} onClick={() => handleCreateBordereau('CF')} /></div>}
            </div>
          )}
          {subTabCF === 'BORDEREAUX' && renderBordereaux(bordereauCF)}
          {subTabCF === 'RETOUR' && (
             <div style={crd}>
               <h3 style={{fontSize: 14, color: P.gold, marginBottom: 12}}>En attente de visa CF</h3>
               <table style={{width:'100%'}}>
                 <thead><tr><th style={thS}><input type="checkbox" onChange={()=>toggleAll(opsTransmisCF)}/></th><th style={thS}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={thS}>MONTANT</th></tr></thead>
                 <tbody>
                   {opsTransmisCF.map(op=><tr key={op.id} onClick={()=>toggleOp(op.id)} style={{background: selectedOps.includes(op.id)?'#FFF8E1':'#FFF'}}><td style={{padding:10}}><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly/></td><td style={{padding:10, fontFamily:'monospace'}}>{op.numero}</td><td style={{padding:10}}>{getBen(op)}</td><td style={{padding:10, textAlign:'right'}}>{formatMontant(op.montant)}</td></tr>)}
                 </tbody>
               </table>
               {selectedOps.length > 0 && <div style={{marginTop:16}}><ActionBtn label="Valider Visa / Retour" color={P.gold} onClick={()=>setModalRetourCF(true)}/></div>}
             </div>
          )}
        </>
      )}

      {mainTab === 'AC' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <STab active={subTabAC === 'NOUVEAU'} label="Nouveau BT" count={opsEligiblesAC.length} color={P.orange} onClick={() => chgSub(setSubTabAC, 'NOUVEAU')} />
            <STab active={subTabAC === 'BORDEREAUX'} label="Mes Bordereaux" count={bordereauAC.length} color={P.orange} onClick={() => chgSub(setSubTabAC, 'BORDEREAUX')} />
          </div>
          {subTabAC === 'NOUVEAU' && (
            <div style={crd}>
               <table style={{width:'100%'}}>
                 <thead><tr><th style={thS}><input type="checkbox" onChange={()=>toggleAll(opsEligiblesAC)}/></th><th style={thS}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={thS}>MONTANT</th></tr></thead>
                 <tbody>
                   {opsEligiblesAC.map(op=><tr key={op.id} onClick={()=>toggleOp(op.id)} style={{background: selectedOps.includes(op.id)?'#FDF2E9':'#FFF'}}><td style={{padding:10}}><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly/></td><td style={{padding:10, fontFamily:'monospace'}}>{op.numero}</td><td style={{padding:10}}>{getBen(op)}</td><td style={{padding:10, textAlign:'right'}}>{formatMontant(op.montant)}</td></tr>)}
                 </tbody>
               </table>
               {selectedOps.length > 0 && <div style={{marginTop:16}}><ActionBtn label="Générer Bordereau AC" color={P.orange} onClick={() => handleCreateBordereau('AC')} /></div>}
            </div>
          )}
          {subTabAC === 'BORDEREAUX' && renderBordereaux(bordereauAC)}
        </>
      )}

      {modalRetourCF && (
        <Modal title="Validation Visa CF" titleColor={P.gold} onClose={()=>setModalRetourCF(false)}>
           <div style={{marginBottom:16}}>
             <label style={{display:'block', marginBottom:8, fontWeight:700}}>Décision :</label>
             <select value={resultatCF} onChange={e=>setResultatCF(e.target.value)} style={iS}>
               <option value="VISE">VISER (Approuver)</option>
               <option value="DIFFERE">DIFFERER (Attente pièces)</option>
               <option value="REJETE">REJETER (Annuler l'OP)</option>
             </select>
           </div>
           <div style={{marginBottom:16}}>
             <label style={{display:'block', marginBottom:8, fontWeight:700}}>Date :</label>
             <input type="date" ref={el=>setDateRef('retourCF', el)} defaultValue={new Date().toISOString().split('T')[0]} style={iS}/>
           </div>
           {(resultatCF==='DIFFERE'||resultatCF==='REJETE') && (
             <div style={{marginBottom:16}}>
               <label style={{display:'block', marginBottom:8, fontWeight:700}}>Motif :</label>
               <textarea value={motifRetour} onChange={e=>setMotifRetour(e.target.value)} style={{...iS, height:80}} />
             </div>
           )}
           <ActionBtn label="Confirmer la décision" color={P.gold} onClick={handleRetourCF} disabled={saving}/>
        </Modal>
      )}

      {modalEditBT && (
        <Modal title="Gestion du Bordereau" titleColor="#333" onClose={()=>setModalEditBT(null)}>
           <div style={{marginBottom:20}}>
             <label style={{display:'block', marginBottom:8, fontWeight:700}}>Numéro du bordereau :</label>
             <input type="text" value={editBtNumero} onChange={e=>setEditBtNumero(e.target.value)} style={iS}/>
             <button onClick={()=>handleSaveBtNumero(modalEditBT)} style={{marginTop:8, padding:10, background:P.gold, color:'#fff', border:'none', borderRadius:8, cursor:'pointer'}}>Mettre à jour le numéro</button>
           </div>
           <div style={{marginTop:20, borderTop:'1px solid #eee', paddingTop:20}}>
             <button onClick={()=>handleDeleteBordereau(modalEditBT)} style={{width:'100%', padding:12, background:P.redLight, color:P.red, border:`1px solid ${P.red}`, borderRadius:8, cursor:'pointer', fontWeight:700}}>Mettre le bordereau à la corbeille</button>
           </div>
        </Modal>
      )}
    </div>
  );
};

export default PageBordereaux;
