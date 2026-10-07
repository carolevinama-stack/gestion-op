import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==================== CONSULTER OP ====================
// La page la plus chargée du projet et celle qui porte le plus de logique
// métier : modification, suppression, rattachement, impression, changement de
// numéro. Ces tests portent sur ce qui protège un document déjà signé.
//
// La base et le contexte sont remplacés par des doublures : updateDoc est
// espionné, et doit rester muet partout où l'écran annonce un refus.

const mockUpdateDoc = jest.fn(async () => {});

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'op' })),
  updateDoc: (...a) => mockUpdateDoc(...a),
}));

jest.mock('../utils/journal', () => ({
  enregistrerJournal: jest.fn(),
  nomUtilisateurJournal: () => 'Testeuse',
  ACTIONS_JOURNAL: { MODIFICATION: 'MODIFICATION', SUPPRESSION: 'SUPPRESSION' },
}));

// L'impression ouvre une fenêtre : on la neutralise.
jest.mock('../utils/opPrint', () => ({ buildOpPrintHtml: () => '<html></html>' }));

const opPayable = {
  id: 'op1', numero: '0042', type: 'DIRECT', statut: 'EN_COURS',
  sourceId: 'S1', exerciceId: 'E1', beneficiaireId: 'B1', beneficiaireNom: 'ENTREPRISE ALPHA',
  ligneBudgetaire: 'L1', libelleLigne: 'Fournitures', dotationFigee: 10000000,
  objet: 'Achat de ramettes', piecesJustificatives: 'Facture 12',
  montant: 250000, modeReglement: 'VIREMENT', rib: 'CI0001', banque: 'BICICI',
  dateCreation: '2026-03-01', createdAt: '2026-03-01T08:00:00.000Z',
};

// Un OP déjà visé par le CF : la modification doit être verrouillée.
const opVise = { ...opPayable, id: 'op2', numero: '0043', statut: 'VISE_CF', dateVisaCF: '2026-03-05' };

const mockContexte = {
  sources: [{ id: 'S1', nom: 'Source principale', sigle: 'SP', couleur: '#2E9940' }],
  beneficiaires: [{ id: 'B1', nom: 'ENTREPRISE ALPHA', ncc: '1234', ribs: [{ banque: 'BICICI', numero: 'CI0001' }] }],
  budgets: [{ id: 'BU1', sourceId: 'S1', exerciceId: 'E1', version: 1, lignes: [{ code: 'L1', libelle: 'Fournitures', dotation: 10000000 }] }],
  ops: [opPayable, opVise],
  setOps: jest.fn(),
  exerciceActif: { id: 'E1', annee: 2026, actif: true },
  exercices: [{ id: 'E1', annee: 2026, actif: true }],
  projet: { sigle: 'PIF2', motDePasseAdmin: 'secret' },
  consultOpData: null,
  setConsultOpData: jest.fn(),
  setCurrentPage: jest.fn(),
  permissions: { canCreate: true, canEdit: true, canDelete: true },
  userProfile: { nom: 'Testeuse', role: 'OPERATEUR' },
  chargerExerciceOps: jest.fn(),
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

const PageConsulterOp = require('./PageConsulterOp').default;

// Ouvre un OP en tapant son numéro dans la barre de recherche.
const ouvrirOp = async (numero) => {
  const barre = screen.getByRole('textbox');
  await userEvent.clear(barre);
  await userEvent.type(barre, numero);
  await userEvent.click(await screen.findByText(new RegExp(numero)));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockContexte.consultOpData = null;
});

describe('Consulter OP — au premier affichage', () => {
  test('aucun OP choisi : la page invite à en sélectionner un', () => {
    render(<PageConsulterOp />);
    expect(screen.getByText('Sélectionnez un OP pour le consulter')).toBeInTheDocument();
  });

  test('la barre de recherche et les flèches sont proposées', () => {
    render(<PageConsulterOp />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByText(/Utilisez la barre de recherche/)).toBeInTheDocument();
  });

  test('rien n\'est écrit en base tant qu\'aucun OP n\'est ouvert', () => {
    render(<PageConsulterOp />);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('Consulter OP — un OP ouvert', () => {
  test('le numéro, le bénéficiaire et l\'objet sont affichés', async () => {
    render(<PageConsulterOp />);
    await ouvrirOp('0042');
    expect(screen.getByDisplayValue(/0042/)).toBeInTheDocument();
    expect(screen.getByText('ENTREPRISE ALPHA')).toBeInTheDocument();
    expect(screen.getByText('Achat de ramettes')).toBeInTheDocument();
  });

  test('le statut est affiché en toutes lettres, pas en code', async () => {
    render(<PageConsulterOp />);
    await ouvrirOp('0042');
    expect(screen.getByText('En cours')).toBeInTheDocument();
    expect(screen.queryByText('EN_COURS')).not.toBeInTheDocument();
  });

  test('les actions sont proposées selon les droits', async () => {
    render(<PageConsulterOp />);
    await ouvrirOp('0042');
    expect(screen.getByTitle('Imprimer')).toBeInTheDocument();
    expect(screen.getByTitle('Mettre à la corbeille')).toBeInTheDocument();
    expect(screen.getByTitle('Dupliquer')).toBeInTheDocument();
  });
});

// Le garde-fou central : un OP déjà engagé dans le circuit ne se modifie plus
// directement. Sans lui, on pourrait changer le montant d'un OP déjà visé.
describe('Consulter OP — le verrou de modification', () => {
  const VERROU = 'Verrouillé : OP déjà visé, payé, annulé ou rejeté';

  // L'infobulle dit déjà pourquoi, avant même qu'on clique.
  test('sur un OP visé, le bouton annonce le verrou au survol', async () => {
    render(<PageConsulterOp />);
    await ouvrirOp('0043');
    expect(screen.getByTitle(VERROU)).toBeInTheDocument();
    expect(screen.queryByTitle('Modifier')).not.toBeInTheDocument();
  });

  test('un OP déjà visé par le CF refuse la modification, et rien n\'est écrit', async () => {
    render(<PageConsulterOp />);
    await ouvrirOp('0043');
    await userEvent.click(screen.getByTitle(VERROU));
    expect(await screen.findByText('Action impossible')).toBeInTheDocument();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('le refus explique quoi faire plutôt que de rester muet', async () => {
    render(<PageConsulterOp />);
    await ouvrirOp('0043');
    await userEvent.click(screen.getByTitle(VERROU));
    expect(await screen.findByText(/rétropédalage/i)).toBeInTheDocument();
  });

  test('un OP encore En cours accepte d\'entrer en modification', async () => {
    render(<PageConsulterOp />);
    await ouvrirOp('0042');
    await userEvent.click(screen.getByTitle('Modifier'));
    expect(await screen.findByTitle('Enregistrer')).toBeInTheDocument();
    expect(screen.queryByText('Action bloquée')).not.toBeInTheDocument();
  });
});

describe('Consulter OP — la suppression', () => {
  test('la mise à la corbeille réclame un mot de passe, et n\'écrit rien avant', async () => {
    render(<PageConsulterOp />);
    await ouvrirOp('0042');
    await userEvent.click(screen.getByTitle('Mettre à la corbeille'));
    expect(await screen.findByText(/Mot de passe requis pour supprimer/)).toBeInTheDocument();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
