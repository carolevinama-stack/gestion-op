// ==================== DIFFÉRÉS ET RÉINTRODUCTIONS ====================
// Un OP différé par le Contrôleur Financier ou par l'Agent Comptable ressort du
// circuit, puis y est réintroduit à une nouvelle date.
//
// Deux règles portent tout ce fichier :
//
// 1. Réintroduire, c'est retransmettre. La date de réintroduction DEVIENT la
//    date de transmission (au CF ou à l'AC selon le circuit). Sans ça, le délai
//    d'un OP réintroduit continuait d'être compté depuis sa toute première
//    transmission, et le Rapport comme le Tableau de bord affichaient un retard
//    qui n'existait plus.
//
// 2. Rien ne se perd. Le différé qu'on quitte — sa date, son motif, et la date
//    de transmission qu'il remplace — part dans historiqueDifferes avant que les
//    champs « en cours » soient effacés.

const champTransmission = (type) => (type === 'AC' ? 'dateTransmissionAC' : 'dateTransmissionCF');

const statutTransmis = (type) => (type === 'AC' ? 'TRANSMIS_AC' : 'TRANSMIS_CF');

// L'entrée d'historique qui garde la trace du différé qu'on quitte.
// dateTransmissionPrecedente est ce qui permet de reconstituer la chronologie
// complète alors même que la date de transmission vient d'être remplacée.
export const entreeHistoriqueDiffere = (op, { dateReintroduction, type }) => ({
  dateDiffere: op?.dateDiffere ?? null,
  motifDiffere: op?.motifDiffere ?? null,
  dateReintroduction,
  type,
  dateTransmissionPrecedente: op?.[champTransmission(type)] ?? null,
});

// Tout ce qu'écrit une réintroduction, en un seul objet.
export const misesAJourReintroduction = (op, { dateReintroduction, type }) => ({
  statut: statutTransmis(type),
  dateReintroduction,
  // La réintroduction EST la nouvelle transmission : c'est de cette date que
  // repart le décompte des délais dans toutes les pages.
  [champTransmission(type)]: dateReintroduction,
  historiqueDifferes: [...(op?.historiqueDifferes || []), entreeHistoriqueDiffere(op, { dateReintroduction, type })],
  dateDiffere: null,
  motifDiffere: null,
});

// ==================== LECTURE ====================

// L'historique prêt à afficher : le plus récent d'abord, les entrées vides
// écartées. Les anciennes entrées n'ont pas de dateTransmissionPrecedente,
// elles datent d'avant cette correction — l'affichage doit s'en accommoder.
export const listerDifferes = (op) =>
  [...(op?.historiqueDifferes || [])]
    .filter(e => e && (e.dateDiffere || e.motifDiffere || e.dateReintroduction))
    .reverse();

export const nombreDifferes = (op) => listerDifferes(op).length;

// Un différé encore en cours n'est pas dans l'historique : il est dans les
// champs « en cours » de l'OP. Cette fonction donne la vue complète, en cours
// compris, pour les écrans qui montrent la vie de l'OP.
export const listerDifferesAvecEnCours = (op) => {
  const passes = listerDifferes(op);
  if (!op?.dateDiffere && !op?.motifDiffere) return passes;
  const type = op?.statut === 'DIFFERE_AC' ? 'AC' : 'CF';
  return [
    { dateDiffere: op.dateDiffere ?? null, motifDiffere: op.motifDiffere ?? null, dateReintroduction: null, type, dateTransmissionPrecedente: op[champTransmission(type)] ?? null },
    ...passes,
  ];
};
