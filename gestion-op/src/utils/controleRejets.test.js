import { controlerRejets, estRejetLegitime, orphelinsParExercice } from './controleRejets';

// Un OP de 5 000 000 F rejeté : l'original reste rejeté, son négatif est légitime.
const rejetEnCours = [
  { id: 'op1', numero: 'N°0042/SP', type: 'DIRECT', statut: 'REJETE_CF', montant: 5000000, exerciceId: 'E1' },
  { id: 'r1', numero: 'N°0042/SP-R', type: 'REJET', statut: 'REJETE_CF', montant: -5000000, opOriginalId: 'op1', exerciceId: 'E1' },
];

// Le même, après annulation du rejet : l'original est reparti, le négatif reste.
const rejetAnnule = [
  { id: 'op2', numero: 'N°0043/SP', type: 'DIRECT', statut: 'TRANSMIS_CF', montant: 800000, exerciceId: 'E1' },
  { id: 'r2', numero: 'N°0043/SP-R', type: 'REJET', statut: 'REJETE_CF', montant: -800000, opOriginalId: 'op2', exerciceId: 'E1' },
];

describe('controlerRejets — distinguer le négatif utile du négatif oublié', () => {
  test('un rejet en cours est légitime', () => {
    const r = controlerRejets(rejetEnCours);
    expect(r.legitimes.map(o => o.id)).toEqual(['r1']);
    expect(r.orphelins).toEqual([]);
    expect(r.montantOrphelins).toBe(0);
  });

  // Le défaut recherché : l'OP d'origine n'est plus rejeté, le négatif aurait
  // dû partir avec l'annulation.
  test('un rejet annulé laisse un négatif orphelin', () => {
    const r = controlerRejets(rejetAnnule);
    expect(r.orphelins.map(o => o.id)).toEqual(['r2']);
    expect(r.montantOrphelins).toBe(-800000);
  });

  test('un rejet dont l\'OP d\'origine a disparu est orphelin', () => {
    const r = controlerRejets([rejetAnnule[1]]);
    expect(r.orphelins.map(o => o.id)).toEqual(['r2']);
  });

  // Un rejet de l'AC compte autant qu'un rejet du CF.
  test('un OP encore rejeté par l\'AC rend son négatif légitime', () => {
    const r = controlerRejets([
      { id: 'op3', type: 'DIRECT', statut: 'REJETE_AC', montant: 100000 },
      { id: 'r3', type: 'REJET', statut: 'REJETE_AC', montant: -100000, opOriginalId: 'op3' },
    ]);
    expect(r.orphelins).toEqual([]);
  });

  // Prudence : sans opOriginalId on ne peut rien conclure. Ces OP sont signalés
  // à part, et ne doivent jamais être comptés comme orphelins.
  test('un rejet sans opOriginalId est signalé à part, pas compté orphelin', () => {
    const r = controlerRejets([{ id: 'r4', type: 'REJET', statut: 'REJETE_CF', montant: -300000 }]);
    expect(r.nonRattachables.map(o => o.id)).toEqual(['r4']);
    expect(r.orphelins).toEqual([]);
    expect(r.montantOrphelins).toBe(0);
  });

  test('les OP ordinaires ne sont jamais examinés', () => {
    const r = controlerRejets([
      { id: 'op5', type: 'DIRECT', statut: 'PAYE', montant: 200000 },
      { id: 'op6', type: 'ANNULATION', statut: 'ANNULE', montant: -200000 },
    ]);
    expect(r.nbRejets).toBe(0);
    expect(r.orphelins).toEqual([]);
  });

  test('plusieurs orphelins additionnent leurs montants', () => {
    const r = controlerRejets([...rejetEnCours, ...rejetAnnule,
      { id: 'op7', type: 'DIRECT', statut: 'PAYE', montant: 1000000, exerciceId: 'E0' },
      { id: 'r7', type: 'REJET', statut: 'REJETE_CF', montant: -1000000, opOriginalId: 'op7', exerciceId: 'E0' },
    ]);
    expect(r.orphelins.map(o => o.id)).toEqual(['r2', 'r7']);
    expect(r.montantOrphelins).toBe(-1800000);
    expect(r.nbRejets).toBe(3);
    expect(r.nbOps).toBe(6);
  });

  test('une base sans OP ne fait pas échouer le contrôle', () => {
    expect(controlerRejets([])).toMatchObject({ nbOps: 0, nbRejets: 0, montantOrphelins: 0 });
    expect(controlerRejets(undefined)).toMatchObject({ nbOps: 0, nbRejets: 0 });
    expect(controlerRejets([null, undefined])).toMatchObject({ nbOps: 0 });
  });
});

describe('estRejetLegitime', () => {
  test('sans OP d\'origine en base, le négatif n\'est pas légitime', () => {
    expect(estRejetLegitime({ opOriginalId: 'absent' }, new Map())).toBe(false);
  });
});

describe('orphelinsParExercice — dire où le budget est faussé', () => {
  test('les orphelins sont regroupés par exercice, avec leurs numéros', () => {
    const groupes = orphelinsParExercice([
      { numero: 'A-R', montant: -100, exerciceId: 'E1' },
      { numero: 'B-R', montant: -200, exerciceId: 'E1' },
      { numero: 'C-R', montant: -500, exerciceId: 'E0' },
    ]);
    expect(groupes).toEqual([
      { exerciceId: 'E1', nb: 2, montant: -300, numeros: ['A-R', 'B-R'] },
      { exerciceId: 'E0', nb: 1, montant: -500, numeros: ['C-R'] },
    ]);
  });

  test('un orphelin sans exercice est regroupé à part, pas perdu', () => {
    expect(orphelinsParExercice([{ numero: 'X-R', montant: -50 }])[0].exerciceId).toBe('sans exercice');
  });

  test('aucun orphelin, aucun groupe', () => {
    expect(orphelinsParExercice([])).toEqual([]);
    expect(orphelinsParExercice(undefined)).toEqual([]);
  });
});
