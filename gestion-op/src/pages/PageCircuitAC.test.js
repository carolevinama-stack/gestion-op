import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==================== CIRCUIT AC ====================
// Le dernier maillon : c'est ici que l'argent sort. Un paiement est enregistré
// dans une transaction Firestore — la base est relue à l'intérieur pour qu'un
// paiement concurrent n'en écrase pas un autre — et c'est ce que la transaction
// écrit que ces tests vérifient.

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockCommit = jest.fn(async () => {});
const mockUpdateDoc = jest.fn(async () => {});
const mockTxUpdate = jest.fn();
const mockRunTransaction = jest.fn();

// La transaction est jouée pour de vrai : on lui fournit un tx.get qui rend l'OP
// tel qu'il est en base, et on observe le tx.update qui en sort. Le corps est une
// fonction simple — Create React App remet les jest.fn à zéro avant chaque test,
// ce qui effacerait son comportement ; le jest.fn ne sert qu'à compter les appels.
let opEnBase = null;
const jouerTransaction = async (_db, fn) => {
  mockRunTransaction();
  return fn({
    get: async () => ({ exists: () => !!opEnBase, data: () => opEnBase }),
    update: mockTxUpdate,
  });
};

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  collection: (_db, nom) => ({ nom }),
  doc: (...a) => ({ id: a.length >= 3 ? a[2] : 'nouveau-doc' }),
  updateDoc: (...a) => mockUpdateDoc(...a),
  writeBatch: () => ({ set: mockBatchSet, update: mockBatchUpdate, commit: mockCommit }),
  runTransaction: (...a) => jouerTransaction(...a),
}));

jest.mock('../utils/journal', () => ({
  enregistrerJournal: jest.fn(),
  nomUtilisateurJournal: () => 'Testeuse',
  ACTIONS_JOURNAL: { CHANGEMENT_STATUT: 'CHANGEMENT_STATUT' },
}));

jest.mock('../utils/bordereauPrint', () => ({ buildBordereauPrintHtml: () => '<html></html>' }));

const opBase = {
  sourceId: 'S1', exerciceId: 'E1', beneficiaireId: 'B1', beneficiaireNom: 'ENTREPRISE ALPHA',
  ligneBudgetaire: 'L1', objet: 'Achat de ramettes', montant: 1000000,
  dateCreation: '2026-03-01', createdAt: '2026-03-01T08:00:00.000Z',
};

const ops = () => [
  // Visé par le CF, pas encore sur un bordereau AC : éligible
  { ...opBase, id: 'op1', numero: 'N°0001/SP', type: 'DIRECT', statut: 'VISE_CF', dateVisaCF: '2026-03-07' },
  // Déjà sur un bordereau AC : plus éligible
  { ...opBase, id: 'op2', numero: 'N°0002/SP', type: 'DIRECT', statut: 'VISE_CF',
    dateVisaCF: '2026-03-07', bordereauAC: 'BT-AC-0001/PIF2-SP/2026' },
  // Transmis à l'AC : c'est lui qu'on paie
  { ...opBase, id: 'op3', numero: 'N°0003/SP', type: 'DIRECT', statut: 'TRANSMIS_AC',
    bordereauAC: 'BT-AC-0001/PIF2-SP/2026', dateTransmissionAC: '2026-03-12' },
  // Déjà payé à moitié
  { ...opBase, id: 'op4', numero: 'N°0004/SP', type: 'DIRECT', statut: 'PAYE_PARTIEL',
    bordereauAC: 'BT-AC-0001/PIF2-SP/2026', dateTransmissionAC: '2026-03-12',
    paiements: [{ date: '2026-04-01', montant: 400000, reference: 'VIR-10' }] },
  // Différé par l'AC
  { ...opBase, id: 'op5', numero: 'N°0005/SP', type: 'DIRECT', statut: 'DIFFERE_AC',
    dateTransmissionAC: '2026-03-12', dateDiffere: '2026-03-15', motifDiffere: 'Compte à vérifier' },
  // Encore en cours : l'AC ne doit jamais le voir
  { ...opBase, id: 'op6', numero: 'N°0006/SP', type: 'DIRECT', statut: 'EN_COURS' },
];

const mockContexte = {
  projet: { sigle: 'PIF2', motDePasseAdmin: 'secret' },
  sources: [{ id: 'S1', nom: 'Source principale', sigle: 'SP', couleur: '#2E9940' }],
  exercices: [{ id: 'E1', annee: 2026, actif: true }],
  beneficiaires: [{ id: 'B1', nom: 'ENTREPRISE ALPHA' }],
  ops: ops(),
  setOps: jest.fn(),
  bordereaux: [
    { id: 'bt1', numero: 'BT-AC-0001/PIF2-SP/2026', type: 'AC', sourceId: 'S1', exerciceId: 'E1',
      statut: 'ENVOYE', opsIds: ['op3', 'op4'], nbOps: 2, totalMontant: 2000000,
      dateCreation: '2026-03-11', dateTransmission: '2026-03-12' },
  ],
  setBordereaux: jest.fn(),
  userProfile: { nom: 'Testeuse', role: 'OPERATEUR' },
  chargerExerciceBordereaux: jest.fn(),
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

const PageCircuitAC = require('./PageCircuitAC').default;

const boutons = (regex) => screen.getAllByRole('button').filter(b => regex.test(b.textContent));
const allerA = async (nom) => userEvent.click(boutons(new RegExp('^' + nom))[0]);
const boutonAction = (regex) => boutons(regex).slice(-1)[0];
const ligneDe = (numero) => screen.getAllByRole('row').find(r => r.textContent.includes(numero));
const confirmer = async () => userEvent.click(await screen.findByText('Confirmer'));
const refus = (titre) => screen.findByRole('heading', { level: 3, name: titre });

// Ouvre la fiche financière d'un OP depuis l'onglet Paiements.
const ouvrirFiche = async (numero) => {
  await allerA('Paiements');
  await userEvent.click(within(ligneDe(numero)).getByText(numero));
  return screen.findByText('Gestion Financière OP');
};

const saisirPaiement = async (montant) => {
  await userEvent.type(screen.getByPlaceholderText(/Montant \(négatif/), String(montant));
  await userEvent.click(boutonAction(/^Valider Paiement/));
};

// Ce que la transaction a écrit sur l'OP.
const ecriturePaiement = () => mockTxUpdate.mock.calls[0][1];

beforeEach(() => {
  jest.clearAllMocks();
  mockContexte.ops = ops();
  opEnBase = null;
});

describe('Circuit AC — la file d\'attente', () => {
  test('seuls les OP visés par le CF et hors bordereau AC sont proposés', () => {
    render(<PageCircuitAC />);
    const file = screen.getByRole('table').textContent;
    expect(file).toContain('N° 0001/SP');
    expect(file).not.toContain('N° 0002/SP');   // déjà sur un bordereau AC
    expect(file).not.toContain('N° 0006/SP');   // pas encore visé par le CF
  });

  test('la date du visa CF est rappelée, c\'est elle qui autorise le paiement', () => {
    render(<PageCircuitAC />);
    expect(screen.getByText('07/03/2026')).toBeInTheDocument();
  });

  test('rien n\'est écrit à l\'affichage de la page', () => {
    render(<PageCircuitAC />);
    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  test('un OP peut être renvoyé au CF plutôt que mis sur un bordereau', async () => {
    render(<PageCircuitAC />);
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    expect(boutonAction(/^Renvoyer au CF/)).toBeInTheDocument();
  });
});

describe('Circuit AC — l\'onglet Paiements', () => {
  test('les OP transmis et partiellement payés y figurent', async () => {
    render(<PageCircuitAC />);
    await allerA('Paiements');
    const tableau = screen.getByRole('table').textContent;
    expect(tableau).toContain('N° 0003/SP');
    expect(tableau).toContain('N° 0004/SP');
  });

  test('l\'avancement d\'un paiement partiel est affiché en pourcentage', async () => {
    render(<PageCircuitAC />);
    await allerA('Paiements');
    expect(within(ligneDe('N° 0004/SP')).getByText('40%')).toBeInTheDocument();
  });
});

describe('Circuit AC — enregistrer un paiement', () => {
  test('un montant vide est refusé, et rien n\'est écrit', async () => {
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0003/SP');
    await userEvent.click(boutonAction(/^Valider Paiement/));
    expect(await refus('Erreur')).toBeInTheDocument();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  test('un paiement partiel laisse l\'OP en « payé partiel »', async () => {
    opEnBase = { ...ops()[2], paiements: [] };
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0003/SP');
    await saisirPaiement(300000);
    await confirmer();
    await waitFor(() => expect(mockTxUpdate).toHaveBeenCalled());
    expect(ecriturePaiement()).toMatchObject({ statut: 'PAYE_PARTIEL', totalPaye: 300000 });
    expect(ecriturePaiement().paiements).toHaveLength(1);
  });

  test('un paiement qui solde exactement l\'OP le passe à « payé »', async () => {
    opEnBase = { ...ops()[2], paiements: [] };
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0003/SP');
    await saisirPaiement(1000000);
    await confirmer();
    await waitFor(() => expect(mockTxUpdate).toHaveBeenCalled());
    expect(ecriturePaiement()).toMatchObject({ statut: 'PAYE', totalPaye: 1000000 });
  });

  // Le total est recalculé depuis la base, pas depuis l'écran : c'est ce qui
  // empêche deux paiements simultanés de s'écraser.
  test('le total cumule le paiement déjà en base, relu dans la transaction', async () => {
    opEnBase = { ...ops()[3] };   // porte déjà 400 000
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0004/SP');
    await saisirPaiement(600000);
    await confirmer();
    await waitFor(() => expect(mockTxUpdate).toHaveBeenCalled());
    expect(ecriturePaiement()).toMatchObject({ statut: 'PAYE', totalPaye: 1000000 });
    expect(ecriturePaiement().paiements).toHaveLength(2);
  });

  test('un paiement supérieur au reste demande confirmation avant tout', async () => {
    opEnBase = { ...ops()[2], paiements: [] };
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0003/SP');
    await saisirPaiement(1500000);
    expect(await screen.findByText('Dépassement')).toBeInTheDocument();
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  // Un trop-perçu doit être signalé : il appelle un reversement. L'OP reste en
  // « payé partiel » exprès, pour rester visible.
  test('un trop-perçu est signalé à l\'utilisateur', async () => {
    opEnBase = { ...ops()[2], paiements: [] };
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0003/SP');
    await saisirPaiement(1500000);
    await confirmer();
    await waitFor(() => expect(mockTxUpdate).toHaveBeenCalled());
    expect(ecriturePaiement().statut).toBe('PAYE_PARTIEL');
    expect(await screen.findByText(/en trop/)).toBeInTheDocument();
  });

  test('un montant négatif est traité comme un reversement', async () => {
    opEnBase = { ...ops()[3] };
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0004/SP');
    await saisirPaiement(-100000);
    expect(await screen.findByText('Reversement')).toBeInTheDocument();
  });

  test('annuler le dernier paiement ramène l\'OP à « transmis »', async () => {
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0004/SP');
    await userEvent.click(screen.getByText(/Annuler dernier paiement/i));
    await confirmer();
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
    expect(mockUpdateDoc.mock.calls[0][1]).toMatchObject({ statut: 'TRANSMIS_AC', totalPaye: 0 });
  });
});

describe('Circuit AC — la décision de l\'Agent Comptable', () => {
  test('une décision sans motif est refusée, et rien n\'est écrit', async () => {
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0003/SP');
    await userEvent.click(boutonAction(/^Valider$/));
    expect(await refus('Erreur')).toBeInTheDocument();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  test('un différé motivé enregistre la date et le motif', async () => {
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0003/SP');
    await userEvent.click(screen.getByText('Différer'));
    await userEvent.type(screen.getByPlaceholderText(/Motif de la décision/), 'Compte clôturé');
    await userEvent.click(boutonAction(/^Valider$/));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(mockBatchUpdate.mock.calls[0][1]).toMatchObject({
      statut: 'DIFFERE_AC', motifDiffere: 'Compte clôturé',
    });
  });

  test('un rejet crée une écriture inverse du montant', async () => {
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0003/SP');
    await userEvent.click(screen.getByText('Rejeter'));
    await userEvent.type(screen.getByPlaceholderText(/Motif de la décision/), 'Bénéficiaire inconnu');
    await userEvent.click(boutonAction(/^Valider$/));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    const clone = mockBatchSet.mock.calls[0][1];
    expect(clone).toMatchObject({ type: 'REJET', numero: 'N°0003/SP-R', opOriginalId: 'op3' });
    expect(clone.montant).toBe(-1000000);
  });
});

describe('Circuit AC — l\'archivage', () => {
  test('un OP non soldé ne peut pas être archivé, et la page le dit', async () => {
    render(<PageCircuitAC />);
    await ouvrirFiche('N° 0004/SP');
    expect(screen.getByText(/Impossible/)).toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText(/BOX-/), 'BOX-2026-001');
    expect(boutonAction(/^Archiver/)).toBeDisabled();
  });
});

describe('Circuit AC — le suivi des différés', () => {
  test('un différé AC est listé avec son motif', async () => {
    render(<PageCircuitAC />);
    await allerA('Suivi');
    expect(screen.getByText('Compte à vérifier')).toBeInTheDocument();
  });

  // Côté AC aussi, réintroduire c'est retransmettre : la nouvelle date devient
  // la date de transmission à l'AC, et le différé rejoint l'historique.
  test('réintroduire redate la transmission AC et conserve le différé', async () => {
    render(<PageCircuitAC />);
    await allerA('Suivi');
    await userEvent.click(within(ligneDe('N° 0005/SP')).getByRole('checkbox'));
    await userEvent.click(boutonAction(/^Réintroduire \(1\)/));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    const ecriture = mockBatchUpdate.mock.calls[0][1];
    expect(ecriture.statut).toBe('TRANSMIS_AC');
    expect(ecriture.dateTransmissionAC).toBe(ecriture.dateReintroduction);
    expect(ecriture.historiqueDifferes[0]).toMatchObject({ motifDiffere: 'Compte à vérifier', type: 'AC' });
    expect(ecriture.dateDiffere).toBeNull();
  });

  test('la flèche d\'annulation annonce qu\'elle efface', async () => {
    render(<PageCircuitAC />);
    await allerA('Suivi');
    expect(screen.getByTitle(/efface la date et le motif/)).toBeInTheDocument();
  });
});

describe('Circuit AC — cocher une ligne', () => {
  test('cliquer la case à cocher coche la ligne', async () => {
    render(<PageCircuitAC />);
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    expect(within(ligneDe('N° 0001/SP')).getByRole('checkbox')).toBeChecked();
  });
});
