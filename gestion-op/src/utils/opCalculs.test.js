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
  filtrerOpProvisoiresPourAnnulation,
  filtrerOpProvisoiresPourDefinitif,
  aUneAnnulationActive,
  aUnDefinitifActif,
  trouverDefinitifActif,
  estAAnnuler,
  indexerRattachements,
  aUneAnnulationActiveIndexee,
  aUnDefinitifActifIndexe,
  trouverDefinitifActifIndexe,
  estAAnnulerIndexe,
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

describe('filtrerOpProvisoiresPourAnnulation', () => {
  test('propose un OP Provisoire non encore rattaché', () => {
    const ops = [{ id: 'p1', type: 'PROVISOIRE', beneficiaireId: 'B1', sourceId: 'S1', statut: 'EN_COURS' }];
    expect(filtrerOpProvisoiresPourAnnulation(ops, { beneficiaireId: 'B1', sourceId: 'S1' })).toHaveLength(1);
  });

  test("n'affiche plus un Provisoire déjà rattaché à une Annulation active", () => {
    const ops = [
      { id: 'p1', type: 'PROVISOIRE', beneficiaireId: 'B1', sourceId: 'S1', statut: 'EN_COURS' },
      { id: 'a1', type: 'ANNULATION', opProvisoireId: 'p1', sourceId: 'S1', statut: 'EN_COURS' },
    ];
    expect(filtrerOpProvisoiresPourAnnulation(ops, { beneficiaireId: 'B1', sourceId: 'S1' })).toHaveLength(0);
  });

  test('redevient disponible si son Annulation a été rejetée (bug corrigé)', () => {
    const ops = [
      { id: 'p1', type: 'PROVISOIRE', beneficiaireId: 'B1', sourceId: 'S1', statut: 'EN_COURS' },
      { id: 'a1', type: 'ANNULATION', opProvisoireId: 'p1', sourceId: 'S1', statut: 'REJETE_CF' },
    ];
    const result = filtrerOpProvisoiresPourAnnulation(ops, { beneficiaireId: 'B1', sourceId: 'S1' });
    expect(result.map(o => o.id)).toEqual(['p1']);
  });

  test('redevient disponible si son Annulation a été supprimée (corbeille)', () => {
    const ops = [
      { id: 'p1', type: 'PROVISOIRE', beneficiaireId: 'B1', sourceId: 'S1', statut: 'EN_COURS' },
      { id: 'a1', type: 'ANNULATION', opProvisoireId: 'p1', sourceId: 'S1', statut: 'SUPPRIME' },
    ];
    expect(filtrerOpProvisoiresPourAnnulation(ops, { beneficiaireId: 'B1', sourceId: 'S1' })).toHaveLength(1);
  });

  test('retourne un tableau vide sans bénéficiaire sélectionné', () => {
    expect(filtrerOpProvisoiresPourAnnulation([{ id: 'p1', type: 'PROVISOIRE' }], { beneficiaireId: '', sourceId: 'S1' })).toEqual([]);
  });
});

describe('filtrerOpProvisoiresPourDefinitif', () => {
  test("n'affiche plus un Provisoire déjà rattaché à un Définitif actif", () => {
    const ops = [
      { id: 'p1', type: 'PROVISOIRE', beneficiaireId: 'B1', sourceId: 'S1', statut: 'EN_COURS' },
      { id: 'd1', type: 'DEFINITIF', opProvisoireIds: ['p1'], sourceId: 'S1', statut: 'EN_COURS' },
    ];
    expect(filtrerOpProvisoiresPourDefinitif(ops, { beneficiaireId: 'B1', sourceId: 'S1' })).toHaveLength(0);
  });

  test('redevient disponible si son Définitif a été rejeté (bug corrigé)', () => {
    const ops = [
      { id: 'p1', type: 'PROVISOIRE', beneficiaireId: 'B1', sourceId: 'S1', statut: 'EN_COURS' },
      { id: 'd1', type: 'DEFINITIF', opProvisoireIds: ['p1'], sourceId: 'S1', statut: 'REJETE_AC' },
    ];
    const result = filtrerOpProvisoiresPourDefinitif(ops, { beneficiaireId: 'B1', sourceId: 'S1' });
    expect(result.map(o => o.id)).toEqual(['p1']);
  });

  test("ignore les Provisoires d'un autre bénéficiaire sauf si demandé explicitement", () => {
    const ops = [{ id: 'p1', type: 'PROVISOIRE', beneficiaireId: 'AUTRE', sourceId: 'S1', statut: 'EN_COURS' }];
    expect(filtrerOpProvisoiresPourDefinitif(ops, { beneficiaireId: 'B1', sourceId: 'S1', autresBeneficiaires: false })).toHaveLength(0);
    expect(filtrerOpProvisoiresPourDefinitif(ops, { beneficiaireId: 'B1', sourceId: 'S1', autresBeneficiaires: true })).toHaveLength(1);
  });
});

// ==================== LOGIQUE PARTAGÉE TABLEAU DE BORD / RAPPORT ====================

describe('aUneAnnulationActive', () => {
  const prov = { id: 'P1', type: 'PROVISOIRE', statut: 'VISE_CF' };

  it("est faux quand aucune annulation n'est rattachée", () => {
    expect(aUneAnnulationActive([prov], 'P1')).toBe(false);
  });

  it('est vrai quand une annulation en cours est rattachée', () => {
    const ops = [prov, { id: 'A1', type: 'ANNULATION', opProvisoireId: 'P1', statut: 'EN_COURS' }];
    expect(aUneAnnulationActive(ops, 'P1')).toBe(true);
  });

  it('est faux quand la seule annulation rattachée a été rejetée', () => {
    const ops = [prov, { id: 'A1', type: 'ANNULATION', opProvisoireId: 'P1', statut: 'REJETE_CF' }];
    expect(aUneAnnulationActive(ops, 'P1')).toBe(false);
  });

  it('est faux quand la seule annulation rattachée a été supprimée', () => {
    const ops = [prov, { id: 'A1', type: 'ANNULATION', opProvisoireId: 'P1', statut: 'SUPPRIME' }];
    expect(aUneAnnulationActive(ops, 'P1')).toBe(false);
  });

  it("ignore une annulation rattachée à un autre provisoire", () => {
    const ops = [prov, { id: 'A1', type: 'ANNULATION', opProvisoireId: 'P2', statut: 'EN_COURS' }];
    expect(aUneAnnulationActive(ops, 'P1')).toBe(false);
  });
});

describe('trouverDefinitifActif / aUnDefinitifActif', () => {
  const prov = { id: 'P1', type: 'PROVISOIRE', statut: 'PAYE' };

  it('trouve un définitif rattaché par opProvisoireId', () => {
    const def = { id: 'D1', type: 'DEFINITIF', opProvisoireId: 'P1', statut: 'EN_COURS', numero: 12 };
    expect(trouverDefinitifActif([prov, def], 'P1')).toBe(def);
    expect(aUnDefinitifActif([prov, def], 'P1')).toBe(true);
  });

  it('trouve un définitif rattaché par opProvisoireIds (régularisation groupée)', () => {
    const def = { id: 'D1', type: 'DEFINITIF', opProvisoireIds: ['P0', 'P1'], statut: 'VISE_CF' };
    expect(trouverDefinitifActif([prov, def], 'P1')).toBe(def);
  });

  it('renvoie null quand le définitif rattaché a été rejeté', () => {
    const def = { id: 'D1', type: 'DEFINITIF', opProvisoireId: 'P1', statut: 'REJETE_AC' };
    expect(trouverDefinitifActif([prov, def], 'P1')).toBeNull();
    expect(aUnDefinitifActif([prov, def], 'P1')).toBe(false);
  });

  it('renvoie null quand il n\'y a aucun définitif', () => {
    expect(trouverDefinitifActif([prov], 'P1')).toBeNull();
  });
});

describe('estAAnnuler', () => {
  const prov = { id: 'P1', type: 'PROVISOIRE', statut: 'VISE_CF' };

  it('retient un provisoire en cours sans annulation rattachée', () => {
    expect(estAAnnuler(prov, [prov])).toBe(true);
  });

  it("écarte un OP qui n'est pas un provisoire", () => {
    const direct = { id: 'X1', type: 'DIRECT', statut: 'VISE_CF' };
    expect(estAAnnuler(direct, [direct])).toBe(false);
  });

  it.each(['PAYE', 'PAYE_PARTIEL', 'REJETE_CF', 'REJETE_AC', 'ARCHIVE', 'ANNULE'])(
    'écarte un provisoire au statut %s',
    (statut) => {
      const op = { ...prov, statut };
      expect(estAAnnuler(op, [op])).toBe(false);
    }
  );

  it('écarte un provisoire déjà rattaché à une annulation active', () => {
    const ops = [prov, { id: 'A1', type: 'ANNULATION', opProvisoireId: 'P1', statut: 'TRANSMIS_CF' }];
    expect(estAAnnuler(prov, ops)).toBe(false);
  });

  it('retient à nouveau un provisoire dont l\'annulation a été rejetée', () => {
    const ops = [prov, { id: 'A1', type: 'ANNULATION', opProvisoireId: 'P1', statut: 'REJETE_CF' }];
    expect(estAAnnuler(prov, ops)).toBe(true);
  });

  it('donne le même résultat que la liste utilisée par le Rapport et le Tableau de bord', () => {
    // Même jeu d'OP, listes de recherche différentes (exercice courant vs tous les exercices) :
    // la règle, elle, doit rester identique.
    const ops = [prov, { id: 'A1', type: 'ANNULATION', opProvisoireId: 'P1', statut: 'SUPPRIME' }];
    expect(estAAnnuler(prov, ops)).toBe(estAAnnuler(prov, [prov]));
  });
});

// ==================== INDEX DES RATTACHEMENTS ====================
// L'index existe pour la vitesse, pas pour changer les règles. Ces tests
// vérifient l'équivalence : sur les mêmes données, la version indexée doit
// répondre exactement comme la version qui relit toute la liste. Si un jour
// quelqu'un modifie une règle d'un seul côté, ces tests tombent.
describe('indexerRattachements — équivalence avec la lecture complète', () => {
  const jeuComplet = [
    { id: 'P1', type: 'PROVISOIRE', statut: 'EN_COURS' },
    { id: 'P2', type: 'PROVISOIRE', statut: 'PAYE' },
    { id: 'P3', type: 'PROVISOIRE', statut: 'EN_COURS' },
    { id: 'P4', type: 'PROVISOIRE', statut: 'EN_COURS' },
    { id: 'P5', type: 'PROVISOIRE', statut: 'ARCHIVE' },
    // annulation active sur P1, inactives sur P3 et P4
    { id: 'A1', type: 'ANNULATION', statut: 'EN_COURS', opProvisoireId: 'P1' },
    { id: 'A2', type: 'ANNULATION', statut: 'SUPPRIME', opProvisoireId: 'P3' },
    { id: 'A3', type: 'ANNULATION', statut: 'REJETE_CF', opProvisoireId: 'P4' },
    // définitif actif couvrant P2 et P3, définitif rejeté sur P4
    { id: 'D1', type: 'DEFINITIF', statut: 'EN_COURS', opProvisoireIds: ['P2', 'P3'] },
    { id: 'D2', type: 'DEFINITIF', statut: 'REJETE_AC', opProvisoireId: 'P4' },
    // définitif à l'ancien format, un seul provisoire visé
    { id: 'D3', type: 'DEFINITIF', statut: 'VISE_CF', opProvisoireId: 'P5' },
  ];

  const tousLesIds = jeuComplet.map(o => o.id);

  test('aUneAnnulationActive : même réponse pour chaque OP du jeu', () => {
    const index = indexerRattachements(jeuComplet);
    for (const id of tousLesIds) {
      expect(aUneAnnulationActiveIndexee(index, id)).toBe(aUneAnnulationActive(jeuComplet, id));
    }
  });

  test('aUnDefinitifActif : même réponse pour chaque OP du jeu', () => {
    const index = indexerRattachements(jeuComplet);
    for (const id of tousLesIds) {
      expect(aUnDefinitifActifIndexe(index, id)).toBe(aUnDefinitifActif(jeuComplet, id));
    }
  });

  test('trouverDefinitifActif : le même OP est renvoyé, pas seulement le même oui/non', () => {
    const index = indexerRattachements(jeuComplet);
    for (const id of tousLesIds) {
      expect(trouverDefinitifActifIndexe(index, id)).toBe(trouverDefinitifActif(jeuComplet, id));
    }
  });

  test('estAAnnuler : même verdict pour chaque OP du jeu', () => {
    const index = indexerRattachements(jeuComplet);
    for (const op of jeuComplet) {
      expect(estAAnnulerIndexe(op, index)).toBe(estAAnnuler(op, jeuComplet));
    }
  });

  test('un définitif couvrant plusieurs provisoires est retrouvé pour chacun d\'eux', () => {
    const index = indexerRattachements(jeuComplet);
    expect(trouverDefinitifActifIndexe(index, 'P2').id).toBe('D1');
    expect(trouverDefinitifActifIndexe(index, 'P3').id).toBe('D1');
  });

  test('un rattachement rejeté ou supprimé n\'entre pas dans l\'index', () => {
    const index = indexerRattachements(jeuComplet);
    expect(aUneAnnulationActiveIndexee(index, 'P3')).toBe(false);
    expect(aUnDefinitifActifIndexe(index, 'P4')).toBe(false);
  });

  test('quand plusieurs définitifs actifs visent le même provisoire, c\'est le premier de la liste', () => {
    const ops = [
      { id: 'P1', type: 'PROVISOIRE', statut: 'EN_COURS' },
      { id: 'Dpremier', type: 'DEFINITIF', statut: 'EN_COURS', opProvisoireId: 'P1' },
      { id: 'Dsecond', type: 'DEFINITIF', statut: 'EN_COURS', opProvisoireId: 'P1' },
    ];
    expect(trouverDefinitifActifIndexe(indexerRattachements(ops), 'P1'))
      .toBe(trouverDefinitifActif(ops, 'P1'));
    expect(trouverDefinitifActifIndexe(indexerRattachements(ops), 'P1').id).toBe('Dpremier');
  });

  test('liste vide ou absente : aucun rattachement, aucune erreur', () => {
    expect(aUneAnnulationActiveIndexee(indexerRattachements([]), 'P1')).toBe(false);
    expect(aUnDefinitifActifIndexe(indexerRattachements(undefined), 'P1')).toBe(false);
    expect(trouverDefinitifActifIndexe(indexerRattachements([]), 'P1')).toBeNull();
  });
});
