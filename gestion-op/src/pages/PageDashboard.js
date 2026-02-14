import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

// Calcul du nombre de jours entre une date et aujourd'hui
const joursDepuis = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
};

const thStyle = { padding: '10px 16px', fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: 0.5 };

const PageDashboard = () => {
  const { exerciceActif, budgets, ops, sources, beneficiaires, userProfile } = useAppContext();
  const [activeAlert, setActiveAlert] = useState('transfert_cf');

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
  const getSourceCouleur = (id) => sources.find(s => s.id === id)?.couleur || '#0f4c3a';
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
    // À transférer au CF : statut EN_COURS (créés, pas encore transmis)
    const transfert_cf = allOpsExercice
      .filter(op => op.statut === 'EN_COURS' && op.type !== 'ANNULATION')
      .map(op => ({ ...op, _jours: joursDepuis(op.dateCreation) }));

    // À transférer à l'AC : statut VISE_CF (visés par CF, pas encore transmis à AC)
    const transfert_ac = allOpsExercice
      .filter(op => op.statut === 'VISE_CF')
      .map(op => ({ ...op, _jours: joursDepuis(op.dateVisaCF || op.dateCreation) }));

    // Différés : statut DIFFERE ou DIFFERE_CF ou DIFFERE_AC
    const differe = allOpsExercice
      .filter(op => ['DIFFERE', 'DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut))
      .map(op => ({ ...op, _jours: joursDepuis(op.dateDiffere || op.dateCreation) }));

    // Attente CF : statut TRANSMIS_CF (transmis, en attente du visa)
    const attente_cf = allOpsExercice
      .filter(op => op.statut === 'TRANSMIS_CF')
      .map(op => ({ ...op, _jours: joursDepuis(op.dateTransmissionCF || op.dateCreation) }));

    // À annuler : PROVISOIRE + > 60 jours + pas régularisé
    const annuler = allOpsExercice
      .filter(op => op.type === 'PROVISOIRE' && op.statut !== 'REGULARISE' && joursDepuis(op.dateCreation) > 60)
      .map(op => ({ ...op, _jours: joursDepuis(op.dateCreation) }));

    // À régulariser : PROVISOIRE + PAYE + pas de DEFINITIF lié
    const regulariser = allOpsExercice
      .filter(op => {
        if (op.type !== 'PROVISOIRE' || op.statut === 'REGULARISE') return false;
        if (op.statut !== 'PAYE') return false;
        // Vérifie si un DEFINITIF est déjà lié
        const hasDefinitif = allOpsExercice.some(o => o.type === 'DEFINITIF' && o.opProvisoireId === op.id);
        return !hasDefinitif;
      })
      .map(op => ({ ...op, _jours: joursDepuis(op.datePaiement || op.dateCreation) }));

    // À solder : paiement partiel (montantPaye > 0 et < montant)
    const solder = allOpsExercice
      .filter(op => op.montantPaye && op.montantPaye > 0 && op.montantPaye < op.montant && op.statut !== 'REJETE')
      .map(op => ({ ...op, _jours: joursDepuis(op.datePaiement || op.dateCreation) }));

    return {
      transfert_cf: { label: "À transférer au CF", icon: "📤", color: "#1565c0", ops: transfert_cf },
      transfert_ac: { label: "À transférer à l'AC", icon: "📨", color: "#2e7d32", ops: transfert_ac },
      differe: { label: "Différés", icon: "⚠️", color: "#e65100", ops: differe },
      attente_cf: { label: "Attente CF", icon: "🕐", color: "#0097a7", ops: attente_cf },
      annuler: { label: "À annuler", icon: "🗑️", color: "#c62828", ops: annuler },
      regulariser: { label: "À régulariser", icon: "📝", color: "#6a1b9a", ops: regulariser },
      solder: { label: "À solder", icon: "💰", color: "#00695c", ops: solder },
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
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Bonjour{prenom ? `, ${prenom}` : ''} 👋</h1>
        <p style={{ color: '#6c757d', fontSize: 13, margin: '6px 0 0', textTransform: 'capitalize' }}>
          {today} — Exercice {exerciceActif?.annee || 'Non défini'}
        </p>
      </div>

      {/* ====== 4 CARTES KPI ====== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '💰', label: 'Dotation totale', value: formatMontant(totalDotation), sub: `${sources.length} sources`, color: '#0f4c3a', accent: '#e8f5e9' },
          { icon: '📝', label: 'Engagements', value: formatMontant(totalEngagement), sub: `${opsActifs.length} OP`, color: '#e65100', accent: '#fff3e0' },
          { icon: '✅', label: 'Disponible', value: formatMontant(totalDisponible), sub: `${(100 - parseFloat(tauxExec)).toFixed(1)}% restant`, color: totalDisponible >= 0 ? '#2e7d32' : '#c62828', accent: totalDisponible >= 0 ? '#e8f5e9' : '#ffebee' },
          { icon: '📊', label: "Taux d'exécution", value: `${tauxExec}%`, sub: 'Définitifs + Directs', color: '#1565c0', accent: '#e3f2fd', isPercent: true },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: '#6c757d', fontWeight: 600, marginBottom: 8 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: card.color, fontFamily: 'monospace', letterSpacing: -0.5 }}>{card.value}</div>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{card.sub}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: card.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{card.icon}</div>
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
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏦</span> Exécution budgétaire par source
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
                      <div style={{ width: 12, height: 12, borderRadius: 4, background: src.couleur || '#0f4c3a' }} />
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{src.sigle || src.nom}</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: src.couleur || '#0f4c3a' }}>{pct}%</span>
                  </div>
                  <div style={{ background: '#f0f0f0', borderRadius: 8, height: 12, overflow: 'hidden', marginBottom: 10 }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 8, background: `linear-gradient(90deg, ${src.couleur || '#0f4c3a'}99, ${src.couleur || '#0f4c3a'})` }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#999' }}>Engagé</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: '#333' }}>{formatMontant(src.engagement)}</div>
                    </div>
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#999' }}>Disponible</div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: src.disponible >= 0 ? '#2e7d32' : '#c62828' }}>{formatMontant(src.disponible)}</div>
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
                padding: '13px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                color: isActive ? a.color : '#999',
                borderBottom: isActive ? `2px solid ${a.color}` : '2px solid transparent',
                marginBottom: -2, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap'
              }}>
                <span style={{ fontSize: 13 }}>{a.icon}</span>
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
              ✅ Aucun OP dans cette catégorie
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
                {selectedOps.map((op, i) => (
                  <tr key={op.id || i} style={{ borderTop: '1px solid #f3f3f3' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: '#333' }}>
                        {(op.numero || '').split('/')[0] || `N°${op.numero}`}
                      </div>
                      <div style={{ fontSize: 10, color: '#bbb' }}>
                        {getSourceSigle(op.sourceId)} • {op.dateCreation || ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>
                      {getBenefNom(op.beneficiaireId)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#555' }}>
                      {op.objet || '—'}
                    </td>
                    {activeAlert === 'solder' ? (
                      <>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: '#333' }}>
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
                      {op._jours ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
                          background: op._jours > 7 ? '#ffebee' : '#f5f5f5',
                          color: op._jours > 7 ? '#c62828' : '#999'
                        }}>
                          {op._jours}j
                        </span>
                      ) : op.observationDiffere ? (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 8, background: '#fff3e0', color: '#e65100' }}>
                          {op.observationDiffere}
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, color: '#ccc' }}>—</span>
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
