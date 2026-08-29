import {
  calculerEngagementsAnterieurs,
  calculerEngagementActuel,
  calculerDisponible,
  maxNumeroExistant,
  prochainNumero,
  construireNumeroOp,
  calculerMontantTVA,
  montantDoitEtrePositif,
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
