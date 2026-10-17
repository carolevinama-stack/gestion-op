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


// Sur cette branche, la page passe par l'interprète ../db au lieu de
// firebase/firestore : seul le module visé par la doublure change. Son
// corps et toutes les assertions sont identiques à ceux de la branche
// principale — c'est ce qui prouve que le comportement est le même.
jest.mock('../db', () => ({
  db: {},
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
      sources: [{ sigle: 'BM', nom: 'Banque Mondiale' }],
      exercices: [{ annee: 2026, actif: true }, { annee: 2025, actif: false }],
      lignesBudgetaires: [{ code: '6011', libelle: 'Fournitures' }],
      beneficiaires: [{ nom: 'ENTREPRISE ALPHA', ribs: [{ banque: 'B', numero: '123' }] }],
      budgets: [{ sourceId: 'S1', version: 1, lignes: [{ code: '6011', dotation: 1000 }] }],
      parametres: [{ sigle: 'PIF2' }],
      compteurs: [{ count: 42 }],
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

// ⚠️ L'objet rendu par useAppContext doit être STABLE d'un rendu à
// l'autre. En renvoyant un objet neuf à chaque appel, le useEffect de la
// page qui surveille `projet` se redéclenchait sans fin : boucle infinie
// et test figé. Ce n'est pas un défaut de l'application — dans le vrai
// contexte, cet objet vient d'un useState et ne change que lorsqu'il doit
// changer. Le nom doit commencer par « mock » : Jest hisse les doublures
// et refuse qu'elles lisent une variable ordinaire.
const mockContexte = {
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
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

jest.mock('./PageAdmin', () => () => <div>Administration</div>);

const lancerLaSauvegarde = async () => {
  const utilisateur = userEvent.setup();
  render(<PageParametres />);
  await utilisateur.click(screen.getByText('Maintenance'));
  // Texte exact : « Sauvegarde » tout court attrapait aussi la phrase
  // d'introduction « Gérez vos sauvegardes… ».
  await utilisateur.click(screen.getByText('Sauvegarder la base'));
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


// ============================================================
//  L'EXPORT COMPLET (JSON)
// ============================================================
//
//  Différent de la sauvegarde Excel : celle-ci est lisible par un
//  humain mais ne garde qu'une sélection de colonnes. L'export JSON
//  reprend les documents TELS QU'ILS SONT EN BASE, pour qu'une
//  migration ou une restauration ne perde rien.
//
//  Ce qu'il faut vérifier est donc : aucune collection oubliée, les
//  identifiants conservés, et un en-tête de contrôle qui permette de
//  constater après import que les comptes correspondent.
// ============================================================

let mockJSONEcrit = null;

const lancerExportJSON = async () => {
  const utilisateur = userEvent.setup();
  render(<PageParametres />);
  await utilisateur.click(screen.getByText('Maintenance'));
  await utilisateur.click(screen.getByText('Exporter tout (JSON)'));
  // L'export passe par une confirmation : elle avertit que le fichier
  // contient des données personnelles réelles.
  await utilisateur.click(await screen.findByText('Confirmer'));
  await waitFor(() => expect(mockJSONEcrit).not.toBeNull(), { timeout: 5000 });
  return JSON.parse(mockJSONEcrit);
};

describe("L'export complet au format JSON", () => {
  beforeEach(() => {
    mockJSONEcrit = null;
    // Le téléchargement n'a pas lieu : on retient ce qui lui est confié.
    global.Blob = function (parties) { mockJSONEcrit = parties.join(''); };
    global.URL.createObjectURL = () => 'blob:essai';
    global.URL.revokeObjectURL = () => {};
  });

  test("n'oublie aucune collection", async () => {
    const fichier = await lancerExportJSON();
    for (const collection of ['sources', 'exercices', 'lignesBudgetaires', 'beneficiaires',
                              'budgets', 'ops', 'bordereaux', 'journal', 'users',
                              'parametres', 'compteurs']) {
      expect(Object.keys(fichier)).toContain(collection);
    }
  });

  test('reprend les OP de TOUS les exercices, pas seulement le contexte', async () => {
    const fichier = await lancerExportJSON();
    expect(fichier.ops).toHaveLength(OPS_DE_LA_BASE.length);
    expect(fichier.ops.map(o => o.numero)).toContain('N°0101');
  });

  test("conserve l'identifiant de chaque document", async () => {
    const fichier = await lancerExportJSON();
    // Sans l'identifiant, impossible de recréer les documents à
    // l'identique ailleurs, ni de relier un OP à son bordereau.
    for (const op of fichier.ops) expect(typeof op.id).toBe('string');
  });

  test("conserve les champs tels quels, y compris les tableaux imbriqués", async () => {
    const fichier = await lancerExportJSON();
    const benef = fichier.beneficiaires[0];
    expect(benef.ribs[0]).toEqual({ banque: 'B', numero: '123' });
    expect(fichier.budgets[0].lignes[0]).toEqual({ code: '6011', dotation: 1000 });
  });

  test("porte un en-tête de contrôle avec le compte par collection", async () => {
    const fichier = await lancerExportJSON();
    expect(fichier._export.collections.ops).toBe(OPS_DE_LA_BASE.length);
    expect(fichier._export.total).toBe(
      Object.values(fichier._export.collections).reduce((s, n) => s + n, 0)
    );
    expect(fichier._export.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("avertit que le fichier contient des données personnelles", async () => {
    const utilisateur = userEvent.setup();
    render(<PageParametres />);
    await utilisateur.click(screen.getByText('Maintenance'));
    await utilisateur.click(screen.getByText('Exporter tout (JSON)'));
    // L'avertissement n'est pas décoratif : ce fichier contient les noms
    // et les RIB des bénéficiaires réels.
    expect(await screen.findByText(/RIB/i)).toBeInTheDocument();
  });
});
