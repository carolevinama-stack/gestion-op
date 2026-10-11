import { versionsDuBudget, versionSuivante, opsDeLaVersion, raisonBlocageSuppression, versionSupprimable } from './versionsBudget';

// La règle qui décide si une version de budget peut être supprimée. Elle est
// partagée par l'écran Budget et par l'Historique budgétaire : une erreur ici
// autoriserait une suppression qui fausse le suivi, ou en interdirait une
// parfaitement légitime.

const v = (version, createdAt, extra = {}) => ({
  id: `bu${version}`, sourceId: 'S1', exerciceId: 'E1', version, createdAt,
  lignes: [{ code: '6011', libelle: 'Fournitures', dotation: 10000000 }], ...extra,
});

const BUDGETS = [
  v(1, '2026-01-10T08:00:00.000Z'),
  v(2, '2026-04-15T08:00:00.000Z'),
  v(3, '2026-08-01T08:00:00.000Z'),
];

const op = (numero, createdAt, extra = {}) => ({
  id: numero, numero, sourceId: 'S1', exerciceId: 'E1', statut: 'EN_COURS',
  montant: 100000, createdAt, ...extra,
});

describe('Les versions d\'un budget', () => {
  test('elles sont rendues de la plus ancienne à la plus récente', () => {
    const melange = [BUDGETS[2], BUDGETS[0], BUDGETS[1]];
    expect(versionsDuBudget(melange, { sourceId: 'S1', exerciceId: 'E1' }).map(b => b.version))
      .toEqual([1, 2, 3]);
  });

  test('les budgets d\'une autre source ou d\'un autre exercice sont écartés', () => {
    const autres = [...BUDGETS, { ...v(1, '2026-01-01'), id: 'x', sourceId: 'S2' }];
    expect(versionsDuBudget(autres, { sourceId: 'S1', exerciceId: 'E1' })).toHaveLength(3);
  });

  test('la dernière version n\'a pas de suivante', () => {
    expect(versionSuivante(BUDGETS, BUDGETS[2])).toBeNull();
    expect(versionSuivante(BUDGETS, BUDGETS[0]).version).toBe(2);
  });
});

describe('Les OP créés sous une version', () => {
  // Un OP appartient à la version en vigueur au moment de sa création.
  test('un OP se rattache à la version en vigueur à sa création', () => {
    const ops = [
      op('N°0001/SP', '2026-02-01T08:00:00.000Z'),   // entre V1 et V2
      op('N°0002/SP', '2026-05-01T08:00:00.000Z'),   // entre V2 et V3
      op('N°0003/SP', '2026-09-01T08:00:00.000Z'),   // après V3
    ];
    expect(opsDeLaVersion(ops, BUDGETS, BUDGETS[0]).map(o => o.numero)).toEqual(['N°0001/SP']);
    expect(opsDeLaVersion(ops, BUDGETS, BUDGETS[1]).map(o => o.numero)).toEqual(['N°0002/SP']);
    expect(opsDeLaVersion(ops, BUDGETS, BUDGETS[2]).map(o => o.numero)).toEqual(['N°0003/SP']);
  });

  test('un OP créé avant la première version n\'appartient à aucune', () => {
    const ops = [op('N°0001/SP', '2025-12-01T08:00:00.000Z')];
    expect(opsDeLaVersion(ops, BUDGETS, BUDGETS[0])).toHaveLength(0);
  });

  // Un OP mis à la corbeille n'engage plus rien : il ne doit pas bloquer.
  test('un OP mis à la corbeille ne compte pas', () => {
    const ops = [op('N°0001/SP', '2026-02-01T08:00:00.000Z', { statut: 'SUPPRIME' })];
    expect(opsDeLaVersion(ops, BUDGETS, BUDGETS[0])).toHaveLength(0);
  });

  test('les OP d\'une autre source ou d\'un autre exercice ne comptent pas', () => {
    const ops = [
      op('N°0001/SE', '2026-02-01T08:00:00.000Z', { sourceId: 'S2' }),
      op('N°0099/SP', '2026-02-01T08:00:00.000Z', { exerciceId: 'E0' }),
    ];
    expect(opsDeLaVersion(ops, BUDGETS, BUDGETS[0])).toHaveLength(0);
  });
});

describe('Peut-on supprimer cette version ?', () => {
  test('une version sous laquelle rien n\'a été créé est supprimable', () => {
    expect(versionSupprimable([], BUDGETS, BUDGETS[1])).toBe(true);
    expect(raisonBlocageSuppression([], BUDGETS, BUDGETS[1])).toBeNull();
  });

  test('une version qui a servi est refusée, et la raison nomme les OP', () => {
    const ops = [op('N°0007/SP', '2026-05-01T08:00:00.000Z')];
    const raison = raisonBlocageSuppression(ops, BUDGETS, BUDGETS[1]);
    expect(raison).toContain('1 OP a été créé sous cette version');
    expect(raison).toContain('N°0007/SP');
    expect(versionSupprimable(ops, BUDGETS, BUDGETS[1])).toBe(false);
  });

  test('la raison cite au plus trois OP, puis abrège', () => {
    const ops = ['a', 'b', 'c', 'd'].map((n, i) => op(`N°000${i + 1}/SP`, '2026-05-0' + (i + 1) + 'T08:00:00.000Z'));
    const raison = raisonBlocageSuppression(ops, BUDGETS, BUDGETS[1]);
    expect(raison).toContain('4 OP ont été créés');
    expect(raison).toContain('…');
  });

  // Une version récente peut être supprimée même si le budget porte des
  // engagements plus anciens : ce sont les OP créés SOUS ELLE qui comptent.
  test('des engagements sous une version antérieure ne bloquent pas la suivante', () => {
    const ops = [op('N°0001/SP', '2026-02-01T08:00:00.000Z')];   // sous V1
    expect(versionSupprimable(ops, BUDGETS, BUDGETS[2])).toBe(true);
    expect(versionSupprimable(ops, BUDGETS, BUDGETS[0])).toBe(false);
  });

  // Sans date de création, on ne peut rien prouver : on refuse.
  test('une version sans date de création est refusée par précaution', () => {
    const sansDate = { ...v(4), createdAt: undefined };
    expect(raisonBlocageSuppression([], [...BUDGETS, sansDate], sansDate))
      .toContain('pas de date de création');
  });

  test('aucune version sélectionnée : refus, sans erreur', () => {
    expect(raisonBlocageSuppression([], BUDGETS, null)).toContain('Aucune version');
    expect(versionSupprimable([], BUDGETS, undefined)).toBe(false);
  });

  test('des listes vides ou absentes ne provoquent pas d\'erreur', () => {
    expect(() => raisonBlocageSuppression(null, null, BUDGETS[0])).not.toThrow();
    expect(versionsDuBudget(null, { sourceId: 'S1', exerciceId: 'E1' })).toEqual([]);
  });
});
