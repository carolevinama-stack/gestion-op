import React, { useState, useRef, useMemo, useCallback } from 'react';
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
  close:(c=P.textMuted,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  chevron:(c=P.green,s=14)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>,
  search:(c=P.textMuted,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
};

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
            placeholder={data.showPwd ? "Mot de passe..." : "Saisir ici..."} />
        </div>
      )}
      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        {isConfirm && <button onClick={onClose} style={{padding:'10px 20px',borderRadius:8,border:'1px solid #ccc',background:'white',cursor:'pointer',fontWeight:600,color:'#000'}}>Annuler</button>}
        <button onClick={() => { if(isConfirm && (data.showInput || data.showPwd) && !val) return; if(isConfirm) data.onConfirm(val); setVal(''); onClose(); }} style={{padding:'10px 20px',borderRadius:8,border:'none',background:color,color:'white',cursor:'pointer',fontWeight:600,flex:isConfirm?1:'0 0 100%'}}>{isConfirm ? 'Confirmer' : 'OK'}</button>
      </div>
    </div>
  </div>;
};

const PageBordereaux = () => {
  const { projet, sources, exercices, beneficiaires, ops, setOps, bordereaux, setBordereaux } = useAppContext();
  const [mainTab, setMainTab] = useState('CF');
  const [subTabCF, setSubTabCF] = useState('NOUVEAU');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [selectedOps, setSelectedOps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchBT, setSearchBT] = useState('');
  const [alertData, setAlertData] = useState(null); 
  const [modalRetourCF, setModalRetourCF] = useState(false);
  const [resultatCF, setResultatCF] = useState('VISE');
  const [motifRetour, setMotifRetour] = useState('');
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

  const toggleOp = (opId) => setSelectedOps(prev => prev.includes(opId) ? prev.filter(id => id !== opId) : [...prev, opId]);
  const toggleAll = (list) => setSelectedOps(prev => prev.length === list.length ? [] : list.map(o => o.id));

  const exerciceActif = exercices.find(e => e.actif);
  const currentSrc = sources.find(s => s.id === activeSourceBT);
  const opsForSource = useMemo(() => ops.filter(op => op.sourceId === activeSourceBT && op.exerciceId === exerciceActif?.id && op.statut !== 'SUPPRIME'), [ops, activeSourceBT, exerciceActif]);
  const opsEligiblesCF = useMemo(() => opsForSource.filter(op => (op.statut === 'EN_COURS' || op.statut === 'DIFFERE_CF') && !op.bordereauCF), [opsForSource]);
  const opsTransmisCF = useMemo(() => opsForSource.filter(op => op.statut === 'TRANSMIS_CF'), [opsForSource]);
  const bordereauCF = useMemo(() => bordereaux.filter(bt => bt.type === 'CF' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActif?.id && bt.statut !== 'SUPPRIME'), [bordereaux, activeSourceBT, exerciceActif]);
  const bordereauAC = useMemo(() => bordereaux.filter(bt => bt.type === 'AC' && bt.sourceId === activeSourceBT && bt.exerciceId === exerciceActif?.id && bt.statut !== 'SUPPRIME'), [bordereaux, activeSourceBT, exerciceActif]);

  const getBen = (op) => op?.beneficiaireNom || beneficiaires.find(b => b.id === op?.beneficiaireId)?.nom || 'N/A';
  const isOpLockedForCF = (op) => ['VISE_CF','TRANSMIS_AC','PAYE_PARTIEL','PAYE','ARCHIVE','ANNULE','DIFFERE_AC','REJETE_AC'].includes(op.statut);
  const isBordereauLocked = (bt) => {
    if (!bt.opsIds) return false;
    return bt.opsIds.some(id => { const op = ops.find(o => o.id === id); return op && isOpLockedForCF(op); });
  };

  const checkPwd = (callback) => {
    ask("Sécurité", "Veuillez saisir le mot de passe administrateur :", (pwd) => {
      if(pwd === (projet?.motDePasseAdmin || 'admin123')) callback();
      else notify('error', 'Erreur', 'Mot de passe incorrect');
    }, true);
  };

  const genNumeroBT = async (typeBT) => {
    const pf = typeBT === 'CF' ? 'BT-CF' : 'BT-AC';
    const sigProj = projet?.sigle || 'PROJET';
    const sigSrc = currentSrc?.sigle || 'SRC';
    const annee = exerciceActif?.annee || new Date().getFullYear();
    const cId = `${typeBT}_${activeSourceBT}_${exerciceActif?.id}`;
    const cRef = doc(db, 'compteurs', cId);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(cRef);
      const next = (snap.exists() ? (snap.data().count || 0) : 0) + 1;
      tx.set(cRef, { count: next, type: typeBT, sourceId: activeSourceBT, exerciceId: exerciceActif?.id });
      return `${pf}-${String(next).padStart(4, '0')}/${sigProj}-${sigSrc}/${annee}`;
    });
  };

  const handleCreateBordereau = async (typeBT) => {
    if (selectedOps.length === 0) return;
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
        const field = typeBT === 'CF' ? 'bordereauCF' : 'bordereauAC';
        selectedOps.forEach(opId => batch.update(doc(db, 'ops', opId), { [field]: num, updatedAt: new Date().toISOString() }));
        await batch.commit();
        notify('success', 'Succès', `${num} créé.`);
        setSelectedOps([]);
        setSubTabCF('BORDEREAUX');
      } catch (e) { notify('error', 'Erreur', e.message); }
      setSaving(false);
    });
  };

  const handleTransmettre = async (bt) => {
    const d = readDate('trans_' + bt.id); if (!d) return;
    ask('Confirmation', `Transmettre le bordereau ${bt.numero} ?`, async () => {
      setSaving(true);
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'bordereaux', bt.id), { dateTransmission: d, statut: 'ENVOYE', updatedAt: new Date().toISOString() });
        const ns = bt.type === 'CF' ? 'TRANSMIS_CF' : 'TRANSMIS_AC';
        const df = bt.type === 'CF' ? 'dateTransmissionCF' : 'dateTransmissionAC';
        bt.opsIds.forEach(opId => batch.update(doc(db, 'ops', opId), { statut: ns, [df]: d, updatedAt: new Date().toISOString() }));
        await batch.commit();
        notify('success', 'Transmis', 'Bordereau transmis.');
      } catch (e) { notify('error', 'Erreur', e.message); }
      setSaving(false);
    });
  };

  const handleRetourCF = async () => {
    const d = readDate('retourCF'); if (!d) return;
    ask('Confirmation', `Valider la décision ?`, async () => {
      setSaving(true);
      try {
        const batch = writeBatch(db);
        for (const opId of selectedOps) {
          const op = ops.find(o => o.id === opId);
          let upd = { updatedAt: new Date().toISOString() };
          if (resultatCF === 'VISE') {
            if (op.type === 'ANNULATION') {
              upd.statut = 'ANNULE'; upd.dateVisaCF = d; upd.dateArchivage = d; 
              if (op.opProvisoireId) batch.update(doc(db, 'ops', op.opProvisoireId), { statut: 'ANNULE', dateAnnulation: d, updatedAt: new Date().toISOString() });
            } else { upd.statut = 'VISE_CF'; upd.dateVisaCF = d; }
          } else if (resultatCF === 'DIFFERE') {
            upd.statut = 'DIFFERE_CF'; upd.dateDiffere = d; upd.motifDiffere = motifRetour;
          } else {
            upd.statut = 'REJETE_CF'; upd.dateRejet = d; upd.motifRejet = motifRetour;
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

  const handleDeleteBordereau = async (bt) => {
    if (isBordereauLocked(bt)) return;
    checkPwd(() => {
      ask('Suppression', `Mettre le bordereau ${bt.numero} à la corbeille ?`, async () => {
        setSaving(true);
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'bordereaux', bt.id), { statut: 'SUPPRIME', updatedAt: new Date().toISOString() });
          const ps = bt.type === 'CF' ? 'EN_COURS' : 'VISE_CF';
          const bf = bt.type === 'CF' ? 'bordereauCF' : 'bordereauAC';
          bt.opsIds.forEach(opId => batch.update(doc(db, 'ops', opId), { [bf]: null, statut: ps, updatedAt: new Date().toISOString() }));
          await batch.commit();
          notify('success', 'OK', 'Bordereau mis à la corbeille.');
          setModalEditBT(null);
        } catch (e) { notify('error', 'Erreur', e.message); }
        setSaving(false);
      });
    });
  };

  const handleSaveBtNumero = async (bt) => {
    const nn = editBtNumero.trim(); if (!nn || nn === bt.numero) return;
    checkPwd(async () => {
      try {
        await updateDoc(doc(db, 'bordereaux', bt.id), { numero: nn, updatedAt: new Date().toISOString() });
        notify('success', 'Modifié', 'Numéro mis à jour.');
        setModalEditBT(null);
      } catch (e) { notify('error', 'Erreur', e.message); }
    });
  };

  const chgTab = (t) => { setMainTab(t); setSelectedOps([]); setSearchBT(''); };
  const chgSub = (fn, v) => { fn(v); setSelectedOps([]); };

  const renderBordereaux = (list) => (
    <div style={crd}>
      {list.length === 0 ? <Empty text="Aucun bordereau" /> :
        list.map(bt => (
          <div key={bt.id} style={{ marginBottom: 4, border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#000' }}>{bt.numero}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <IBtn icon={I.settings()} onClick={() => { setEditBtNumero(bt.numero); setModalEditBT(bt); }} />
              </div>
            </div>
            {bt.statut === 'EN_COURS' && (
              <div style={{ marginTop: 8 }}>
                <input type="date" ref={el => setDateRef('trans_' + bt.id, el)} style={{ color: '#000' }} />
                <button onClick={() => handleTransmettre(bt)}>Transmettre</button>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );

  return (
    <div className="bordereaux-page">
      <style>{` .bordereaux-page input, .bordereaux-page select, .bordereaux-page textarea { color: #000000 !important; } `}</style>
      <ModalAlert data={alertData} onClose={() => setAlertData(null)} />
      <h1 style={{ fontSize: 22, fontWeight: 700, color: P.greenDark }}>Bordereaux</h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {sources.map(s => <button key={s.id} onClick={() => setActiveSourceBT(s.id)} style={{ background: activeSourceBT === s.id ? s.couleur : '#fff', color: activeSourceBT === s.id ? '#fff' : '#000' }}>{s.sigle}</button>)}
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <STab active={subTabCF === 'NOUVEAU'} label="Nouveau" count={opsEligiblesCF.length} color={P.greenDark} onClick={() => chgSub(setSubTabCF, 'NOUVEAU')} />
        <STab active={subTabCF === 'BORDEREAUX'} label="Bordereaux" count={bordereauCF.length} color={P.green} onClick={() => chgSub(setSubTabCF, 'BORDEREAUX')} />
        <STab active={subTabCF === 'RETOUR'} label="Visa CF" count={opsTransmisCF.length} color={P.gold} onClick={() => chgSub(setSubTabCF, 'RETOUR')} />
      </div>
      {subTabCF === 'NOUVEAU' && (
        <div style={crd}>
          <table style={{ width: '100%' }}>
            <thead><tr><th><input type="checkbox" onChange={() => toggleAll(opsEligiblesCF)} /></th><th>N° OP</th><th>Bénéficiaire</th><th style={{ textAlign: 'right' }}>Montant</th></tr></thead>
            <tbody>
              {opsEligiblesCF.map(op => (
                <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', color: '#000' }}>
                  <td><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly /></td>
                  <td style={{ fontWeight: 700 }}>{op.numero}</td>
                  <td>{getBen(op)}</td>
                  <td style={{ textAlign: 'right' }}>{formatMontant(op.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedOps.length > 0 && <button onClick={() => handleCreateBordereau('CF')}>Créer Bordereau</button>}
        </div>
      )}
      {subTabCF === 'BORDEREAUX' && renderBordereaux(bordereauCF)}
      {subTabCF === 'RETOUR' && (
        <div style={crd}>
          <table style={{ width: '100%' }}>
            <thead><tr><th><input type="checkbox" onChange={() => toggleAll(opsTransmisCF)} /></th><th>N° OP</th><th>Bénéficiaire</th></tr></thead>
            <tbody>
              {opsTransmisCF.map(op => (
                <tr key={op.id} onClick={() => toggleOp(op.id)} style={{ cursor: 'pointer', color: '#000' }}>
                  <td><input type="checkbox" checked={selectedOps.includes(op.id)} readOnly /></td>
                  <td style={{ fontWeight: 700 }}>{op.numero}</td>
                  <td>{getBen(op)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedOps.length > 0 && <button onClick={() => setModalRetourCF(true)}>Valider Visa CF</button>}
        </div>
      )}
      {modalRetourCF && (
        <Modal title="Visa CF" onClose={() => setModalRetourCF(false)}>
          <select value={resultatCF} onChange={e => setResultatCF(e.target.value)}>
            <option value="VISE">VISER</option>
            <option value="DIFFERE">DIFFERER</option>
            <option value="REJETE">REJETER</option>
          </select>
          <input type="date" ref={el => setDateRef('retourCF', el)} />
          <button onClick={handleRetourCF}>Confirmer</button>
        </Modal>
      )}
      {modalEditBT && (
        <Modal title="Gestion" onClose={() => setModalEditBT(null)}>
          <input type="text" value={editBtNumero} onChange={e => setEditBtNumero(e.target.value)} />
          <button onClick={() => handleSaveBtNumero(modalEditBT)}>Sauver</button>
          <button onClick={() => handleDeleteBordereau(modalEditBT)} style={{ color: 'red' }}>Mettre à la corbeille</button>
        </Modal>
      )}
    </div>
  );
};

export default PageBordereaux;
