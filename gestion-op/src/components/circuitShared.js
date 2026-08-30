// Composants d'interface et palette de couleurs communs aux circuits de validation
// (Contrôle Financier et Agent Comptable). Auparavant dupliqués à l'identique dans
// PageCircuitCF.js et PageCircuitAC.js.
import React, { useState } from 'react';

export const P = {
  bg:'#F6F4F1',card:'#FFFFFF',green:'#2E9940',greenDark:'#1B6B2E',greenLight:'#E8F5E9',
  olive:'#5D6A55',oliveDark:'#4A5A42',gold:'#C5961F',goldLight:'#FFF8E1',goldBorder:'#E8B931',
  red:'#C43E3E',redLight:'#FFEBEE',orange:'#D4722A',
  border:'#E2DFD8',text:'#3A3A3A',textSec:'#7A7A7A',textMuted:'#A0A0A0',
};

// Icônes nécessaires aux composants ci-dessous uniquement (les pages CF/AC gardent
// leur propre jeu d'icônes complet pour le reste de leur interface).
const I = {
  close:(c=P.textMuted,s=16)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  fileText:(c=P.textMuted,s=40)=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
};

export const Badge=React.memo(({bg,color,children})=><span style={{background:bg,color,padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,whiteSpace:'nowrap',letterSpacing:.3}}>{children}</span>);
export const Empty=React.memo(({text})=><div style={{textAlign:'center',padding:40,color:P.textMuted}}><div style={{marginBottom:12,opacity:.5}}>{I.fileText(P.textMuted,40)}</div><p style={{fontSize:14,margin:0}}>{text}</p></div>);
export const STab=React.memo(({active,label,count,color,onClick})=><button onClick={onClick} style={{padding:'10px 18px',borderRadius:10,border:active?`2px solid ${color}`:'2px solid transparent',background:active?color:P.card,color:active?'#fff':P.textSec,fontWeight:600,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:6,transition:'all .2s',boxShadow:active?`0 4px 12px ${color}33`:'0 1px 3px rgba(0,0,0,.06)'}}>{label}{count!==undefined&&<span style={{background:active?'rgba(255,255,255,.25)':P.border,padding:'1px 7px',borderRadius:10,fontSize:10,fontWeight:700}}>{count}</span>}</button>);

// Petite pastille indiquant l'exercice d'origine d'un OP, affichée seulement quand il
// diffère de l'exercice actif (ex : un OP resté dans un circuit d'une année sur l'autre).
export const ExBadge=React.memo(({exerciceId,exercices,exerciceActif})=>{
  const ex=exercices.find(e=>e.id===exerciceId);
  if(!ex||(exerciceActif&&ex.id===exerciceActif.id))return null;
  return <span style={{background:P.redLight,color:P.red,padding:'1px 5px',borderRadius:4,fontSize:9,fontWeight:700,marginLeft:6}}>{ex.annee}</span>;
});

export const IBtn = React.memo(({icon, title, bg, onClick, disabled, size = 30}) => (
  <button onClick={onClick} disabled={disabled} title={title} style={{width: size, height: size, borderRadius: 8, border: 'none', background: bg || P.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, transition: 'all .15s', padding: 0}}>{icon}</button>
));

export const ActionBtn = React.memo(({label, icon, color, onClick, disabled, count}) => (
  <button onClick={onClick} disabled={disabled} style={{padding: '10px 20px', background: color, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1, boxShadow: `0 4px 12px ${color}33`, transition: 'all .2s', minHeight: 40}}>{icon}{label}{count !== undefined && <span style={{background: 'rgba(255,255,255,.25)', padding: '2px 8px', borderRadius: 6, fontSize: 11}}>{count}</span>}</button>
));

export const Modal=React.memo(({title,titleColor,onClose,children,width=540})=><><div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.25)',backdropFilter:'blur(3px)',zIndex:200}}/><div style={{position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width,maxWidth:'92vw',maxHeight:'88vh',background:P.card,borderRadius:16,zIndex:201,boxShadow:'0 20px 60px rgba(0,0,0,.2)',display:'flex',flexDirection:'column',overflow:'hidden'}}><div style={{padding:'16px 22px',background:titleColor||P.green,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}><h3 style={{fontSize:16,fontWeight:700,color:'#fff',margin:0}}>{title}</h3><button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:'none',background:'rgba(255,255,255,.2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{I.close('#fff',16)}</button></div><div style={{flex:1,overflowY:'auto',padding:'20px 22px'}}>{children}</div></div></>);

export const ModalAlert = ({ data, onClose }) => {
  const [val, setVal] = useState('');
  if (!data) return null;
  const isConfirm = data.type === 'confirm';
  const color = data.type === 'error' ? P.red : isConfirm ? P.gold : P.green;

  return <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)',backdropFilter:'blur(4px)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{background:'white',borderRadius:16,padding:24,width:420,boxShadow:'0 10px 40px rgba(0,0,0,.2)'}}>
      <h3 style={{color,margin:'0 0 12px', textAlign:'center'}}>{data.title}</h3>
      <p style={{color:'#444',fontSize:14,marginBottom:24,whiteSpace:'pre-line', textAlign:'center', lineHeight:1.5}}>{data.message}</p>

      {(data.showInput || data.showPwd) && (
        <div style={{marginBottom:24}}>
          {data.inputLabel && <label style={{fontSize:12,fontWeight:700,display:'block',marginBottom:6, color:P.textSec}}>{data.inputLabel}</label>}
          <input type={data.showPwd ? "password" : "text"} autoFocus value={val} onChange={e=>setVal(e.target.value)}
            style={{width:'100%',padding:'12px',borderRadius:8,border:`1px solid ${P.border}`,boxSizing:'border-box', fontSize:14}}
            placeholder={data.showPwd ? "Mot de passe administrateur" : "Saisir ici..."}
          />
        </div>
      )}

      <div style={{display:'flex',gap:12,justifyContent:'center'}}>
        {isConfirm && <button onClick={onClose} style={{padding:'10px 24px',borderRadius:8,border:`1px solid ${P.border}`,background:'#f9f9f9',cursor:'pointer',fontWeight:600, color:P.text}}>Annuler</button>}
        <button onClick={() => {
          if(isConfirm && (data.showInput || data.showPwd) && !val) return;
          const confirmFn = data.onConfirm;
          const finalVal = val;
          setVal('');
          onClose();
          if(isConfirm && confirmFn) setTimeout(() => confirmFn(finalVal), 150);
        }} style={{padding:'10px 32px',borderRadius:8,border:'none',background:color,color:'white',cursor:'pointer',fontWeight:700, minWidth: 120}}>{isConfirm ? 'Confirmer' : 'OK'}</button>
      </div>
    </div>
  </div>;
};

export const formatDate = (ds) => {
  if (!ds) return '-';
  if (ds.length >= 10) {
    const [y, m, d] = ds.substring(0, 10).split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
  }
  return ds;
};
