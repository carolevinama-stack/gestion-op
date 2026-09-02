import {
  ribsDuBeneficiaire,
  indexRibDeLOp,
  validerModificationOp,
  montantAEnregistrer,
  demandeConfirmationMontantNegatif,
  beneficiairesRattachesDifferents,
  opsImpactesParChangementMontant,
  champsRattachement,
  dotationFigeeApresModif,
} from './opModification';

// Un formulaire valide de référence : chaque test n'en modifie que ce qu'il
// veut éprouver, pour qu'on voie tout de suite quelle règle est en cause.
const formValide = () => ({
  type: 'PROVISOIRE',
  beneficiaireId: 'ben1',
  ribIndex: 0,
  modeReglement: 'VIREMENT',
  objet: 'Achat de fournitures',
  piecesJustificatives: 'Facture n°12',
  montant: '150000',
  ligneBudgetaire: 'L1',
  montantTVA: '',
  tvaRecuperable: false,
  opProvisoireNumero: '',
  opProvisoireId: '',
  opProvisoireIds: [],
  opProvisoireManuel: '',
});

const contexteOk = { selectedRib: { banque: 'BICICI', numero: 'CI001' }, disponible: 500000 };

describe('ribsDuBeneficiaire', () => {
  test('bénéficiaire absent → liste vide', () => {
    expect(ribsDuBeneficiaire(null)).toEqual([]);
    expect(ribsDuBeneficiaire(undefined)).toEqual([]);
  });

  test('format récent : la liste ribs est rendue telle quelle', () => {
    const ben = { ribs: [{ banque: 'SGBCI', numero: 'CI42' }, { banque: '', numero: '' }] };
    expect(ribsDuBeneficiaire(ben)).toEqual(ben.ribs);
  });

  test('format ancien : le champ rib unique devient une liste d\'un élément', () => {
    expect(ribsDuBeneficiaire({ rib: 'CI999' })).toEqual([{ banque: '', numero: 'CI999' }]);
  });

  // C'est le cas qui faisait diverger l'affichage et l'enregistrement : l'écran
  // retombait sur l'ancien champ, le code d'enregistrement non, et le RIB
  // affiché à l'écran était effacé au moment de valider.
  test('liste vide MAIS ancien champ rempli → on retombe sur l\'ancien champ', () => {
    expect(ribsDuBeneficiaire({ ribs: [], rib: 'CI777' })).toEqual([{ banque: '', numero: 'CI777' }]);
  });

  test('aucune référence d\'aucune sorte → liste vide', () => {
    expect(ribsDuBeneficiaire({ ribs: [] })).toEqual([]);
    expect(ribsDuBeneficiaire({})).toEqual([]);
  });

  test('un RIB vide reste un choix possible, il n\'est pas filtré', () => {
    const ben = { ribs: [{ banque: '', numero: '' }] };
    expect(ribsDuBeneficiaire(ben)).toHaveLength(1);
  });
});

describe('indexRibDeLOp', () => {
  const ribs = [{ numero: 'A' }, { numero: 'B' }, { numero: 'C' }];

  test('retrouve le RIB stocké en texte', () => {
    expect(indexRibDeLOp(ribs, 'B')).toBe(1);
  });

  test('retrouve le RIB stocké en objet', () => {
    expect(indexRibDeLOp(ribs, { banque: 'X', numero: 'C' })).toBe(2);
  });

  test('RIB introuvable → premier de la liste, jamais -1', () => {
    expect(indexRibDeLOp(ribs, 'INCONNU')).toBe(0);
  });

  test('liste vide ou absente → 0', () => {
    expect(indexRibDeLOp([], 'A')).toBe(0);
    expect(indexRibDeLOp(undefined, 'A')).toBe(0);
  });

  test('le premier RIB trouvé en position 0 renvoie bien 0', () => {
    expect(indexRibDeLOp(ribs, 'A')).toBe(0);
  });
});

describe('validerModificationOp — champs obligatoires', () => {
  test('un formulaire complet passe', () => {
    expect(validerModificationOp(formValide(), contexteOk)).toBeNull();
  });

  test('bénéficiaire manquant', () => {
    const r = validerModificationOp({ ...formValide(), beneficiaireId: '' }, contexteOk);
    expect(r.message).toMatch(/bénéficiaire/i);
  });

  test('virement sans RIB', () => {
    const r = validerModificationOp(formValide(), { ...contexteOk, selectedRib: null });
    expect(r.titre).toBe('RIB manquant');
  });

  test('espèces sans RIB : autorisé', () => {
    const form = { ...formValide(), modeReglement: 'ESPECES' };
    expect(validerModificationOp(form, { ...contexteOk, selectedRib: null })).toBeNull();
  });

  test('ligne budgétaire manquante', () => {
    const r = validerModificationOp({ ...formValide(), ligneBudgetaire: '' }, contexteOk);
    expect(r.message).toMatch(/ligne budgétaire/i);
  });

  test('objet vide, et objet fait uniquement d\'espaces', () => {
    expect(validerModificationOp({ ...formValide(), objet: '' }, contexteOk).message).toMatch(/objet/i);
    expect(validerModificationOp({ ...formValide(), objet: '   ' }, contexteOk).message).toMatch(/objet/i);
  });

  test('pièces justificatives vides, ou faites uniquement d\'espaces', () => {
    expect(validerModificationOp({ ...formValide(), piecesJustificatives: '' }, contexteOk)).not.toBeNull();
    expect(validerModificationOp({ ...formValide(), piecesJustificatives: '  ' }, contexteOk)).not.toBeNull();
  });
});

describe('validerModificationOp — montant', () => {
  test('montant vide, non numérique, ou nul : refusé', () => {
    for (const montant of ['', 'abc', '0']) {
      expect(validerModificationOp({ ...formValide(), montant }, contexteOk)).not.toBeNull();
    }
  });

  test('un OP Provisoire ne peut pas être négatif', () => {
    const r = validerModificationOp({ ...formValide(), type: 'PROVISOIRE', montant: '-5000' }, contexteOk);
    expect(r.titre).toBe('Montant invalide');
  });

  test('un OP Direct négatif n\'est pas bloqué : il sera seulement confirmé', () => {
    const form = { ...formValide(), type: 'DIRECT', montant: '-5000', tvaRecuperable: false };
    expect(validerModificationOp(form, contexteOk)).toBeNull();
  });

  test('une Annulation négative passe', () => {
    const form = { ...formValide(), type: 'ANNULATION', montant: '-5000', opProvisoireId: 'op1' };
    expect(validerModificationOp(form, contexteOk)).toBeNull();
  });
});

describe('validerModificationOp — TVA', () => {
  const direct = (extra) => ({ ...formValide(), type: 'DIRECT', ...extra });

  test('Direct sans réponse TVA (null) : refusé', () => {
    expect(validerModificationOp(direct({ tvaRecuperable: null }), contexteOk).message).toMatch(/TVA/);
  });

  test('Direct avec TVA récupérable mais sans montant : refusé', () => {
    expect(validerModificationOp(direct({ tvaRecuperable: true, montantTVA: '' }), contexteOk)).not.toBeNull();
    expect(validerModificationOp(direct({ tvaRecuperable: true, montantTVA: '0' }), contexteOk)).not.toBeNull();
  });

  test('Direct avec TVA récupérable et un montant : accepté', () => {
    expect(validerModificationOp(direct({ tvaRecuperable: true, montantTVA: '27000' }), contexteOk)).toBeNull();
  });

  test('Direct avec TVA non récupérable : aucun montant demandé', () => {
    expect(validerModificationOp(direct({ tvaRecuperable: false }), contexteOk)).toBeNull();
  });

  test('la question TVA ne se pose pas pour un Provisoire', () => {
    const form = { ...formValide(), type: 'PROVISOIRE', tvaRecuperable: null };
    expect(validerModificationOp(form, contexteOk)).toBeNull();
  });
});

describe('validerModificationOp — rattachement obligatoire', () => {
  test('Annulation sans provisoire ni saisie manuelle : refusé', () => {
    const form = { ...formValide(), type: 'ANNULATION' };
    expect(validerModificationOp(form, contexteOk).message).toMatch(/Provisoire/);
  });

  test('Annulation avec un numéro saisi à la main : accepté', () => {
    const form = { ...formValide(), type: 'ANNULATION', opProvisoireManuel: '0042' };
    expect(validerModificationOp(form, contexteOk)).toBeNull();
  });

  test('Annulation dont la saisie manuelle n\'est que des espaces : refusé', () => {
    const form = { ...formValide(), type: 'ANNULATION', opProvisoireManuel: '   ' };
    expect(validerModificationOp(form, contexteOk)).not.toBeNull();
  });

  test('Définitif sans aucun provisoire : refusé', () => {
    const form = { ...formValide(), type: 'DEFINITIF', tvaRecuperable: false, opProvisoireIds: [] };
    expect(validerModificationOp(form, contexteOk).message).toMatch(/régulariser/);
  });

  test('Définitif avec au moins un provisoire : accepté', () => {
    const form = { ...formValide(), type: 'DEFINITIF', tvaRecuperable: false, opProvisoireIds: ['p1'] };
    expect(validerModificationOp(form, contexteOk)).toBeNull();
  });
});

describe('validerModificationOp — budget', () => {
  test('disponible négatif : refusé', () => {
    const r = validerModificationOp(formValide(), { ...contexteOk, disponible: -1 });
    expect(r.titre).toBe('Budget insuffisant');
  });

  test('disponible exactement à zéro : accepté', () => {
    expect(validerModificationOp(formValide(), { ...contexteOk, disponible: 0 })).toBeNull();
  });

  // Une annulation rend du budget : la bloquer sur un disponible négatif
  // empêcherait précisément de corriger la situation.
  test('une Annulation passe même avec un disponible négatif', () => {
    const form = { ...formValide(), type: 'ANNULATION', opProvisoireId: 'op1' };
    expect(validerModificationOp(form, { ...contexteOk, disponible: -900000 })).toBeNull();
  });
});

describe('montantAEnregistrer', () => {
  test('une annulation est toujours enregistrée en négatif', () => {
    expect(montantAEnregistrer('ANNULATION', '5000')).toBe(-5000);
    expect(montantAEnregistrer('ANNULATION', '-5000')).toBe(-5000);
  });

  test('les autres types gardent le signe saisi', () => {
    expect(montantAEnregistrer('PROVISOIRE', '5000')).toBe(5000);
    expect(montantAEnregistrer('DIRECT', '-5000')).toBe(-5000);
  });

  test('une saisie non numérique reste non numérique', () => {
    expect(montantAEnregistrer('DIRECT', 'abc')).toBeNaN();
  });
});

describe('demandeConfirmationMontantNegatif', () => {
  test('Direct et Définitif négatifs demandent confirmation', () => {
    expect(demandeConfirmationMontantNegatif('DIRECT', '-1')).toBe(true);
    expect(demandeConfirmationMontantNegatif('DEFINITIF', '-1')).toBe(true);
  });

  test('positifs et autres types : aucune confirmation', () => {
    expect(demandeConfirmationMontantNegatif('DIRECT', '1')).toBe(false);
    expect(demandeConfirmationMontantNegatif('ANNULATION', '-1')).toBe(false);
    expect(demandeConfirmationMontantNegatif('PROVISOIRE', '-1')).toBe(false);
  });
});

describe('beneficiairesRattachesDifferents', () => {
  const ops = [
    { id: 'p1', beneficiaireId: 'ben1' },
    { id: 'p2', beneficiaireId: 'ben2' },
    { id: 'p3', beneficiaireId: 'ben3' },
    { id: 'p4', beneficiaireId: 'ben2' },
  ];
  const beneficiaires = [
    { id: 'ben1', nom: 'ENTREPRISE A' },
    { id: 'ben2', nom: 'ENTREPRISE B' },
    { id: 'ben3', nom: 'ENTREPRISE C' },
  ];

  test('tous les provisoires ont le même bénéficiaire → rien à signaler', () => {
    const form = { type: 'DEFINITIF', beneficiaireId: 'ben1', opProvisoireIds: ['p1'] };
    expect(beneficiairesRattachesDifferents(form, ops, beneficiaires)).toEqual([]);
  });

  test('un provisoire d\'un autre bénéficiaire est signalé par son nom', () => {
    const form = { type: 'DEFINITIF', beneficiaireId: 'ben1', opProvisoireIds: ['p1', 'p2'] };
    expect(beneficiairesRattachesDifferents(form, ops, beneficiaires)).toEqual(['ENTREPRISE B']);
  });

  test('le même bénéficiaire différent, deux fois, n\'est cité qu\'une fois', () => {
    const form = { type: 'DEFINITIF', beneficiaireId: 'ben1', opProvisoireIds: ['p2', 'p4'] };
    expect(beneficiairesRattachesDifferents(form, ops, beneficiaires)).toEqual(['ENTREPRISE B']);
  });

  test('plusieurs bénéficiaires différents sont tous cités', () => {
    const form = { type: 'DEFINITIF', beneficiaireId: 'ben1', opProvisoireIds: ['p2', 'p3'] };
    expect(beneficiairesRattachesDifferents(form, ops, beneficiaires)).toEqual(['ENTREPRISE B', 'ENTREPRISE C']);
  });

  test('un bénéficiaire disparu de la liste est cité N/A plutôt qu\'ignoré', () => {
    const form = { type: 'DEFINITIF', beneficiaireId: 'ben1', opProvisoireIds: ['p2'] };
    expect(beneficiairesRattachesDifferents(form, ops, [])).toEqual(['N/A']);
  });

  test('un provisoire introuvable est ignoré sans faire planter', () => {
    const form = { type: 'DEFINITIF', beneficiaireId: 'ben1', opProvisoireIds: ['inexistant'] };
    expect(beneficiairesRattachesDifferents(form, ops, beneficiaires)).toEqual([]);
  });

  test('la question ne se pose que pour un Définitif', () => {
    const form = { type: 'ANNULATION', beneficiaireId: 'ben1', opProvisoireIds: ['p2'] };
    expect(beneficiairesRattachesDifferents(form, ops, beneficiaires)).toEqual([]);
  });
});

describe('opsImpactesParChangementMontant', () => {
  const op = { id: 'op5', sourceId: 's1', exerciceId: 'e1', ligneBudgetaire: 'L1', createdAt: '2026-05-10' };
  const ops = [
    op,
    { id: 'avant', sourceId: 's1', exerciceId: 'e1', ligneBudgetaire: 'L1', createdAt: '2026-05-01' },
    { id: 'apres', sourceId: 's1', exerciceId: 'e1', ligneBudgetaire: 'L1', createdAt: '2026-05-20' },
    { id: 'autreLigne', sourceId: 's1', exerciceId: 'e1', ligneBudgetaire: 'L2', createdAt: '2026-05-20' },
    { id: 'autreSource', sourceId: 's2', exerciceId: 'e1', ligneBudgetaire: 'L1', createdAt: '2026-05-20' },
    { id: 'autreExercice', sourceId: 's1', exerciceId: 'e2', ligneBudgetaire: 'L1', createdAt: '2026-05-20' },
    { id: 'supprime', sourceId: 's1', exerciceId: 'e1', ligneBudgetaire: 'L1', createdAt: '2026-05-20', statut: 'SUPPRIME' },
  ];

  test('seuls les OP postérieurs de la même ligne, source et exercice sont impactés', () => {
    expect(opsImpactesParChangementMontant(ops, op).map(o => o.id)).toEqual(['apres']);
  });

  test('l\'OP modifié ne s\'impacte pas lui-même', () => {
    expect(opsImpactesParChangementMontant(ops, op).map(o => o.id)).not.toContain('op5');
  });

  test('un OP supprimé ne pèse plus sur les cumuls', () => {
    expect(opsImpactesParChangementMontant(ops, op).map(o => o.id)).not.toContain('supprime');
  });

  test('aucun OP postérieur → liste vide, donc aucune confirmation', () => {
    const dernier = { ...op, createdAt: '2026-12-31' };
    expect(opsImpactesParChangementMontant(ops, dernier)).toEqual([]);
  });
});

describe('champsRattachement', () => {
  test('Annulation liée à un provisoire choisi dans la liste', () => {
    const form = { type: 'ANNULATION', opProvisoireId: 'p1', opProvisoireNumero: '0007', opProvisoireManuel: '' };
    expect(champsRattachement(form)).toEqual({
      opProvisoireId: 'p1', opProvisoireNumero: '0007', opProvisoireIds: null,
    });
  });

  test('Annulation avec un numéro saisi à la main : pas d\'identifiant, juste le numéro', () => {
    const form = { type: 'ANNULATION', opProvisoireId: '', opProvisoireNumero: '', opProvisoireManuel: ' 0042 ' };
    expect(champsRattachement(form)).toEqual({
      opProvisoireId: null, opProvisoireNumero: '0042', opProvisoireIds: null,
    });
  });

  test('Définitif : le premier provisoire sert aussi d\'identifiant principal', () => {
    const form = { type: 'DEFINITIF', opProvisoireIds: ['p1', 'p2'], opProvisoireId: '' };
    expect(champsRattachement(form)).toEqual({ opProvisoireId: 'p1', opProvisoireIds: ['p1', 'p2'] });
  });

  test('Définitif sans sélection : les deux champs restent vides', () => {
    const form = { type: 'DEFINITIF', opProvisoireIds: [], opProvisoireId: '' };
    expect(champsRattachement(form)).toEqual({ opProvisoireId: null, opProvisoireIds: null });
  });

  // Sans cette remise à zéro, un OP repassé en Provisoire garderait le
  // rattachement de son ancien type et fausserait les rapports.
  test('un Provisoire efface tout rattachement hérité d\'un autre type', () => {
    const form = { type: 'PROVISOIRE', opProvisoireId: 'p1', opProvisoireIds: ['p1'] };
    expect(champsRattachement(form)).toEqual({ opProvisoireId: null, opProvisoireIds: null });
  });

  test('un Direct n\'a jamais de rattachement', () => {
    expect(champsRattachement({ type: 'DIRECT', opProvisoireIds: ['p1'] }))
      .toEqual({ opProvisoireId: null, opProvisoireIds: null });
  });
});

describe('dotationFigeeApresModif', () => {
  test('ligne inchangée : la dotation figée d\'origine est conservée', () => {
    expect(dotationFigeeApresModif({
      ligneChangee: false, dotationNouvelleLigne: 9_000_000, dotationFigeeActuelle: 5_000_000,
    })).toBe(5_000_000);
  });

  test('ligne changée : on fige la dotation de la nouvelle ligne', () => {
    expect(dotationFigeeApresModif({
      ligneChangee: true, dotationNouvelleLigne: 9_000_000, dotationFigeeActuelle: 5_000_000,
    })).toBe(9_000_000);
  });

  test('une dotation figée absente vaut 0, pas undefined', () => {
    expect(dotationFigeeApresModif({ ligneChangee: false, dotationFigeeActuelle: undefined })).toBe(0);
  });

  test('une nouvelle ligne sans dotation connue vaut 0', () => {
    expect(dotationFigeeApresModif({ ligneChangee: true, dotationNouvelleLigne: undefined })).toBe(0);
  });

  // Une dotation réellement à zéro doit rester zéro, pas être remplacée.
  test('une dotation figée à zéro est conservée telle quelle', () => {
    expect(dotationFigeeApresModif({
      ligneChangee: false, dotationNouvelleLigne: 9_000_000, dotationFigeeActuelle: 0,
    })).toBe(0);
  });
});
