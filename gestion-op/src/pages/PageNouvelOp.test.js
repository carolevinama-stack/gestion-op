import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==================== NOUVEL OP ====================
// L'écran où se joue l'argent. Ces tests vérifient ce qu'un utilisateur voit et
// obtient : les refus de saisie dans leur ordre, le bandeau budgétaire, et le
// fait qu'un formulaire incomplet n'écrit jamais rien en base.
//
// La page parle directement à Firestore. On remplace donc la base et le contexte
// de l'application par des doublures : les tests portent sur l'écran, pas sur le
// réseau. runTransaction est espionné — s'il est appelé alors que le formulaire
// est incomplet, c'est un défaut.

const mockRunTransaction = jest.fn();
const mockGetDoc = jest.fn(async () => ({ exists: () => true, data: () => ({ count: 7 }) }));
const mockGetDocs = jest.fn(async () => ({ docs: [] }));

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({ id: 'nouvel-op' })),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  getDoc: (...a) => mockGetDoc(...a),
  getDocs: (...a) => mockGetDocs(...a),
  runTransaction: (...a) => mockRunTransaction(...a),
}));

// Le journal écrit dans Firestore de son côté : on le neutralise.
jest.mock('../utils/journal', () => ({
  enregistrerJournal: jest.fn(),
  nomUtilisateurJournal: () => 'Testeuse',
  ACTIONS_JOURNAL: { CREATION: 'CREATION' },
}));

const mockContexte = {
  sources: [{ id: 'S1', nom: 'Source principale', sigle: 'SP', couleur: '#2E9940' }],
  beneficiaires: [
    { id: 'B1', nom: 'ENTREPRISE ALPHA', ncc: '1234', ribs: [{ banque: 'BICICI', numero: 'CI0001' }] },
    { id: 'B2', nom: 'ENTREPRISE BETA', ncc: '5678', ribs: [] },
  ],
  budgets: [{
    id: 'BU1', sourceId: 'S1', exerciceId: 'E1', version: 1,
    lignes: [{ code: 'L1', libelle: 'Fournitures de bureau', dotation: 10000000 }],
  }],
  ops: [],
  exercices: [{ id: 'E1', annee: 2026, actif: true }],
  exerciceActif: { id: 'E1', annee: 2026, actif: true },
  projet: { sigle: 'PIF2' },
  consultOpData: null,
  setConsultOpData: jest.fn(),
  setCurrentPage: jest.fn(),
  userProfile: { nom: 'Testeuse', role: 'OPERATEUR' },
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

// Importé après les mocks : la page les prend au chargement du module.
const PageNouvelOp = require('./PageNouvelOp').default;

const enregistrer = () => screen.getByText("Enregistrer l'OP");

// Le refus s'affiche dans une modale : un titre et un message. handleSubmit étant
// asynchrone, la modale arrive juste APRÈS le clic : on l'attend, sinon React
// signale une mise à jour hors de la fenêtre surveillée par le test.
const attendreRefus = (titre) => screen.findByRole('heading', { level: 3, name: titre });

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
});

describe('Nouvel OP — ce que l\'écran refuse', () => {
  test('un formulaire vide est refusé sur le type, et n\'écrit rien', async () => {
    render(<PageNouvelOp />);
    await userEvent.click(enregistrer());
    expect(await attendreRefus('Type manquant')).toBeInTheDocument();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  test('le type choisi, c\'est le bénéficiaire qui manque', async () => {
    render(<PageNouvelOp />);
    await userEvent.selectOptions(screen.getByDisplayValue('-- Sélectionner --'), 'DIRECT');
    await userEvent.click(enregistrer());
    expect(await attendreRefus('Champ obligatoire')).toBeInTheDocument();
    expect(screen.getByText('Veuillez sélectionner un bénéficiaire')).toBeInTheDocument();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  // Le garde-fou qui a bloqué les bénéficiaires sans coordonnées bancaires.
  test('aucune écriture tant que le formulaire est incomplet', async () => {
    render(<PageNouvelOp />);
    await userEvent.selectOptions(screen.getByDisplayValue('-- Sélectionner --'), 'PROVISOIRE');
    await userEvent.click(enregistrer());
    await attendreRefus('Champ obligatoire');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('Nouvel OP — ce que l\'écran affiche', () => {
  test('le numéro est annoncé comme automatique, jamais saisissable', () => {
    render(<PageNouvelOp />);
    expect(screen.getByText(/N° OP \(auto\)/)).toBeInTheDocument();
  });

  test('les quatre types d\'OP sont proposés', () => {
    render(<PageNouvelOp />);
    const select = screen.getByDisplayValue('-- Sélectionner --');
    const options = within(select).getAllByRole('option').map(o => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['Provisoire', 'Direct', 'Définitif', '✕ Annulation']));
  });

  test('les champs obligatoires sont marqués d\'une étoile', () => {
    render(<PageNouvelOp />);
    for (const label of ['TYPE *', 'OBJET *', 'MONTANT (FCFA) *', 'LIGNE BUDG. *']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test('la TVA n\'est demandée que pour un Direct ou un Définitif', async () => {
    render(<PageNouvelOp />);
    expect(screen.queryByText('TVA RÉCUPÉRABLE *')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByDisplayValue('-- Sélectionner --'), 'DIRECT');
    expect(screen.getByText('TVA RÉCUPÉRABLE *')).toBeInTheDocument();
  });

  test('un Provisoire ne demande pas la TVA', async () => {
    render(<PageNouvelOp />);
    await userEvent.selectOptions(screen.getByDisplayValue('-- Sélectionner --'), 'PROVISOIRE');
    expect(screen.queryByText('TVA RÉCUPÉRABLE *')).not.toBeInTheDocument();
  });
});
