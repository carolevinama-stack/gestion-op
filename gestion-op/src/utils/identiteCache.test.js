import { retenirIdentite, identiteRetenue } from './identiteCache';

// ==================== IDENTITÉ RETENUE POUR L'ACCUEIL ====================
// L'écran de connexion s'affiche avant toute authentification : il ne peut pas
// lire les paramètres du projet. On retient donc le nom et le logo de la
// structure d'une session à l'autre.
//
// Cette mémoire est celle du navigateur : elle peut être vide, effacée ou
// refusée. L'écran doit s'afficher correctement dans tous ces cas — c'est ce
// que ces tests vérifient, plus que le rangement lui-même.

describe('Identité retenue pour l\'écran de connexion', () => {
  beforeEach(() => window.localStorage.clear());

  test('le nom, le pays et le logo sont retenus puis relus', () => {
    retenirIdentite({ nomProjet: 'PROJET X', pays: 'République du Mali', logo: 'data:image/png;base64,AA', motDePasseAdmin: 'secret' });
    const lu = identiteRetenue();
    expect(lu.nomProjet).toBe('PROJET X');
    expect(lu.pays).toBe('République du Mali');
    expect(lu.logo).toBe('data:image/png;base64,AA');
  });

  // Ce qui est retenu finit dans le navigateur de chaque poste : on n'y met
  // que ce qui figure déjà en tête des documents imprimés.
  test('rien d\'autre n\'est retenu — surtout pas le mot de passe', () => {
    retenirIdentite({ nomProjet: 'PROJET X', motDePasseAdmin: 'secret', coordonnateur: 'NDIAYE Fatou' });
    const lu = identiteRetenue();
    expect(Object.keys(lu).sort()).toEqual(['logo', 'nomProjet', 'pays']);
    expect(JSON.stringify(lu)).not.toContain('secret');
    expect(JSON.stringify(lu)).not.toContain('NDIAYE');
  });

  test('première visite : rien de retenu, et c\'est normal', () => {
    expect(identiteRetenue()).toBeNull();
  });

  test('une mémoire abîmée ne fait pas échouer l\'accueil', () => {
    window.localStorage.setItem('identite_structure_v1', 'ceci n\'est pas du JSON');
    expect(identiteRetenue()).toBeNull();
  });

  test('une mémoire indisponible ne fait rien échouer non plus', () => {
    const refuse = () => { throw new Error('mode privé'); };
    const ecrire = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(refuse);
    const lire = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(refuse);
    expect(() => retenirIdentite({ nomProjet: 'PROJET X' })).not.toThrow();
    expect(identiteRetenue()).toBeNull();
    ecrire.mockRestore();
    lire.mockRestore();
  });

  test('un projet absent n\'écrase pas ce qui était retenu', () => {
    retenirIdentite({ nomProjet: 'PROJET X' });
    retenirIdentite(null);
    expect(identiteRetenue().nomProjet).toBe('PROJET X');
  });
});
