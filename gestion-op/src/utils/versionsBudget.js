// ==================== SUPPRESSION D'UNE VERSION DE BUDGET ====================
// Un budget vit par versions : le Budget Primitif, puis des révisions, chacune
// notifiée à une date. Supprimer une version qui a servi réécrit l'histoire
// budgétaire — et pire, si c'est la dernière, la version précédente redevient
// courante et toutes les dotations changent, alors que les OP créés sous la
// version supprimée gardent la dotation qu'ils avaient figée.
//
// Un OP ne référence pas la version du budget sous laquelle il a été créé.
// On la retrouve par les dates : un OP appartient à la version en vigueur au
// moment de sa création, c'est-à-dire la dernière version créée avant lui.

const EXCLUS = ['SUPPRIME'];

// Les versions d'un même budget (source + exercice), de la plus ancienne à la
// plus récente. Le tri se fait sur le numéro de version, pas sur la date : deux
// versions créées le même jour doivent rester dans leur ordre déclaré.
export const versionsDuBudget = (budgets, { sourceId, exerciceId }) =>
  (budgets || [])
    .filter(b => b.sourceId === sourceId && b.exerciceId === exerciceId)
    .sort((a, b) => (a.version || 1) - (b.version || 1));

// La version créée juste après celle-ci, s'il y en a une.
export const versionSuivante = (budgets, budget) => {
  if (!budget) return null;
  const versions = versionsDuBudget(budgets, budget);
  const i = versions.findIndex(v => v.id === budget.id);
  return i >= 0 ? versions[i + 1] || null : null;
};

// Les OP créés pendant que cette version était en vigueur : après sa création,
// et avant celle de la version suivante. Les OP mis à la corbeille ne comptent
// pas — ils n'engagent plus rien.
export const opsDeLaVersion = (ops, budgets, budget) => {
  if (!budget?.createdAt) return [];
  const suivante = versionSuivante(budgets, budget);
  const debut = budget.createdAt;
  const fin = suivante?.createdAt || null;
  return (ops || []).filter(op =>
    op.sourceId === budget.sourceId &&
    op.exerciceId === budget.exerciceId &&
    !EXCLUS.includes(op.statut) &&
    typeof op.createdAt === 'string' &&
    op.createdAt >= debut &&
    (fin === null || op.createdAt < fin)
  );
};

// Pourquoi cette version ne peut pas être supprimée — ou null si elle le peut.
// Renvoyer la raison plutôt qu'un simple booléen permet aux deux écrans
// d'afficher le même message, qui dit précisément ce qui bloque.
export const raisonBlocageSuppression = (ops, budgets, budget) => {
  if (!budget) return 'Aucune version sélectionnée.';

  // Sans date de création, impossible de savoir ce qui a été créé sous elle :
  // on refuse, par prudence. Cela ne concerne que d'éventuels budgets très
  // anciens, enregistrés avant que la date ne soit systématique.
  if (!budget.createdAt) {
    return "Cette version n'a pas de date de création : impossible de vérifier si elle a servi. Suppression refusée par précaution.";
  }

  const utilisee = opsDeLaVersion(ops, budgets, budget);
  if (utilisee.length > 0) {
    const exemples = utilisee.slice(0, 3).map(op => op.numero).filter(Boolean).join(', ');
    return `${utilisee.length} OP ${utilisee.length > 1 ? 'ont été créés' : 'a été créé'} sous cette version${exemples ? ` (${exemples}${utilisee.length > 3 ? '…' : ''})` : ''}. La supprimer fausserait le suivi budgétaire.`;
  }

  return null;
};

export const versionSupprimable = (ops, budgets, budget) =>
  raisonBlocageSuppression(ops, budgets, budget) === null;
