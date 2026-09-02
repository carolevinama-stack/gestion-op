// ==================== MODIFICATION D'UN OP ====================
// Décisions pures extraites de PageConsulterOp : à quelles conditions une
// modification est refusée, quels champs de rattachement écrire selon le type,
// quelle dotation figer, quels OP seront impactés par un changement de montant.
//
// Aucune de ces fonctions ne lit ni n'écrit dans Firestore et aucune n'affiche
// quoi que ce soit : elles reçoivent des données et renvoient une décision.
// C'est ce qui les rend testables, et c'est tout l'intérêt de les avoir sorties
// de la page — la page garde l'enchaînement et l'affichage, ces règles-là sont
// désormais vérifiées automatiquement.

import { montantDoitEtrePositif } from './opCalculs';

// ==================== RÉFÉRENCES BANCAIRES ====================
// Les bénéficiaires existent sous deux formats : les anciens portent un seul
// RIB dans `rib`, les récents une liste dans `ribs`. Une seule fonction pour
// les deux, afin que l'écran qui affiche et le code qui enregistre voient
// exactement la même liste.
//
// Le test `ribs.length > 0` compte : une liste vide doit laisser sa chance à
// l'ancien champ `rib`, sinon un bénéficiaire ancien format se retrouve sans
// aucune référence à l'enregistrement alors que l'écran en affichait une.
export const ribsDuBeneficiaire = (ben) => {
  if (!ben) return [];
  if (Array.isArray(ben.ribs) && ben.ribs.length > 0) return ben.ribs;
  if (ben.rib) return [{ banque: '', numero: ben.rib }];
  return [];
};

// Retrouve, dans la liste des RIB du bénéficiaire, celui que porte l'OP.
// L'OP peut stocker son RIB en objet (récent) ou en texte (ancien).
// Introuvable ⇒ on retombe sur le premier RIB, jamais sur -1.
export const indexRibDeLOp = (ribs, opRib) => {
  const numero = typeof opRib === 'object' && opRib !== null ? opRib.numero : opRib;
  const i = (ribs || []).findIndex(r => r.numero === numero);
  return i >= 0 ? i : 0;
};

// ==================== VALIDATION ====================
// Renvoie null si la modification peut être enregistrée, sinon le premier
// refus rencontré, dans l'ordre où la page les présentait à l'utilisateur.
// L'ordre est significatif : c'est celui des champs à l'écran, de haut en bas.
export const validerModificationOp = (form, { selectedRib, disponible }) => {
  const refus = (titre, message) => ({ titre, message });

  if (!form.beneficiaireId) return refus('Champ obligatoire', 'Veuillez sélectionner un bénéficiaire');
  if (form.modeReglement === 'VIREMENT' && !selectedRib) return refus('RIB manquant', 'Veuillez renseigner un RIB pour le bénéficiaire');
  if (!form.ligneBudgetaire) return refus('Champ obligatoire', 'Veuillez sélectionner une ligne budgétaire');
  if (!form.objet.trim()) return refus('Champ obligatoire', "Veuillez saisir l'objet de la dépense");
  if (!form.piecesJustificatives.trim()) return refus('Champ obligatoire', 'Veuillez renseigner les pièces justificatives');

  const montant = parseFloat(form.montant);
  if (isNaN(montant) || montant === 0) return refus('Champ obligatoire', 'Veuillez saisir un montant valide');
  if (montantDoitEtrePositif(form.type) && montant < 0) return refus('Montant invalide', "Le montant d'un OP Provisoire doit être positif.");

  const estDirectOuDefinitif = ['DIRECT', 'DEFINITIF'].includes(form.type);
  if (estDirectOuDefinitif && form.tvaRecuperable === null) return refus('Champ obligatoire', 'Veuillez indiquer si la TVA est récupérable (OUI / NON)');
  if (estDirectOuDefinitif && form.tvaRecuperable === true && (!form.montantTVA || parseFloat(form.montantTVA) === 0)) {
    return refus('Champ obligatoire', 'TVA récupérable : veuillez saisir le montant de la TVA');
  }

  if (form.type === 'ANNULATION' && !form.opProvisoireId && !form.opProvisoireManuel.trim()) {
    return refus('Champ obligatoire', "Veuillez sélectionner ou saisir le N° d'OP Provisoire à annuler");
  }
  if (form.type === 'DEFINITIF' && (form.opProvisoireIds || []).length === 0 && !form.opProvisoireManuel.trim()) {
    return refus('Champ obligatoire', "Veuillez sélectionner ou saisir le(s) N° d'OP Provisoire à régulariser");
  }

  // Une annulation ramène du budget : elle n'a pas à être bloquée par un
  // disponible négatif, c'est justement ce qu'elle vient corriger.
  if (form.type !== 'ANNULATION' && disponible < 0) {
    return refus('Budget insuffisant', null); // le montant est ajouté par l'appelant, qui sait le formater
  }

  return null;
};

// Le montant réellement enregistré : une annulation est toujours négative,
// quel que soit le signe saisi.
export const montantAEnregistrer = (type, montantSaisi) => {
  const m = parseFloat(montantSaisi);
  if (isNaN(m)) return NaN;
  return type === 'ANNULATION' ? -Math.abs(m) : m;
};

// ==================== CONFIRMATIONS ====================
// Ces situations ne bloquent pas : elles demandent un « êtes-vous sûr ».

export const demandeConfirmationMontantNegatif = (type, montantSaisi) =>
  ['DIRECT', 'DEFINITIF'].includes(type) && parseFloat(montantSaisi) < 0;

// Les bénéficiaires des provisoires rattachés qui diffèrent de celui de l'OP.
// Liste sans doublon, vide si tout concorde.
export const beneficiairesRattachesDifferents = (form, ops, beneficiaires) => {
  if (form.type !== 'DEFINITIF') return [];
  return [...new Set(
    (form.opProvisoireIds || [])
      .map(id => (ops || []).find(o => o.id === id))
      .filter(op => op && op.beneficiaireId !== form.beneficiaireId)
      .map(op => (beneficiaires || []).find(b => b.id === op.beneficiaireId)?.nom || 'N/A')
  )];
};

// Les OP enregistrés APRÈS celui-ci sur la même ligne budgétaire : changer le
// montant décale leurs cumuls, d'où la confirmation. Les OP supprimés ne
// comptent pas, ils ne pèsent plus sur le budget.
export const opsImpactesParChangementMontant = (ops, op) => (ops || []).filter(o =>
  o.sourceId === op.sourceId &&
  o.exerciceId === op.exerciceId &&
  o.ligneBudgetaire === op.ligneBudgetaire &&
  (o.createdAt || '') > (op.createdAt || '') &&
  o.id !== op.id &&
  o.statut !== 'SUPPRIME'
);

// ==================== CHAMPS ÉCRITS ====================

// Le rattachement, selon le type. Chaque branche remet à null ce qu'elle
// n'utilise pas : sans ça, un OP qui change de type garderait le rattachement
// de son type précédent.
export const champsRattachement = (form) => {
  if (form.type === 'ANNULATION') {
    return {
      opProvisoireId: form.opProvisoireId || null,
      opProvisoireNumero: form.opProvisoireId ? form.opProvisoireNumero : (form.opProvisoireManuel || '').trim() || null,
      opProvisoireIds: null,
    };
  }
  if (form.type === 'DEFINITIF') {
    const ids = form.opProvisoireIds || [];
    return {
      opProvisoireId: ids[0] || form.opProvisoireId || null,
      opProvisoireIds: ids.length > 0 ? ids : null,
    };
  }
  return { opProvisoireId: null, opProvisoireIds: null };
};

// La dotation gelée sur l'OP. Tant que la ligne budgétaire ne change pas, on
// garde celle figée à la création : c'est ce qui fait qu'un OP ancien continue
// d'être jugé sur le budget de son époque. Si la ligne change, on fige celle
// de la nouvelle ligne.
export const dotationFigeeApresModif = ({ ligneChangee, dotationNouvelleLigne, dotationFigeeActuelle }) =>
  ligneChangee ? (dotationNouvelleLigne ?? 0) : (dotationFigeeActuelle ?? 0);
