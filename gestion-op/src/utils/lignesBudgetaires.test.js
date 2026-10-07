import { comparerCodesLignes, trierLignesParCode } from './lignesBudgetaires';

// Le tri des codes est partagé par tous les écrans qui montrent un budget : une
// erreur ici se verrait partout, et dans les exports Excel aussi.

const codes = (lignes) => trierLignesParCode(lignes).map(l => l.code);

describe('comparerCodesLignes', () => {
  test('les codes de même longueur sont classés simplement', () => {
    expect(comparerCodesLignes('6011', '6021')).toBeLessThan(0);
    expect(comparerCodesLignes('6021', '6011')).toBeGreaterThan(0);
    expect(comparerCodesLignes('6011', '6011')).toBe(0);
  });

  // Le piège d'un tri alphabétique : « 611 » passerait avant « 6011 », parce que
  // le caractère « 1 » vient après « 0 ».
  test('les nombres sont comparés comme des nombres, pas comme du texte', () => {
    expect(comparerCodesLignes('611', '6011')).toBeLessThan(0);
    expect('611'.localeCompare('6011')).toBeGreaterThan(0);   // ce qu'un tri naïf ferait
  });

  test('un code à plusieurs niveaux se classe niveau par niveau', () => {
    expect(comparerCodesLignes('6.1.9', '6.1.10')).toBeLessThan(0);
    expect(comparerCodesLignes('6.2', '6.10')).toBeLessThan(0);
  });

  test('un code absent ou vide ne provoque pas d\'erreur', () => {
    expect(() => comparerCodesLignes(undefined, '6011')).not.toThrow();
    expect(comparerCodesLignes('', '6011')).toBeLessThan(0);
  });
});

describe('trierLignesParCode', () => {
  test('les lignes sont rendues dans l\'ordre de leurs codes', () => {
    expect(codes([{ code: '6031' }, { code: '6011' }, { code: '6021' }]))
      .toEqual(['6011', '6021', '6031']);
  });

  // Les listes viennent du contexte de l'application et sont partagées par tous
  // les écrans : les trier sur place en désordonnerait d'autres.
  test('la liste reçue n\'est pas modifiée', () => {
    const origine = [{ code: '6031' }, { code: '6011' }];
    trierLignesParCode(origine);
    expect(origine.map(l => l.code)).toEqual(['6031', '6011']);
  });

  test('une ligne ajoutée après coup se range à sa place', () => {
    const budget = [{ code: '6011' }, { code: '6031' }];
    expect(codes([...budget, { code: '6021' }])).toEqual(['6011', '6021', '6031']);
  });

  test('une liste vide, absente ou sans code ne provoque pas d\'erreur', () => {
    expect(trierLignesParCode([])).toEqual([]);
    expect(trierLignesParCode(null)).toEqual([]);
    expect(trierLignesParCode(undefined)).toEqual([]);
    expect(codes([{ code: '6011' }, {}])).toEqual([undefined, '6011']);
  });
});
