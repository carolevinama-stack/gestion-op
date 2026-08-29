import {
  calculerEngagementsAnterieurs,
  calculerEngagementActuel,
  calculerDisponible,
  maxNumeroExistant,
  prochainNumero,
  construireNumeroOp,
  calculerMontantTVA,
  montantDoitEtrePositif,
  calculerDotationConsultation,
  calculerEngagementsAnterieursAvantOp,
  calculerMontantTVASiRecuperable,
} from './opCalculs';

const opsFixture = [
  { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'EN_COURS', montant: 100 },
  { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'PAYE', montant: 50 },
  { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'REJETE_CF', montant: 9999 }, // exclu
  { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'SUPPRIME', montant: 9999 }, // exclu
  { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L2', statut: 'EN_COURS', montant: 500 }, // autre ligne
  { sourceId: 'S2', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'EN_COURS', montant: 700 }, // autre source
];

describe('calculerEngagementsAnterieurs', () => {
  test('additionne uniquement les OP de la même source/exercice/ligne, hors rejetés/supprimés', () => {
    expect(calculerEngagementsAnterieurs(opsFixture, { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1' })).toBe(150);
  });

  test('retourne 0 si aucune ligne budgétaire sélectionnée', () => {
    expect(calculerEngagementsAnterieurs(opsFixture, { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: '' })).toBe(0);
  });

  test('retourne 0 si aucun OP ne correspond', () => {
    expect(calculerEngagementsAnterieurs(opsFixture, { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L9' })).toBe(0);
  });
});

describe('calculerEngagementActuel', () => {
  test('un OP normal engage son montant tel quel', () => {
    expect(calculerEngagementActuel('50', 'PROVISOIRE')).toBe(50);
    expect(calculerEngagementActuel('-50', 'DIRECT')).toBe(-50);
  });

  test('une Annulation engage toujours en négatif, même saisie positive', () => {
    expect(calculerEngagementActuel('50', 'ANNULATION')).toBe(-50);
    expect(calculerEngagementActuel('-50', 'ANNULATION')).toBe(-50);
  });

  test('un montant invalide compte pour 0', () => {
    expect(calculerEngagementActuel('', 'DIRECT')).toBe(0);
    expect(calculerEngagementActuel(undefined, 'DIRECT')).toBe(0);
  });
});

describe('calculerDisponible', () => {
  test('dotation moins engagements antérieurs et actuel', () => {
    expect(calculerDisponible(1000, 300, 200)).toBe(500);
  });

  test('peut devenir négatif (budget dépassé)', () => {
    expect(calculerDisponible(1000, 900, 200)).toBe(-100);
  });
});

const opsNumeros = [
  { sourceId: 'S1', exerciceId: 'E1', numero: 'N°0001/PIF2-BM/2026' },
  { sourceId: 'S1', exerciceId: 'E1', numero: 'N°0007/PIF2-BM/2026' },
  { sourceId: 'S1', exerciceId: 'E1', numero: 'N°0003/PIF2-BM/2026' },
  { sourceId: 'S2', exerciceId: 'E1', numero: 'N°0099/PIF2-IDA/2026' }, // autre source, ne compte pas
];

describe('maxNumeroExistant', () => {
  test('trouve le plus grand numéro dans la liste', () => {
    expect(maxNumeroExistant(opsNumeros)).toBe(99);
  });

  test('retourne 0 pour une liste vide', () => {
    expect(maxNumeroExistant([])).toBe(0);
  });

  test('ignore les OP sans numéro valide', () => {
    expect(maxNumeroExistant([{ numero: '' }, { numero: null }])).toBe(0);
  });
});

describe('prochainNumero', () => {
  test('renvoie le max + 1, filtré par source/exercice', () => {
    expect(prochainNumero(opsNumeros, { sourceId: 'S1', exerciceId: 'E1' })).toBe(8);
  });

  test('démarre à 1 si aucun OP existant pour cette source/exercice', () => {
    expect(prochainNumero(opsNumeros, { sourceId: 'S3', exerciceId: 'E1' })).toBe(1);
  });
});

describe('construireNumeroOp', () => {
  test('formate le numéro avec padding sur 4 chiffres', () => {
    expect(construireNumeroOp(1, { sigleProjet: 'PIF2', sigleSource: 'BM', annee: 2026 })).toBe('N°0001/PIF2-BM/2026');
    expect(construireNumeroOp(42, { sigleProjet: 'PIF2', sigleSource: 'IDA', annee: 2026 })).toBe('N°0042/PIF2-IDA/2026');
  });

  test('ne tronque pas au-delà de 4 chiffres', () => {
    expect(construireNumeroOp(12345, { sigleProjet: 'PIF2', sigleSource: 'BM', annee: 2026 })).toBe('N°12345/PIF2-BM/2026');
  });
});

describe('calculerMontantTVA', () => {
  test('applique le signe du montant principal', () => {
    expect(calculerMontantTVA(-1000, '18')).toBe(-18);
    expect(calculerMontantTVA(1000, '18')).toBe(18);
  });

  test('retourne null si pas de TVA saisie', () => {
    expect(calculerMontantTVA(1000, '')).toBeNull();
    expect(calculerMontantTVA(1000, null)).toBeNull();
    expect(calculerMontantTVA(1000, 0)).toBeNull();
  });

  test('ignore le signe déjà présent dans la saisie', () => {
    expect(calculerMontantTVA(-1000, '-18')).toBe(-18);
    expect(calculerMontantTVA(1000, '-18')).toBe(18);
  });
});

describe('montantDoitEtrePositif', () => {
  test('un Provisoire doit être positif', () => {
    expect(montantDoitEtrePositif('PROVISOIRE')).toBe(true);
  });

  test("Direct, Définitif et Annulation peuvent être négatifs", () => {
    expect(montantDoitEtrePositif('DIRECT')).toBe(false);
    expect(montantDoitEtrePositif('DEFINITIF')).toBe(false);
    expect(montantDoitEtrePositif('ANNULATION')).toBe(false);
  });
});

describe('calculerDotationConsultation', () => {
  test("utilise la dotation figée si la ligne budgétaire n'a pas changé", () => {
    expect(calculerDotationConsultation({ ligneBudgetaireChangee: false, dotationFigee: 1000, dotationLigneSelectionnee: 2000 })).toBe(1000);
  });

  test('bascule sur la dotation de la nouvelle ligne si elle a été changée', () => {
    expect(calculerDotationConsultation({ ligneBudgetaireChangee: true, dotationFigee: 1000, dotationLigneSelectionnee: 2000 })).toBe(2000);
  });

  test('retourne 0 si aucune dotation disponible', () => {
    expect(calculerDotationConsultation({ ligneBudgetaireChangee: false, dotationFigee: null, dotationLigneSelectionnee: null })).toBe(0);
  });
});

const opsChronologie = [
  { id: 'op1', sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'EN_COURS', montant: 100, createdAt: '2026-01-01' },
  { id: 'op2', sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'REJETE_CF', montant: 50, createdAt: '2026-01-02' }, // compte (rejeté ≠ supprimé)
  { id: 'op3', sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'SUPPRIME', montant: 999, createdAt: '2026-01-03' }, // exclu
  { id: 'opEdite', sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'EN_COURS', montant: 30, createdAt: '2026-01-04' },
  { id: 'op5', sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', statut: 'EN_COURS', montant: 9999, createdAt: '2026-01-05' }, // après : ignoré
];

describe('calculerEngagementsAnterieursAvantOp', () => {
  test("cumule uniquement les OP créés avant l'OP en cours de modification, sur la même ligne", () => {
    expect(calculerEngagementsAnterieursAvantOp(opsChronologie, { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', opId: 'opEdite' })).toBe(150);
  });

  test('les OP rejetés comptent (contrairement au calcul de création)', () => {
    const result = calculerEngagementsAnterieursAvantOp(opsChronologie, { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', opId: 'opEdite' });
    expect(result).toBeGreaterThanOrEqual(150); // inclut bien op2 (REJETE_CF, 50)
  });

  test('retourne 0 sans ligne budgétaire ou sans OP sélectionné', () => {
    expect(calculerEngagementsAnterieursAvantOp(opsChronologie, { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: '', opId: 'opEdite' })).toBe(0);
    expect(calculerEngagementsAnterieursAvantOp(opsChronologie, { sourceId: 'S1', exerciceId: 'E1', ligneBudgetaire: 'L1', opId: null })).toBe(0);
  });
});

describe('calculerMontantTVASiRecuperable', () => {
  test('retourne 0 si la TVA n\'est pas récupérable', () => {
    expect(calculerMontantTVASiRecuperable(false, 1000, '18')).toBe(0);
  });

  test('applique le signe du montant principal si récupérable', () => {
    expect(calculerMontantTVASiRecuperable(true, -1000, '18')).toBe(-18);
    expect(calculerMontantTVASiRecuperable(true, 1000, '18')).toBe(18);
  });

  test('gère une saisie de TVA vide sans planter (0)', () => {
    expect(calculerMontantTVASiRecuperable(true, 1000, '')).toBe(0);
  });
});
