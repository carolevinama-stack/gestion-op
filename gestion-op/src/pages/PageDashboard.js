import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

const I = {
  wallet: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 01-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4H6a2 2 0 01-2-2V6z"/></svg>,
  file: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  checkCircle: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  percent: (c, s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
  arrowRight: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  clock: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  xCircle: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  refresh: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
  coins: (c, s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="7"/><path d="M16 16v-4a4 4 0 00-4-4h-4"/></svg>,
};

const joursDepuis = (dateStr) => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
};

const thStyle = { 
  padding: '14px 16px', 
  fontSize: 11, 
  fontWeight: 700, 
  color: '#999', 
  textTransform: 'uppercase',
  background: '#fff',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  borderBottom: '2px solid #f0f0f0'
};

const PageDashboard = () => {
  const { exerciceActif, budgets, ops, sources, beneficiaires, userProfile, setConsultOpData, setCurrentPage } = useAppContext();
  const [activeAlert, setActiveAlert] = useState('transfert_cf');

  const budgetsActifs = useMemo(() => budgets.filter(b => b.exerciceId === exerciceActif?.id), [budgets, exerciceActif]);
  const allOpsExercice = useMemo(() => ops.filter(op => op.exerciceId === exerciceActif?.id), [ops, exerciceActif]);
  const opsActifs = useMemo(() => allOpsExercice.filter(op => !['REJETE_CF', 'REJETE_AC', 'ANNULE', 'SUPPRIME'].includes(op.statut)), [allOpsExercice]);

  const totalDotation = useMemo(() => budgetsActifs.reduce((sum, b) => sum + (b.lignes?.reduce((s, l) => s + (l.dotation || 0), 0) || 0), 0), [budgetsActifs]);
  const totalEngagement = useMemo(() => opsActifs.reduce((sum, op) => sum + (op.montant || 0), 0), [opsActifs]);
  const totalDisponible = totalDotation - totalEngagement;
  const tauxExec = totalDotation > 0 ? ((totalEngagement / totalDotation) * 100).toFixed(1) : '0.0';

  const getBenefNom = (id) => beneficiaires.find(b => b.id === id)?.nom || 'Inconnu';
  const getSourceSigle = (id) => sources.find(s => s.id === id)?.sigle || '—';

  const alertes = useMemo(() => {
    const hasValidRegul = (id) => allOpsExercice.some(o => (o.type === 'DEFINITIF' || o.type === 'ANNULATION') && o.opProvisoireId === id && !['REJETE_CF', 'REJETE_AC', 'SUPPRIME'].includes(o.statut));
    const opsF = allOpsExercice.filter(op => op.statut !== 'SUPPRIME');

    return {
      transfert_cf: { label: "À transférer au CF", icon: I.arrowRight('#555'), color: "#555", ops: opsF.filter(op => ['EN_COURS', 'CREE'].includes(op.statut)) },
      transfert_ac: { label: "À transférer à l'AC", icon: I.arrowRight('#2e7d32'), color: "#2e7d32", ops: opsF.filter(op => op.statut === 'VISE_CF') },
      differe: { label: "Différés", icon: I.clock('#C5961F'), color: "#C5961F", ops: opsF.filter(op => ['DIFFERE_CF', 'DIFFERE_AC'].includes(op.statut)) },
      attente_cf: { label: "Attente CF", icon: I.clock('#D4722A'), color: "#D4722A", ops: opsF.filter(op => op.statut === 'TRANSMIS_CF') },
      annuler: { label: "À annuler", icon: I.xCircle('#C43E3E'), color: "#C43E3E", ops: opsF.filter(op => op.type === 'PROVISOIRE' && !['PAYE', 'PAYE_PARTIEL', 'REJETE_CF', 'REJETE_AC', 'ANNULE'].includes(op.statut) && !hasValidRegul(op.id)) },
      regulariser: { label: "À régulariser", icon: I.refresh('#C5961F'), color: "#C5961F", ops: opsF.filter(op => op.type === 'PROVISOIRE' && ['PAYE', 'PAYE_PARTIEL'].includes(op.statut) && !hasValidRegul(op.id)) },
      solder: { label: "À solder", icon: I.coins('#555'), color: "#555", ops: opsF.filter(op => ['TRANSMIS_AC', 'PAYE_PARTIEL'].includes(op.statut)) },
    };
  }, [allOpsExercice]);

  const selectedOps = alertes[activeAlert]?.ops || [];
  const prenom = userProfile?.nom?.split(' ')[0] || '';

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1B6B2E' }}>Bonjour{prenom ? `, ${prenom}` : ''}</h1>
        <p style={{ color: '#6c757d', fontSize: 13, margin: '6px 0 0' }}>Tableau de bord — Exercice {exerciceActif?.annee || '...'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Dotation totale', value: formatMontant(totalDotation), color: '#2E9940', accent: '#E8F5E9', icon: I.wallet('#2E9940') },
          { label: 'Engagements', value: formatMontant(totalEngagement), color: '#C5961F', accent: '#fff3e0', icon: I.file('#C5961F') },
          { label: 'Disponible', value: formatMontant(totalDisponible), color: totalDisponible >= 0 ? '#2e7d32' : '#C43E3E', accent: totalDisponible >= 0 ? '#e8f5e9' : '#ffebee', icon: I.checkCircle(totalDisponible >= 0 ? '#2e7d32' : '#C43E3E') },
          { label: "Taux d'exécution", value: `${tauxExec}%`, color: '#D4722A', accent: '#FFF3E8', icon: I.percent('#D4722A') },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12, color: '#999', fontWeight: 600, marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: card.color, fontFamily: 'monospace' }}>{card.value}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: card.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0', overflowX: 'auto', background: '#fff' }}>
          {Object.keys(alertes).map((key) => (
            <div key={key} onClick={() => setActiveAlert(key)} style={{
              padding: '14px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
              color: activeAlert === key ? alertes[key].color : '#999',
              borderBottom: activeAlert === key ? `2px solid ${alertes[key].color}` : '2px solid transparent',
              transition: 'all 0.2s'
            }}>
              {alertes[key].label} ({alertes[key].ops.length})
            </div>
          ))}
        </div>

        <div style={{ maxHeight: 600, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                <th style={thStyle}>N° OP</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Bénéficiaire</th>
                <th style={thStyle}>Objet</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Jours</th>
              </tr>
            </thead>
            <tbody>
              {selectedOps.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: 40, textAlign: 'center', color: '#ccc' }}>Aucune donnée disponible</td></tr>
              ) : (
                selectedOps.map((op, i) => (
                  <tr key={i} onClick={() => { setConsultOpData(op); setCurrentPage('consulterOp'); }} style={{ cursor: 'pointer', borderTop: '1px solid #f8f8f8' }}>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{(op.numero || '').split('/')[0]}</td>
                    <td style={{ padding: '14px 16px', fontSize: 11, fontWeight: 700, color: op.type === 'DEFINITIF' ? '#1976d2' : op.type === 'ANNULATION' ? '#c62828' : '#666' }}>{op.type}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13 }}>{getBenefNom(op.beneficiaireId)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#666' }}>{op.objet}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{formatMontant(op.montant)}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, color: joursDepuis(op.dateCreation) > 15 ? '#C43E3E' : '#999', fontWeight: 700 }}>{joursDepuis(op.dateCreation)}j</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PageDashboard;
