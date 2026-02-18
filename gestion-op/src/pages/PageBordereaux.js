import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';
import { ARMOIRIE, LOGO_PIF2 } from '../utils/logos';

// ============================================================
// PALETTE
// ============================================================
const P = {
  bg:'#F6F4F1',card:'#FFFFFF',green:'#2E9940',greenDark:'#1B6B2E',greenLight:'#E8F5E9',
  olive:'#5D6A55',oliveDark:'#4A5A42',gold:'#C5961F',goldLight:'#FFF8E1',goldBorder:'#E8B931',
  red:'#C43E3E',redLight:'#FFEBEE',orange:'#D4722A',
  border:'#E2DFD8',text:'#3A3A3A',textSec:'#7A7A7A',textMuted:'#A0A0A0',
};

// ============================================================
// ICÔNES SVG
// ============================================================
const I={
  print:(c=P.greenDark,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  edit:(c=P.gold,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:(c=P.red,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>,
  undo:(c=P.gold,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/></svg>,
  check:(c='#fff',s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
  close:(c=P.textMuted,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevron:(c=P.green,s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  plus:(c='#fff',s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  archive:(c=P.olive,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  search:(c=P.textMuted,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  lock:(c=P.red,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  warn:(c=P.gold,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  fileText:(c=P.textMuted,s=40)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
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
const ActionBtn=React.memo(({label,icon,color,onClick,disabled,count})=><button onClick={onClick} disabled={disabled} style={{padding:'12px 24px',background:color,color:'#fff',border:'none',borderRadius:10,fontWeight:700,fontSize:14,cursor:disabled?'not-allowed':'pointer',display:'inline-flex',alignItems:'center',gap:8,opacity:disabled?.5:1,boxShadow:`0 4px 12px ${color}33`,transition:'all .2s'}}>{icon}{label}{count!==undefined&&<span style={{background:'rgba(255,255,255,.25)',padding:'2px 10px',borderRadius:8,fontSize:12}}>{count}</span>}</button>);
const Modal=React.memo(({title,titleColor,onClose,children,width=540})=><><div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.25)',backdropFilter:'blur(3px)',zIndex:200}}/><div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width,maxWidth:'92vw',maxHeight:'88vh',background:P.card,borderRadius:16,zIndex:201,boxShadow:'0 20px 60px rgba(0,0,0,.2)',display:'flex',flexDirection:'column',overflow:'hidden'}}><div style={{padding:'16px 22px',background:titleColor||P.green,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}><h3 style={{fontSize:16,fontWeight:700,color:'#fff',margin:0}}>{title}</h3><button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'none',background:'rgba(255,255,255,.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{I.close('#fff',16)}</button></div><div style={{flex:1,overflowY:'auto',padding:'20px 22px'}}>{children}</div></div></>);

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
const PageBordereaux=()=>{
  const{projet,sources,exercices,beneficiaires,ops,setOps,bordereaux,setBordereaux}=useAppContext();
  const[mainTab,setMainTab]=useState('CF');
  const[subTabCF,setSubTabCF]=useState('NOUVEAU');
  const[subTabAC,setSubTabAC]=useState('NOUVEAU');
  const[subTabSuiviCF,setSubTabSuiviCF]=useState('DIFFERES');
  const[subTabSuiviAC,setSubTabSuiviAC]=useState('DIFFERES');
  const[subTabArch,setSubTabArch]=useState('A_ARCHIVER');
  const[activeSourceBT,setActiveSourceBT]=useState(sources[0]?.id||null);
  const[selectedOps,setSelectedOps]=useState([]);
  const[saving,setSaving]=useState(false);
  const[searchBT,setSearchBT]=useState('');
  const[searchSuivi,setSearchSuivi]=useState('');
  const[searchArch,setSearchArch]=useState('');
  const[modalRetourCF,setModalRetourCF]=useState(false);
  const[resultatCF,setResultatCF]=useState('VISE');
  const[motifRetour,setMotifRetour]=useState('');
  const[modalPaiement,setModalPaiement]=useState(null);
  const[resultatAC,setResultatAC]=useState('DIFFERE');
  const[motifRetourAC,setMotifRetourAC]=useState('');
  const[paiementMontant,setPaiementMontant]=useState('');
  const[paiementReference,setPaiementReference]=useState('');
  const[boiteModalPaiement,setBoiteModalPaiement]=useState('');
  const[modalArchive,setModalArchive]=useState(false);
  const[boiteArchivage,setBoiteArchivage]=useState('');
  const[modalEditBT,setModalEditBT]=useState(null);
  const[editBtNumero,setEditBtNumero]=useState('');
  const[modalProtection,setModalProtection]=useState(null);
  const[expandedBT,setExpandedBT]=useState(null);

  const dateRefs=useRef({});
  const setDateRef=(key,el)=>{if(el)dateRefs.current['_'+key]=el};
  const readDate=(key)=>dateRefs.current['_'+key]?.value||'';

  // === DATA ===
  const exerciceActif=exercices.find(e=>e.actif);
  const currentSrc=sources.find(s=>s.id===activeSourceBT);
  const opsForSource=ops.filter(op=>op.sourceId===activeSourceBT&&op.exerciceId===exerciceActif?.id);

  // (+) Exclure OP déjà dans un bordereau de "Nouveau BT"
  const opsEligiblesCF=opsForSource.filter(op=>(op.statut==='EN_COURS'||op.statut==='DIFFERE_CF')&&!op.bordereauCF);
  const opsTransmisCF=opsForSource.filter(op=>op.statut==='TRANSMIS_CF');
  const opsDifferesCF=opsForSource.filter(op=>op.statut==='DIFFERE_CF');
  const opsRejetesCF=opsForSource.filter(op=>op.statut==='REJETE_CF');
  const opsEligiblesAC=opsForSource.filter(op=>op.statut==='VISE_CF'&&!op.bordereauAC);
  const opsTransmisAC=opsForSource.filter(op=>op.statut==='TRANSMIS_AC'||op.statut==='PAYE_PARTIEL');
  const opsDifferesAC=opsForSource.filter(op=>op.statut==='DIFFERE_AC');
  const opsRejetesAC=opsForSource.filter(op=>op.statut==='REJETE_AC');
  // (1) opsAArchiver inclut ANNULÉ
  const opsAArchiver=opsForSource.filter(op=>op.statut==='PAYE'||op.statut==='ANNULE');
  const opsArchives=opsForSource.filter(op=>op.statut==='ARCHIVE');
  const bordereauCF=bordereaux.filter(bt=>bt.type==='CF'&&bt.sourceId===activeSourceBT&&bt.exerciceId===exerciceActif?.id);
  const bordereauAC=bordereaux.filter(bt=>bt.type==='AC'&&bt.sourceId===activeSourceBT&&bt.exerciceId===exerciceActif?.id);

  // === HELPERS ===
  const getBen=(op)=>op?.beneficiaireNom||beneficiaires.find(b=>b.id===op?.beneficiaireId)?.nom||'N/A';
  const checkPwd=()=>{const p=window.prompt('Mot de passe requis :');if(p!==(projet?.motDePasseAdmin||'admin123')){if(p!==null)alert('Mot de passe incorrect');return false;}return true;};
  const opHasAdvanced=(opId)=>{const op=ops.find(o=>o.id===opId);return op&&['VISE_CF','TRANSMIS_AC','PAYE_PARTIEL','PAYE','ARCHIVE','ANNULE','DIFFERE_AC','REJETE_AC'].includes(op.statut);};
  const btHasAdvancedOps=(bt)=>(bt.opsIds||[]).some(id=>opHasAdvanced(id));
  const filterBordereaux=(btList)=>btList.filter(bt=>{if(!searchBT)return true;const t=searchBT.toLowerCase();if((bt.numero||'').toLowerCase().includes(t))return true;return bt.opsIds?.some(opId=>{const op=ops.find(o=>o.id===opId);return(op?.numero||'').toLowerCase().includes(t)||getBen(op).toLowerCase().includes(t);});});
  const filterOps=(list,term)=>{if(!term)return list;const t=term.toLowerCase();return list.filter(op=>(op.numero||'').toLowerCase().includes(t)||getBen(op).toLowerCase().includes(t)||(op.objet||'').toLowerCase().includes(t)||(op.motifDiffere||'').toLowerCase().includes(t)||(op.motifRejet||'').toLowerCase().includes(t)||(op.boiteArchivage||'').toLowerCase().includes(t));};
  const toggleOp=(opId)=>setSelectedOps(p=>p.includes(opId)?p.filter(id=>id!==opId):[...p,opId]);
  const toggleAll=(list)=>{if(selectedOps.length===list.length&&list.length>0)setSelectedOps([]);else setSelectedOps(list.map(o=>o.id));};
  const totalSelected=selectedOps.reduce((s,id)=>s+(ops.find(o=>o.id===id)?.montant||0),0);
  const closeAllModals=()=>{setModalRetourCF(false);setModalPaiement(null);setModalArchive(false);setModalEditBT(null);setModalProtection(null);};

  const genNumeroBT=async(typeBT)=>{
    const pf=typeBT==='CF'?'BT-CF':'BT-AC';
    const sp=projet?.sigle||'PROJET';const ss=currentSrc?.sigle||'SRC';
    const a=exerciceActif?.annee||new Date().getFullYear();
    const cId=`${typeBT}_${activeSourceBT}_${exerciceActif?.id}`;
    const cRef=doc(db,'compteurs',cId);
    return await runTransaction(db,async(tx)=>{
      const snap=await tx.get(cRef);const next=(snap.exists()?(snap.data().count||0):0)+1;
      tx.set(cRef,{count:next,type:typeBT,sourceId:activeSourceBT,exerciceId:exerciceActif?.id});
      return`${pf}-${String(next).padStart(4,'0')}/${sp}-${ss}/${a}`;
    });
  };

  const chgTab=(t)=>{setMainTab(t);setSelectedOps([]);setSearchBT('');setExpandedBT(null);closeAllModals();setSearchSuivi('');setSearchArch('');};
  const chgSub=(fn,v)=>{fn(v);setSelectedOps([]);setSearchBT('');setExpandedBT(null);setSearchSuivi('');};

  // ================================================================
  // ACTIONS
  // ================================================================
  const handleCreateBordereau=async(typeBT)=>{
    if(selectedOps.length===0){alert('Sélectionnez au moins un OP.');return;}
    const bf=typeBT==='CF'?'bordereauCF':'bordereauAC';
    const eligibles=typeBT==='CF'?['EN_COURS','DIFFERE_CF']:['VISE_CF'];
    const bad=selectedOps.filter(opId=>{const op=ops.find(o=>o.id===opId);return!op||!eligibles.includes(op.statut)||(op[bf]&&op[bf]!=='');});
    if(bad.length>0){alert(`${bad.length} OP déjà utilisé(s). Rafraîchissez.`);setSelectedOps([]);return;}
    if(!window.confirm(`Créer un bordereau — ${selectedOps.length} OP — ${formatMontant(totalSelected)} F ?`))return;
    setSaving(true);
    try{
      const num=await genNumeroBT(typeBT);
      await addDoc(collection(db,'bordereaux'),{numero:num,type:typeBT,sourceId:activeSourceBT,exerciceId:exerciceActif.id,dateCreation:new Date().toISOString().split('T')[0],dateTransmission:null,opsIds:selectedOps,nbOps:selectedOps.length,totalMontant:totalSelected,statut:'EN_COURS',createdAt:new Date().toISOString()});
      for(const opId of selectedOps)await updateDoc(doc(db,'ops',opId),{[bf]:num,updatedAt:new Date().toISOString()});
      alert(`${num} créé.`);setSelectedOps([]);
      if(typeBT==='CF')setSubTabCF('BORDEREAUX');else setSubTabAC('BORDEREAUX');
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleTransmettre=async(bt)=>{
    const d=readDate('trans_'+bt.id);if(!d){alert('Saisissez une date.');return;}
    const lab=bt.type==='CF'?'au CF':"à l'AC";
    if(!window.confirm(`Transmettre ${bt.numero} ${lab} le ${d} ?`))return;
    setSaving(true);
    try{
      await updateDoc(doc(db,'bordereaux',bt.id),{dateTransmission:d,statut:'ENVOYE',updatedAt:new Date().toISOString()});
      const ns=bt.type==='CF'?'TRANSMIS_CF':'TRANSMIS_AC';const df=bt.type==='CF'?'dateTransmissionCF':'dateTransmissionAC';
      for(const opId of bt.opsIds)await updateDoc(doc(db,'ops',opId),{statut:ns,[df]:d,updatedAt:new Date().toISOString()});
      alert(`Transmis ${lab}.`);
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleAnnulerTransmission=async(bt)=>{
    if(!checkPwd())return;if(!window.confirm(`Annuler la transmission de ${bt.numero} ?`))return;
    setSaving(true);
    try{
      await updateDoc(doc(db,'bordereaux',bt.id),{dateTransmission:null,statut:'EN_COURS',updatedAt:new Date().toISOString()});
      const prevSt=bt.type==='CF'?'EN_COURS':'VISE_CF';const df=bt.type==='CF'?'dateTransmissionCF':'dateTransmissionAC';
      for(const opId of bt.opsIds){const op=ops.find(o=>o.id===opId);const exp=bt.type==='CF'?'TRANSMIS_CF':'TRANSMIS_AC';if(op&&op.statut===exp)await updateDoc(doc(db,'ops',opId),{statut:prevSt,[df]:null,updatedAt:new Date().toISOString()});}
      alert('Transmission annulée.');
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleOpenEditBT=(bt)=>{
    if(btHasAdvancedOps(bt)){setModalProtection(bt);return;}
    if(bt.statut==='ENVOYE'&&!checkPwd())return;
    setEditBtNumero(bt.numero||'');setModalEditBT(bt);
  };

  const handleAddOpToBT=async(bt,opId)=>{
    try{
      const nIds=[...bt.opsIds,opId];const nT=nIds.reduce((s,id)=>s+(ops.find(x=>x.id===id)?.montant||0),0);
      await updateDoc(doc(db,'bordereaux',bt.id),{opsIds:nIds,nbOps:nIds.length,totalMontant:nT,updatedAt:new Date().toISOString()});
      await updateDoc(doc(db,'ops',opId),{[bt.type==='CF'?'bordereauCF':'bordereauAC']:bt.numero,updatedAt:new Date().toISOString()});
      setModalEditBT(p=>p?{...p,opsIds:nIds,nbOps:nIds.length,totalMontant:nT}:null);
    }catch(e){alert('Erreur : '+e.message);}
  };

  const handleRemoveOpFromBT=async(bt,opId)=>{
    if(bt.opsIds.length<=1){alert('Minimum 1 OP.');return;}
    if(!window.confirm('Retirer cet OP ?'))return;
    try{
      const nIds=bt.opsIds.filter(id=>id!==opId);const nT=nIds.reduce((s,id)=>s+(ops.find(x=>x.id===id)?.montant||0),0);
      await updateDoc(doc(db,'bordereaux',bt.id),{opsIds:nIds,nbOps:nIds.length,totalMontant:nT,updatedAt:new Date().toISOString()});
      const ps=bt.type==='CF'?'EN_COURS':'VISE_CF';
      await updateDoc(doc(db,'ops',opId),{[bt.type==='CF'?'bordereauCF':'bordereauAC']:null,statut:ps,updatedAt:new Date().toISOString()});
      setModalEditBT(p=>p?{...p,opsIds:nIds,nbOps:nIds.length,totalMontant:nT}:null);
    }catch(e){alert('Erreur : '+e.message);}
  };

  const handleDeleteBordereau=async(bt)=>{
    if(!checkPwd())return;if(!window.confirm(`Supprimer ${bt.numero} ?`))return;
    try{
      const ps=bt.type==='CF'?'EN_COURS':'VISE_CF';const bf=bt.type==='CF'?'bordereauCF':'bordereauAC';const df=bt.type==='CF'?'dateTransmissionCF':'dateTransmissionAC';
      for(const opId of bt.opsIds){const op=ops.find(o=>o.id===opId);if(op)await updateDoc(doc(db,'ops',opId),{[bf]:null,statut:ps,[df]:null,updatedAt:new Date().toISOString()});}
      await deleteDoc(doc(db,'bordereaux',bt.id));
      alert('Supprimé.');if(expandedBT===bt.id)setExpandedBT(null);setModalEditBT(null);
    }catch(e){alert('Erreur : '+e.message);}
  };

  const handleSaveBtNumero=async(bt)=>{
    const nn=editBtNumero.trim();if(!nn){alert('Le numéro ne peut pas être vide.');return;}
    if(nn===bt.numero)return;if(!checkPwd())return;
    if(bordereaux.find(b=>b.numero===nn&&b.id!==bt.id&&b.type===bt.type)){alert('Ce numéro existe déjà.');return;}
    try{
      const old=bt.numero;const bf=bt.type==='CF'?'bordereauCF':'bordereauAC';
      await updateDoc(doc(db,'bordereaux',bt.id),{numero:nn,updatedAt:new Date().toISOString()});
      for(const opId of(bt.opsIds||[]))await updateDoc(doc(db,'ops',opId),{[bf]:nn,updatedAt:new Date().toISOString()});
      setBordereaux(p=>p.map(b=>b.id===bt.id?{...b,numero:nn}:b));
      setOps(p=>p.map(o=>(bt.opsIds||[]).includes(o.id)?{...o,[bf]:nn}:o));
      setModalEditBT(p=>p?{...p,numero:nn}:null);
      alert('N° modifié : '+old+' → '+nn);
    }catch(e){alert('Erreur : '+e.message);}
  };

  const handleRetourCF=async()=>{
    if(selectedOps.length===0){alert('Sélectionnez des OP.');return;}
    const d=readDate('retourCF');if(!d){alert('Date requise.');return;}
    if((resultatCF==='DIFFERE'||resultatCF==='REJETE')&&!motifRetour.trim()){alert('Motif obligatoire.');return;}
    if(resultatCF==='REJETE'&&!checkPwd())return;
    const lab=resultatCF==='VISE'?'Visé':resultatCF==='DIFFERE'?'Différé':'Rejeté';
    if(!window.confirm(`Marquer ${selectedOps.length} OP comme "${lab}" ?`))return;
    setSaving(true);
    try{
      let upd={updatedAt:new Date().toISOString()};
      if(resultatCF==='VISE'){upd.statut='VISE_CF';upd.dateVisaCF=d;}
      else if(resultatCF==='DIFFERE'){upd.statut='DIFFERE_CF';upd.dateDiffere=d;upd.motifDiffere=motifRetour.trim();}
      else{upd.statut='REJETE_CF';upd.dateRejet=d;upd.motifRejet=motifRetour.trim();}
      for(const opId of selectedOps)await updateDoc(doc(db,'ops',opId),upd);
      alert(`${selectedOps.length} OP → "${lab}".`);setSelectedOps([]);setMotifRetour('');setModalRetourCF(false);
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleAnnulerRetour=async(opId,statut)=>{
    if(!checkPwd())return;
    const lab=statut==='VISE_CF'?'visa':statut==='DIFFERE_CF'?'différé CF':statut==='REJETE_CF'?'rejet CF':statut==='DIFFERE_AC'?'différé AC':'rejet AC';
    const ret=['DIFFERE_AC','REJETE_AC'].includes(statut)?'TRANSMIS_AC':'TRANSMIS_CF';
    if(!window.confirm(`Annuler le ${lab} ? → "${ret}"`))return;
    setSaving(true);
    try{await updateDoc(doc(db,'ops',opId),{statut:ret,dateVisaCF:null,dateDiffere:null,motifDiffere:null,dateRejet:null,motifRejet:null,updatedAt:new Date().toISOString()});alert(`${lab} annulé.`);}catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleRetourAC=async()=>{
    if(!modalPaiement)return;if(!motifRetourAC.trim()){alert('Motif obligatoire.');return;}
    const d=readDate('retourAC');if(!d){alert('Date requise.');return;}
    if(resultatAC==='REJETE'&&!checkPwd())return;
    const lab=resultatAC==='DIFFERE'?'Différé AC':'Rejeté AC';
    if(!window.confirm(`Marquer comme "${lab}" ?`))return;
    setSaving(true);
    try{
      let upd={updatedAt:new Date().toISOString()};
      if(resultatAC==='DIFFERE'){upd.statut='DIFFERE_AC';upd.dateDiffere=d;upd.motifDiffere=motifRetourAC.trim();}
      else{upd.statut='REJETE_AC';upd.dateRejet=d;upd.motifRejet=motifRetourAC.trim();}
      await updateDoc(doc(db,'ops',modalPaiement.id),upd);
      alert(`OP → "${lab}".`);setModalPaiement(null);setMotifRetourAC('');
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handlePaiement=async(opId)=>{
    const op=ops.find(o=>o.id===opId);if(!op)return;
    const m=parseFloat(paiementMontant);if(!m||m<=0){alert('Montant invalide.');return;}
    const d=readDate('paiement');if(!d){alert('Date requise.');return;}
    const paiem=op.paiements||[];const deja=paiem.reduce((s,p)=>s+(p.montant||0),0);const reste=(op.montant||0)-deja;
    if(m>reste+1){alert(`Dépasse le reste (${formatMontant(reste)} F).`);return;}
    const nP=[...paiem,{date:d,montant:m,reference:paiementReference.trim(),createdAt:new Date().toISOString()}];
    const tot=nP.reduce((s,p)=>s+(p.montant||0),0);const solde=(op.montant||0)-tot<1;
    if(!window.confirm(`Paiement ${formatMontant(m)} F ?\n${solde?'→ Soldé':'→ Reste '+formatMontant((op.montant||0)-tot)+' F'}`))return;
    setSaving(true);
    try{
      await updateDoc(doc(db,'ops',opId),{paiements:nP,totalPaye:tot,datePaiement:d,updatedAt:new Date().toISOString(),statut:solde?'PAYE':'PAYE_PARTIEL'});
      alert(solde?'OP soldé.':'Paiement partiel enregistré.');setPaiementMontant('');setPaiementReference('');
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleAnnulerPaiement=async(opId)=>{
    const op=ops.find(o=>o.id===opId);const p=op?.paiements||[];if(p.length===0)return;
    if(!checkPwd())return;const der=p[p.length-1];
    if(!window.confirm(`Annuler paiement ${formatMontant(der.montant)} F du ${der.date} ?`))return;
    setSaving(true);
    try{
      const nP=p.slice(0,-1);const tot=nP.reduce((s,x)=>s+(x.montant||0),0);
      const upd={paiements:nP,totalPaye:tot,statut:nP.length>0?'PAYE_PARTIEL':'TRANSMIS_AC',updatedAt:new Date().toISOString()};
      if(nP.length===0)upd.datePaiement=null;
      await updateDoc(doc(db,'ops',opId),upd);alert('Paiement annulé.');
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleArchiverDirect=async(opId,boite)=>{
    if(!boite||!boite.trim()){alert("Renseignez la boîte d'archivage.");return;}
    if(!checkPwd())return;if(!window.confirm(`Archiver dans "${boite}" ?`))return;
    setSaving(true);
    try{await updateDoc(doc(db,'ops',opId),{statut:'ARCHIVE',boiteArchivage:boite.trim(),dateArchivage:new Date().toISOString().split('T')[0],updatedAt:new Date().toISOString()});alert('Archivé.');setModalPaiement(null);setBoiteModalPaiement('');}catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleArchiver=async()=>{
    if(selectedOps.length===0||!boiteArchivage.trim())return;
    if(!window.confirm(`Archiver ${selectedOps.length} OP dans "${boiteArchivage}" ?`))return;
    setSaving(true);
    try{
      for(const opId of selectedOps)await updateDoc(doc(db,'ops',opId),{statut:'ARCHIVE',boiteArchivage:boiteArchivage.trim(),dateArchivage:new Date().toISOString().split('T')[0],updatedAt:new Date().toISOString()});
      alert(`${selectedOps.length} OP archivés.`);setSelectedOps([]);setBoiteArchivage('');setModalArchive(false);
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleDesarchiver=async(opId)=>{
    if(!checkPwd())return;if(!window.confirm('Désarchiver ?'))return;
    setSaving(true);
    try{
      const op=ops.find(o=>o.id===opId);
      const prev=(op?.totalPaye&&op.totalPaye>=(op?.montant||0))?'PAYE':(op?.totalPaye>0?'PAYE_PARTIEL':'TRANSMIS_AC');
      await updateDoc(doc(db,'ops',opId),{statut:prev,boiteArchivage:null,dateArchivage:null,updatedAt:new Date().toISOString()});alert('Désarchivé.');
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  const handleModifierBoite=async(opId)=>{
    if(!checkPwd())return;const nv=window.prompt("Nouvelle boîte d'archivage :");
    if(!nv||!nv.trim())return;
    try{await updateDoc(doc(db,'ops',opId),{boiteArchivage:nv.trim(),updatedAt:new Date().toISOString()});alert('Boîte modifiée.');}catch(e){alert('Erreur : '+e.message);}
  };

  const handleReintroduire=async(opIds,type='CF')=>{
    const d=readDate('reintro');if(!d){alert('Date requise.');return;}
    if(!window.confirm(`Réintroduire ${opIds.length} OP ?`))return;
    setSaving(true);
    try{
      for(const opId of opIds){
        const op=ops.find(o=>o.id===opId);
        const hist=[...(op?.historiqueDifferes||[]),{dateDiffere:op?.dateDiffere,motifDiffere:op?.motifDiffere,dateReintroduction:d,type}];
        const upd={statut:type==='CF'?'EN_COURS':'TRANSMIS_AC',dateReintroduction:d,historiqueDifferes:hist,dateDiffere:null,motifDiffere:null,updatedAt:new Date().toISOString()};
        if(type==='CF'){upd.bordereauCF=null;upd.dateTransmissionCF=null;}
        await updateDoc(doc(db,'ops',opId),upd);
      }
      alert(`${opIds.length} OP réintroduit(s).`);setSelectedOps([]);
    }catch(e){alert('Erreur : '+e.message);}
    setSaving(false);
  };

  // (+) Montant en lettres — préfixe "moins" si négatif
  const montantEnLettres=(n)=>{
    const neg=n<0;n=Math.abs(n);if(n===0)return'zéro';
    const u=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];
    const d=['','dix','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];
    const cb=(num)=>{
      if(num===0)return'';if(num<20)return u[num];
      if(num<100){const dz=Math.floor(num/10);const r=num%10;
        if(dz===7||dz===9)return d[dz]+(r===0?'-dix':(r===1&&dz===7?' et onze':'-'+u[10+r]));
        if(r===0)return d[dz]+(dz===8?'s':'');if(r===1&&dz<8)return d[dz]+' et un';return d[dz]+'-'+u[r];}
      const c=Math.floor(num/100);const r=num%100;
      let s=c===1?'cent':u[c]+' cent';if(r===0&&c>1)s+='s';else if(r>0)s+=' '+cb(r);return s;
    };
    const g=[{v:1e9,l:'milliard',lp:'milliards'},{v:1e6,l:'million',lp:'millions'},{v:1e3,l:'mille',lp:'mille'},{v:1,l:'',lp:''}];
    let res='';let rem=Math.floor(Math.abs(n));
    for(const x of g){const c=Math.floor(rem/x.v);rem=rem%x.v;if(c===0)continue;
      if(x.v===1){res+=(res?' ':'')+cb(c);continue;}
      if(x.v===1000&&c===1){res+=(res?' ':'')+'mille';continue;}
      res+=(res?' ':'')+cb(c)+' '+(c>1?x.lp:x.l);}
    return(neg?'moins ':'')+res.trim();
  };

  // === IMPRESSION ===
  const handlePrintBordereau=(bt)=>{
    const btOps=bt.opsIds.map(id=>ops.find(o=>o.id===id)).filter(Boolean);
    const nbEx=bt.type==='CF'?(projet?.nbExemplairesCF||4):(projet?.nbExemplairesAC||2);
    const rows=btOps.map((op,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${getBen(op)}</td><td>${op.objet||'-'}</td><td style="text-align:center;font-family:monospace;font-size:9px;font-weight:bold">${op.numero}</td><td style="text-align:center">${nbEx}</td><td style="text-align:right;font-family:monospace;font-weight:bold">${Number(op.montant||0).toLocaleString('fr-FR')}</td></tr>`).join('');
    const destM=bt.type==='CF'?'Monsieur le Contrôleur Financier':"Monsieur l'Agent Comptable";
    const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${bt.numero}</title><style>@page{size:A4 landscape;margin:10mm}@media print{.tb{display:none!important}body{background:#fff!important}.pg{box-shadow:none!important;margin:0!important}}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Century Gothic','Trebuchet MS',sans-serif;font-size:11px;background:#e0e0e0}.tb{background:#1B6B2E;padding:12px 20px;display:flex;gap:12px;align-items:center;position:sticky;top:0;z-index:100}.tb button{padding:8px 20px;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;background:#D4722A;color:white}.tb span{color:rgba(255,255,255,.7);margin-left:auto;font-size:12px}.pg{width:297mm;min-height:210mm;margin:20px auto;background:white;padding:12mm 15mm;box-shadow:0 2px 10px rgba(0,0,0,.3)}.hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px}.hd-left{width:15%}.hd-left img{max-width:100px}.hd-center{width:55%;text-align:center;font-size:10px;line-height:1.5}.hd-center .sep{width:180px;border:none;border-top:1px solid #333;margin:3px auto}.hd-right{width:15%;text-align:center}.hd-right img{max-width:75px;margin:0 auto;display:block}.hd-right .dev{font-size:9px;font-style:italic;margin-top:2px}.fin{text-align:center;font-style:italic;font-size:10px;color:#1B6B2E;margin:8px 0 15px}.dw{display:flex;justify-content:flex-end;margin-bottom:20px}.db{text-align:left;font-size:11px;line-height:1.8}.bt-title{text-align:center;font-size:13px;font-weight:bold;text-decoration:underline;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin-bottom:15px}th{border:1px solid #000;padding:8px 6px;font-size:10px;font-weight:bold;text-align:center;background:#f5f5f5}td{border:1px solid #000;padding:8px 6px;font-size:10px}.tot td{font-weight:bold;font-size:11px}.arr{font-size:11px;margin:15px 0}.sw{display:flex;justify-content:flex-end;margin-top:20px;margin-right:40px}.sb{text-align:center;width:250px}.sb .tit{font-weight:bold;font-size:11px}.sb .nom{font-weight:bold;font-size:11px;text-decoration:underline;margin-top:70px}</style></head><body><div class="tb"><button onclick="window.print()">Imprimer</button><span>Aperçu – ${bt.numero}</span></div><div class="pg"><div class="hd"><div class="hd-left"><img src="${LOGO_PIF2}" alt="PIF2"/></div><div class="hd-center"><div style="font-weight:bold;font-size:11px;text-transform:uppercase">REPUBLIQUE DE CÔTE D'IVOIRE</div><hr class="sep"/><div style="font-weight:bold;font-style:italic">${projet?.ministere||''}</div><hr class="sep"/><div style="font-weight:bold;font-size:11px">${projet?.nomProjet||''}</div><hr class="sep"/></div><div class="hd-right"><img src="${ARMOIRIE}" alt="Armoirie"/><div class="dev">Union – Discipline – Travail</div></div></div><div class="fin">Financement Groupe Banque Mondiale : Projet N° TF088829-CI, Crédit IDA N° 7187-CI</div><div class="dw"><div class="db">Abidjan le,<br/>A ${destM}<br/>auprès du ${projet?.sigle||'PIF 2'}<br/><strong>ABIDJAN</strong></div></div><div class="bt-title">BORDEREAU DE TRANSMISSION D'ORDRE DE PAIEMENT DIRECT N° ${bt.numero}</div><table><thead><tr><th style="width:70px">N° D'ORDRE</th><th style="width:150px">BENEFICIAIRES</th><th>OBJET</th><th style="width:160px">N°DE L'OP</th><th style="width:120px">NOMBRE<br/>D'EXEMPLAIRES DE<br/>L'OP</th><th style="width:120px">MONTANT NET<br/>F CFA</th></tr></thead><tbody>${rows}<tr class="tot"><td colspan="5" style="text-align:center;font-weight:bold">MONTANT TOTAL</td><td style="text-align:right;font-family:monospace;font-weight:bold">${Number(bt.totalMontant||0).toLocaleString('fr-FR')}</td></tr></tbody></table><div class="arr">Arrêté le présent bordereau à la somme de: <strong><em>${montantEnLettres(Number(bt.totalMontant||0))} Francs CFA</em></strong></div>${bt.observations?'<div style="font-size:11px;margin-bottom:20px"><strong style="text-decoration:underline">OBSERVATIONS</strong>: '+bt.observations+'</div>':''}<div class="sw"><div class="sb"><div class="tit">${projet?.titreCoordonnateur||'LA COORDONNATRICE DU PIF 2'}</div><div class="nom">${projet?.coordonnateur||''}</div></div></div></div></body></html>`;
    const w=window.open('','_blank','width=1100,height=700');w.document.write(html);w.document.close();
  };

  // ================================================================
  // STYLES
  // ================================================================
  const iS={...styles.input,marginBottom:0,width:'100%'};
  const thS={...styles.th,fontSize:11,fontWeight:700,color:P.textSec,textTransform:'uppercase',letterSpacing:.5,background:'#FAFAF8'};
  const crd={...styles.card,background:P.card,borderRadius:14,border:`1px solid ${P.border}`,boxShadow:'0 2px 8px rgba(0,0,0,.04)'};

  // ================================================================
  // RENDU BORDEREAU
  // ================================================================
  const renderBordereaux=(btList)=>{
    return<div style={crd}>
      <div style={{position:'relative',maxWidth:400,marginBottom:16}}><div style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)'}}>{I.search(P.textMuted,16)}</div>
        <input type="text" placeholder="Rechercher bordereau ou OP..." value={searchBT} onChange={e=>setSearchBT(e.target.value)} style={{...styles.input,marginBottom:0,paddingLeft:40,borderRadius:10,border:`1px solid ${P.border}`,background:'#FAFAF8'}}/>
      </div>
      {filterBordereaux(btList).length===0?<Empty text="Aucun bordereau"/>:
      <div style={{maxHeight:'60vh',overflowY:'auto'}}>
        {filterBordereaux(btList).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).map(bt=>{
          const isExp=expandedBT===bt.id;const isPrep=bt.statut==='EN_COURS';const locked=btHasAdvancedOps(bt);
          const btOps=bt.opsIds.map(id=>ops.find(o=>o.id===id)).filter(Boolean);
          return<div key={bt.id} style={{marginBottom:4}}>
            <div onClick={()=>setExpandedBT(isExp?null:bt.id)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:isExp?P.greenLight:isPrep?'#fffde7':P.card,borderRadius:isExp?'12px 12px 0 0':12,border:isExp?`2px solid ${P.green}`:isPrep?`1px dashed ${P.goldBorder}`:`1px solid ${P.border}`,borderBottom:isExp?'none':undefined,cursor:'pointer',transition:'all .15s'}}>
              <span style={{display:'inline-flex',transform:isExp?'rotate(90deg)':'none',transition:'transform .2s'}}>{I.chevron(P.green,14)}</span>
              <span style={{fontFamily:'monospace',fontWeight:700,fontSize:12,minWidth:200}}>{bt.numero}</span>
              <span style={{fontSize:12,color:P.textSec}}>{bt.dateTransmission||bt.dateCreation}</span>
              <Badge bg={isPrep?P.goldLight:P.greenLight} color={isPrep?P.gold:P.greenDark}>{isPrep?'En cours':'Transmis'}</Badge>
              <span style={{fontSize:12,color:P.textSec}}>{bt.nbOps} OP</span>
              <span style={{fontFamily:'monospace',fontWeight:700,fontSize:12,marginLeft:'auto',color:P.greenDark}}>{formatMontant(bt.totalMontant)} F</span>
              <div style={{display:'flex',gap:4,marginLeft:8}} onClick={e=>e.stopPropagation()}>
                <IBtn icon={I.print(P.greenDark,15)} title="Imprimer" bg={`${P.greenDark}15`} onClick={()=>handlePrintBordereau(bt)}/>
                {locked?<IBtn icon={I.lock(P.red,15)} title="Verrouillé" bg={`${P.red}12`} onClick={()=>setModalProtection(bt)}/>:<IBtn icon={I.edit(P.gold,15)} title="Modifier" bg={`${P.gold}15`} onClick={()=>handleOpenEditBT(bt)}/>}
                {bt.statut==='ENVOYE'&&<IBtn icon={I.undo(P.gold,15)} title="Annuler transmission" bg={`${P.gold}15`} onClick={()=>handleAnnulerTransmission(bt)} disabled={saving}/>}
                <IBtn icon={I.trash(P.red,15)} title="Supprimer" bg={`${P.red}12`} onClick={()=>handleDeleteBordereau(bt)}/>
              </div>
            </div>
            {isExp&&<div style={{border:`2px solid ${P.green}`,borderTop:'none',borderRadius:'0 0 12px 12px',padding:16,background:P.card}}>
              {locked&&<div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:`${P.gold}12`,borderRadius:10,marginBottom:14,border:`1px solid ${P.goldBorder}`}}>{I.lock(P.gold,18)}<div><div style={{fontWeight:700,fontSize:13,color:P.gold}}>Bordereau verrouillé</div><div style={{fontSize:12,color:P.textSec,marginTop:2}}>Des OP ont avancé. Annulez d'abord chaque étape dans l'ordre inverse.</div></div></div>}
              {isPrep&&<div style={{background:P.goldLight,borderRadius:10,padding:14,marginBottom:14,display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                <span style={{fontSize:13,fontWeight:600,color:P.gold}}>Date :</span>
                <input type="date" defaultValue={bt.dateTransmission||''} ref={el=>setDateRef('trans_'+bt.id,el)} style={{...styles.input,marginBottom:0,width:170,borderRadius:8,border:`1px solid ${P.border}`}}/>
                <ActionBtn label="Transmettre" icon={I.check('#fff',14)} color={P.greenDark} onClick={()=>handleTransmettre(bt)} disabled={saving}/>
              </div>}
              <table style={{...styles.table,fontSize:11}}><thead><tr><th style={{...thS,width:30}}>N°</th><th style={{...thS,width:120}}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={thS}>OBJET</th><th style={{...thS,width:100,textAlign:'right'}}>MONTANT</th></tr></thead><tbody>
                {btOps.map((op,i)=><tr key={op.id}><td style={styles.td}>{i+1}</td><td style={{...styles.td,fontFamily:'monospace',fontWeight:600,fontSize:10}}>{op.numero}</td><td style={{...styles.td,fontSize:11}}>{getBen(op)}</td><td style={{...styles.td,fontSize:11,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{op.objet||'-'}</td><td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td></tr>)}
              </tbody></table>
            </div>}
          </div>;
        })}
      </div>}
    </div>;
  };

  // ================================================================
  // RENDU SUIVI
  // ================================================================
  const renderSuivi=(differes,rejetes,type='CF',subTab,setSubTab)=><div>
    <div style={{display:'flex',gap:8,marginBottom:16}}>
      <STab active={subTab==='DIFFERES'} label="Différés" count={differes.length} color={P.gold} onClick={()=>{setSubTab('DIFFERES');setSelectedOps([]);}}/>
      <STab active={subTab==='REJETES'} label="Rejetés" count={rejetes.length} color={P.red} onClick={()=>{setSubTab('REJETES');setSelectedOps([]);}}/>
    </div>
    <div style={{marginBottom:12}}><input type="text" placeholder="Rechercher..." value={searchSuivi} onChange={e=>setSearchSuivi(e.target.value)} style={{...styles.input,maxWidth:400,marginBottom:0,borderRadius:10,border:`1px solid ${P.border}`}}/></div>
    {subTab==='DIFFERES'&&<div style={crd}>
      {filterOps(differes,searchSuivi).length===0?<Empty text="Aucun différé"/>:<>
      <div style={{maxHeight:350,overflowY:'auto'}}><table style={styles.table}><thead><tr>
        <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(differes,searchSuivi).length&&selectedOps.length>0} onChange={()=>toggleAll(filterOps(differes,searchSuivi))}/></th>
        <th style={{...thS,width:130}}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={{...thS,width:100,textAlign:'right'}}>MONTANT</th><th style={{...thS,width:90}}>DATE</th><th style={thS}>MOTIF</th><th style={{...thS,width:36}}></th>
      </tr></thead><tbody>{filterOps(differes,searchSuivi).map(op=>{const ch=selectedOps.includes(op.id);
        return<tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?P.goldLight:'transparent'}}>
          <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
          <td style={{...styles.td,fontFamily:'monospace',fontWeight:600,fontSize:10}}>{op.numero}</td>
          <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
          <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
          <td style={{...styles.td,fontSize:12}}>{op.dateDiffere||'-'}</td>
          <td style={{...styles.td,fontSize:11}}>{op.motifDiffere||'-'}</td>
          <td style={styles.td} onClick={e=>e.stopPropagation()}><IBtn icon={I.undo(P.gold,14)} title="Annuler" bg={`${P.gold}15`} onClick={()=>handleAnnulerRetour(op.id,type==='CF'?'DIFFERE_CF':'DIFFERE_AC')}/></td>
        </tr>;})}</tbody></table></div>
      {selectedOps.length>0&&selectedOps.some(id=>differes.find(o=>o.id===id))&&<div style={{marginTop:12,padding:12,background:P.goldLight,borderRadius:10,display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div><label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:4}}>Date</label><input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el=>setDateRef('reintro',el)} style={{...styles.input,marginBottom:0,width:170,borderRadius:8,border:`1px solid ${P.border}`}}/></div>
        <ActionBtn label={`Réintroduire (${selectedOps.length})`} color={P.goldBorder} onClick={()=>handleReintroduire(selectedOps,type)} disabled={saving}/>
      </div>}</>}
    </div>}
    {subTab==='REJETES'&&<div style={crd}>
      {filterOps(rejetes,searchSuivi).length===0?<Empty text="Aucun rejeté"/>:
      <div style={{maxHeight:350,overflowY:'auto'}}><table style={styles.table}><thead><tr>
        <th style={{...thS,width:130}}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={{...thS,width:100,textAlign:'right'}}>MONTANT</th><th style={{...thS,width:90}}>DATE</th><th style={thS}>MOTIF</th><th style={{...thS,width:36}}></th>
      </tr></thead><tbody>{filterOps(rejetes,searchSuivi).map(op=><tr key={op.id} style={{background:P.redLight}}>
        <td style={{...styles.td,fontFamily:'monospace',fontWeight:600,fontSize:10}}>{op.numero}</td>
        <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
        <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600,color:P.red}}>{formatMontant(op.montant)}</td>
        <td style={{...styles.td,fontSize:12}}>{op.dateRejet||'-'}</td>
        <td style={{...styles.td,fontSize:11}}>{op.motifRejet||'-'}</td>
        <td style={styles.td}><IBtn icon={I.undo(P.red,14)} title="Annuler" bg={P.redLight} onClick={()=>handleAnnulerRetour(op.id,type==='CF'?'REJETE_CF':'REJETE_AC')}/></td>
      </tr>)}</tbody></table></div>}
    </div>}
  </div>;

  // ================================================================
  // RENDU PRINCIPAL
  // ================================================================
  return<div>
    <h1 style={{fontSize:22,fontWeight:700,color:P.greenDark,margin:'0 0 8px'}}>Circuit de validation</h1>
    <div style={{display:'flex',gap:8,padding:'16px 0',flexWrap:'wrap'}}>
      {sources.map(src=><button key={src.id} onClick={()=>{setActiveSourceBT(src.id);setSelectedOps([]);setExpandedBT(null);closeAllModals();}} style={{padding:'8px 20px',borderRadius:10,border:activeSourceBT===src.id?`2px solid ${P.green}`:'2px solid transparent',background:activeSourceBT===src.id?P.card:'#EDEAE5',color:activeSourceBT===src.id?P.greenDark:P.textSec,fontWeight:700,cursor:'pointer',fontSize:13,boxShadow:activeSourceBT===src.id?`0 2px 8px ${P.green}22`:'none'}}>{src.sigle}</button>)}
    </div>
    <div style={{display:'flex',gap:4,marginBottom:20}}>
      {[{k:'CF',l:'Contrôle Financier',c:P.greenDark},{k:'AC',l:'Agent Comptable',c:P.orange},{k:'ARCHIVES',l:'Archives',c:P.olive}].map(t=><button key={t.k} onClick={()=>chgTab(t.k)} style={{flex:1,padding:'14px 12px',border:'none',cursor:'pointer',fontSize:14,fontWeight:700,background:mainTab===t.k?t.c:'#EDEAE5',color:mainTab===t.k?'white':P.textSec,borderRadius:10,boxShadow:mainTab===t.k?`0 4px 12px ${t.c}33`:'none',transition:'all .2s'}}>{t.l}</button>)}
    </div>

    {/* ===== CF ===== */}
    {mainTab==='CF'&&<div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <STab active={subTabCF==='NOUVEAU'} label="Nouveau BT" count={opsEligiblesCF.length} color={P.greenDark} onClick={()=>chgSub(setSubTabCF,'NOUVEAU')}/>
        <STab active={subTabCF==='BORDEREAUX'} label="Bordereaux" count={bordereauCF.length} color={P.green} onClick={()=>chgSub(setSubTabCF,'BORDEREAUX')}/>
        <STab active={subTabCF==='RETOUR'} label="Retour CF" count={opsTransmisCF.length} color={P.gold} onClick={()=>chgSub(setSubTabCF,'RETOUR')}/>
        <STab active={subTabCF==='SUIVI'} label="Suivi" count={opsDifferesCF.length+opsRejetesCF.length} color={P.red} onClick={()=>chgSub(setSubTabCF,'SUIVI')}/>
      </div>
      {subTabCF==='NOUVEAU'&&<div style={crd}>
        <h3 style={{margin:'0 0 16px',color:P.greenDark,fontSize:15}}>Sélectionner les OP pour un bordereau au CF</h3>
        <input type="text" placeholder="Rechercher OP..." value={searchBT} onChange={e=>setSearchBT(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsEligiblesCF,searchBT).length===0?<Empty text="Aucun OP éligible"/>:
        <div style={{maxHeight:450,overflowY:'auto',border:`1px solid ${P.border}`,borderRadius:10}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(opsEligiblesCF,searchBT).length&&filterOps(opsEligiblesCF,searchBT).length>0} onChange={()=>toggleAll(filterOps(opsEligiblesCF,searchBT))}/></th>
          <th style={{...thS,width:130}}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={thS}>OBJET</th><th style={{...thS,width:70}}>LIGNE</th><th style={{...thS,width:110,textAlign:'right'}}>MONTANT</th><th style={{...thS,width:80}}>STATUT</th>
        </tr></thead><tbody>
          {filterOps(opsEligiblesCF,searchBT).map(op=>{const ch=selectedOps.includes(op.id);
            return<tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?P.greenLight:'transparent'}}>
              <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{op.numero}</td>
              <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
              <td style={{...styles.td,fontSize:11,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{op.objet||'-'}</td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:11}}>{op.ligneBudgetaire||'-'}</td>
              <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
              <td style={styles.td}><Badge bg={op.statut==='DIFFERE_CF'?P.goldLight:P.greenLight} color={op.statut==='DIFFERE_CF'?P.gold:P.greenDark}>{op.statut==='DIFFERE_CF'?'Différé':'En cours'}</Badge></td>
            </tr>;})}
        </tbody></table></div>}
        {selectedOps.length>0&&<div style={{marginTop:16,padding:16,background:P.greenLight,borderRadius:10}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:P.greenDark}}>{selectedOps.length} OP — {formatMontant(totalSelected)} F</div>
          <ActionBtn label="Créer le bordereau" icon={I.plus('#fff',14)} color={P.greenDark} onClick={()=>handleCreateBordereau('CF')} disabled={saving}/>
        </div>}
      </div>}
      {subTabCF==='BORDEREAUX'&&renderBordereaux(bordereauCF)}
      {subTabCF==='RETOUR'&&<div style={crd}>
        <h3 style={{margin:'0 0 6px',color:P.gold,fontSize:15}}>OP transmis au CF ({opsTransmisCF.length})</h3>
        <p style={{fontSize:12,color:P.textMuted,marginBottom:16}}>Sélectionnez puis cliquez Retour CF.</p>
        <input type="text" placeholder="Rechercher..." value={searchBT} onChange={e=>setSearchBT(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsTransmisCF,searchBT).length===0?<Empty text="Aucun OP"/>:
        <div style={{maxHeight:400,overflowY:'auto',border:`1px solid ${P.border}`,borderRadius:10}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(opsTransmisCF,searchBT).length&&filterOps(opsTransmisCF,searchBT).length>0} onChange={()=>toggleAll(filterOps(opsTransmisCF,searchBT))}/></th>
          <th style={{...thS,width:130}}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={{...thS,width:110,textAlign:'right'}}>MONTANT</th><th style={{...thS,width:100}}>N° BT</th><th style={{...thS,width:90}}>TRANSMIS</th>
        </tr></thead><tbody>
          {filterOps(opsTransmisCF,searchBT).map(op=>{const ch=selectedOps.includes(op.id);
            return<tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?`${P.gold}10`:'transparent'}}>
              <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{op.numero}</td>
              <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
              <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:9}}>{op.bordereauCF||'-'}</td>
              <td style={{...styles.td,fontSize:12}}>{op.dateTransmissionCF||'-'}</td>
            </tr>;})}
        </tbody></table></div>}
        {selectedOps.length>0&&<div style={{marginTop:14,textAlign:'right'}}><ActionBtn label="Retour CF" count={selectedOps.length} color={P.gold} onClick={()=>{setModalRetourCF(true);setResultatCF('VISE');setMotifRetour('');}}/></div>}
      </div>}
      {subTabCF==='SUIVI'&&renderSuivi(opsDifferesCF,opsRejetesCF,'CF',subTabSuiviCF,setSubTabSuiviCF)}
    </div>}

    {/* ===== AC ===== */}
    {mainTab==='AC'&&<div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <STab active={subTabAC==='NOUVEAU'} label="Nouveau BT" count={opsEligiblesAC.length} color={P.orange} onClick={()=>chgSub(setSubTabAC,'NOUVEAU')}/>
        <STab active={subTabAC==='BORDEREAUX'} label="Bordereaux" count={bordereauAC.length} color={P.orange} onClick={()=>chgSub(setSubTabAC,'BORDEREAUX')}/>
        <STab active={subTabAC==='PAIEMENT'} label="Paiements" count={opsTransmisAC.length} color={P.gold} onClick={()=>chgSub(setSubTabAC,'PAIEMENT')}/>
        <STab active={subTabAC==='SUIVI'} label="Suivi" count={opsDifferesAC.length+opsRejetesAC.length} color={P.red} onClick={()=>chgSub(setSubTabAC,'SUIVI')}/>
      </div>
      {subTabAC==='NOUVEAU'&&<div style={crd}>
        <h3 style={{margin:'0 0 16px',color:P.orange,fontSize:15}}>OP visés pour un bordereau à l'AC</h3>
        <input type="text" placeholder="Rechercher..." value={searchBT} onChange={e=>setSearchBT(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsEligiblesAC,searchBT).length===0?<Empty text="Aucun OP visé"/>:
        <div style={{maxHeight:450,overflowY:'auto',border:`1px solid ${P.border}`,borderRadius:10}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(opsEligiblesAC,searchBT).length&&filterOps(opsEligiblesAC,searchBT).length>0} onChange={()=>toggleAll(filterOps(opsEligiblesAC,searchBT))}/></th>
          <th style={{...thS,width:130}}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={thS}>OBJET</th><th style={{...thS,width:110,textAlign:'right'}}>MONTANT</th><th style={{...thS,width:90}}>VISA CF</th><th style={{...thS,width:36}}></th>
        </tr></thead><tbody>
          {filterOps(opsEligiblesAC,searchBT).map(op=>{const ch=selectedOps.includes(op.id);
            return<tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?P.greenLight:'transparent'}}>
              <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{op.numero}</td>
              <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
              <td style={{...styles.td,fontSize:11,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{op.objet||'-'}</td>
              <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
              <td style={{...styles.td,fontSize:12}}>{op.dateVisaCF||'-'}</td>
              <td style={styles.td} onClick={e=>e.stopPropagation()}><IBtn icon={I.undo(P.gold,14)} title="Annuler visa" bg={`${P.gold}15`} onClick={()=>handleAnnulerRetour(op.id,'VISE_CF')}/></td>
            </tr>;})}
        </tbody></table></div>}
        {selectedOps.length>0&&<div style={{marginTop:16,padding:16,background:P.greenLight,borderRadius:10}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:12,color:P.greenDark}}>{selectedOps.length} OP — {formatMontant(totalSelected)} F</div>
          <ActionBtn label="Créer le bordereau" icon={I.plus('#fff',14)} color={P.orange} onClick={()=>handleCreateBordereau('AC')} disabled={saving}/>
        </div>}
      </div>}
      {subTabAC==='BORDEREAUX'&&renderBordereaux(bordereauAC)}
      {subTabAC==='PAIEMENT'&&<div style={crd}>
        <h3 style={{margin:'0 0 6px',color:P.gold,fontSize:15}}>Paiements ({opsTransmisAC.length})</h3>
        <p style={{fontSize:12,color:P.textMuted,marginBottom:16}}>Cliquez sur un OP pour gérer.</p>
        <input type="text" placeholder="Rechercher..." value={searchBT} onChange={e=>setSearchBT(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsTransmisAC,searchBT).length===0?<Empty text="Aucun OP"/>:
        <div style={{maxHeight:'55vh',overflowY:'auto'}}>{filterOps(opsTransmisAC,searchBT).map(op=>{
          const paiem=op.paiements||[];const tot=paiem.reduce((s,p)=>s+(p.montant||0),0);const reste=(op.montant||0)-tot;
          return<div key={op.id} onClick={()=>{setModalPaiement(op);setPaiementMontant('');setPaiementReference('');setMotifRetourAC('');setBoiteModalPaiement('');setResultatAC('DIFFERE');}}
            style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',border:`1px solid ${P.border}`,borderRadius:12,marginBottom:4,cursor:'pointer',background:modalPaiement?.id===op.id?P.goldLight:P.card,transition:'all .15s'}}>
            <span style={{fontFamily:'monospace',fontWeight:700,fontSize:11}}>{op.numero}</span>
            <span style={{fontSize:12,flex:1}}>{getBen(op)}</span>
            {tot>0&&<Badge bg={P.goldLight} color={P.gold}>{Math.round(tot/(op.montant||1)*100)}%</Badge>}
            <span style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:P.greenDark}}>{formatMontant(op.montant)} F</span>
            {tot>0&&<span style={{fontSize:11,color:reste>0?P.red:P.green,fontWeight:600}}>Reste {formatMontant(reste)}</span>}
            <span style={{display:'inline-flex'}}>{I.chevron(P.gold,14)}</span>
          </div>;})}</div>}
      </div>}
      {subTabAC==='SUIVI'&&renderSuivi(opsDifferesAC,opsRejetesAC,'AC',subTabSuiviAC,setSubTabSuiviAC)}
    </div>}

    {/* ===== ARCHIVES ===== */}
    {mainTab==='ARCHIVES'&&<div>
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        <STab active={subTabArch==='A_ARCHIVER'} label="À archiver" count={opsAArchiver.length} color={P.olive} onClick={()=>chgSub(setSubTabArch,'A_ARCHIVER')}/>
        <STab active={subTabArch==='ARCHIVES'} label="Archivés" count={opsArchives.length} color={P.oliveDark} onClick={()=>chgSub(setSubTabArch,'ARCHIVES')}/>
      </div>
      {subTabArch==='A_ARCHIVER'&&<div style={crd}>
        <h3 style={{margin:'0 0 6px',color:P.olive,fontSize:15}}>OP prêts à archiver</h3>
        <p style={{fontSize:12,color:P.textMuted,marginBottom:12}}>Les OP soldés et annulés apparaissent ici.</p>
        <input type="text" placeholder="Rechercher..." value={searchArch} onChange={e=>setSearchArch(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsAArchiver,searchArch).length===0?<Empty text="Aucun OP à archiver"/>:
        <div style={{maxHeight:400,overflowY:'auto',border:`1px solid ${P.border}`,borderRadius:10}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(opsAArchiver,searchArch).length&&filterOps(opsAArchiver,searchArch).length>0} onChange={()=>toggleAll(filterOps(opsAArchiver,searchArch))}/></th>
          <th style={{...thS,width:130}}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={{...thS,width:110,textAlign:'right'}}>MONTANT</th><th style={{...thS,width:80}}>STATUT</th><th style={{...thS,width:100}}>DATE</th>
        </tr></thead><tbody>
          {filterOps(opsAArchiver,searchArch).map(op=>{const ch=selectedOps.includes(op.id);
            return<tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?P.greenLight:'transparent'}}>
              <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{op.numero}</td>
              <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
              <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
              <td style={styles.td}>{op.statut==='ANNULE'?<Badge bg={P.redLight} color={P.red}>Annulé</Badge>:<Badge bg={P.greenLight} color={P.greenDark}>Payé</Badge>}</td>
              <td style={{...styles.td,fontSize:12}}>{op.datePaiement||op.dateVisaCF||'-'}</td>
            </tr>;})}
        </tbody></table></div>}
        {selectedOps.length>0&&<div style={{marginTop:14,textAlign:'right'}}><ActionBtn label="Archiver" icon={I.archive('#fff',14)} count={selectedOps.length} color={P.olive} onClick={()=>{setModalArchive(true);setBoiteArchivage('');}}/></div>}
      </div>}
      {subTabArch==='ARCHIVES'&&<div style={crd}>
        <h3 style={{margin:'0 0 16px',color:P.oliveDark,fontSize:15}}>OP Archivés ({opsArchives.length})</h3>
        <input type="text" placeholder="Rechercher..." value={searchArch} onChange={e=>setSearchArch(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsArchives,searchArch).length===0?<Empty text="Aucun OP archivé"/>:
        <div style={{maxHeight:500,overflowY:'auto'}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:130}}>N° OP</th><th style={thS}>BÉNÉFICIAIRE</th><th style={{...thS,width:110,textAlign:'right'}}>MONTANT</th><th style={{...thS,width:120}}>BOÎTE</th><th style={{...thS,width:90}}>DATE</th><th style={{...thS,width:70}}></th>
        </tr></thead><tbody>
          {filterOps(opsArchives,searchArch).map(op=><tr key={op.id}>
            <td style={{...styles.td,fontFamily:'monospace',fontWeight:600,fontSize:10}}>{op.numero}</td>
            <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
            <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
            <td style={{...styles.td,fontWeight:700,color:P.olive}}>{op.boiteArchivage||'-'}</td>
            <td style={{...styles.td,fontSize:12}}>{op.dateArchivage||'-'}</td>
            <td style={{...styles.td,display:'flex',gap:4}}>
              <IBtn icon={I.edit(P.olive,14)} title="Modifier boîte" bg={P.greenLight} onClick={()=>handleModifierBoite(op.id)}/>
              <IBtn icon={I.undo(P.gold,14)} title="Désarchiver" bg={`${P.gold}15`} onClick={()=>handleDesarchiver(op.id)}/>
            </td>
          </tr>)}</tbody></table></div>}
      </div>}
    </div>}

    {/* MODALE RETOUR CF */}
    {modalRetourCF&&selectedOps.length>0&&<Modal title={`Retour CF — ${selectedOps.length} OP`} titleColor={P.gold} onClose={()=>setModalRetourCF(false)}>
      <div style={{marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${P.border}`}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>OP sélectionnés</div>
        {selectedOps.map(opId=>{const op=ops.find(o=>o.id===opId);if(!op)return null;
          return<div key={opId} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:`${P.gold}10`,borderRadius:8,marginBottom:3,fontSize:12}}><span><strong style={{fontFamily:'monospace'}}>{op.numero}</strong> — {getBen(op)}</span><span style={{fontFamily:'monospace',fontWeight:700}}>{formatMontant(op.montant)} F</span></div>;})}
        <div style={{fontSize:15,fontWeight:800,color:P.gold,marginTop:10,textAlign:'right'}}>Total : {formatMontant(totalSelected)} F</div>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Décision</div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          {[{v:'VISE',l:'Visé',c:P.green,bg:P.greenLight},{v:'DIFFERE',l:'Différé',c:P.gold,bg:P.goldLight},{v:'REJETE',l:'Rejeté',c:P.red,bg:P.redLight}].map(o=><button key={o.v} onClick={()=>setResultatCF(o.v)} style={{flex:1,padding:'12px 8px',borderRadius:10,fontWeight:700,fontSize:13,cursor:'pointer',border:resultatCF===o.v?`3px solid ${o.c}`:`2px solid ${P.border}`,background:resultatCF===o.v?o.bg:P.card,color:resultatCF===o.v?o.c:P.textMuted,transition:'all .15s'}}>{o.l}</button>)}
        </div>
      </div>
      <div style={{marginBottom:14}}><label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:6}}>Date</label><input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el=>setDateRef('retourCF',el)} style={iS}/></div>
      {(resultatCF==='DIFFERE'||resultatCF==='REJETE')&&<div style={{marginBottom:14}}><label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:6,color:P.red}}>Motif (obligatoire) *</label><textarea value={motifRetour} onChange={e=>setMotifRetour(e.target.value)} placeholder="Motif..." style={{...styles.input,minHeight:80,resize:'vertical',marginBottom:0}}/></div>}
      {resultatCF==='REJETE'&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:P.redLight,borderRadius:8,marginBottom:14}}>{I.warn(P.red,16)}<span style={{fontSize:12,color:P.red,fontWeight:600}}>Confirmé par mot de passe.</span></div>}
      <button onClick={handleRetourCF} disabled={saving} style={{width:'100%',padding:14,border:'none',borderRadius:10,background:resultatCF==='VISE'?P.green:resultatCF==='DIFFERE'?P.gold:P.red,color:'white',fontWeight:700,fontSize:14,cursor:'pointer'}}>{saving?'...':`Valider (${selectedOps.length} OP)`}</button>
    </Modal>}

    {/* MODALE ARCHIVAGE */}
    {modalArchive&&selectedOps.length>0&&<Modal title={`Archivage — ${selectedOps.length} OP`} titleColor={P.olive} onClose={()=>setModalArchive(false)}>
      <div style={{marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${P.border}`}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>OP sélectionnés</div>
        {selectedOps.map(opId=>{const op=ops.find(o=>o.id===opId);if(!op)return null;
          return<div key={opId} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:P.greenLight,borderRadius:8,marginBottom:3,fontSize:12}}>
            <span><strong style={{fontFamily:'monospace'}}>{op.numero}</strong> — {getBen(op)}</span>
            <div style={{display:'flex',alignItems:'center',gap:8}}>{op.statut==='ANNULE'?<Badge bg={P.redLight} color={P.red}>Annulé</Badge>:<Badge bg={P.greenLight} color={P.greenDark}>Payé</Badge>}<span style={{fontFamily:'monospace',fontWeight:700}}>{formatMontant(op.montant)} F</span></div>
          </div>;})}
        <div style={{fontSize:15,fontWeight:800,color:P.olive,marginTop:10,textAlign:'right'}}>Total : {formatMontant(totalSelected)} F</div>
      </div>
      <div style={{marginBottom:16}}><label style={{display:'block',fontSize:12,fontWeight:600,marginBottom:6}}>Boîte d'archivage</label><input type="text" value={boiteArchivage} onChange={e=>setBoiteArchivage(e.target.value)} placeholder="Ex: BOX-2025-001" style={iS}/></div>
      <button onClick={handleArchiver} disabled={saving||!boiteArchivage.trim()} style={{width:'100%',padding:14,border:'none',borderRadius:10,background:P.olive,color:'white',fontWeight:700,fontSize:14,cursor:'pointer',opacity:!boiteArchivage.trim()?.5:1}}>{saving?'...':`Archiver (${selectedOps.length} OP)`}</button>
    </Modal>}

    {/* MODALE PAIEMENT AC */}
    {modalPaiement&&<Modal title="Gestion OP" titleColor={P.greenDark} onClose={()=>setModalPaiement(null)} width={560}>
      {(()=>{
        const op=ops.find(o=>o.id===modalPaiement.id)||modalPaiement;
        const paiem=op.paiements||[];const tot=paiem.reduce((s,p)=>s+(p.montant||0),0);const reste=(op.montant||0)-tot;const pct=Math.round(tot/Math.max(op.montant||1,1)*100);const isSolde=reste<1;
        return<>
          <div style={{marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${P.border}`}}>
            <div style={{fontFamily:'monospace',fontSize:12,fontWeight:700,color:P.greenDark}}>{op.numero}</div>
            <div style={{fontSize:15,fontWeight:600,marginTop:2}}>{getBen(op)}</div>
            <div style={{fontSize:12,color:P.textSec,marginTop:2}}>{op.objet||'-'}</div>
            <div style={{fontSize:22,fontWeight:800,color:P.gold,marginTop:10}}>{formatMontant(op.montant)} <span style={{fontSize:12,color:P.textSec,fontWeight:500}}>FCFA</span></div>
            <div style={{marginTop:10,background:P.border,borderRadius:6,height:8,overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',background:pct>=100?P.green:P.gold,borderRadius:6}}/></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginTop:6}}><span style={{color:P.gold,fontWeight:600}}>Payé : {formatMontant(tot)} ({pct}%)</span><span style={{color:reste>0?P.red:P.green,fontWeight:600}}>Reste : {formatMontant(reste)}</span></div>
          </div>
          {paiem.length>0&&<div style={{marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Historique</div>
            {paiem.map((p,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 12px',background:i%2===0?P.goldLight:P.card,borderRadius:8,marginBottom:2}}><div><span style={{fontSize:12}}>{p.date}</span><span style={{fontSize:11,color:P.textMuted,marginLeft:8}}>{p.reference||'Sans réf.'}</span></div><span style={{fontFamily:'monospace',fontWeight:700,fontSize:12,color:P.gold}}>{formatMontant(p.montant)} F</span></div>)}
            <button onClick={()=>handleAnnulerPaiement(op.id)} disabled={saving} style={{marginTop:8,padding:'6px 14px',background:P.redLight,color:P.red,border:'none',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:600,display:'inline-flex',alignItems:'center',gap:6}}>{I.undo(P.red,13)} Annuler dernier paiement</button>
          </div>}
          {!isSolde&&(op.statut==='TRANSMIS_AC'||op.statut==='PAYE_PARTIEL')&&<div style={{background:P.goldLight,borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:P.gold,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Nouveau paiement</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>
              <div style={{flex:1,minWidth:120}}><label style={{fontSize:10,fontWeight:600,display:'block',marginBottom:4,color:P.textSec}}>Date</label><input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el=>setDateRef('paiement',el)} style={iS}/></div>
              <div style={{flex:1,minWidth:100}}><label style={{fontSize:10,fontWeight:600,display:'block',marginBottom:4,color:P.textSec}}>Montant</label><input type="number" value={paiementMontant} onChange={e=>setPaiementMontant(e.target.value)} placeholder={String(reste)} style={iS}/></div>
              <div style={{flex:1,minWidth:100}}><label style={{fontSize:10,fontWeight:600,display:'block',marginBottom:4,color:P.textSec}}>Référence</label><input type="text" value={paiementReference} onChange={e=>setPaiementReference(e.target.value)} placeholder="VIR-..." style={iS}/></div>
            </div>
            <ActionBtn label="Payer" color={P.gold} onClick={()=>handlePaiement(op.id)} disabled={saving}/>
          </div>}
          {isSolde&&<div style={{background:P.greenLight,borderRadius:10,padding:12,textAlign:'center',color:P.greenDark,fontWeight:700,fontSize:13,marginBottom:16}}>OP entièrement soldé</div>}
          {op.statut==='TRANSMIS_AC'&&<div style={{borderTop:`1px solid ${P.border}`,paddingTop:16}}>
            <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Autre décision</div>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              {[{v:'DIFFERE',l:'Différer',c:P.gold,bg:P.goldLight},{v:'REJETE',l:'Rejeter',c:P.red,bg:P.redLight}].map(o=><button key={o.v} onClick={()=>setResultatAC(o.v)} style={{flex:1,padding:10,borderRadius:10,fontWeight:700,fontSize:12,cursor:'pointer',border:resultatAC===o.v?`3px solid ${o.c}`:`2px solid ${P.border}`,background:resultatAC===o.v?o.bg:P.card,color:resultatAC===o.v?o.c:P.textMuted}}>{o.l}</button>)}
            </div>
            <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:600,marginBottom:4,display:'block'}}>Date</label><input type="date" defaultValue={new Date().toISOString().split('T')[0]} ref={el=>setDateRef('retourAC',el)} style={iS}/></div>
            <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:600,marginBottom:4,display:'block',color:P.red}}>Motif (obligatoire) *</label><textarea value={motifRetourAC} onChange={e=>setMotifRetourAC(e.target.value)} placeholder="Motif..." style={{...styles.input,minHeight:60,resize:'vertical',marginBottom:0}}/></div>
            {resultatAC==='REJETE'&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:P.redLight,borderRadius:8,marginBottom:10}}>{I.warn(P.red,16)}<span style={{fontSize:12,color:P.red,fontWeight:600}}>Confirmé par mot de passe.</span></div>}
            <ActionBtn label="Valider" color={resultatAC==='DIFFERE'?P.goldBorder:P.red} onClick={handleRetourAC} disabled={saving}/>
          </div>}
          {op.statut==='TRANSMIS_AC'&&paiem.length===0&&<div style={{borderTop:`1px solid ${P.border}`,paddingTop:14,marginTop:14}}>
            <button onClick={async()=>{if(!checkPwd())return;if(!window.confirm("Annuler la transmission AC ?"))return;setSaving(true);try{await updateDoc(doc(db,'ops',op.id),{statut:'VISE_CF',dateTransmissionAC:null,bordereauAC:null,updatedAt:new Date().toISOString()});alert('Annulée.');setModalPaiement(null);}catch(e){alert('Erreur : '+e.message);}setSaving(false);}} disabled={saving} style={{width:'100%',padding:10,border:`1px solid ${P.goldBorder}`,borderRadius:10,background:P.goldLight,color:P.gold,fontWeight:600,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{I.undo(P.gold,14)} Annuler la transmission AC</button>
          </div>}
          {op.statut!=='ARCHIVE'&&<div style={{borderTop:`1px solid ${P.border}`,paddingTop:16,marginTop:16}}>
            <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Archiver</div>
            {!isSolde&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:P.goldLight,borderRadius:8,color:P.gold,fontSize:12,marginBottom:12}}>{I.warn(P.gold,16)} OP non soldé (reste {formatMontant(reste)} F) — mot de passe requis.</div>}
            <div style={{marginBottom:10}}><label style={{fontSize:12,fontWeight:600,display:'block',marginBottom:4}}>Boîte d'archivage</label><input type="text" value={boiteModalPaiement} onChange={e=>setBoiteModalPaiement(e.target.value)} placeholder="Ex: BOX-2025-001" style={iS}/></div>
            <ActionBtn label="Archiver (mot de passe)" icon={I.archive('#fff',14)} color={P.olive} onClick={()=>handleArchiverDirect(op.id,boiteModalPaiement)} disabled={saving||!boiteModalPaiement.trim()}/>
          </div>}
        </>;
      })()}
    </Modal>}

    {/* MODALE GESTION BORDEREAU */}
    {modalEditBT&&<Modal title={`Modifier — ${modalEditBT.numero}`} titleColor={P.gold} onClose={()=>setModalEditBT(null)} width={580}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Numéro du bordereau</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}><input type="text" value={editBtNumero} onChange={e=>setEditBtNumero(e.target.value)} style={{flex:1,...iS,fontFamily:'monospace',fontWeight:700,borderRadius:8}}/><ActionBtn label="Sauver" color={P.gold} onClick={()=>handleSaveBtNumero(modalEditBT)} disabled={saving}/></div>
        <p style={{fontSize:11,color:P.textMuted,marginTop:6}}>Mot de passe requis.</p>
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>OP du bordereau ({modalEditBT.opsIds?.length||0})</div>
        {(modalEditBT.opsIds||[]).map(id=>{const op=ops.find(o=>o.id===id);if(!op)return null;
          return<div key={id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'#FAFAF8',borderRadius:10,marginBottom:4,border:`1px solid ${P.border}`}}>
            <div><div style={{fontFamily:'monospace',fontWeight:700,fontSize:11}}>{op.numero}</div><div style={{fontSize:12,color:P.textSec}}>{getBen(op)} — {op.objet||'-'}</div></div>
            <div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontFamily:'monospace',fontWeight:700,fontSize:12}}>{formatMontant(op.montant)} F</span><IBtn icon={I.minusCircle(P.red,16)} title="Retirer" bg={P.redLight} onClick={()=>handleRemoveOpFromBT(modalEditBT,op.id)}/></div>
          </div>;})}
      </div>
      <div>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Ajouter un OP</div>
        {(()=>{const avails=modalEditBT.type==='CF'?opsForSource.filter(op=>(op.statut==='EN_COURS'||op.statut==='DIFFERE_CF')&&!op.bordereauCF&&!(modalEditBT.opsIds||[]).includes(op.id)):opsForSource.filter(op=>op.statut==='VISE_CF'&&!op.bordereauAC&&!(modalEditBT.opsIds||[]).includes(op.id));
          return<div style={{background:P.greenLight,borderRadius:10,padding:12,maxHeight:200,overflowY:'auto'}}>{avails.length===0?<span style={{fontSize:12,color:P.textMuted}}>Aucun OP disponible</span>:avails.map(op=><div key={op.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderBottom:`1px solid ${P.border}`}}><span style={{fontSize:11}}><strong style={{fontFamily:'monospace'}}>{op.numero}</strong> — {getBen(op)} — {formatMontant(op.montant)} F</span><IBtn icon={I.plusCircle(P.green,16)} title="Ajouter" bg={P.greenLight} onClick={()=>handleAddOpToBT(modalEditBT,op.id)}/></div>)}</div>;})()}
      </div>
      <div style={{borderTop:`1px solid ${P.border}`,paddingTop:16,marginTop:20}}><button onClick={()=>handleDeleteBordereau(modalEditBT)} style={{width:'100%',padding:12,border:`1px solid ${P.red}33`,borderRadius:10,background:P.redLight,color:P.red,fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{I.trash(P.red,15)} Supprimer ce bordereau</button></div>
    </Modal>}

    {/* MODALE PROTECTION CIRCUIT */}
    {modalProtection&&<Modal title="Bordereau verrouillé" titleColor={P.gold} onClose={()=>setModalProtection(null)} width={500}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:16,background:`${P.gold}10`,borderRadius:12,marginBottom:20,border:`1px solid ${P.goldBorder}`}}>
        {I.lock(P.gold,24)}
        <div><div style={{fontWeight:700,fontSize:14,color:P.gold,marginBottom:6}}>Modification impossible</div><div style={{fontSize:13,color:P.text,lineHeight:1.6}}>Ce bordereau contient des OP qui ont avancé dans le circuit. Annulez d'abord les étapes dans l'ordre inverse.</div></div>
      </div>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:700,color:P.olive,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>OP ayant avancé</div>
        {(modalProtection.opsIds||[]).map(id=>{const op=ops.find(o=>o.id===id);if(!op||!opHasAdvanced(id))return null;
          const sl={VISE_CF:'Visé CF',TRANSMIS_AC:'Transmis AC',PAYE_PARTIEL:'Paiement partiel',PAYE:'Payé',ARCHIVE:'Archivé',ANNULE:'Annulé',DIFFERE_AC:'Différé AC',REJETE_AC:'Rejeté AC'};
          return<div key={id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'#FAFAF8',borderRadius:10,marginBottom:4,border:`1px solid ${P.border}`}}>
            <div style={{flex:1}}><div style={{fontFamily:'monospace',fontWeight:700,fontSize:11}}>{op.numero}</div><div style={{fontSize:12,color:P.textSec}}>{getBen(op)}</div></div>
            <Badge bg={P.redLight} color={P.red}>{sl[op.statut]||op.statut}</Badge>
          </div>;})}
      </div>
      <div style={{textAlign:'center'}}><ActionBtn label="Compris" color={P.olive} onClick={()=>setModalProtection(null)}/></div>
    </Modal>}
  </div>;
};

export default PageBordereaux;
