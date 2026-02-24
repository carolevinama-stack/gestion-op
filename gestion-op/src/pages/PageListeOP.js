import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// Palette de couleurs pour harmoniser avec le reste de l'application
const P = {
  bg:'#F6F4F1', card:'#FFFFFF', green:'#2E9940', greenDark:'#1B6B2E', greenLight:'#E8F5E9',
  olive:'#5D6A55', oliveDark:'#4A5A42', gold:'#C5961F', goldLight:'#FFF8E1', goldBorder:'#E8B931',
  red:'#C43E3E', redLight:'#FFEBEE', orange:'#D4722A',
  border:'#E2DFD8', text:'#3A3A3A', textSec:'#7A7A7A', textMuted:'#A0A0A0',
};

const PageListeOP = () => {
  const { sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [filters, setFilters] = useState({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statut: '' });
  
  // Stockage uniquement de l'ID pour la mise à jour en temps réel
  const [previewOpId, setPreviewOpId] = useState(null);

  const getBenNom = (op) => op.beneficiaireNom || beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || 'N/A';

  // Fonction de formatage des dates (AAAA-MM-JJ vers JJ/MM/AAAA)
  const formatDate = (dateString) => {
    if (!dateString) return null;
    if (dateString.length >= 10) {
      const [year, month, day] = dateString.substring(0, 10).split('-');
      if (year && month && day) return `${day}/${month}/${year}`;
    }
    return dateString;
  };

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      return true;
    });

    // Tri chronologique pour le calcul exact des cumuls (Engagement Antérieur)
    const sorted = [...baseOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const cumulParLigne = {};
    
    const withCalculations = sorted.map(op => {
      const lb = op.ligneBudgetaire;
      const budgetSource = budgets.find(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId);
      const dotation = budgetSource?.lignes?.find(l => l.code === lb)?.dotation || 0;
      
      const engagementAnterieur = cumulParLigne[lb] || 0;
      
      // Si l'OP est un rejet (montant négatif), il va naturellement faire baisser le cumul
      cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (op.montant || 0);

      return { ...op, dotationLigne: dotation, engagementAnterieur, disponible: dotation - cumulParLigne[lb] };
    });

    // Application des filtres et inversion pour l'affichage (le plus récent en haut)
    return withCalculations.filter(op => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchString = `${op.numero} ${getBenNom(op)} ${op.montant} ${formatMontant(op.montant)}`.toLowerCase();
        if (!searchString.includes(searchLower)) return false;
      }
      if (filters.type && op.type !== filters.type) return false;
      if (filters.statut && op.statut !== filters.statut) return false;
      if (filters.ligneBudgetaire && !op.ligneBudgetaire?.toLowerCase().includes(filters.ligneBudgetaire.toLowerCase())) return false;
      
      // Filtres de date
      if (filters.dateDebut && (op.dateCreation || '') < filters.dateDebut) return false;
      if (filters.dateFin && (op.dateCreation || '') > filters.dateFin) return false;
      
      return true;
    }).reverse();
  }, [ops, activeSource, filters, exerciceActif, budgets, beneficiaires]);

  // L'OP affiché dans la modale est récupéré en direct, donc il s'actualise seul
  const livePreviewOp = useMemo(() => ops.find(o => o.id === previewOpId), [ops, previewOpId]);

  // Style ajusté pour l'en-tête : texte plus grand, hauteur naturelle ajustée
  const thStyle = {
    ...styles.th, 
    fontSize: 12, // Texte légèrement agrandi
    color: P.textSec, 
    textTransform: 'uppercase', 
    padding: '12px 10px', // Marges réduites pour éviter une ligne trop haute
    background: '#FAFAF8',
    position: 'sticky',
    top: 0,
    zIndex: 10
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
      </div>

      {/* BOUTONS DES SOURCES AVEC COULEURS DYNAMIQUES */}
      <div style={{display:'flex',gap:8,paddingBottom:'20px',flexWrap:'wrap'}}>
        <button onClick={() => setActiveSource('ALL')} 
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

      {/* FILTRES AJUSTÉS AU CONTENU */}
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

      {/* TABLEAU AVEC SCROLL RÉTABLI ET EN-TÊTE AJUSTÉ */}
      <div style={{ background: P.card, borderRadius: 12, border: `1px solid ${P.border}`, overflow: 'auto', maxHeight: '65vh' }}>
        <table style={styles.table}>
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '6%' }} />
            {activeSource !== 'ALL' && <col style={{ width: '11%' }} />}
            <col style={{ width: '11%' }} />
            {activeSource !== 'ALL' && <><col style={{ width: '11%' }} /><col style={{ width: '10%' }} /></>}
            <col style={{ width: '10%' }} />
            <col style={{ width: '3%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{...thStyle}}>N° OP</th>
              <th style={{...thStyle}}>Type</th>
              <th style={{...thStyle}}>Bénéficiaire</th>
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
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, color: isRejet ? P.red : P.text }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: '10px', fontWeight: isRejet ? 800 : 600, color: isRejet ? P.red : '#666' }}>{op.type}</td>
                  <td style={{ ...styles.td, fontWeight: 600, fontSize: 12 }}>{getBenNom(op)}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire}</td>
                  {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontSize: 12 }}>{formatMontant(op.dotationLigne)}</td>}
                  
                  {/* Montant en Rouge si c'est un rejet (Négatif) */}
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800, color: op.montant < 0 ? P.red : P.greenDark }}>
                    {formatMontant(op.montant)}
                  </td>
                  
                  {activeSource !== 'ALL' && (
                    <>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#666', fontSize: 12 }}>{formatMontant(op.engagementAnterieur)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, fontSize: 12, color: op.disponible < 0 ? P.red : P.text }}>{formatMontant(op.disponible)}</td>
                    </>
                  )}
                  <td style={{ ...styles.td, textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#666' }}>{op.statut.replace('_', ' ')}</td>
                  <td style={styles.td}>
                    <button onClick={(e) => { e.stopPropagation(); setPreviewOpId(op.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P.orange} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {displayOps.length === 0 && (
              <tr>
                <td colSpan={activeSource !== 'ALL' ? 10 : 7} style={{ textAlign: 'center', padding: '40px', color: P.textMuted }}>
                  Aucun ordre de paiement trouvé avec ces filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODALE D'APERÇU EN TEMPS RÉEL */}
      {livePreviewOp && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.25)',backdropFilter:'blur(3px)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:16,width:400,boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #eee',background:'#FAFAF8',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:800,fontSize:13,color:P.oliveDark,letterSpacing:1}}>APERÇU DIRECT</span>
              <button onClick={() => setPreviewOpId(null)} style={{border:'none',background:'none',cursor:'pointer'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={P.textMuted} strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{padding:'24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
                 <div>
                    <div style={{fontSize:11,color:P.textMuted,fontWeight:700,marginBottom:4}}>RÉFÉRENCE</div>
                    <div style={{fontFamily:'monospace',fontWeight:800,fontSize:16,color:P.text}}>{livePreviewOp.numero}</div>
                 </div>
                 <div style={{background:P.greenLight,padding:'6px 12px',borderRadius:8,color:P.greenDark,fontSize:11,fontWeight:700}}>
                    {livePreviewOp.statut.replace('_', ' ')}
                 </div>
              </div>
              
              <div style={{background:'#F9F9F9',border:'1px solid #EEE',borderRadius:10,padding:16,marginBottom:24}}>
                 {/* APPLICATION DU FORMATAGE JJ/MM/AAAA AUX DATES */}
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Saisie le :</span>
                    <span style={{fontWeight:700}}>{formatDate(livePreviewOp.dateCreation) || 'N/A'}</span>
                 </div>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Transmis CF :</span>
                    <span style={{fontWeight:700}}>{formatDate(livePreviewOp.dateTransmissionCF) || 'En attente'}</span>
                 </div>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Visa CF :</span>
                    <span style={{fontWeight:700,color:livePreviewOp.dateVisaCF?P.greenDark:P.text}}>{formatDate(livePreviewOp.dateVisaCF) || 'En attente'}</span>
                 </div>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Transmis AC :</span>
                    <span style={{fontWeight:700}}>{formatDate(livePreviewOp.dateTransmissionAC) || 'En attente'}</span>
                 </div>
                 <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Paiement :</span>
                    <span style={{fontWeight:700,color:livePreviewOp.datePaiement?P.gold:P.text}}>{formatDate(livePreviewOp.datePaiement) || 'En attente'}</span>
                 </div>
                 
                 {/* DÉTAILS DU PAIEMENT SI EXISTANT */}
                 {(()=>{
                    const pTab = livePreviewOp.paiements || [];
                    const tPaye = pTab.reduce((s, p) => s + (p.montant || 0), 0);
                    const reste = (livePreviewOp.montant || 0) - tPaye;
                    const refs = pTab.map(p => p.reference).filter(Boolean).join(', ');

                    if (tPaye > 0) {
                      return (
                        <>
                          <hr style={{ border: 'none', borderTop: '1px dashed #DDD', margin: '12px 0' }} />
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
                            <span style={{color:'#666',fontWeight:600}}>Montant payé :</span>
                            <span style={{fontWeight:800, color: P.greenDark}}>{formatMontant(tPaye)} F</span>
                          </div>
                          {reste > 0 && (
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
                              <span style={{color:'#666',fontWeight:600}}>Reste à payer :</span>
                              <span style={{fontWeight:800, color: P.red}}>{formatMontant(reste)} F</span>
                            </div>
                          )}
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                            <span style={{color:'#666',fontWeight:600}}>Réf. Virement :</span>
                            <span style={{fontWeight:700, color: P.text}}>{refs || 'Non renseignée'}</span>
                          </div>
                        </>
                      );
                    }
                    return null;
                 })()}
              </div>

              {(livePreviewOp.type === 'REJET' || livePreviewOp.statut.includes('REJETE') || livePreviewOp.statut.includes('DIFFERE')) && (
                 <div style={{background:P.redLight,border:`1px solid ${P.red}44`,borderRadius:10,padding:12,marginBottom:20}}>
                    <div style={{fontSize:11,color:P.red,fontWeight:800,marginBottom:4}}>MOTIF (BLOCAGE / REJET)</div>
                    <div style={{fontSize:12,color:P.red}}>{livePreviewOp.motifRejet || livePreviewOp.motifDiffere || 'Vérifiez les notes.'}</div>
                 </div>
              )}

              <button onClick={() => { setConsultOpData(livePreviewOp); setCurrentPage('consulterOp'); setPreviewOpId(null); }} style={{width:'100%',padding:'12px',background:P.orange,color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',display:'flex',justifyContent:'center',gap:8}}>
                 Ouvrir le dossier complet <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageListeOP;
