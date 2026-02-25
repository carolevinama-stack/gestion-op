import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { db } from '../firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// ============================================================
// PALETTE & ICÔNES
// ============================================================
const P = {
  bg:'#F6F4F1', card:'#FFFFFF', green:'#2E9940', greenDark:'#1B6B2E', greenLight:'#E8F5E9',
  olive:'#5D6A55', oliveDark:'#4A5A42', gold:'#C5961F', goldLight:'#FFF8E1', goldBorder:'#E8B931',
  red:'#C43E3E', redLight:'#FFEBEE', orange:'#D4722A',
  border:'#E2DFD8', text:'#3A3A3A', textSec:'#7A7A7A', textMuted:'#A0A0A0',
};

const I = {
  archive: (c=P.olive, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  undo: (c=P.gold, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6.69 3L3 13"/></svg>,
  edit: (c=P.greenDark, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  search: (c=P.textMuted, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  fileText: (c=P.textMuted, s=40) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  close: (c='#fff', s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

// ============================================================
// COMPOSANTS UI
// ============================================================
const Badge = React.memo(({bg, color, children}) => <span style={{background:bg, color, padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, whiteSpace:'nowrap', letterSpacing:.3}}>{children}</span>);
const Empty = React.memo(({text}) => <div style={{textAlign:'center', padding:40, color:P.textMuted}}><div style={{marginBottom:12, opacity:.5}}>{I.fileText(P.textMuted,40)}</div><p style={{fontSize:14, margin:0}}>{text}</p></div>);
const STab = React.memo(({active, label, count, color, onClick}) => <button onClick={onClick} style={{padding:'10px 18px', borderRadius:10, border:active?`2px solid ${color}`:'2px solid transparent', background:active?color:P.card, color:active?'#fff':P.textSec, fontWeight:600, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', gap:6, transition:'all .2s', boxShadow:active?`0 4px 12px ${color}33`:'0 1px 3px rgba(0,0,0,.06)'}}>{label}{count!==undefined && <span style={{background:active?'rgba(255,255,255,.25)':P.border, padding:'1px 7px', borderRadius:10, fontSize:10, fontWeight:700}}>{count}</span>}</button>);
const IBtn = React.memo(({icon, title, bg, onClick, disabled, size=30}) => <button onClick={onClick} disabled={disabled} title={title} style={{width:size, height:size, borderRadius:8, border:'none', background:bg||P.greenLight, display:'flex', alignItems:'center', justifyContent:'center', cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.4:1, transition:'all .15s', padding:0}}>{icon}</button>);
const ActionBtn = React.memo(({label, icon, color, onClick, disabled, count}) => <button onClick={onClick} disabled={disabled} style={{padding:'10px 20px', background:color, color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:13, cursor:disabled?'not-allowed':'pointer', display:'inline-flex', alignItems:'center', gap:8, opacity:disabled?0.5:1, boxShadow:`0 4px 12px ${color}33`, transition:'all .2s', minHeight:40}}>{icon}{label}{count!==undefined && <span style={{background:'rgba(255,255,255,.25)', padding:'2px 8px', borderRadius:6, fontSize:11}}>{count}</span>}</button>);

const ModalAlert = ({ data, onClose }) => {
  const [val, setVal] = useState('');
  if (!data) return null;
  const isConfirm = data.type === 'confirm';
  const color = data.type === 'error' ? P.red : isConfirm ? P.gold : P.green;
  
  return <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.4)', backdropFilter:'blur(4px)', zIndex:3000, display:'flex', alignItems:'center', justifyContent:'center'}}>
    <div style={{background:'white', borderRadius:16, padding:24, width:420, boxShadow:'0 10px 40px rgba(0,0,0,.2)'}}>
      <h3 style={{color, margin:'0 0 12px', textAlign:'center'}}>{data.title}</h3>
      <p style={{color:'#444', fontSize:14, marginBottom:24, whiteSpace:'pre-line', textAlign:'center', lineHeight:1.5}}>{data.message}</p>
      {(data.showInput || data.showPwd) && (
        <div style={{marginBottom:24}}>
          {data.inputLabel && <label style={{fontSize:12, fontWeight:700, display:'block', marginBottom:6, color:P.textSec}}>{data.inputLabel}</label>}
          <input type={data.showPwd ? "password" : "text"} autoFocus value={val} onChange={e=>setVal(e.target.value)} style={{width:'100%', padding:'12px', borderRadius:8, border:`1px solid ${P.border}`, boxSizing:'border-box', fontSize:14}} placeholder={data.showPwd ? "Mot de passe administrateur" : "Saisir ici..."} />
        </div>
      )}
      <div style={{display:'flex', gap:12, justifyContent:'center'}}>
        {isConfirm && <button onClick={onClose} style={{padding:'10px 24px', borderRadius:8, border:`1px solid ${P.border}`, background:'#f9f9f9', cursor:'pointer', fontWeight:600, color:P.text}}>Annuler</button>}
        <button onClick={() => { 
          if(isConfirm && (data.showInput || data.showPwd) && !val) return; 
          const confirmFn = data.onConfirm; const finalVal = val; setVal(''); onClose(); 
          if(isConfirm && confirmFn) setTimeout(() => confirmFn(finalVal), 150);
        }} style={{padding:'10px 32px', borderRadius:8, border:'none', background:color, color:'white', cursor:'pointer', fontWeight:700, minWidth:120}}>{isConfirm ? 'Confirmer' : 'OK'}</button>
      </div>
    </div>
  </div>;
};

const formatDate = (ds) => {
  if (!ds) return '-';
  if (ds.length >= 10) {
    const [y, m, d] = ds.substring(0, 10).split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return ds;
};

// ============================================================
// COMPOSANT PRINCIPAL : ARCHIVES
// ============================================================
const PageArchives = () => {
  const { projet, sources, exercices, beneficiaires, ops } = useAppContext();
  
  const [subTabArch, setSubTabArch] = useState('A_ARCHIVER');
  const [activeSourceBT, setActiveSourceBT] = useState(sources[0]?.id || null);
  const [selectedOps, setSelectedOps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchArch, setSearchArch] = useState('');
  
  // Modales
  const [alertData, setAlertData] = useState(null); 
  const [modalArchive, setModalArchive] = useState(false);
  const [boiteArchivage, setBoiteArchivage] = useState('');

  const notify = (type, title, message) => setAlertData({ type, title, message });
  const ask = (title, message, onConfirm, showPwd=false, showInput=false, inputLabel='') => {
    setAlertData({ type: 'confirm', title, message, onConfirm, showPwd, showInput, inputLabel });
  };

  const getBen = (op) => op?.beneficiaireNom || beneficiaires.find(b => b.id === op?.beneficiaireId)?.nom || 'N/A';
  
  const exerciceActif = exercices.find(e => e.actif);
  const opsForSource = useMemo(() => ops.filter(op => op.exerciceId === exerciceActif?.id && op.sourceId === activeSourceBT), [ops, activeSourceBT, exerciceActif]);

  const opsAArchiver = useMemo(() => opsForSource.filter(op => op.statut === 'PAYE' || op.statut === 'ANNULE'), [opsForSource]);
  const opsArchives = useMemo(() => opsForSource.filter(op => op.statut === 'ARCHIVE'), [opsForSource]);

  const checkPwd = (callback) => {
    ask("Sécurité", "Veuillez saisir le mot de passe administrateur :", (pwd) => {
      if(pwd === (projet?.motDePasseAdmin || 'admin123')) callback();
      else notify("error", "Erreur", "Mot de passe incorrect");
    }, true);
  };

  const filterOps = (list, term) => { if(!term) return list; const t = term.toLowerCase(); return list.filter(op => (op.numero||'').toLowerCase().includes(t) || getBen(op).toLowerCase().includes(t) || (op.objet||'').toLowerCase().includes(t)); };
  const toggleOp = (opId) => setSelectedOps(p => p.includes(opId) ? p.filter(id => id !== opId) : [...p, opId]);
  const toggleAll = (list) => { if(selectedOps.length === list.length && list.length > 0) setSelectedOps([]); else setSelectedOps(list.map(o => o.id)); };
  const totalSelected = selectedOps.reduce((s, id) => s + (ops.find(o => o.id === id)?.montant || 0), 0);

  const handleArchiver = async () => {
    if(selectedOps.length === 0 || !boiteArchivage.trim()) return;
    ask("Archivage", `Archiver ${selectedOps.length} OP dans la boîte "${boiteArchivage}" ?`, async () => {
      setSaving(true);
      try{
        const batch = writeBatch(db);
        selectedOps.forEach(opId => {
          batch.update(doc(db, 'ops', opId), {statut: 'ARCHIVE', boiteArchivage: boiteArchivage.trim(), dateArchivage: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString()});
        });
        await batch.commit();
        notify("success", "Terminé", `${selectedOps.length} OP ont été archivés avec succès.`);
        setSelectedOps([]); setBoiteArchivage(''); setModalArchive(false);
      }catch(e){notify("error", "Erreur", e.message);}
      setSaving(false);
    });
  };

  const handleRetropedalage = async (opId) => {
    checkPwd(() => {
      ask("Rétropédalage", "Sortir cet OP des archives et le renvoyer à l'étape précédente ?", async () => {
        setSaving(true);
        try{
          const op = ops.find(o => o.id === opId);
          let nextStatut = 'TRANSMIS_AC'; 
          if(op.statut === 'ANNULE') {
             nextStatut = op.bordereauAC ? 'TRANSMIS_AC' : 'TRANSMIS_CF';
          } else {
             const paiem = op.paiements || [];
             const tot = paiem.reduce((s, p) => s + (p.montant || 0), 0);
             nextStatut = tot > 0 ? 'PAYE_PARTIEL' : 'TRANSMIS_AC';
          }
          await updateDoc(doc(db, 'ops', opId), { statut: nextStatut, dateArchivage: null, boiteArchivage: null, updatedAt: new Date().toISOString() });
          notify("success", "Rétropédalage", "L'OP a été sorti des archives.");
        }catch(e){notify("error", "Erreur", e.message);}
        setSaving(false);
      });
    });
  };

  const handleModifierBoite = async (opId) => {
    checkPwd(() => {
      ask("Modifier boîte", "Nouvelle référence de boîte :", async (val) => {
        if(!val) return;
        try{await updateDoc(doc(db, 'ops', opId), {boiteArchivage: val.trim(), updatedAt: new Date().toISOString()}); notify("success", "OK", "Référence de la boîte modifiée.");}catch(e){notify("error", "Erreur", e.message);}
      }, false, true, "Référence boîte");
    });
  };

  const chgSub = (fn, v) => { fn(v); setSelectedOps([]); setSearchArch(''); };
  const thS = {...styles.th, fontSize: 11, fontWeight: 700, color: P.textSec, textTransform: 'uppercase', letterSpacing: .5, background: '#FAFAF8'};
  const crd = {...styles.card, background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(0,0,0,.04)'};

  return <div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
      <h1 style={{fontSize:22,fontWeight:700,color:P.oliveDark,margin:0}}>Salle des Archives</h1>
    </div>
    
    <div style={{display:'flex',gap:8,padding:'16px 0',flexWrap:'wrap'}}>
      {sources.map(src=>{
        const isActif = activeSourceBT === src.id;
        const srcColor = src.couleur || P.olive; 
        return (
          <button key={src.id} onClick={()=>{setActiveSourceBT(src.id);setSelectedOps([]);}} 
            style={{padding:'8px 20px',borderRadius:10,border:isActif?`2px solid ${srcColor}`:'2px solid transparent',background:isActif?srcColor:'#EDEAE5',color:isActif?'#fff':P.textSec,fontWeight:700,cursor:'pointer',fontSize:13,boxShadow:isActif?`0 2px 8px ${srcColor}55`:'none'}}>
            {src.sigle}
          </button>
        )
      })}
    </div>

    <ModalAlert data={alertData} onClose={() => setAlertData(null)} />

    <div>
      <div style={{display:'flex',gap:10,marginBottom:20}}>
        <STab active={subTabArch==='A_ARCHIVER'} label="À archiver" count={opsAArchiver.length} color={P.olive} onClick={()=>chgSub(setSubTabArch,'A_ARCHIVER')}/>
        <STab active={subTabArch==='ARCHIVES'} label="Dossiers Classés" count={opsArchives.length} color={P.oliveDark} onClick={()=>chgSub(setSubTabArch,'ARCHIVES')}/>
      </div>

      {subTabArch==='A_ARCHIVER' && <div style={crd}>
        <h3 style={{margin:'0 0 6px',color:P.olive,fontSize:15}}>OP prêts pour le classement</h3>
        <p style={{fontSize:12,color:P.textMuted,marginBottom:12}}>Les OP soldés et les annulations validées s'affichent ici.</p>
        <input type="text" placeholder="Rechercher..." value={searchArch} onChange={e=>setSearchArch(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:400,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsAArchiver,searchArch).length===0?<Empty text="Aucun OP en attente de classement"/>:
        <div style={{maxHeight:450,overflowY:'auto',border:`1px solid ${P.border}`,borderRadius:10}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:36}}><input type="checkbox" checked={selectedOps.length===filterOps(opsAArchiver,searchArch).length&&filterOps(opsAArchiver,searchArch).length>0} onChange={()=>toggleAll(filterOps(opsAArchiver,searchArch))}/></th>
          <th style={{...thS,width:110}}>N° OP</th>
          <th style={{...thS,width:70}}>TYPE</th>
          <th style={thS}>BÉNÉFICIAIRE</th>
          <th style={thS}>OBJET</th>
          <th style={{...thS,width:100,textAlign:'right'}}>MONTANT</th>
          <th style={{...thS,width:80}}>STATUT</th>
          <th style={{...thS,width:90}}>DATE</th>
        </tr></thead><tbody>
          {filterOps(opsAArchiver,searchArch).map(op=>{const ch=selectedOps.includes(op.id);
            return <tr key={op.id} onClick={()=>toggleOp(op.id)} style={{cursor:'pointer',background:ch?P.greenLight:'transparent'}}>
              <td style={styles.td}><input type="checkbox" checked={ch} onChange={()=>toggleOp(op.id)}/></td>
              <td style={{...styles.td,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{op.numero}</td>
              <td style={{...styles.td,fontSize:10,fontWeight:600}}>{op.type}</td>
              <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
              <td style={{...styles.td,fontSize:11,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{op.objet||'-'}</td>
              <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
              <td style={styles.td}>{op.statut==='ANNULE'?<Badge bg={P.redLight} color={P.red}>Annulé</Badge>:<Badge bg={P.greenLight} color={P.greenDark}>Payé</Badge>}</td>
              <td style={{...styles.td,fontSize:11}}>{formatDate(op.datePaiement)||formatDate(op.dateVisaCF)}</td>
            </tr>;})}
        </tbody></table></div>}
        {selectedOps.length > 0 && <div style={{marginTop:14,textAlign:'right'}}><ActionBtn label="Archiver les éléments sélectionnés" icon={I.archive('#fff',14)} count={selectedOps.length} color={P.olive} onClick={()=>{setModalArchive(true);setBoiteArchivage('');}}/></div>}
      </div>}

      {subTabArch==='ARCHIVES' && <div style={crd}>
        <h3 style={{margin:'0 0 16px',color:P.oliveDark,fontSize:15}}>Consultation des Archives ({opsArchives.length})</h3>
        <input type="text" placeholder="Rechercher par N° de boîte, OP, Bénéficiaire..." value={searchArch} onChange={e=>setSearchArch(e.target.value)} style={{...styles.input,marginBottom:12,maxWidth:450,borderRadius:10,border:`1px solid ${P.border}`}}/>
        {filterOps(opsArchives,searchArch).length===0?<Empty text="Aucun dossier trouvé dans les archives"/>:
        <div style={{maxHeight:550,overflowY:'auto'}}><table style={styles.table}><thead style={{position:'sticky',top:0,zIndex:1}}><tr>
          <th style={{...thS,width:110}}>N° OP</th>
          <th style={{...thS,width:70}}>TYPE</th>
          <th style={thS}>BÉNÉFICIAIRE</th>
          <th style={thS}>OBJET</th>
          <th style={{...thS,width:100,textAlign:'right'}}>MONTANT</th>
          <th style={{...thS,width:120}}>RÉF. BOÎTE</th>
          <th style={{...thS,width:80}}>CLASSÉ LE</th>
          <th style={{...thS,width:80}}>ACTIONS</th>
        </tr></thead><tbody>
          {filterOps(opsArchives,searchArch).map(op=><tr key={op.id}>
            <td style={{...styles.td,fontFamily:'monospace',fontWeight:600,fontSize:10}}>{op.numero}</td>
            <td style={{...styles.td,fontSize:10,fontWeight:600}}>{op.type}</td>
            <td style={{...styles.td,fontSize:12}}>{getBen(op)}</td>
            <td style={{...styles.td,fontSize:11,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{op.objet||'-'}</td>
            <td style={{...styles.td,textAlign:'right',fontFamily:'monospace',fontWeight:600}}>{formatMontant(op.montant)}</td>
            <td style={{...styles.td,fontWeight:800,color:P.oliveDark}}>{op.boiteArchivage||'-'}</td>
            <td style={{...styles.td,fontSize:11}}>{formatDate(op.dateArchivage)}</td>
            <td style={{...styles.td,display:'flex',gap:6}}>
              <IBtn icon={I.edit(P.olive,14)} title="Modifier la référence de la boîte" bg={P.greenLight} onClick={()=>handleModifierBoite(op.id)}/>
              <IBtn icon={I.undo(P.gold,14)} title="Sortir des archives (Rétropédalage)" bg={`${P.gold}15`} onClick={()=>handleRetropedalage(op.id)}/>
            </td>
          </tr>)}</tbody></table></div>}
      </div>}
    </div>

    {/* MODALE DE CLASSEMENT EN BOÎTE */}
    {modalArchive && selectedOps.length > 0 && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.25)',backdropFilter:'blur(3px)',zIndex:200}}><div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:540,maxWidth:'92vw',background:P.card,borderRadius:16,zIndex:201,boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden'}}>
      <div style={{padding:'16px 22px',background:P.olive,display:'flex',justifyContent:'space-between',alignItems:'center'}}><h3 style={{fontSize:16,fontWeight:700,color:'#fff',margin:0}}>Classement Physique — {selectedOps.length} OP</h3><button onClick={()=>setModalArchive(false)} style={{background:'transparent',border:'none',cursor:'pointer'}}>{I.close('#fff',16)}</button></div>
      <div style={{padding:'20px 22px'}}>
        <div style={{marginBottom:16,paddingBottom:14,borderBottom:`1px solid ${P.border}`}}>
          {selectedOps.map(opId=>{const op=ops.find(o=>o.id===opId);if(!op)return null;
            return <div key={opId} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:P.greenLight,borderRadius:8,marginBottom:3,fontSize:12}}>
              <span><strong style={{fontFamily:'monospace'}}>{op.numero}</strong> — {getBen(op)}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>{op.statut==='ANNULE'?<Badge bg={P.redLight} color={P.red}>Annulé</Badge>:<Badge bg={P.greenLight} color={P.greenDark}>Payé</Badge>}<span style={{fontFamily:'monospace',fontWeight:700}}>{formatMontant(op.montant)} F</span></div>
            </div>;})}
          <div style={{fontSize:15,fontWeight:800,color:P.olive,marginTop:10,textAlign:'right'}}>Total : {formatMontant(totalSelected)} F</div>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:'block',fontSize:13,fontWeight:700,marginBottom:6,color:P.oliveDark}}>Saisissez la référence de la boîte physique :</label>
          <input type="text" value={boiteArchivage} onChange={e=>setBoiteArchivage(e.target.value)} placeholder="Ex: CA-2025-001" style={{...styles.input,marginBottom:0,fontSize:14,padding:12,width:'100%',boxSizing:'border-box'}}/>
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', gap:12}}>
           <button onClick={()=>setModalArchive(false)} style={{padding:'10px 20px',border:`1px solid ${P.border}`,borderRadius:8,background:'#fff',color:P.text,fontWeight:600,cursor:'pointer'}}>Annuler</button>
           <button onClick={handleArchiver} disabled={saving||!boiteArchivage.trim()} style={{padding:'10px 24px',border:'none',borderRadius:8,background:P.olive,color:'white',fontWeight:700,cursor:'pointer',opacity:(!boiteArchivage.trim() || saving) ? 0.5 : 1}}>{saving?'Classement en cours...':`Valider l'archivage`}</button>
        </div>
      </div>
    </div></div>}

  </div>;
};

export default PageArchives;
