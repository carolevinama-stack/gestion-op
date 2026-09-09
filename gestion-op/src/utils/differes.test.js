import {
  entreeHistoriqueDiffere,
  misesAJourReintroduction,
  listerDifferes,
  nombreDifferes,
  listerDifferesAvecEnCours,
} from './differes';

// Un OP transmis au CF le 1er, différé le 3, qu'on réintroduit le 20.
const opDiffereCF = () => ({
  id: 'op1',
  numero: '0042',
  statut: 'DIFFERE_CF',
  dateTransmissionCF: '2026-03-01',
  dateDiffere: '2026-03-03',
  motifDiffere: 'Pièce justificative manquante',
});

describe('misesAJourReintroduction — la réintroduction devient la transmission', () => {
  test('CF : la date de transmission est remplacée par la date de réintroduction', () => {
    const upd = misesAJourReintroduction(opDiffereCF(), { dateReintroduction: '2026-03-20', type: 'CF' });
    expect(upd.dateTransmissionCF).toBe('2026-03-20');
    expect(upd.statut).toBe('TRANSMIS_CF');
    expect(upd.dateReintroduction).toBe('2026-03-20');
  });

  test('AC : c\'est la date de transmission AC qui bouge, pas celle du CF', () => {
    const op = { statut: 'DIFFERE_AC', dateTransmissionCF: '2026-03-01', dateTransmissionAC: '2026-04-01', dateDiffere: '2026-04-05', motifDiffere: 'Solde' };
    const upd = misesAJourReintroduction(op, { dateReintroduction: '2026-04-20', type: 'AC' });
    expect(upd.dateTransmissionAC).toBe('2026-04-20');
    expect(upd.statut).toBe('TRANSMIS_AC');
    expect(upd.dateTransmissionCF).toBeUndefined();
  });

  test('les champs « en cours » sont vidés', () => {
    const upd = misesAJourReintroduction(opDiffereCF(), { dateReintroduction: '2026-03-20', type: 'CF' });
    expect(upd.dateDiffere).toBeNull();
    expect(upd.motifDiffere).toBeNull();
  });

  // Le cœur du défaut signalé : le motif disparaissait de tous les écrans.
  test('le différé quitté est conservé dans l\'historique, motif compris', () => {
    const upd = misesAJourReintroduction(opDiffereCF(), { dateReintroduction: '2026-03-20', type: 'CF' });
    expect(upd.historiqueDifferes).toHaveLength(1);
    expect(upd.historiqueDifferes[0]).toEqual({
      dateDiffere: '2026-03-03',
      motifDiffere: 'Pièce justificative manquante',
      dateReintroduction: '2026-03-20',
      type: 'CF',
      dateTransmissionPrecedente: '2026-03-01',
    });
  });

  test('la date de transmission remplacée est gardée, la chronologie reste reconstituable', () => {
    const upd = misesAJourReintroduction(opDiffereCF(), { dateReintroduction: '2026-03-20', type: 'CF' });
    expect(upd.historiqueDifferes[0].dateTransmissionPrecedente).toBe('2026-03-01');
    expect(upd.dateTransmissionCF).toBe('2026-03-20');
  });

  test('un deuxième différé s\'ajoute au premier sans l\'écraser', () => {
    const premier = misesAJourReintroduction(opDiffereCF(), { dateReintroduction: '2026-03-20', type: 'CF' });
    const apres = { ...opDiffereCF(), ...premier, dateDiffere: '2026-03-25', motifDiffere: 'Montant erroné' };
    const second = misesAJourReintroduction(apres, { dateReintroduction: '2026-04-02', type: 'CF' });
    expect(second.historiqueDifferes).toHaveLength(2);
    expect(second.historiqueDifferes[0].motifDiffere).toBe('Pièce justificative manquante');
    expect(second.historiqueDifferes[1].motifDiffere).toBe('Montant erroné');
    expect(second.historiqueDifferes[1].dateTransmissionPrecedente).toBe('2026-03-20');
    expect(second.dateTransmissionCF).toBe('2026-04-02');
  });

  test('un OP sans historique préalable en obtient un', () => {
    const upd = misesAJourReintroduction({ dateDiffere: '2026-01-02' }, { dateReintroduction: '2026-01-10', type: 'CF' });
    expect(upd.historiqueDifferes).toHaveLength(1);
  });
});

describe('entreeHistoriqueDiffere', () => {
  test('les champs absents deviennent null, jamais undefined (Firestore refuse undefined)', () => {
    const e = entreeHistoriqueDiffere({}, { dateReintroduction: '2026-01-10', type: 'CF' });
    expect(e.dateDiffere).toBeNull();
    expect(e.motifDiffere).toBeNull();
    expect(e.dateTransmissionPrecedente).toBeNull();
    expect(Object.values(e)).not.toContain(undefined);
  });
});

describe('listerDifferes — affichage', () => {
  const opAvecHistorique = {
    historiqueDifferes: [
      { dateDiffere: '2026-03-03', motifDiffere: 'Premier motif', dateReintroduction: '2026-03-20', type: 'CF' },
      { dateDiffere: '2026-03-25', motifDiffere: 'Second motif', dateReintroduction: '2026-04-02', type: 'CF' },
    ],
  };

  test('le plus récent est affiché en premier', () => {
    expect(listerDifferes(opAvecHistorique)[0].motifDiffere).toBe('Second motif');
  });

  test('compte le nombre de différés', () => {
    expect(nombreDifferes(opAvecHistorique)).toBe(2);
    expect(nombreDifferes({})).toBe(0);
    expect(nombreDifferes(null)).toBe(0);
  });

  test('les entrées vides sont écartées', () => {
    const op = { historiqueDifferes: [null, {}, { dateDiffere: '2026-01-01' }] };
    expect(listerDifferes(op)).toHaveLength(1);
  });

  test('la liste d\'origine n\'est pas retournée sur place', () => {
    const op = { historiqueDifferes: [{ dateDiffere: 'a' }, { dateDiffere: 'b' }] };
    listerDifferes(op);
    expect(op.historiqueDifferes[0].dateDiffere).toBe('a');
  });
});

describe('listerDifferesAvecEnCours', () => {
  test('un différé en cours apparaît en tête, sans date de réintroduction', () => {
    const op = { statut: 'DIFFERE_CF', dateTransmissionCF: '2026-05-01', dateDiffere: '2026-05-04', motifDiffere: 'En attente', historiqueDifferes: [{ dateDiffere: '2026-03-03', motifDiffere: 'Ancien', dateReintroduction: '2026-03-20', type: 'CF' }] };
    const l = listerDifferesAvecEnCours(op);
    expect(l).toHaveLength(2);
    expect(l[0].motifDiffere).toBe('En attente');
    expect(l[0].dateReintroduction).toBeNull();
    expect(l[1].motifDiffere).toBe('Ancien');
  });

  test('un différé en cours côté AC est marqué AC', () => {
    const op = { statut: 'DIFFERE_AC', dateTransmissionAC: '2026-05-01', dateDiffere: '2026-05-04', motifDiffere: 'x' };
    expect(listerDifferesAvecEnCours(op)[0].type).toBe('AC');
  });

  test('sans différé en cours, c\'est exactement l\'historique', () => {
    const op = { historiqueDifferes: [{ dateDiffere: '2026-03-03', dateReintroduction: '2026-03-20', type: 'CF' }] };
    expect(listerDifferesAvecEnCours(op)).toEqual(listerDifferes(op));
  });
});
