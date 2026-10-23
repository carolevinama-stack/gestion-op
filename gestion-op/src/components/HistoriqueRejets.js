import React from 'react';
import { listerRejetsAvecEnCours, listerRejets } from '../utils/rejets';
import { formatDate } from '../utils/formatters';
import { Etiquette, Ligne } from './historiqueCommun';

// ==================== HISTORIQUE DES REJETS ====================
// Le pendant du bloc des différés, pour les rejets. Avant, annuler un rejet
// effaçait sa date et son motif définitivement : plus personne ne pouvait
// savoir qu'un OP avait été rejeté, ni pourquoi. Désormais la trace reste.
//
// Volontairement distinct de l'historique des différés : un rejet n'est pas un
// différé, et le Rapport compte les différés pour mesurer les délais.

const P = {
  red: '#C43E3E', redLight: '#FFEBEE',
  text: '#2B2B2B', textMuted: '#9A9A9A',
  green: '#2E7D46', card: '#FFFFFF',
};

// avecEnCours est faux par défaut : le rejet EN COURS a déjà son encadré rouge
// dans Liste OP comme dans Consulter OP, et l'afficher ici en plus ferait
// doublon. Ce bloc sert à montrer ce qui n'était visible nulle part : les
// rejets ANNULÉS.
const HistoriqueRejets = ({ op, compact = false, avecEnCours = false }) => {
  const rejets = avecEnCours ? listerRejetsAvecEnCours(op) : listerRejets(op);
  if (rejets.length === 0) return null;

  return (
    <div style={{
      background: P.redLight, border: `1px solid ${P.red}44`,
      borderRadius: 10, padding: compact ? 12 : 16, marginBottom: 20,
    }}>
      <div style={{
        fontSize: 11, color: P.red, fontWeight: 800, marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        HISTORIQUE DES REJETS
        <Etiquette couleur="#fff" fond={P.red}>{rejets.length}</Etiquette>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rejets.map((r, i) => {
          const enCours = !r.dateAnnulation;
          return (
            <div key={i} style={{
              background: P.card, borderRadius: 8, padding: '10px 12px',
              borderLeft: `3px solid ${enCours ? P.red : P.green}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <Etiquette couleur={P.red} fond={P.redLight}>{r.type === 'AC' ? 'AGENT COMPTABLE' : 'CONTRÔLEUR FINANCIER'}</Etiquette>
                {enCours
                  ? <Etiquette couleur="#fff" fond={P.red}>EN COURS</Etiquette>
                  : <Etiquette couleur={P.green} fond="#E8F5E9">ANNULÉ</Etiquette>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                <Ligne label="Rejeté le" valeur={formatDate(r.dateRejet)} couleur={P.red} />
                {!enCours && <Ligne label="Rejet annulé le" valeur={formatDate(r.dateAnnulation)} couleur={P.green} />}
                {r.parQui && <Ligne label="Annulé par" valeur={r.parQui} couleur={P.textMuted} />}
              </div>

              {r.motifRejet && (
                <div style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid #EEE' }}>
                  <div style={{ fontSize: 10, color: P.textMuted, fontWeight: 700, marginBottom: 2 }}>MOTIF</div>
                  <div style={{ fontSize: 12, color: P.text, fontStyle: 'italic' }}>{r.motifRejet}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Pastille compacte, sur le modèle de celle des différés : elle signale qu'un
// OP a déjà été rejeté puis remis dans le circuit, sans ajouter de colonne.
export const BadgeRejets = ({ op }) => {
  const rejets = listerRejets(op);
  if (rejets.length === 0) return null;
  const detail = rejets
    .map(r => `${r.type === 'AC' ? 'AC' : 'CF'} : rejeté le ${formatDate(r.dateRejet) || '?'}, rejet annulé le ${formatDate(r.dateAnnulation) || '?'}${r.motifRejet ? ` — ${r.motifRejet}` : ''}`)
    .join('\n');
  return (
    <span title={detail} style={{
      display: 'inline-block', marginLeft: 6, background: P.redLight, color: P.red,
      border: `1px solid ${P.red}44`, borderRadius: 4, padding: '0 5px',
      fontSize: 9, fontWeight: 800, cursor: 'help', whiteSpace: 'nowrap',
    }}>
      {rejets.length === 1 ? '1 rejet annulé' : `${rejets.length} rejets annulés`}
    </span>
  );
};

export default HistoriqueRejets;
