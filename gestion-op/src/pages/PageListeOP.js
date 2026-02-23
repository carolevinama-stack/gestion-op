import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

const PageListeOP = () => {
  const { sources, exerciceActif, beneficiaires, budgets, ops, setCurrentPage, setConsultOpData } = useAppContext();
  const [activeSource, setActiveSource] = useState('ALL');
  const [filters, setFilters] = useState({ type: '', search: '', ligneBudgetaire: '', dateDebut: '', dateFin: '', statut: '' });
  
  // MODIFICATION : On stocke uniquement l'ID pour avoir les données en temps réel
  const [previewOpId, setPreviewOpId] = useState(null);

  const getBenNom = (op) => op.beneficiaireNom || beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || 'N/A';

  const displayOps = useMemo(() => {
    let baseOps = ops.filter(op => {
      if (op.exerciceId !== exerciceActif?.id) return false;
      if (activeSource !== 'ALL' && op.sourceId !== activeSource) return false;
      return true;
    });

    // Tri chronologique STRICT (du plus ancien au plus récent) pour le calcul des cumuls
    const sorted = [...baseOps].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    const cumulParLigne = {};
    
    const withCalculations = sorted.map(op => {
      const lb = op.ligneBudgetaire;
      const budgetSource = budgets.find(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId);
      const dotation = budgetSource?.lignes?.find(l => l.code === lb)?.dotation || 0;
      
      const engagementAnterieur = cumulParLigne[lb] || 0;
      
      // La magie de la contre-passation : Si op.montant est négatif (Rejet), ça soustrait automatiquement !
      cumulParLigne[lb] = (cumulParLigne[lb] || 0) + (op.montant || 0);

      return { ...op, dotationLigne: dotation, engagementAnterieur, disponible: dotation - cumulParLigne[lb] };
    });

    // Application des filtres et inversion pour affichage (du plus récent au plus ancien)
    return withCalculations.filter(op => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchString = `${op.numero} ${getBenNom(op)} ${op.montant} ${formatMontant(op.montant)}`.toLowerCase();
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

  // Récupération des données fraîches pour la modale
  const livePreviewOp = useMemo(() => ops.find(o => o.id === previewOpId), [ops, previewOpId]);

  return (
    <div> {/* DIV Simple pour éviter le décalage de marge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={styles.title}>Liste des Ordres de Paiement</h1>
        <button onClick={() => setCurrentPage('nouvelOp')} style={styles.button}>+ Nouvel OP</button>
      </div>

      <div style={styles.tabs}>
        <div onClick={() => setActiveSource('ALL')} style={activeSource === 'ALL' ? styles.tabActive : styles.tab}>CUMUL GENERAL</div>
        {sources.map(s => <div key={s.id} onClick={() => setActiveSource(s.id)} style={activeSource === s.id ? styles.tabActive : styles.tab}>{s.sigle}</div>)}
      </div>

      <div style={{ ...styles.card, background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2DFD8', marginBottom: 20 }}>
        <div style={styles.filterGrid}>
          <div>
            <label style={{...styles.label, fontSize: 11, color: '#7A7A7A', fontWeight: 700}}>Recherche globale</label>
            <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="N°, bénéficiaire, montant..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
          </div>
          <div>
            <label style={{...styles.label, fontSize: 11, color: '#7A7A7A', fontWeight: 700}}>Type</label>
            <select style={{...styles.select, marginBottom: 0}} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">Tous les types</option>
              <option value="DIRECT">Direct</option>
              <option value="PROVISOIRE">Provisoire</option>
              <option value="DEFINITIF">Définitif</option>
              <option value="ANNULATION">Annulation</option>
              <option value="REJET">Rejet (Contre-passation)</option>
            </select>
          </div>
          <div>
            <label style={{...styles.label, fontSize: 11, color: '#7A7A7A', fontWeight: 700}}>Ligne Budg.</label>
            <input type="text" style={{...styles.input, marginBottom: 0}} placeholder="Code" value={filters.ligneBudgetaire} onChange={e => setFilters({...filters, ligneBudgetaire: e.target.value})} />
          </div>
          <div>
            <label style={{...styles.label, fontSize: 11, color: '#7A7A7A', fontWeight: 700}}>Statut</label>
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
          <div style={{display: 'flex', alignItems: 'flex-end'}}>
            <button style={{...styles.buttonIcon, background: '#f5f5f5', border: '1px solid #ddd'}} onClick={() => setFilters({search:'', type:'', ligneBudgetaire:'', dateDebut:'', dateFin:'', statut:''})} title="Effacer les filtres">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2DFD8', overflow: 'hidden' }}>
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
              <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase'}}>N° OP</th>
              <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase'}}>Type</th>
              <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase'}}>Bénéficiaire</th>
              <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase'}}>Ligne</th>
              {activeSource !== 'ALL' && <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase', textAlign: 'right'}}>Dotation</th>}
              <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase', textAlign: 'right'}}>Montant</th>
              {activeSource !== 'ALL' && (
                <>
                  <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase', textAlign: 'right'}}>Engag. Ant.</th>
                  <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase', textAlign: 'right'}}>Disponible</th>
                </>
              )}
              <th style={{...styles.th, fontSize: 11, color: '#7A7A7A', textTransform: 'uppercase', textAlign: 'center'}}>Statut</th>
              <th style={{...styles.th, background: '#FAFAF8'}}></th>
            </tr>
          </thead>
          <tbody>
            {displayOps.map((op, i) => {
              const isRejet = op.type === 'REJET';
              
              return (
                <tr key={i} onDoubleClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ borderBottom: '1px solid #eee', cursor: 'pointer', background: isRejet ? '#FFF5F5' : 'transparent' }}>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 700, color: isRejet ? '#C43E3E' : '#333' }}>{op.numero}</td>
                  <td style={{ ...styles.td, fontSize: '10px', fontWeight: isRejet ? 800 : 600, color: isRejet ? '#C43E3E' : '#666' }}>{op.type}</td>
                  <td style={{ ...styles.td, fontWeight: 600, fontSize: 12 }}>{getBenNom(op)}</td>
                  <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: 11 }}>{op.ligneBudgetaire}</td>
                  {activeSource !== 'ALL' && <td style={{ ...styles.td, textAlign: 'right', fontSize: 12 }}>{formatMontant(op.dotationLigne)}</td>}
                  
                  {/* Montant en Rouge si c'est un rejet (Négatif) */}
                  <td style={{ ...styles.td, textAlign: 'right', fontWeight: 800, color: op.montant < 0 ? '#C43E3E' : '#1B6B2E' }}>
                    {formatMontant(op.montant)}
                  </td>
                  
                  {activeSource !== 'ALL' && (
                    <>
                      <td style={{ ...styles.td, textAlign: 'right', color: '#666', fontSize: 12 }}>{formatMontant(op.engagementAnterieur)}</td>
                      <td style={{ ...styles.td, textAlign: 'right', fontWeight: 700, fontSize: 12, color: op.disponible < 0 ? '#C43E3E' : '#333' }}>{formatMontant(op.disponible)}</td>
                    </>
                  )}
                  <td style={{ ...styles.td, textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#666' }}>{op.statut.replace('_', ' ')}</td>
                  <td style={styles.td}>
                    <button onClick={(e) => { e.stopPropagation(); setPreviewOpId(op.id); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D4722A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
            {displayOps.length === 0 && (
              <tr>
                <td colSpan={activeSource !== 'ALL' ? 10 : 7} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
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
              <span style={{fontWeight:800,fontSize:13,color:'#4A5A42',letterSpacing:1}}>APERÇU DIRECT</span>
              <button onClick={() => setPreviewOpId(null)} style={{border:'none',background:'none',cursor:'pointer'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{padding:'24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
                 <div>
                    <div style={{fontSize:11,color:'#999',fontWeight:700,marginBottom:4}}>RÉFÉRENCE</div>
                    <div style={{fontFamily:'monospace',fontWeight:800,fontSize:16,color:'#333'}}>{livePreviewOp.numero}</div>
                 </div>
                 <div style={{background:'#E8F5E9',padding:'6px 12px',borderRadius:8,color:'#1B6B2E',fontSize:11,fontWeight:700}}>
                    {livePreviewOp.statut.replace('_', ' ')}
                 </div>
              </div>
              
              <div style={{background:'#F9F9F9',border:'1px solid #EEE',borderRadius:10,padding:16,marginBottom:24}}>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Saisie le :</span>
                    <span style={{fontWeight:700}}>{livePreviewOp.dateCreation || 'N/A'}</span>
                 </div>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Transmis CF :</span>
                    <span style={{fontWeight:700}}>{livePreviewOp.dateTransmissionCF || 'En attente'}</span>
                 </div>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Visa CF :</span>
                    <span style={{fontWeight:700,color:livePreviewOp.dateVisaCF?'#2E9940':'#333'}}>{livePreviewOp.dateVisaCF || 'En attente'}</span>
                 </div>
                 <div style={{display:'flex',justifyContent:'space-between',marginBottom:12,fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Transmis AC :</span>
                    <span style={{fontWeight:700}}>{livePreviewOp.dateTransmissionAC || 'En attente'}</span>
                 </div>
                 <div style={{display:'flex',justifyContent:'space-between',fontSize:12}}>
                    <span style={{color:'#666',fontWeight:600}}>Paiement :</span>
                    <span style={{fontWeight:700,color:livePreviewOp.datePaiement?'#C5961F':'#333'}}>{livePreviewOp.datePaiement || 'En attente'}</span>
                 </div>
              </div>

              {(livePreviewOp.type === 'REJET' || livePreviewOp.statut.includes('REJETE') || livePreviewOp.statut.includes('DIFFERE')) && (
                 <div style={{background:'#FFF5F5',border:'1px solid #FFCDD2',borderRadius:10,padding:12,marginBottom:20}}>
                    <div style={{fontSize:11,color:'#C43E3E',fontWeight:800,marginBottom:4}}>MOTIF (BLOCAGE / REJET)</div>
                    <div style={{fontSize:12,color:'#C43E3E'}}>{livePreviewOp.motifRejet || livePreviewOp.motifDiffere || 'Vérifiez les notes.'}</div>
                 </div>
              )}

              <button onClick={() => { setConsultOpData(livePreviewOp); setCurrentPage('consulterOp'); setPreviewOpId(null); }} style={{width:'100%',padding:'12px',background:'#D4722A',color:'#fff',border:'none',borderRadius:10,fontWeight:700,cursor:'pointer',display:'flex',justifyContent:'center',gap:8}}>
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
