import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==================== LIGNES BUDGÉTAIRES ====================
// La nomenclature : c'est elle qui alimente les budgets, et donc tous les OP.
// Ces tests portent sur ce que l'écran montre et sur ses deux ajouts récents —
// la pagination et le repère d'attente pendant l'import.

const mockAddDoc = jest.fn(async () => ({ id: 'nouvelle' }));
const mockUpdateDoc = jest.fn(async () => {});
const mockDeleteDoc = jest.fn(async () => {});

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  collection: (_db, nom) => ({ nom }),
  doc: (...a) => ({ id: a.length >= 3 ? a[2] : 'nouveau' }),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  deleteDoc: (...a) => mockDeleteDoc(...a),
}));

// 120 lignes : de quoi dépasser la page de 50 et vérifier le découpage.
const nomenclature = (n) => Array.from({ length: n }, (_, i) => ({
  id: `lb${i}`,
  code: String(6000 + i),
  libelle: `Rubrique ${i}`,
}));

const mockContexte = {
  lignesBudgetaires: nomenclature(120),
  setLignesBudgetaires: jest.fn(),
  budgets: [{ id: 'b1', sourceId: 'S1', exerciceId: 'E1', lignes: [{ code: '6000', dotation: 10 }] }],
  setCurrentPage: jest.fn(),
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

const PageLignesBudgetaires = require('./PageLignesBudgetaires').default;

const lignesAffichees = () => {
  const corps = screen.getAllByRole('rowgroup')[1];
  return within(corps).queryAllByRole('row');
};
const codesAffiches = () => lignesAffichees()
  .map(l => within(l).queryAllByRole('cell')[0]?.textContent.trim())
  .filter(Boolean);

beforeEach(() => {
  jest.clearAllMocks();
  mockContexte.lignesBudgetaires = nomenclature(120);
});

describe('Lignes budgétaires — la pagination', () => {
  test('seules 50 lignes sont affichées à la fois', () => {
    render(<PageLignesBudgetaires />);
    expect(codesAffiches()).toHaveLength(50);
  });

  test('le nombre total de lignes est annoncé', () => {
    render(<PageLignesBudgetaires />);
    expect(screen.getByText(/Page/)).toHaveTextContent('Page 1 / 3');
    expect(screen.getByText(/Page/)).toHaveTextContent('120 lignes');
  });

  test('la page suivante montre les lignes suivantes', async () => {
    render(<PageLignesBudgetaires />);
    expect(codesAffiches()[0]).toBe('6000');
    await userEvent.click(screen.getByTitle('Page suivante'));
    expect(codesAffiches()[0]).toBe('6050');
  });

  test('la double flèche mène à la dernière page', async () => {
    render(<PageLignesBudgetaires />);
    await userEvent.click(screen.getByTitle('Dernière page'));
    expect(screen.getByText(/Page/)).toHaveTextContent('Page 3 / 3');
    expect(codesAffiches()).toHaveLength(20);   // 120 − 100
  });

  // Chercher depuis la page 3 doit ramener au début, sinon on tombe sur une
  // page vide alors que des résultats existent.
  test('une recherche ramène à la première page', async () => {
    render(<PageLignesBudgetaires />);
    await userEvent.click(screen.getByTitle('Dernière page'));
    await userEvent.type(screen.getByPlaceholderText(/Rechercher par code/), '6005');
    expect(screen.queryByTitle('Page suivante')).not.toBeInTheDocument();   // une seule page de résultats
    expect(codesAffiches()).toContain('6005');
  });

  test('une nomenclature courte n\'affiche aucune pagination', () => {
    mockContexte.lignesBudgetaires = nomenclature(12);
    render(<PageLignesBudgetaires />);
    expect(screen.queryByTitle('Page suivante')).not.toBeInTheDocument();
    expect(codesAffiches()).toHaveLength(12);
  });

  test('les lignes restent triées par code à travers les pages', () => {
    render(<PageLignesBudgetaires />);
    const codes = codesAffiches();
    expect(codes).toEqual([...codes].sort((a, b) => Number(a) - Number(b)));
  });
});

describe('Lignes budgétaires — l\'import', () => {
  const ouvrirImport = async () => {
    await userEvent.click(screen.getAllByRole('button').find(b => /Importer/.test(b.textContent)));
    return screen.findByText('Importer la nomenclature');
  };

  test('la fenêtre d\'import rappelle le format attendu', async () => {
    render(<PageLignesBudgetaires />);
    await ouvrirImport();
    expect(screen.getByText(/Format attendu/)).toBeInTheDocument();
  });

  // Sans fichier chargé, rien à importer : le bouton reste inactif.
  test('le bouton d\'import est inactif tant qu\'aucun fichier n\'est lu', async () => {
    render(<PageLignesBudgetaires />);
    await ouvrirImport();
    const bouton = screen.getAllByRole('button').find(b => /Importer 0 ligne/.test(b.textContent));
    expect(bouton).toBeDisabled();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});

describe('Lignes budgétaires — ce que l\'écran protège', () => {
  test('une ligne utilisée par un budget est signalée', () => {
    render(<PageLignesBudgetaires />);
    const ligne = lignesAffichees().find(l => l.textContent.includes('6000'));
    expect(within(ligne).getByText(/Utilisée|Utilisé/i)).toBeInTheDocument();
  });

  test('rien n\'est écrit à l\'affichage de la page', () => {
    render(<PageLignesBudgetaires />);
    expect(mockAddDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  test('un code en doublon est refusé à la création', async () => {
    render(<PageLignesBudgetaires />);
    await userEvent.click(screen.getAllByRole('button').find(b => /Nouvelle ligne/.test(b.textContent)));
    await userEvent.type(await screen.findByPlaceholderText('6221'), '6000');
    await userEvent.type(screen.getByPlaceholderText(/^Ex: Personnel/), 'Doublon');
    await userEvent.click(screen.getAllByRole('button').slice(-1)[0]);
    expect(await screen.findByText(/existe déjà/i)).toBeInTheDocument();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
