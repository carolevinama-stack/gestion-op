import {
  entreeHistoriqueRejet,
  misesAJourAnnulationRejet,
  rejetsAMettreALaCorbeille,
  misesAJourCorbeilleRejet,
  listerRejets,
  nombreRejets,
  listerRejetsAvecEnCours,
} from './rejets';

// Un OP de 5 000 000 F visé le 2, rejeté par le CF le 15, qu'on annule le 20.
const opRejeteCF = () => ({
  id: 'op1',
  numero: 'N°0042/SP',
  statut: 'REJETE_CF',
  montant: 5000000,
  bordereauCF: 'BT-001',
  dateVisaCF: '2026-04-02',
  dateRejet: '2026-04-15',
  motifRejet: 'Facture non conforme',
});

const opRejeteAC = () => ({
  ...opRejeteCF(),
  statut: 'REJETE_AC',
  dateRejet: '2026-05-10',
  motifRejet: 'Imputation erronée',
});

describe('misesAJourAnnulationRejet — la trace du rejet est conservée', () => {
  // C'est la raison d'être du fichier : avant, la date et le motif étaient
  // simplement mis à null et personne ne pouvait plus savoir qu'il y avait eu
  // un rejet, ni lequel.
  test('la date et le motif du rejet partent dans l\'historique', () => {
    const upd = misesAJourAnnulationRejet(opRejeteCF(), { dateAnnulation: '2026-04-20', type: 'CF' });
    expect(upd.historiqueRejets).toHaveLength(1);
    expect(upd.historiqueRejets[0]).toMatchObject({
      dateRejet: '2026-04-15',
      motifRejet: 'Facture non conforme',
      dateAnnulation: '2026-04-20',
      type: 'CF',
    });
  });

  test('les champs « en cours » sont bien effacés', () => {
    const upd = misesAJourAnnulationRejet(opRejeteCF(), { dateAnnulation: '2026-04-20', type: 'CF' });
    expect(upd.dateRejet).toBeNull();
    expect(upd.motifRejet).toBeNull();
  });

  test('CF : l\'OP redevient transmis au CF et perd son visa', () => {
    const upd = misesAJourAnnulationRejet(opRejeteCF(), { dateAnnulation: '2026-04-20', type: 'CF' });
    expect(upd.statut).toBe('TRANSMIS_CF');
    expect(upd.dateVisaCF).toBeNull();
  });

  // Côté AC le visa du CF est acquis : l'annulation d'un rejet de l'AC ne doit
  // pas le faire disparaître, sinon l'OP repartirait de bien trop loin.
  test('AC : l\'OP redevient transmis à l\'AC et garde le visa du CF', () => {
    const upd = misesAJourAnnulationRejet(opRejeteAC(), { dateAnnulation: '2026-05-20', type: 'AC' });
    expect(upd.statut).toBe('TRANSMIS_AC');
    expect(upd).not.toHaveProperty('dateVisaCF');
  });

  test('le bordereau d\'origine n\'est pas touché', () => {
    const upd = misesAJourAnnulationRejet(opRejeteCF(), { dateAnnulation: '2026-04-20', type: 'CF' });
    expect(upd).not.toHaveProperty('bordereauCF');
  });

  test('l\'auteur de l\'annulation est enregistré quand il est fourni', () => {
    const upd = misesAJourAnnulationRejet(opRejeteCF(), { dateAnnulation: '2026-04-20', type: 'CF', parQui: 'Awa' });
    expect(upd.historiqueRejets[0].parQui).toBe('Awa');
  });

  // Deux rejets successifs sur le même OP : le second s'ajoute, il n'écrase pas.
  test('un second rejet annulé s\'ajoute à l\'historique', () => {
    const premier = misesAJourAnnulationRejet(opRejeteCF(), { dateAnnulation: '2026-04-20', type: 'CF' });
    const opApres = { ...opRejeteCF(), ...premier, dateRejet: '2026-06-01', motifRejet: 'Montant erroné' };
    const second = misesAJourAnnulationRejet(opApres, { dateAnnulation: '2026-06-05', type: 'CF' });
    expect(second.historiqueRejets).toHaveLength(2);
    expect(second.historiqueRejets[1].motifRejet).toBe('Montant erroné');
  });

  test('un OP sans historique antérieur n\'échoue pas', () => {
    const upd = misesAJourAnnulationRejet({ dateRejet: '2026-04-15' }, { dateAnnulation: '2026-04-20', type: 'CF' });
    expect(upd.historiqueRejets).toHaveLength(1);
  });
});

describe('entreeHistoriqueRejet — une entrée se suffit à elle-même', () => {
  test('un rejet sans motif donne une entrée exploitable', () => {
    const e = entreeHistoriqueRejet({ dateRejet: '2026-04-15' }, { dateAnnulation: '2026-04-20', type: 'CF' });
    expect(e.motifRejet).toBeNull();
    expect(e.dateRejet).toBe('2026-04-15');
  });
});

describe('rejetsAMettreALaCorbeille — le négatif part avec le rejet', () => {
  const ops = [
    { id: 'op1', numero: 'N°0042/SP', type: 'DIRECT', montant: 5000000 },
    { id: 'r1', numero: 'N°0042/SP-R', type: 'REJET', montant: -5000000, opOriginalId: 'op1' },
    { id: 'op2', numero: 'N°0043/SP', type: 'DIRECT', montant: 800000 },
    { id: 'r2', numero: 'N°0043/SP-R', type: 'REJET', montant: -800000, opOriginalId: 'op2' },
  ];

  test('seul le négatif de l\'OP concerné est retenu', () => {
    expect(rejetsAMettreALaCorbeille(ops, 'op1').map(o => o.id)).toEqual(['r1']);
  });

  // La garantie qui compte : ne jamais emporter le négatif d'un autre OP.
  test('le négatif d\'un autre OP n\'est jamais retenu', () => {
    expect(rejetsAMettreALaCorbeille(ops, 'op1').some(o => o.opOriginalId !== 'op1')).toBe(false);
  });

  test('un OP sans rejet ne donne rien à supprimer', () => {
    expect(rejetsAMettreALaCorbeille(ops, 'op9')).toEqual([]);
  });

  // Un rejet annulé avant cette correction a laissé un négatif orphelin : si
  // l'OP est rejeté puis annulé de nouveau, les deux doivent partir.
  test('plusieurs négatifs orphelins du même OP partent ensemble', () => {
    const avecOrphelin = [...ops, { id: 'r1bis', type: 'REJET', montant: -5000000, opOriginalId: 'op1' }];
    expect(rejetsAMettreALaCorbeille(avecOrphelin, 'op1').map(o => o.id)).toEqual(['r1', 'r1bis']);
  });

  test('une liste absente ne fait pas échouer', () => {
    expect(rejetsAMettreALaCorbeille(undefined, 'op1')).toEqual([]);
  });
});

describe('lecture de l\'historique', () => {
  const opAvecHistorique = {
    statut: 'TRANSMIS_CF',
    historiqueRejets: [
      { dateRejet: '2026-04-15', motifRejet: 'Facture non conforme', dateAnnulation: '2026-04-20', type: 'CF' },
      { dateRejet: '2026-06-01', motifRejet: 'Montant erroné', dateAnnulation: '2026-06-05', type: 'CF' },
    ],
  };

  test('le plus récent est présenté en premier', () => {
    expect(listerRejets(opAvecHistorique)[0].motifRejet).toBe('Montant erroné');
  });

  test('les entrées vides sont écartées', () => {
    const op = { historiqueRejets: [{}, null, { dateRejet: '2026-04-15' }] };
    expect(listerRejets(op)).toHaveLength(1);
  });

  test('un OP jamais rejeté n\'a pas d\'historique', () => {
    expect(listerRejets({ statut: 'EN_COURS' })).toEqual([]);
    expect(nombreRejets({ statut: 'EN_COURS' })).toBe(0);
  });

  test('nombreRejets compte les entrées retenues', () => {
    expect(nombreRejets(opAvecHistorique)).toBe(2);
  });

  // Un OP actuellement rejeté doit apparaître dans la vue complète, alors que
  // son rejet n'est pas encore dans l'historique.
  test('le rejet en cours est présenté en tête, sans date d\'annulation', () => {
    const complet = listerRejetsAvecEnCours(opRejeteCF());
    expect(complet).toHaveLength(1);
    expect(complet[0].dateAnnulation).toBeNull();
    expect(complet[0].type).toBe('CF');
  });

  test('le rejet en cours de l\'AC est reconnu comme tel', () => {
    expect(listerRejetsAvecEnCours(opRejeteAC())[0].type).toBe('AC');
  });

  test('rejet en cours et rejets passés sont présentés ensemble', () => {
    const op = { ...opRejeteCF(), historiqueRejets: opAvecHistorique.historiqueRejets };
    expect(listerRejetsAvecEnCours(op)).toHaveLength(3);
    expect(listerRejetsAvecEnCours(op)[0].dateAnnulation).toBeNull();
  });
});

// ⚠️ Un OP ne se supprime JAMAIS : firestore.rules porte « allow delete: if
// false » sur la collection ops, pour empêcher de contourner la corbeille et le
// journal. Un lot qui tente un delete est refusé EN ENTIER — l'annulation du
// rejet échouait alors sur « Missing or insufficient permissions ».
describe('la corbeille, jamais la suppression', () => {
  test('un négatif déjà à la corbeille est laissé tranquille', () => {
    const ops = [
      { id: 'r1', type: 'REJET', statut: 'REJETE_CF', montant: -100, opOriginalId: 'op1' },
      { id: 'r2', type: 'REJET', statut: 'SUPPRIME', montant: -100, opOriginalId: 'op1' },
    ];
    expect(rejetsAMettreALaCorbeille(ops, 'op1').map(o => o.id)).toEqual(['r1']);
  });

  test('la mise à la corbeille écrit les champs que la page Corbeille affiche', () => {
    const upd = misesAJourCorbeilleRejet({
      dateSuppression: '2026-04-20T10:00:00.000Z', parQui: 'Awa', numeroOrigine: 'N°0042/SP',
    });
    expect(upd).toMatchObject({
      statut: 'SUPPRIME',
      dateSuppression: '2026-04-20T10:00:00.000Z',
      supprimePar: 'Awa',
      motifSuppression: "Rejet de l'OP N°0042/SP annulé",
    });
  });

  test('sans auteur connu, le champ reste nul plutôt qu\'inventé', () => {
    expect(misesAJourCorbeilleRejet({ dateSuppression: 'x' }).supprimePar).toBeNull();
  });
});
