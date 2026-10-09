import fs from 'fs';
import path from 'path';

// ==================== ACCÈS AUX PAGES ====================
// App.js renvoie au tableau de bord toute page qu'aucun rôle n'autorise. Une
// page rendue mais absente de ROLE_PERMISSIONS devient donc inatteignable —
// silencieusement, sans message ni erreur dans la console.
//
// C'est arrivé à « lignes » (les lignes budgétaires) : la page n'est pas au
// menu, on n'y accède que par l'engrenage du Budget, et ce bouton ne menait
// plus nulle part. Personne ne pouvait plus ajouter de ligne budgétaire.
//
// Ce test lit les deux fichiers et compare les deux listes. Il n'a pas besoin
// de monter l'application : c'est une cohérence entre deux tableaux.

const lire = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

const pagesRendues = () => {
  const app = lire('../App.js');
  return [...app.matchAll(/currentPage === '([a-zA-Z]+)'/g)].map(m => m[1]);
};

const pagesParRole = () => {
  const ctx = lire('./AppContext.js');
  const bloc = ctx.slice(ctx.indexOf('const ROLE_PERMISSIONS'), ctx.indexOf('export function AppProvider'));
  const roles = {};
  for (const m of bloc.matchAll(/(\w+):\s*\{\s*\n\s*pages:\s*\[([^\]]*)\]/g)) {
    roles[m[1]] = [...m[2].matchAll(/'([a-zA-Z]+)'/g)].map(p => p[1]);
  }
  return roles;
};

describe('Accès aux pages', () => {
  test('les deux listes sont bien lues', () => {
    expect(pagesRendues().length).toBeGreaterThan(10);
    expect(Object.keys(pagesParRole()).sort()).toEqual(['ADMIN', 'CONSULTATION', 'OPERATEUR']);
  });

  // Le test qui compte : une page que personne ne peut atteindre est une page
  // morte, et rien dans l'application ne le signale.
  test('toute page rendue est autorisée à au moins un rôle', () => {
    const autorisees = new Set(Object.values(pagesParRole()).flat());
    const inatteignables = pagesRendues().filter(p => !autorisees.has(p));
    expect(inatteignables).toEqual([]);
  });

  test('un administrateur atteint toutes les pages rendues', () => {
    const admin = new Set(pagesParRole().ADMIN);
    expect(pagesRendues().filter(p => !admin.has(p))).toEqual([]);
  });

  // L'engrenage du Budget mène aux lignes budgétaires : qui peut ouvrir le
  // budget doit pouvoir ouvrir ses lignes, sinon le bouton renvoie au tableau
  // de bord sans rien dire.
  test('qui accède au budget accède à ses lignes budgétaires', () => {
    const manquants = Object.entries(pagesParRole())
      .filter(([, pages]) => pages.includes('budget') && !pages.includes('lignes'))
      .map(([role]) => role);
    expect(manquants).toEqual([]);
  });

  test('un compte en consultation n\'atteint aucun écran de paramétrage', () => {
    const consultation = pagesParRole().CONSULTATION;
    for (const page of ['parametres', 'admin', 'lignes', 'budget', 'beneficiaires']) {
      expect([page, consultation.includes(page)]).toEqual([page, false]);
    }
  });
});
