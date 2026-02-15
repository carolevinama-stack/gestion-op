import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// ===================== PALETTE PIF2 =====================
const P = {
  bgApp: '#F6F4F1',
  bgCard: '#FDFCFA',
  bgSection: '#ECE2CE',
  sidebarDark: '#223300',
  olive: '#4B5D16',
  olivePale: '#E8F0D8',
  gold: '#F2B635',
  orange: '#E45C10',
  labelMuted: '#8A7D6B',
};

// ===================== ICÔNES SVG (Lucide-style) =====================
const Icons = {
  dotation: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  engagement: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  disponible: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  taux: (c) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  source: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 14h.01"/><path d="M10 14h.01"/></svg>,
  transfert_cf: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17l9.2-9.2M17 17V7H7"/></svg>,
  transfert_ac: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  differe: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  attente_cf: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  annuler: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  regulariser: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  solder: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/><path d="M6 14h.01"/><path d="M10 14h.01"/></svg>,
  checkCircle: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
};

// Calcul du nombre de jours entre une date et aujourd'hui
const joursDepuis = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
};

const thStyle = { padding: '10px 16px', fontSize: 10, fontWeight: 700, color: P.labelMuted, letterSpacing: 0.5 };

const PageDashboard = () => {
  const { exerciceActif, budgets, ops, sources, beneficiaires, userProfile } = useAppContext();
  const [activeAlert, setActiveAlert] = useState('transfert_cf');
  const [hoveredTab, setHoveredTab] = useState(null);

  const exerciceActifId = exerciceActif?.id;

  // === DONNÉES DE BASE ===
  const budgetsActifs = useMemo(() => budgets.filter(b => b.exerciceId === exerciceActifId), [budgets, exerciceActifId]);
  const allOpsExercice = useMemo(() => ops.filter(op => op.exerciceId === exerciceActifId), [ops, exerciceActifId]);
  const opsActifs = useMemo(() => allOpsExercice.filter(op => ['DIRECT', 'DEFINITIF'].includes(op.type) && op.statut !== 'REJETE'), [allOpsExercice]);

  const totalDotation = useMemo(() => budgetsActifs.reduce((sum, b) => sum + (b.lignes?.reduce((s, l) => s + (l.dotation || 0), 0) || 0), 0), [budgetsActifs]);
  const totalEngagement = useMemo(() => opsActifs.reduce((sum, op) => sum + (op.montant || 0), 0), [opsActifs]);
  const totalDisponible = totalDotation - totalEngagement;
  const tauxExec = totalDotation > 0 ? ((totalEngagement / totalDotation) * 100).toFixed(1) : '0.0';

  // === HELPERS ===
  const getBenefNom = (id) => beneficiaires.find(b => b.id === id)?.nom || 'Inconnu';
  const getSourceSigle = (id) => sources.find(s => s.id === id)?.sigle || sources.find(s => s.id === id)?.nom || '—';
  const getSourceCouleur = (id) => sources.find(s => s.id === id)?.couleur || P.olive;
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
    const transfert_cf = allOpsExercice
      .filter(op => ['EN_COURS', 'CREE'].includes(op.statut) && op.type !== 'ANNULATION')
      .map(op => ({ ...op, _jours: joursDepuis(op.dateCreation) }));

    const transfert_ac = allOpsExercice
      .filter(op => op.statut === 'VISE_CF')
      .map(op => ({ ...op, _jours: joursDepuis(op.dateVisaCF || op.dateCreation) }));

    const differe = allOpsExercice
      .filter(op => ['DIFFERE', 'DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut))
      .map(op => ({ ...op, _jours: joursDepuis(op.dateDiffere || op.dateCreation) }));

    const attente_cf = allOpsExercice
      .filter(op => op.statut === 'TRANSMIS_CF')
      .map(op => ({ ...op, _jours: joursDepuis(op.dateTransmissionCF || op.dateCreation) }));

    const annuler = allOpsExercice
      .filter(op => op.type === 'PROVISOIRE' && op.statut !== 'REGULARISE' && joursDepuis(op.dateCreation) > 60)
      .map(op => ({ ...op, _jours: joursDepuis(op.dateCreation) }));

    const regulariser = allOpsExercice
      .filter(op => {
        if (op.type !== 'PROVISOIRE' || op.statut === 'REGULARISE') return false;
        if (op.statut !== 'PAYE') return false;
        const hasDefinitif = allOpsExercice.some(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id);
        return !hasDefinitif;
      })
      .map(op => ({ ...op, _jours: joursDepuis(op.datePaiement || op.dateCreation) }));

    const solder = allOpsExercice
      .filter(op => op.montantPaye && op.montantPaye > 0 && op.montantPaye < op.montant && op.statut !== 'REJETE')
      .map(op => ({ ...op, _jours: joursDepuis(op.datePaiement || op.dateCreation) }));

    return {
      transfert_cf: { label: "À transférer au CF", iconKey: "transfert_cf", color: P.olive, ops: transfert_cf },
      transfert_ac: { label: "À transférer à l'AC", iconKey: "transfert_ac", color: "#2e7d32", ops: transfert_ac },
      differe: { label: "Différés", iconKey: "differe", color: P.orange, ops: differe },
      attente_cf: { label: "Attente CF", iconKey: "attente_cf", color: "#0097a7", ops: attente_cf },
      annuler: { label: "À annuler", iconKey: "annuler", color: "#c62828", ops: annuler },
      regulariser: { label: "À régulariser", iconKey: "regulariser", color: "#6a1b9a", ops: regulariser },
      solder: { label: "À solder", iconKey: "solder", color: "#00695c", ops: solder },
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
        .op-list::-webkit-scrollbar-thumb { background: ${P.bgSection}; border-radius: 10px; }
        .op-list::-webkit-scrollbar-thumb:hover { background: ${P.labelMuted}; }
        .op-list::-webkit-scrollbar-track { background: ${P.bgApp}; border-radius: 10px; }
        .op-list { scrollbar-width: thin; scrollbar-color: ${P.bgSection} ${P.bgApp}; }
      `}</style>

      {/* ====== HEADER ====== */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: P.sidebarDark }}>Bonjour{prenom ? `, ${prenom}` : ''}</h1>
        <p style={{ color: P.labelMuted, fontSize: 13, margin: '6px 0 0', textTransform: 'capitalize' }}>
          {today} — Exercice {exerciceActif?.annee || 'Non défini'}
        </p>
      </div>

      {/* ====== 4 CARTES KPI ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { iconKey: 'dotation', label: 'Dotation totale', value: formatMontant(totalDotation), sub: `${sources.length} sources`, color: P.olive, accent: P.olivePale },
          { iconKey: 'engagement', label: 'Engagements', value: formatMontant(totalEngagement), sub: `${opsActifs.length} OP`, color: P.orange, accent: '#FDEBD0' },
          { iconKey: 'disponible', label: 'Disponible', value: formatMontant(totalDisponible), sub: `${(100 - parseFloat(tauxExec)).toFixed(1)}% restant`, color: totalDisponible >= 0 ? '#2e7d32' : '#c62828', accent: totalDisponible >= 0 ? P.olivePale : '#ffebee' },
          { iconKey: 'taux', label: "Taux d'exécution", value: `${tauxExec}%`, sub: 'Définitifs + Directs', color: P.sidebarDark, accent: P.bgSection, isPercent: true },
        ].map((card, i) => (
          <div key={i} style={{ background: P.bgCard, borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(34,51,0,0.04)', position: 'relative', overflow: 'hidden', border: '1px solid rgba(34,51,0,0.04)' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: P.labelMuted, fontWeight: 600, marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: card.color, fontFamily: 'monospace', letterSpacing: -0.5 }}>{card.value}</div>
                <div style={{ fontSize: 11, color: P.labelMuted, marginTop: 4, opacity: 0.7 }}>{card.sub}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: card.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icons[card.iconKey](card.color)}
              </div>
            </div>
            {card.isPercent && (
              <div style={{ marginTop: 12, background: P.bgSection, borderRadius: 10, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(tauxExec, 100)}%`, height: '100%', background: card.color, borderRadius: 10, transition: 'width 0.8s ease' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ====== EXÉCUTION PAR SOURCE ====== */}
      <div style={{ background: P.bgCard, borderRadius: 14, padding: 24, boxShadow: '0 1px 4px rgba(34,51,0,0.04)', marginBottom: 24, border: '1px solid rgba(34,51,0,0.04)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8, color: P.sidebarDark }}>
          {Icons.source(P.olive)} Exécution budgétaire par source
        </h3>
        {sourceStats.length === 0 ? (
          <p style={{ color: P.labelMuted, fontSize: 13 }}>Aucune source configurée</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sourceStats.length}, 1fr)`, gap: 24 }}>
            {sourceStats.map((src) => {
              const pct = src.dotation > 0 ? ((src.engagement / src.dotation) * 100).toFixed(1) : '0.0';
              return (
                <div key={src.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 4, background: src.couleur || P.olive }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: P.sidebarDark }}>{src.sigle || src.nom}</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: src.couleur || P.olive }}>{pct}%</span>
                  </div>
                  <div style={{ background: P.bgSection, borderRadius: 8, height: 12, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${src.couleur || P.olive}99, ${src.couleur || P.olive})`, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: P.bgApp, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: P.labelMuted }}>Engagé</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: P.sidebarDark }}>{formatMontant(src.engagement)}</div>
                    </div>
                    <div style={{ background: P.bgApp, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: P.labelMuted }}>Disponible</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: src.disponible >= 0 ? '#2e7d32' : '#c62828' }}>{formatMontant(src.disponible)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: P.labelMuted, marginTop: 6, textAlign: 'center', opacity: 0.7 }}>
                    Dotation : {formatMontant(src.dotation)} • {src.nbOps} OP
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ====== BARRE D'ONGLETS ALERTES ====== */}
      <div style={{ background: P.bgCard, borderRadius: 14, boxShadow: '0 1px 4px rgba(34,51,0,0.04)', overflow: 'hidden', border: '1px solid rgba(34,51,0,0.04)' }}>

        <div style={{ display: 'flex', borderBottom: `2px solid ${P.bgSection}`, overflowX: 'auto', gap: 2, padding: '6px 6px 0' }}>
          {alertKeys.map((key) => {
            const a = alertes[key];
            const isActive = activeAlert === key;
            const isHov = hoveredTab === key && !isActive;
            return (
              <div key={key}
                onClick={() => setActiveAlert(key)}
                onMouseEnter={() => setHoveredTab(key)}
                onMouseLeave={() => setHoveredTab(null)}
                style={{
                  padding: '10px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  color: isActive ? a.color : isHov ? P.sidebarDark : P.labelMuted,
                  background: isActive ? a.color + '14' : isHov ? P.bgApp : 'transparent',
                  borderRadius: '10px 10px 0 0',
                  borderBottom: isActive ? `2.5px solid ${a.color}` : '2.5px solid transparent',
                  marginBottom: -2, transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
                }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {Icons[a.iconKey]?.(isActive ? a.color : isHov ? P.sidebarDark : P.labelMuted)}
                </span>
                {a.label}
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                  background: isActive ? a.color + '22' : P.bgApp,
                  color: isActive ? a.color : P.labelMuted,
                  minWidth: 18, textAlign: 'center'
                }}>{a.ops.length}</span>
              </div>
            );
          })}
        </div>

        {/* ====== LISTE DES OP ====== */}
        <div className="op-list" style={{ maxHeight: 340, overflowY: 'auto' }}>
          {selectedOps.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: P.labelMuted, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {Icons.checkCircle(P.olive)} Aucun OP dans cette catégorie
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: P.bgSection }}>
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
                {selectedOps.map((op, i) => (
                  <tr key={op.id || i} style={{ borderTop: `1px solid ${P.bgApp}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = P.bgApp}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: P.sidebarDark }}>
                        {(op.numero || '').split('/')[0] || `N°${op.numero}`}
                      </div>
                      <div style={{ fontSize: 10, color: P.labelMuted, opacity: 0.7 }}>
                        {getSourceSigle(op.sourceId)} • {op.dateCreation || ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: P.sidebarDark }}>
                      {getBenefNom(op.beneficiaireId)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: P.labelMuted }}>
                      {op.objet || '—'}
                    </td>
                    {activeAlert === 'solder' ? (
                      <>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: P.sidebarDark }}>
                          {formatMontant(op.montant)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                          {formatMontant(op.montantPaye || 0)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#c62828' }}>
                          {formatMontant(op.montant - (op.montantPaye || 0))}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: P.bgApp, color: P.labelMuted, fontWeight: 500 }}>
                            {getLigneBudgetaire(op)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: P.sidebarDark }}>
                          {formatMontant(op.montant)}
                        </td>
                      </>
                    )}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {op._jours ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                          background: op._jours > 7 ? '#c6282818' : P.bgApp,
                          color: op._jours > 7 ? '#c62828' : P.labelMuted
                        }}>
                          {op._jours}j
                        </span>
                      ) : op.observationDiffere ? (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: P.orange + '18', color: P.orange }}>
                          {op.observationDiffere}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: P.labelMuted, opacity: 0.5 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageDashboard;
