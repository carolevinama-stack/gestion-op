import fs from 'fs';
import path from 'path';

// ==================== COÛT DU CHARGEMENT ====================
// Firebase facture CHAQUE document lu, et le forfait gratuit s'arrête à
// 50 000 lectures par jour. Au-delà, l'application se bloque jusqu'au
// lendemain — c'est arrivé le 9 septembre 2026, puis de nouveau fin novembre.
//
// Deux réglages évitent cela, et aucun ne se voit à l'écran : ils peuvent donc
// être défaits par inadvertance sans que personne ne s'en aperçoive, jusqu'au
// jour où le quota saute. Ces tests les verrouillent.
//
// Ils lisent le code source plutôt que de monter l'application : ce qu'on
// vérifie ici, c'est une façon d'écrire, pas un comportement à l'écran.

const lire = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

// Les commentaires de ces fichiers racontent les incidents passés, et citent
// donc les tournures à ne plus employer. On ne vérifie que le code.
const sansCommentaires = (texte) => texte
  .split('\n')
  .filter(l => !l.trim().startsWith('//'))
  .join('\n');

describe('Mémoire locale du navigateur', () => {
  // Sans mémoire locale, chaque rechargement de page relit toute la base.
  test('la mémoire locale est déclarée à l\'initialisation', () => {
    expect(lire('../firebase.js')).toMatch(/persistentLocalCache/);
  });

  // enableIndexedDbPersistence ne fonctionne que sur UN onglet : dès qu'un
  // deuxième s'ouvrait, la mémoire se désactivait pour tout le monde. C'est la
  // cause du dépassement de septembre.
  test('elle est partagée entre les onglets, et non limitée à un seul', () => {
    const firebase = sansCommentaires(lire('../firebase.js'));
    expect(firebase).toMatch(/persistentMultipleTabManager/);
    expect(firebase).not.toMatch(/enableIndexedDbPersistence/);
  });
});

describe('Collections stables : écouteur, et non relecture', () => {
  const contexte = () => sansCommentaires(lire('./AppContext.js'));

  // Les bénéficiaires sont plus de trois cents. Les relire à chaque ouverture
  // de page coûtait autant que toute une journée de saisie.
  test('les bénéficiaires ne sont pas relus à chaque chargement', () => {
    const lignesGetDocs = contexte().split('\n').filter(l => l.includes('getDocs') && l.includes('beneficiaires'));
    expect(lignesGetDocs).toEqual([]);
  });

  test('les lignes budgétaires non plus', () => {
    const lignesGetDocs = contexte().split('\n').filter(l => l.includes('getDocs') && l.includes('lignesBudgetaires'));
    expect(lignesGetDocs).toEqual([]);
  });

  // Elles passent par un écouteur : avec la mémoire locale, un rechargement ne
  // redemande alors au serveur que ce qui a changé.
  test('les deux passent par un écouteur de collection stable', () => {
    const c = contexte();
    expect(c).toMatch(/ecouterCollectionStable\(\s*\n?\s*query\(collection\(db, 'beneficiaires'\)/);
    expect(c).toMatch(/ecouterCollectionStable\(\s*\n?\s*collection\(db, 'lignesBudgetaires'\)/);
  });

  // Un écouteur jamais arrêté reste branché après la déconnexion : il continue
  // de recevoir — et de faire payer — des mises à jour.
  test('chaque écouteur est arrêté au démontage', () => {
    expect(contexte()).toMatch(/arretsStables\.forEach\(arreter => arreter\(\)\)/);
  });
});
