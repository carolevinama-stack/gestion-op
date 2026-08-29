// ==================== CALCULS OP (budget, montant, TVA, numérotation) ====================
// Fonctions pures extraites de PageNouvelOp.js pour les rendre testables séparément.
// Aucun changement de règle métier : mêmes calculs, juste détachés de l'état React.

const STATUTS_EXCLUS_ENGAGEMENT = ['REJETE_CF', 'REJETE_AC', 'SUPPRIME'];

// Somme des montants déjà engagés sur une ligne budgétaire donnée (hors OP rejetés/supprimés).
export const calculerEngagementsAnterieurs = (ops, { sourceId, exerciceId, ligneBudgetaire }) => {
  if (!ligneBudgetaire) return 0;
  return ops
    .filter(op =>
      op.sourceId === sourceId &&
      op.exerciceId === exerciceId &&
      op.ligneBudgetaire === ligneBudgetaire &&
      !STATUTS_EXCLUS_ENGAGEMENT.includes(op.statut)
    )
    .reduce((sum, o) => sum + (parseFloat(o.montant) || 0), 0);
};

// Montant signé que l'OP en cours de saisie va engager (une Annulation engage en négatif).
export const calculerEngagementActuel = (montant, type) => {
  const m = parseFloat(montant) || 0;
  return type === 'ANNULATION' ? -Math.abs(m) : m;
};

// Budget disponible = dotation - (engagements antérieurs + engagement actuel).
export const calculerDisponible = (dotation, engagementsAnterieurs, engagementActuel) =>
  (dotation || 0) - (engagementsAnterieurs || 0) - (engagementActuel || 0);

// Plus grand numéro d'OP déjà attribué dans une liste d'OP (format "N°0007/...").
export const maxNumeroExistant = (ops) => {
  let maxNum = 0;
  ops.forEach(op => {
    const match = (op.numero || '').match(/N°(\d+)\//);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  });
  return maxNum;
};

// Prochain numéro disponible pour une source/exercice donnés.
export const prochainNumero = (ops, { sourceId, exerciceId }) => {
  const filtered = ops.filter(op => op.sourceId === sourceId && op.exerciceId === exerciceId);
  return maxNumeroExistant(filtered) + 1;
};

// Construit le numéro d'OP affiché à partir de ses composants.
export const construireNumeroOp = (num, { sigleProjet, sigleSource, annee }) =>
  `N°${String(num).padStart(4, '0')}/${sigleProjet}-${sigleSource}/${annee}`;

// Applique le signe du montant principal au montant de TVA (les deux doivent avoir le même signe).
export const calculerMontantTVA = (finalMontant, montantTVA) => {
  if (!montantTVA) return null;
  const m = Math.abs(parseFloat(montantTVA));
  return finalMontant < 0 ? -m : m;
};

// Un OP Provisoire doit toujours avoir un montant positif ; Direct/Définitif/Annulation
// peuvent être négatifs (Direct/Définitif demandent alors une confirmation à l'utilisateur).
export const montantDoitEtrePositif = (type) => !['ANNULATION', 'DIRECT', 'DEFINITIF'].includes(type);
