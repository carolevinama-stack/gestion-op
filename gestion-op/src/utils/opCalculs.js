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

// ==================== RATTACHEMENT AUX OP PROVISOIRES (Annulation / Définitif) ====================

// Un OP Provisoire ne peut lui-même pas être sélectionné s'il est dans un de ces statuts.
const STATUTS_PROVISOIRE_INDISPONIBLE = ['REJETE_CF', 'REJETE_AC', 'ANNULE', 'TRAITE', 'SUPPRIME'];

// Un OP (Annulation/Définitif) rattaché à un Provisoire ne le "consomme" plus s'il a été
// supprimé OU rejeté : dans ce cas le Provisoire doit redevenir disponible pour un nouveau
// rattachement.
const STATUTS_RATTACHEMENT_INACTIF = ['SUPPRIME', 'REJETE_CF', 'REJETE_AC'];

// Statuts dans lesquels un OP Provisoire n'a plus à être annulé : soit il est déjà réglé,
// soit il est sorti du circuit. Sert à la catégorie "À annuler" (Tableau de bord et Rapport).
const STATUTS_PROVISOIRE_HORS_ANNULATION = ['PAYE', 'PAYE_PARTIEL', 'REJETE_CF', 'REJETE_AC', 'ARCHIVE', 'ANNULE'];

// Un rattachement (Annulation ou Définitif) ne compte que s'il est encore actif :
// rejeté ou supprimé, il libère de nouveau le Provisoire.
const estAnnulationActive = (o) =>
  o.type === 'ANNULATION' && !STATUTS_RATTACHEMENT_INACTIF.includes(o.statut);

const estDefinitifActif = (o) =>
  o.type === 'DEFINITIF' && !STATUTS_RATTACHEMENT_INACTIF.includes(o.statut);

// Les Provisoires que vise un Définitif : un seul (opProvisoireId) ou plusieurs
// (opProvisoireIds), les deux formes coexistent dans les données.
const provisoiresVisesParDefinitif = (o) => [o.opProvisoireId, ...(o.opProvisoireIds || [])];

// Existe-t-il un OP Annulation encore actif rattaché à ce Provisoire ?
// Un rattachement rejeté ou supprimé ne compte pas : le Provisoire reste à annuler.
export const aUneAnnulationActive = (ops, opProvisoireId) => ops.some(o =>
  estAnnulationActive(o) && o.opProvisoireId === opProvisoireId
);

// L'OP Définitif encore actif rattaché à ce Provisoire, s'il existe (null sinon).
// Un Définitif peut régulariser un seul Provisoire (opProvisoireId) ou plusieurs (opProvisoireIds).
export const trouverDefinitifActif = (ops, opProvisoireId) => ops.find(o =>
  estDefinitifActif(o) && provisoiresVisesParDefinitif(o).includes(opProvisoireId)
) || null;

export const aUnDefinitifActif = (ops, opProvisoireId) => trouverDefinitifActif(ops, opProvisoireId) !== null;

// ==================== INDEX DES RATTACHEMENTS ====================
// Les fonctions ci-dessus parcourent toute la liste des OP à chaque appel. Tant
// qu'on interroge un seul Provisoire, c'est le plus direct. Mais dès qu'on les
// appelle DANS une boucle sur tous les Provisoires — ce que font le Rapport et
// les listes de rattachement — le coût devient le carré du nombre d'OP : quatre
// fois plus de données, vingt-trois fois plus de calcul.
//
// L'index se construit en un seul passage, puis chaque question se répond
// instantanément. Les règles restent celles des fonctions ci-dessus : les mêmes
// prédicats sont utilisés des deux côtés, ils ne peuvent pas diverger.
export const indexerRattachements = (ops) => {
  const annulations = new Set();
  const definitifs = new Map();
  for (const o of ops || []) {
    if (estAnnulationActive(o)) {
      annulations.add(o.opProvisoireId);
    } else if (estDefinitifActif(o)) {
      // « Le premier gagne », pour rendre exactement ce que trouverDefinitifActif
      // renvoyait avec son find() sur la liste dans l'ordre.
      for (const id of provisoiresVisesParDefinitif(o)) {
        if (!definitifs.has(id)) definitifs.set(id, o);
      }
    }
  }
  return { annulations, definitifs };
};

export const aUneAnnulationActiveIndexee = (index, opProvisoireId) => index.annulations.has(opProvisoireId);

export const trouverDefinitifActifIndexe = (index, opProvisoireId) => index.definitifs.get(opProvisoireId) || null;

export const aUnDefinitifActifIndexe = (index, opProvisoireId) => index.definitifs.has(opProvisoireId);

// Cet OP doit-il figurer dans la catégorie "À annuler" ?
// Définition unique, partagée par le Tableau de bord et le Rapport, pour que les
// deux pages ne puissent plus afficher des listes différentes.
export const estAAnnuler = (op, ops) => estAAnnulerIndexe(op, indexerRattachements(ops));

// Même règle, mais sur un index déjà construit : c'est cette forme qu'utilisent
// les pages qui posent la question pour tous les Provisoires d'un coup.
export const estAAnnulerIndexe = (op, index) =>
  op.type === 'PROVISOIRE' &&
  !STATUTS_PROVISOIRE_HORS_ANNULATION.includes(op.statut) &&
  !aUneAnnulationActiveIndexee(index, op.id);

// OP Provisoires disponibles pour être annulés par un nouvel OP Annulation.
export const filtrerOpProvisoiresPourAnnulation = (ops, { beneficiaireId, sourceId }) => {
  if (!beneficiaireId) return [];
  const index = indexerRattachements(ops);
  return ops.filter(op =>
    op.type === 'PROVISOIRE' &&
    op.beneficiaireId === beneficiaireId &&
    op.sourceId === sourceId &&
    !STATUTS_PROVISOIRE_INDISPONIBLE.includes(op.statut) &&
    !aUneAnnulationActiveIndexee(index, op.id)
  );
};

// OP Provisoires disponibles pour être régularisés par un nouvel OP Définitif.
export const filtrerOpProvisoiresPourDefinitif = (ops, { beneficiaireId, sourceId, autresBeneficiaires }) => {
  if (!beneficiaireId) return [];
  const index = indexerRattachements(ops);
  return ops.filter(op =>
    op.type === 'PROVISOIRE' &&
    (autresBeneficiaires || op.beneficiaireId === beneficiaireId) &&
    op.sourceId === sourceId &&
    !STATUTS_PROVISOIRE_INDISPONIBLE.includes(op.statut) &&
    !aUnDefinitifActifIndexe(index, op.id)
  );
};
