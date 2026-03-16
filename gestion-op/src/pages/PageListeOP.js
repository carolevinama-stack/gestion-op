{/* FENÊTRE FLOTTANTE D'APERÇU COMPLET */}
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
                    <div style={{fontFamily:'monospace', fontWeight:800, fontSize:18, color:P.text}}>{livePreviewOp.numero}</div>
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

              {/* MOTIFS DE BLOCAGE (DIFFERE / REJET) */}
              {(livePreviewOp.motifRejet || livePreviewOp.motifDiffere) && (
                 <div style={{background:P.redLight, border:`1px solid ${P.red}44`, borderRadius:10, padding:12, marginBottom:20}}>
                    <div style={{fontSize:11, color:P.red, fontWeight:800, marginBottom:4}}>MOTIF DE BLOCAGE</div>
                    <div style={{fontSize:12, color:P.red, fontStyle:'italic'}}>{livePreviewOp.motifRejet || livePreviewOp.motifDiffere}</div>
                 </div>
              )}

              {/* CALCUL DES PAIEMENTS PARTIELS */}
              {(() => {
                  const paiements = livePreviewOp.paiements || [];
                  const totalPaye = paiements.reduce((sum, p) => sum + (Number(p.montant) || 0), 0);
                  const reste = (Number(livePreviewOp.montant) || 0) - totalPaye;
                  
                  if (totalPaye > 0) {
                    return (
                      <div style={{background:P.greenLight, border:`1px solid ${P.green}33`, borderRadius:10, padding:16, marginBottom:20}}>
                        <div style={{fontSize:11, color:P.greenDark, fontWeight:800, marginBottom:8}}>SITUATION DES PAIEMENTS</div>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5}}>
                          <span>Déjà payé :</span>
                          <span style={{fontWeight:800}}>{formatMontant(totalPaye)} F</span>
                        </div>
                        {reste > 0 && (
                          <div style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5, color: P.red}}>
                            <span>Reste à payer :</span>
                            <span style={{fontWeight:800}}>{formatMontant(reste)} F</span>
                          </div>
                        )}
                        <div style={{fontSize:11, marginTop:8, paddingTop:8, borderTop:'1px dashed #ccc', color:'#666'}}>
                          <b>Réf. :</b> {paiements.map(p => p.reference).filter(Boolean).join(' / ') || 'N/A'}
                        </div>
                      </div>
                    );
                  }
                  return null;
              })()}

              <button onClick={() => { setConsultOpData(livePreviewOp); setCurrentPage('consulterOp'); setPreviewOpId(null); }} style={{width:'100%', padding:'12px', background:P.orange, color:'#fff', border:'none', borderRadius:10, fontWeight:700, cursor:'pointer'}}>
                 Ouvrir le dossier complet pour modification
              </button>
            </div>
          </div>
        </div>
      )}
