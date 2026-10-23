// ==================== CONTRÔLE DES OP DE REJET ====================
// Un rejet crée un OP négatif qui annule l'engagement au budget. Ce négatif n'a
// de sens que tant que le rejet tient : si le rejet est annulé, il doit partir.
//
// Avant la correction de l'annulation, il restait en base. Son montant était
// donc soustrait du budget disponible définitivement, sans que rien ne le
// signale à l'écran. Ce fichier retrouve ces négatifs devenus inutiles.
//
// Il ne modifie RIEN : il lit et il compte. C'est volontaire — supprimer un OP
// sur la foi d'une règle déduite serait plus grave que le défaut lui-même.

const STATUTS_REJETES = ['REJETE_CF', 'REJETE_AC'];

// Un OP de rejet est légitime tant que l'OP qu'il compense est encore rejeté.
export const estRejetLegitime = (rejet, parId) => {
  const original = parId.get(rejet.opOriginalId);
  return !!original && STATUTS_REJETES.includes(original.statut);
};

// Le contrôle, sur la liste complète des OP de TOUS les exercices.
//
// Trois issues pour un OP de rejet :
// - légitime : l'OP d'origine est encore rejeté, le négatif a sa raison d'être ;
// - orphelin : l'OP d'origine n'est plus rejeté, ou a disparu de la base ;
// - non rattachable : il ne porte pas d'opOriginalId, donc on ne peut rien
//   conclure. Ceux-là sont signalés à part, jamais comptés comme orphelins.
export const controlerRejets = (ops) => {
  const liste = (ops || []).filter(Boolean);
  const parId = new Map(liste.map(o => [o.id, o]));
  const rejets = liste.filter(o => o.type === 'REJET');

  const nonRattachables = rejets.filter(r => !r.opOriginalId);
  const rattachables = rejets.filter(r => r.opOriginalId);
  const orphelins = rattachables.filter(r => !estRejetLegitime(r, parId));
  const legitimes = rattachables.filter(r => estRejetLegitime(r, parId));

  return {
    nbOps: liste.length,
    nbRejets: rejets.length,
    legitimes,
    orphelins,
    nonRattachables,
    // Ce que les orphelins soustraient à tort du budget. Les montants sont
    // négatifs : la valeur absolue est ce que le disponible affiche en trop.
    montantOrphelins: orphelins.reduce((somme, o) => somme + (o.montant || 0), 0),
  };
};

// Les orphelins regroupés par exercice, pour dire OÙ le budget est faussé.
export const orphelinsParExercice = (orphelins) => {
  const parExercice = new Map();
  for (const o of orphelins || []) {
    const cle = o.exerciceId || 'sans exercice';
    const actuel = parExercice.get(cle) || { exerciceId: cle, nb: 0, montant: 0, numeros: [] };
    actuel.nb += 1;
    actuel.montant += o.montant || 0;
    actuel.numeros.push(o.numero || o.id);
    parExercice.set(cle, actuel);
  }
  return [...parExercice.values()];
};
