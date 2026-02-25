import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// ============================================================
// ICÔNES SVG (Harmonisées avec le reste de l'application)
// ============================================================
const I = {
  wallet: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4H6a2 2 0 01-2-2V6z"/></svg>,
  file: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  checkCircle: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  percent: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  arrowRight: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  alert: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  clock: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  xCircle: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  refresh: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  coins: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="7"/><line x1="8" y1="12" x2="8" y2="12"/><line x1="8" y1="4" x2="8" y2="4"/><line x1="4" y1="8" x2="4" y2="8"/><line x1="12" y1="8" x2="12" y2="8"/><path d="M16 16v-4a4 4 0 00-4-4h-4"/></svg>,
};

// Calcul du nombre de jours entre une date et aujourd'hui
const joursDepuis = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
};

const thStyle = { padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 0.5 };

const PageDashboard = () => {
  const { exerciceActif, budgets, ops, sources, beneficiaires, userProfile, setConsultOpData, setCurrentPage } = useAppContext();
  const [activeAlert, setActiveAlert] = useState('transfert_cf');

  const exerciceActifId = exerciceActif?.id;

  // === DONNÉES DE BASE ===
  const budgetsActifs = useMemo(() => budgets.filter(b => b.exerciceId === exerciceActifId), [budgets, exerciceActifId]);
  
  // On récupère tous les OP de l'exercice
  const allOpsExercice = useMemo(() => ops.filter(op => op.exerciceId === exerciceActifId), [ops, exerciceActifId]);
  
  // RÈGLE : Engagements sans condition sur la dotation (On prend tout sauf les annulés/rejetés/supprimés)
  const opsActifs = useMemo(() => allOpsExercice.filter(op => 
    !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'SUPPRIME'].includes(op.statut)
  ), [allOpsExercice]);

  const totalDotation = useMemo(() => budgetsActifs.reduce((sum, b) => sum + (b.lignes?.reduce((s, l) => s + (l.dotation || 0), 0) || 0), 0), [budgetsActifs]);
  const totalEngagement = useMemo(() => opsActifs.reduce((sum, op) => sum + (op.montant || 0), 0), [opsActifs]);
  const totalDisponible = totalDotation - totalEngagement;
  const tauxExec = totalDotation > 0 ? ((totalEngagement / totalDotation) * 100).toFixed(1) : '0.0';

  // === HELPERS ===
  const getBenefNom = (id) => beneficiaires.find(b => b.id === id)?.nom || 'Inconnu';
  const getSourceSigle = (id) => sources.find(s => s.id === id)?.sigle || sources.find(s => s.id === id)?.nom || '—';
  const getLigneBudgetaire = (op) => {
    const budget = budgets.find(b => b.sourceId === op.sourceId && b.exerciceId === op.exerciceId);
    const ligne = budget?.lignes?.find(l => l.code === op.ligneBudgetaire || l.nom === op.ligneBudgetaire);
    return ligne?.nom || op.ligneBudgetaire || '—';
  };

  // === STATS PAR SOURCE ===
  const sourceStats = useMemo(() => sources.map(source => {
    const sourceBudgets = budgetsActifs.filter(b => b.sourceId === source.id);
    const sourceOps = opsActifs.filter(op => op.sourceId === source.id);
    const dotation = sourceBudgets.reduce((sum, b) => sum + (b.lignes?.reduce((s, l) => s + (l.dotation || 0), 0) || 0), 0);
    const engagement = sourceOps.reduce((sum, op) => sum + (op.montant || 0), 0);
    return { ...source, dotation, engagement, disponible: dotation - engagement, nbOps: sourceOps.length };
  }), [sources, budgetsActifs, opsActifs]);

  // === 7 CATÉGORIES D'ALERTES ===
  const alertes = useMemo(() => {
    
    // Fonction helper pour savoir si un OP a une régularisation (Définitif ou Annulation) active
    const hasValidRegularisation = (opProvId) => {
      return allOpsExercice.some(o => 
        (o.type === 'DEFINITIF' || o.type === 'ANNULATION') && 
        o.opProvisoireId === opProvId &&
        !['REJETE_CF', 'REJETE_AC', 'SUPPRIME'].includes(o.statut)
      );
    };

    // On exclut de base les OP supprimés de toutes les alertes
    const opsForAlerts = allOpsExercice.filter(op => op.statut !== 'SUPPRIME');

    // 1. À transférer au CF : statut EN_COURS ou CREE (Inclut désormais les annulations)
    const transfert_cf = opsForAlerts
      .filter(op => ['EN_COURS', 'CREE'].includes(op.statut))
      .map(op => ({ ...op, _jours: joursDepuis(op.dateCreation) }));

    // 2. À transférer à l'AC : statut VISE_CF (visés par CF, pas encore transmis à AC)
    const transfert_ac = opsForAlerts
      .filter(op => op.statut === 'VISE_CF')
      .map(op => ({ ...op, _jours: joursDepuis(op.dateVisaCF || op.dateCreation) }));

    // 3. Différés : statut DIFFERE_CF ou DIFFERE_AC
    const differe = opsForAlerts
      .filter(op => ['DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut))
      .map(op => ({ ...op, _jours: joursDepuis(op.dateDiffereCF || op.dateDiffereAC || op.dateCreation) }));

    // 4. Attente CF : statut TRANSMIS_CF (transmis, en attente du visa)
    const attente_cf = opsForAlerts
      .filter(op => op.statut === 'TRANSMIS_CF')
      .map(op => ({ ...op, _jours: joursDepuis(op.dateTransmissionCF || op.dateCreation) }));

    // 5. À annuler : RÈGLE (OP Provisoires à annuler)
    const annuler = opsForAlerts
      .filter(op => {
        if (op.type !== 'PROVISOIRE') return false;
        if (['PAYE', 'PAYE_PARTIEL', 'REJETE_CF', 'REJETE_AC', 'ARCHIVE', 'ANNULE'].includes(op.statut)) return false;
        return !hasValidRegularisation(op.id);
      })
      .map(op => ({ ...op, _jours: joursDepuis(op.dateCreation) }));

    // 6. À régulariser : PROVISOIRE + PAYÉ + pas de DEFINITIF/ANNULATION lié
    const regulariser = opsForAlerts
      .filter(op => {
        if (op.type !== 'PROVISOIRE') return false;
        if (!['PAYE', 'PAYE_PARTIEL'].includes(op.statut)) return false;
        return !hasValidRegularisation(op.id);
      })
      .map(op => ({ ...op, _jours: joursDepuis(op.datePaiement || op.dateCreation) }));

    // 7. À solder : RÈGLE (OP en paiement chez AC non soldé)
    const solder = opsForAlerts
      .filter(op => ['TRANSMIS_AC', 'PAYE_PARTIEL'].includes(op.statut))
      .map(op => ({ ...op, _jours: joursDepuis(op.dateTransmissionAC || op.dateCreation) }));

    return {
      transfert_cf: { label: "À transférer au CF", icon: I.arrowRight('#555'), color: "#555", ops: transfert_cf },
      transfert_ac: { label: "À transférer à l'AC", icon: I.arrowRight('#2e7d32'), color: "#2e7d32", ops: transfert_ac },
      differe: { label: "Différés", icon: I.alert('#C5961F'), color: "#C5961F", ops: differe },
      attente_cf: { label: "Attente CF", icon: I.clock('#D4722A'), color: "#D4722A", ops: attente_cf },
      annuler: { label: "À annuler", icon: I.xCircle('#C43E3E'), color: "#C43E3E", ops: annuler },
      regulariser: { label: "À régulariser", icon: I.refresh('#C5961F'), color: "#C5961F", ops: regulariser },
      solder: { label: "À solder", icon: I.coins('#555'), color: "#555", ops: solder },
    };
  }, [allOpsExercice]);

  const alertKeys = Object.keys(alertes);
  const selectedAlert = alertes[activeAlert];
  const selectedOps = selectedAlert?.ops || [];

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const prenom = userProfile?.nom?.split(' ')[0] || userProfile?.email?.split('@')[0] || '';

  return (
    <div>
      <style>{`
        .op-list::-webkit-scrollbar { width: 6px; }
        .op-list::-webkit-scrollbar-thumb { background: #bbb; border-radius: 10px; }
        .op-list::-webkit-scrollbar-thumb:hover { background: #999; }
        .op-list::-webkit-scrollbar-track { background: #f0f0f0; border-radius: 10px; }
        .op-list { scrollbar-width: thin; scrollbar-color: #bbb #f0f0f0; }
      `}</style>

      {/* ====== HEADER ====== */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1B6B2E' }}>Bonjour{prenom ? `, ${prenom}` : ''}</h1>
        <p style={{ color: '#6c757d', fontSize: 13, margin: '6px 0 0', textTransform: 'capitalize' }}>
          {today} — Exercice {exerciceActif?.annee || 'Non défini'}
        </p>
      </div>

      {/* ====== 4 CARTES KPI ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: I.wallet('#2E9940'), label: 'Dotation totale', value: formatMontant(totalDotation), sub: `${sources.length} sources`, color: '#2E9940', accent: '#E8F5E9' },
          { icon: I.file('#C5961F'), label: 'Engagements', value: formatMontant(totalEngagement), sub: `${opsActifs.length} OP validés`, color: '#C5961F', accent: '#fff3e0' },
          { icon: I.checkCircle(totalDisponible >= 0 ? '#2e7d32' : '#C43E3E'), label: 'Disponible', value: formatMontant(totalDisponible), sub: `${(100 - parseFloat(tauxExec)).toFixed(1)}% restant`, color: totalDisponible >= 0 ? '#2e7d32' : '#C43E3E', accent: totalDisponible >= 0 ? '#e8f5e9' : '#ffebee' },
          { icon: I.percent('#D4722A'), label: "Taux d'exécution", value: `${tauxExec}%`, sub: 'Engagements globaux', color: '#D4722A', accent: '#FFF3E8', isPercent: true },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, color: '#6c757d', fontWeight: 600, marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: card.color, fontFamily: 'monospace', letterSpacing: -0.5 }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{card.sub}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: card.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card.icon}</div>
            </div>
            {card.isPercent && (
              <div style={{ marginTop: 12, background: '#eee', borderRadius: 10, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(tauxExec, 100)}%`, height: '100%', background: card.color, borderRadius: 10 }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ====== EXÉCUTION PAR SOURCE ====== */}
      <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          Exécution budgétaire par source
        </h3>
        {sourceStats.length === 0 ? (
          <p style={{ color: '#6c757d', fontSize: 13 }}>Aucune source configurée</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sourceStats.length}, 1fr)`, gap: 24 }}>
            {sourceStats.map((src) => {
              const pct = src.dotation > 0 ? ((src.engagement / src.dotation) * 100).toFixed(1) : '0.0';
              return (
                <div key={src.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 4, background: src.couleur || '#1B6B2E' }} />
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{src.sigle || src.nom}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: src.couleur || '#1B6B2E' }}>{pct}%</span>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 8, height: 12, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${src.couleur || '#1B6B2E'}99, ${src.couleur || '#1B6B2E'})` }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: '#999' }}>Engagé</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#333' }}>{formatMontant(src.engagement)}</div>
                    </div>
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: '#999' }}>Disponible</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: src.disponible >= 0 ? '#2e7d32' : '#C43E3E' }}>{formatMontant(src.disponible)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: '#bbb', marginTop: 6, textAlign: 'center' }}>
                    Dotation : {formatMontant(src.dotation)} • {src.nbOps} OP
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== BARRE D'ONGLETS ALERTES ====== */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0', overflowX: 'auto' }}>
          {alertKeys.map((key) => {
            const a = alertes[key];
            const isActive = activeAlert === key;
            return (
              <div key={key} onClick={() => setActiveAlert(key)} style={{
                padding: '13px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: isActive ? a.color : '#999',
                borderBottom: isActive ? `2px solid ${a.color}` : '2px solid transparent',
                marginBottom: -2, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}>
                {a.icon}
                {a.label}
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                  background: isActive ? a.color + '18' : '#f0f0f0',
                  color: isActive ? a.color : '#999',
                  minWidth: 18, textAlign: 'center'
                }}>{a.ops.length}</span>
              </div>
            );
          })}
        </div>

        {/* ====== LISTE DES OP ====== */}
        <div className="op-list" style={{ maxHeight: 340, overflowY: 'auto' }}>
          {selectedOps.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
              Aucun OP dans cette catégorie
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ ...thStyle, textAlign: 'left' }}>N° OP</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>BÉNÉFICIAIRE</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>OBJET</th>
                  {activeAlert === 'solder' ? (
                    <>
                      <th style={{ ...thStyle, textAlign: 'right' }}>MONTANT</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>PAYÉ</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>SOLDE</th>
                    </>
                  ) : (
                    <>
                      <th style={{ ...thStyle, textAlign: 'left' }}>LIGNE</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>MONTANT</th>
                    </>
                  )}
                  <th style={{ ...thStyle, textAlign: 'center' }}>INFO</th>
                </tr>
              </thead>
              <tbody>
                {selectedOps.map((op, i) => {
                  const mtPaye = op.montantPaye || op.totalPaye || 0;
                  return (
                    <tr key={op.id || i} style={{ borderTop: '1px solid #f3f3f3', cursor: 'pointer' }} onClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'monospace', color: '#333' }}>
                          {(op.numero || '').split('/')[0] || `N°${op.numero}`}
                        </div>
                        <div style={{ fontSize: 11, color: '#bbb' }}>
                          {getSourceSigle(op.sourceId)} • {op.dateCreation || ''}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>
                        {getBenefNom(op.beneficiaireId)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#555', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {op.objet || '—'}
                      </td>
                      {activeAlert === 'solder' ? (
                        <>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#333' }}>
                            {formatMontant(op.montant)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                            {formatMontant(mtPaye)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#C43E3E' }}>
                            {formatMontant((op.montant || 0) - mtPaye)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: '#f0f0f0', color: '#555' }}>
                              {getLigneBudgetaire(op)}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                            {formatMontant(op.montant)}
                          </td>
                        </>
                      )}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {op._jours > 0 ? (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                            background: op._jours > 15 ? '#ffebee' : '#f5f5f5',
                            color: op._jours > 15 ? '#C43E3E' : '#999'
                          }}>
                            {op._jours}j
                          </span>
                        ) : op.motifDiffereCF || op.motifDiffereAC ? (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: '#fff3e0', color: '#C5961F' }}>
                            Motif renseigné
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: '#ccc' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageDashboard;
