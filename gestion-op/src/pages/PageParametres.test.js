import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PageParametres from './PageParametres';

// ============================================================
//  LA SAUVEGARDE DOIT COUVRIR TOUS LES EXERCICES
// ============================================================
//
//  Ces tests existent à cause d'un défaut réel : la sauvegarde prenait
//  les OP dans le contexte React au lieu de les relire en base.
//
//  Or le contexte ne garde que l'exercice actif, ce qui est encore dans
//  un circuit de validation, et les OP importés — pour ne pas relire
//  indéfiniment les archives à chaque ouverture. Les OP archivés des
//  exercices clos manquaient donc au fichier, sans que rien ne le
//  signale : la sauvegarde paraissait réussie et était incomplète.
//
//  C'est le pire genre de défaut pour une sauvegarde : on ne s'en
//  aperçoit que le jour où on en a besoin.
// ============================================================

// Les doublures doivent commencer par « mock » : Jest les hisse avant le
// reste du fichier et refuse qu'elles lisent une variable ordinaire.
let mockOpsEnBase = [];
let mockFeuilles = {};
let mockFichierEcrit = null;

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  collection: (_db, nom) => ({ nom }),
  doc: (...a) => ({ id: a.length >= 3 ? a[2] : 'nouveau' }),
  setDoc: () => Promise.resolve(),
  addDoc: () => Promise.resolve({ id: 'nouveau' }),
  updateDoc: () => Promise.resolve(),
  deleteDoc: () => Promise.resolve(),
  writeBatch: () => ({ set: () => {}, update: () => {}, commit: () => Promise.resolve() }),
  getDocs: (ref) => {
    const parCollection = {
      ops: mockOpsEnBase,
      bordereaux: [{ numero: 'BT-001', type: 'CF' }],
      users: [{ nom: 'Testeuse', email: 't@x.y', role: 'ADMIN' }],
      journal: [{ date: '2026-01-01', action: 'CREATION' }],
    };
    const lignes = parCollection[ref?.nom] || [];
    return Promise.resolve({ docs: lignes.map((d, i) => ({ id: `d${i}`, data: () => d })) });
  },
}));

// Le classeur n'est pas réellement écrit : on retient ce qui lui est confié.
jest.mock('xlsx', () => ({
  utils: {
    book_new: () => ({}),
    json_to_sheet: (rows) => ({ rows }),
    book_append_sheet: (_wb, ws, nom) => { mockFeuilles[nom] = ws.rows; },
  },
  writeFile: (_wb, nom) => { mockFichierEcrit = nom; },
}), { virtual: true });

const SOURCES = [{ id: 'S1', sigle: 'BM', nom: 'Banque Mondiale' }];
const EXERCICES = [
  { id: 'E2026', annee: 2026, actif: true },
  { id: 'E2025', annee: 2025, actif: false },
];

// Le contexte ne contient QUE l'exercice actif : c'est le comportement
// réel, et c'est précisément ce qui rendait la sauvegarde incomplète.
const OPS_DU_CONTEXTE = [
  { id: 'op1', numero: 'N°0001', type: 'DIRECT', statut: 'EN_COURS', sourceId: 'S1', exerciceId: 'E2026', montant: 1000 },
  { id: 'op2', numero: 'N°0002', type: 'DIRECT', statut: 'PAYE', sourceId: 'S1', exerciceId: 'E2026', montant: 2000 },
];

// La base, elle, contient en plus les archives de l'exercice clos.
const OPS_DE_LA_BASE = [
  ...OPS_DU_CONTEXTE,
  { id: 'op3', numero: 'N°0101', type: 'DEFINITIF', statut: 'ARCHIVE', sourceId: 'S1', exerciceId: 'E2025', montant: 5000 },
  { id: 'op4', numero: 'N°0102', type: 'DEFINITIF', statut: 'ARCHIVE', sourceId: 'S1', exerciceId: 'E2025', montant: 6000 },
];

jest.mock('../context/AppContext', () => ({
  useAppContext: () => ({
    userProfile: { role: 'ADMIN', nom: 'Testeuse' },
    projet: { sigle: 'PIF2', nom: 'Projet' },
    setProjet: () => {},
    sources: [{ id: 'S1', sigle: 'BM', nom: 'Banque Mondiale' }],
    setSources: () => {},
    exercices: [
      { id: 'E2026', annee: 2026, actif: true },
      { id: 'E2025', annee: 2025, actif: false },
    ],
    setExercices: () => {},
    ops: [
      { id: 'op1', numero: 'N°0001', type: 'DIRECT', statut: 'EN_COURS', sourceId: 'S1', exerciceId: 'E2026', montant: 1000 },
      { id: 'op2', numero: 'N°0002', type: 'DIRECT', statut: 'PAYE', sourceId: 'S1', exerciceId: 'E2026', montant: 2000 },
    ],
    budgets: [],
    beneficiaires: [],
    lignesBudgetaires: [],
  }),
}));

jest.mock('./PageAdmin', () => () => <div>Administration</div>);

const lancerLaSauvegarde = async () => {
  const utilisateur = userEvent.setup();
  render(<PageParametres />);
  await utilisateur.click(screen.getByText('Maintenance'));
  await utilisateur.click(screen.getByText(/Sauvegarder la base|Sauvegarde/i));
  await waitFor(() => expect(mockFichierEcrit).not.toBeNull());
};

beforeEach(() => {
  mockOpsEnBase = OPS_DE_LA_BASE;
  mockFeuilles = {};
  mockFichierEcrit = null;
});

describe('La sauvegarde de la base', () => {
  test("contient les OP des exercices CLOS, absents du contexte", async () => {
    await lancerLaSauvegarde();
    const numeros = (mockFeuilles['OP'] || []).map(l => l['N° OP']);
    // Les deux premiers viennent du contexte, les deux autres n'en font
    // pas partie : seule une relecture en base peut les ramener.
    expect(numeros).toEqual(expect.arrayContaining(['N°0001', 'N°0002', 'N°0101', 'N°0102']));
  });

  test('comporte autant de lignes que la base, pas que le contexte', async () => {
    await lancerLaSauvegarde();
    expect(mockFeuilles['OP']).toHaveLength(OPS_DE_LA_BASE.length);
    expect(mockFeuilles['OP'].length).toBeGreaterThan(OPS_DU_CONTEXTE.length);
  });

  test("l'exercice clos est bien nommé dans le fichier", async () => {
    await lancerLaSauvegarde();
    const archive = mockFeuilles['OP'].find(l => l['N° OP'] === 'N°0101');
    expect(archive['Exercice']).toBe(2025);
    expect(archive['Statut']).toBe('ARCHIVE');
    expect(archive['Montant']).toBe(5000);
  });

  test('les autres onglets sont bien présents', async () => {
    await lancerLaSauvegarde();
    for (const onglet of ['OP', 'Bordereaux', 'Utilisateurs', 'Journal', 'Sources', 'Exercices']) {
      expect(Object.keys(mockFeuilles)).toContain(onglet);
    }
  });

  test('le fichier porte la date du jour', async () => {
    await lancerLaSauvegarde();
    const attendu = new Date().toISOString().split('T')[0].replace(/-/g, '');
    expect(mockFichierEcrit).toBe(`Sauvegarde_GestionOP_${attendu}.xlsx`);
  });
});

// Sans ces constantes utilisées, ESLint signalerait du code mort : elles
// servent de référence lisible dans les assertions ci-dessus.
export { SOURCES, EXERCICES };
