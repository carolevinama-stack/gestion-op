import React from 'react';
import { listerDifferesAvecEnCours, listerDifferes } from '../utils/differes';
import { formatDate } from '../utils/formatters';

// ==================== HISTORIQUE DES DIFFÉRÉS ====================
// Le même bloc dans l'aperçu de Liste OP et dans Consulter OP : un OP qui a été
// différé garde la trace de chaque passage, même après avoir été réintroduit.
//
// Avant, le motif du différé n'existait à l'écran que tant que l'OP était
// bloqué : la réintroduction effaçait les champs « en cours » et le détail
// disparaissait, alors qu'il restait enregistré.

const P = {
  gold: '#C5961F', goldLight: '#FFF8E1', goldBorder: '#E8B931',
  text: '#2B2B2B', textSec: '#7A7A7A', textMuted: '#9A9A9A',
  green: '#2E7D46', card: '#FFFFFF',
};

const Etiquette = ({ children, couleur, fond }) => (
  <span style={{
    background: fond, color: couleur, padding: '1px 7px', borderRadius: 4,
    fontSize: 10, fontWeight: 800, letterSpacing: '.03em', whiteSpace: 'nowrap',
  }}>{children}</span>
);

const HistoriqueDifferes = ({ op, compact = false }) => {
  const differes = listerDifferesAvecEnCours(op);
  if (differes.length === 0) return null;

  return (
    <div style={{
      background: P.goldLight, border: `1px solid ${P.goldBorder}66`,
      borderRadius: 10, padding: compact ? 12 : 16, marginBottom: 20,
    }}>
      <div style={{
        fontSize: 11, color: P.gold, fontWeight: 800, marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        HISTORIQUE DES DIFFÉRÉS
        <Etiquette couleur="#fff" fond={P.gold}>{differes.length}</Etiquette>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {differes.map((d, i) => {
          const enCours = !d.dateReintroduction;
          return (
            <div key={i} style={{
              background: P.card, borderRadius: 8, padding: '10px 12px',
              borderLeft: `3px solid ${enCours ? P.gold : P.green}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <Etiquette couleur={P.gold} fond={P.goldLight}>{d.type === 'AC' ? 'AGENT COMPTABLE' : 'CONTRÔLEUR FINANCIER'}</Etiquette>
                {enCours
                  ? <Etiquette couleur="#fff" fond={P.gold}>EN COURS</Etiquette>
                  : <Etiquette couleur={P.green} fond="#E8F5E9">RÉINTRODUIT</Etiquette>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                <Ligne label="Différé le" valeur={formatDate(d.dateDiffere)} />
                {!enCours && <Ligne label="Réintroduit le" valeur={formatDate(d.dateReintroduction)} couleur={P.green} />}
                {/* Absente sur les différés enregistrés avant cette correction. */}
                {d.dateTransmissionPrecedente && (
                  <Ligne label="Transmission précédente" valeur={formatDate(d.dateTransmissionPrecedente)} couleur={P.textMuted} />
                )}
              </div>

              {d.motifDiffere && (
                <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid #EEE' }}>
                  <div style={{ fontSize: 10, color: P.textMuted, fontWeight: 700, marginBottom: 2 }}>MOTIF</div>
                  <div style={{ fontSize: 12, color: P.text, fontStyle: 'italic' }}>{d.motifDiffere}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Ligne = ({ label, valeur, couleur }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
    <span style={{ color: P.textSec, fontWeight: 600 }}>{label} :</span>
    <span style={{ fontWeight: 700, color: couleur || P.text }}>{valeur || '—'}</span>
  </div>
);

// Pastille compacte pour les tableaux denses du Rapport : elle signale qu'un OP
// a déjà été différé sans ajouter de colonne. Le détail est dans l'infobulle.
export const BadgeDifferes = ({ op }) => {
  const differes = listerDifferes(op);
  if (differes.length === 0) return null;
  const detail = differes
    .map(d => `${d.type === 'AC' ? 'AC' : 'CF'} : différé le ${formatDate(d.dateDiffere) || '?'}, réintroduit le ${formatDate(d.dateReintroduction) || '?'}${d.motifDiffere ? ` — ${d.motifDiffere}` : ''}`)
    .join('\n');
  return (
    <span title={detail} style={{
      display: 'inline-block', marginLeft: 6, background: P.goldLight, color: P.gold,
      border: `1px solid ${P.goldBorder}66`, borderRadius: 4, padding: '0 5px',
      fontSize: 9, fontWeight: 800, cursor: 'help', whiteSpace: 'nowrap',
    }}>
      {differes.length === 1 ? '1 différé' : `${differes.length} différés`}
    </span>
  );
};

export default HistoriqueDifferes;
