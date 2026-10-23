// ==================== REJETS ET ANNULATIONS DE REJET ====================
// Rejeter un OP fait deux choses : l'OP d'origine passe en REJETE_CF (ou
// REJETE_AC) en gardant son bordereau, et un OP de rejet est créé en négatif,
// sans bordereau, pour annuler l'engagement au budget.
//
// Annuler ce rejet — pour corriger une erreur de saisie — doit donc défaire les
// deux. Deux règles portent ce fichier :
//
// 1. L'OP de rejet part avec. Il n'existe que pour compenser un rejet : si le
//    rejet n'existe plus, le négatif non plus. Le laisser en base soustrayait
//    définitivement un montant du budget disponible, sans que rien ne le
//    signale à l'écran.
//
// 2. Rien ne se perd. La date et le motif du rejet partent dans
//    historiqueRejets avant que les champs « en cours » soient effacés. C'est
//    volontairement un historique SÉPARÉ de celui des différés : un rejet
//    annulé ne doit pas être compté comme un différé dans le Rapport.

const champStatutTransmis = (type) => (type === 'AC' ? 'TRANSMIS_AC' : 'TRANSMIS_CF');

// L'entrée d'historique qui garde la trace du rejet qu'on annule.
export const entreeHistoriqueRejet = (op, { dateAnnulation, type, parQui = null }) => ({
  dateRejet: op?.dateRejet ?? null,
  motifRejet: op?.motifRejet ?? null,
  dateAnnulation,
  type,
  parQui,
});

// Tout ce qu'écrit l'annulation d'un rejet sur l'OP d'origine, en un objet.
// dateVisaCF est remise à zéro côté CF seulement : l'AC ne la touche pas.
export const misesAJourAnnulationRejet = (op, { dateAnnulation, type, parQui = null }) => ({
  statut: champStatutTransmis(type),
  ...(type === 'CF' ? { dateVisaCF: null } : {}),
  dateRejet: null,
  motifRejet: null,
  historiqueRejets: [...(op?.historiqueRejets || []), entreeHistoriqueRejet(op, { dateAnnulation, type, parQui })],
});

// Les OP de rejet à supprimer avec le rejet qu'on annule. On prend TOUS les
// négatifs rattachés à cet OP, pas seulement le dernier : si un rejet annulé
// avant cette correction a laissé un négatif orphelin en base, il part aussi.
export const rejetsARetirer = (ops, opId) =>
  (ops || []).filter(o => o && o.type === 'REJET' && o.opOriginalId === opId);

// ==================== LECTURE ====================

// L'historique prêt à afficher : le plus récent d'abord, les entrées vides
// écartées.
export const listerRejets = (op) =>
  [...(op?.historiqueRejets || [])]
    .filter(e => e && (e.dateRejet || e.motifRejet || e.dateAnnulation))
    .reverse();

export const nombreRejets = (op) => listerRejets(op).length;

// Un rejet encore en cours n'est pas dans l'historique : il est dans les champs
// « en cours » de l'OP. Cette fonction donne la vue complète pour les écrans
// qui montrent la vie de l'OP.
export const listerRejetsAvecEnCours = (op) => {
  const passes = listerRejets(op);
  if (!op?.dateRejet && !op?.motifRejet) return passes;
  const type = op?.statut === 'REJETE_AC' ? 'AC' : 'CF';
  return [
    { dateRejet: op.dateRejet ?? null, motifRejet: op.motifRejet ?? null, dateAnnulation: null, type, parQui: null },
    ...passes,
  ];
};
