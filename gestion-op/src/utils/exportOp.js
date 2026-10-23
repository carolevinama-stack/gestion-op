import { sanitizeForExport } from './formatters';

// ==================== LIGNE D'EXPORT D'UN OP ====================
// La définition des colonnes d'un OP exporté, en un seul endroit. Elle sert à
// la fois à l'export de la Liste OP et à la sauvegarde Excel complète des
// Paramètres : les deux doivent décrire un OP de la même façon, sinon on finit
// avec deux vérités selon le bouton cliqué.
//
// La sauvegarde ajoute la Source et l'Exercice devant, parce qu'elle couvre
// tous les exercices alors que la Liste OP est déjà filtrée sur l'un d'eux.

// Les dates sont stockées en « AAAA-MM-JJ ». On les reformate en découpant la
// chaîne, et NON avec new Date() : selon le fuseau, celui-ci recule d'un jour.
export const formatDateExport = (valeur) => {
  if (!valeur) return '';
  const texte = String(valeur);
  if (texte.length >= 10) {
    const [annee, mois, jour] = texte.substring(0, 10).split('-');
    if (annee && mois && jour) return `${jour}/${mois}/${annee}`;
  }
  return texte;
};

export const construireLigneExportOp = (op, { beneficiaireNom = '' } = {}) => {
  const paiements = op?.paiements || [];
  const totalPaye = paiements.reduce((somme, p) => somme + (Number(p.montant) || 0), 0);
  const solde = (Number(op?.montant) || 0) - totalPaye;
  const references = paiements.map(p => p.reference).filter(Boolean).join(', ');
  const datesPaiement = paiements.map(p => formatDateExport(p.date)).filter(Boolean).join(', ');

  return {
    'N° OP': op?.numero || '',
    'Type': op?.type || '',
    'Date création': formatDateExport(op?.dateCreation),
    'Bénéficiaire': sanitizeForExport(beneficiaireNom || op?.beneficiaireNom || ''),
    'Objet': sanitizeForExport(op?.objet || ''),
    'Ligne budgétaire': op?.ligneBudgetaire || '',
    'Dotation': Number(op?.dotationFigee || 0),
    'Montant': Number(op?.montant || 0),
    'Mode règlement': op?.modeReglement || '',
    'Montant TVA': Number(op?.montantTVA || 0),
    'OP provisoire rattaché': sanitizeForExport(op?.opProvisoireNumero || ''),
    'Statut': op?.statut || '',
    'N° Bordereau CF': op?.bordereauCF || '',
    'Date transmission CF': formatDateExport(op?.dateTransmissionCF),
    'Date différé CF': formatDateExport(op?.dateDiffere),
    'Date rejet CF': formatDateExport(op?.dateRejet),
    'Date visa CF': formatDateExport(op?.dateVisaCF),
    'Motif CF': sanitizeForExport(op?.motifRejet || op?.motifDiffere || ''),
    'N° Bordereau AC': op?.bordereauAC || '',
    'Date transmission AC': formatDateExport(op?.dateTransmissionAC),
    'Montant total payé': totalPaye,
    'Solde restant': solde,
    'Références paiement': sanitizeForExport(references),
    'Dates paiement': datesPaiement,
    'Date archivage': formatDateExport(op?.dateArchivage),
    'Référence boîte': op?.boiteArchivage || '',
  };
};
