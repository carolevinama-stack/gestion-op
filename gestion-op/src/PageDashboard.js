import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { styles } from '../utils/styles';
import { formatMontant } from '../utils/formatters';

const PageDashboard = () => {
  const { exerciceActif, budgets, ops, sources, beneficiaires } = useAppContext();
  const [showDetailSource, setShowDetailSource] = useState(null);
  
  const exerciceActifId = exerciceActif?.id;
  const budgetsActifs = budgets.filter(b => b.exerciceId === exerciceActifId);
  const opsActifs = ops.filter(op => op.exerciceId === exerciceActifId && ['DIRECT', 'DEFINITIF'].includes(op.type) && op.statut !== 'REJETE');
  
  const totalDotation = budgetsActifs.reduce((sum, b) => sum + (b.lignes?.reduce((s, l) => s + (l.dotation || 0), 0) || 0), 0);
  const totalEngagement = opsActifs.reduce((sum, op) => sum + (op.montant || 0), 0);
  const totalDisponible = totalDotation - totalEngagement;
  
  const opsProvisoires = ops.filter(op => op.exerciceId === exerciceActifId && op.type === 'PROVISOIRE' && op.statut !== 'REGULARISE');
  const opsEnCours = ops.filter(op => op.exerciceId === exerciceActifId && ['TRANSMIS_CF', 'TRANSMIS_AC', 'DIFFERE'].includes(op.statut));

  const getSourceStats = (sourceId) => {
    const sourceBudgets = budgetsActifs.filter(b => b.sourceId === sourceId);
    const sourceOps = opsActifs.filter(op => op.sourceId === sourceId);
    const dotation = sourceBudgets.reduce((sum, b) => sum + (b.lignes?.reduce((s, l) => s + (l.dotation || 0), 0) || 0), 0);
    const engagement = sourceOps.reduce((sum, op) => sum + (op.montant || 0), 0);
    return { dotation, engagement, disponible: dotation - engagement, nbOps: sourceOps.length };
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>📊 Tableau de bord</h1>
        <p style={{ color: '#6c757d' }}>
          Exercice {exerciceActif?.annee || 'Non défini'} - Vue d'ensemble
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '💰', label: 'Dotation totale', value: formatMontant(totalDotation), color: '#0f4c3a' },
          { icon: '📝', label: 'Engagements', value: formatMontant(totalEngagement), color: '#f0b429' },
          { icon: '✅', label: 'Disponible', value: formatMontant(totalDisponible), color: '#06d6a0' },
          { icon: '📋', label: 'Total OP', value: opsActifs.length, color: '#1565c0' },
        ].map((s, i) => (
          <div key={i} style={styles.card}>
            <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 8 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📊 Situation par source de financement</h3>
        {sources.length === 0 ? (
          <p style={{ color: '#6c757d' }}>Aucune source configurée</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>SOURCE</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>DOTATION</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>ENGAGEMENTS</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>DISPONIBLE</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>NB OP</th>
              </tr>
            </thead>
            <tbody>
              {sources.map(source => {
                const stats = getSourceStats(source.id);
                return (
                  <tr key={source.id}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: source.couleur || '#0f4c3a' }}></div>
                        <strong>{source.nom}</strong>
                      </div>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace' }}>{formatMontant(stats.dotation)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: '#f0b429' }}>{formatMontant(stats.engagement)}</td>
                    <td style={{ ...styles.td, textAlign: 'right', fontFamily: 'monospace', color: stats.disponible >= 0 ? '#06d6a0' : '#dc3545', fontWeight: 600 }}>{formatMontant(stats.disponible)}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}><span style={{ ...styles.badge, background: '#e3f2fd', color: '#1565c0' }}>{stats.nbOps}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>⏳ OP Provisoires en attente ({opsProvisoires.length})</h3>
          {opsProvisoires.length === 0 ? (
            <p style={{ color: '#6c757d', fontSize: 14 }}>Aucun OP provisoire en attente</p>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {opsProvisoires.slice(0, 5).map(op => (
                <div key={op.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f3f4', display: 'flex', justifyContent: 'space-between' }}>
                  <span>N°{op.numero} - {beneficiaires.find(b => b.id === op.beneficiaireId)?.nom || 'Inconnu'}</span>
                  <span style={{ fontFamily: 'monospace', color: '#f0b429' }}>{formatMontant(op.montant)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>🔄 OP en circuit ({opsEnCours.length})</h3>
          {opsEnCours.length === 0 ? (
            <p style={{ color: '#6c757d', fontSize: 14 }}>Aucun OP en cours de traitement</p>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {opsEnCours.slice(0, 5).map(op => {
                const statutLabels = { 'TRANSMIS_CF': 'Chez CF', 'TRANSMIS_AC': 'Chez AC', 'DIFFERE': 'Différé' };
                return (
                  <div key={op.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f3f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>N°{op.numero}</span>
                    <span style={{ ...styles.badge, background: op.statut === 'DIFFERE' ? '#fff3e0' : '#e3f2fd', color: op.statut === 'DIFFERE' ? '#e65100' : '#1565c0' }}>
                      {statutLabels[op.statut] || op.statut}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageDashboard;
