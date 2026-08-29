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

// ==================== SPÉCIFIQUE À "CONSULTER OP" (modification d'un OP existant) ====================

// Dotation à utiliser pendant la modification d'un OP : la dotation "figée" au moment de sa
// création, sauf si on vient de changer sa ligne budgétaire, auquel cas on prend la dotation
// actuelle de la nouvelle ligne. Logique métier volontaire (cf. décision projet) : ne pas modifier.
export const calculerDotationConsultation = ({ ligneBudgetaireChangee, dotationFigee, dotationLigneSelectionnee }) => {
  if (ligneBudgetaireChangee) return dotationLigneSelectionnee ?? 0;
  return dotationFigee ?? dotationLigneSelectionnee ?? 0;
};

// Engagements antérieurs à un OP en cours de modification : somme des montants des OP de la même
// ligne budgétaire créés AVANT lui (ordre chronologique), en excluant seulement les OP supprimés.
// Logique métier volontaire (cf. décision projet) : ne pas modifier, y compris le fait que les OP
// rejetés comptent ici (contrairement au calcul utilisé à la création d'un nouvel OP).
export const calculerEngagementsAnterieursAvantOp = (ops, { sourceId, exerciceId, ligneBudgetaire, opId }) => {
  if (!ligneBudgetaire || !opId) return 0;
  const allOps = ops
    .filter(op => op.sourceId === sourceId && op.exerciceId === exerciceId && op.statut !== 'SUPPRIME')
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  let cumul = 0;
  for (const op of allOps) {
    if (op.id === opId) break;
    if (op.ligneBudgetaire === ligneBudgetaire) {
      cumul += (parseFloat(op.montant) || 0);
    }
  }
  return cumul;
};

// Montant de TVA à enregistrer en modification : 0 si la TVA n'est pas récupérable
// (contrairement à la création, où l'absence de TVA donne null).
export const calculerMontantTVASiRecuperable = (tvaRecuperable, finalMontant, montantTVA) => {
  if (!tvaRecuperable) return 0;
  const m = Math.abs(parseFloat(montantTVA) || 0);
  return finalMontant < 0 ? -m : m;
};
