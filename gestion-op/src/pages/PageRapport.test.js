import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==================== RAPPORT COMPTABLE ====================
// Cinq listes de relance, chacune répondant à une question que la comptabilité
// pose chaque semaine : qu'est-ce qui dort, qu'est-ce qui dépasse les délais,
// qu'est-ce qui reste à régulariser. Un OP rangé dans la mauvaise liste ne
// casse rien — il se fait simplement oublier. D'où ces tests.
//
// La date de référence est fixée dans les tests, jamais « aujourd'hui » : un
// test qui dépend du jour où on le lance ne prouve rien.

const mockBatchUpdate = jest.fn();
const mockCommit = jest.fn(async () => {});
const mockUpdateDoc = jest.fn(async () => {});

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  doc: (...a) => ({ id: a.length >= 3 ? a[2] : 'nouveau-doc' }),
  updateDoc: (...a) => mockUpdateDoc(...a),
  writeBatch: () => ({ update: mockBatchUpdate, commit: mockCommit }),
}));

const opBase = {
  sourceId: 'S1', exerciceId: 'E1', beneficiaireId: 'B1', beneficiaireNom: 'ENTREPRISE ALPHA',
  ligneBudgetaire: 'L1', objet: 'Achat de ramettes', montant: 1000000,
  dateCreation: '2026-03-02', createdAt: '2026-03-02T08:00:00.000Z',
};

// Date de référence des tests : lundi 23 mars 2026.
const DATE_REF = '2026-03-23';

const ops = () => [
  // --- En cours compta : les quatre statuts qui y figurent
  { ...opBase, id: 'enCours', numero: 'N°0001/SP', type: 'DIRECT', statut: 'EN_COURS' },
  { ...opBase, id: 'viseCF', numero: 'N°0002/SP', type: 'DIRECT', statut: 'VISE_CF', dateVisaCF: '2026-03-19' },
  { ...opBase, id: 'differeCF', numero: 'N°0003/SP', type: 'DIRECT', statut: 'DIFFERE_CF',
    dateDiffere: '2026-03-10', motifDiffere: 'Pièce manquante' },

  // --- Non visés CF : transmis le lundi 16/03, soit 5 jours ouvrés avant le 23/03
  { ...opBase, id: 'transmisCF', numero: 'N°0004/SP', type: 'DIRECT', statut: 'TRANSMIS_CF',
    bordereauCF: 'BT-CF-0002/PIF2-SP/2026', dateTransmissionCF: '2026-03-16',
    historiqueDifferes: [{ dateDiffere: '2026-03-05', motifDiffere: 'Facture illisible',
                           dateReintroduction: '2026-03-16', type: 'CF' }] },

  // --- Non soldés
  { ...opBase, id: 'transmisAC', numero: 'N°0005/SP', type: 'DIRECT', statut: 'TRANSMIS_AC',
    dateTransmissionAC: '2026-03-18' },
  { ...opBase, id: 'partiel', numero: 'N°0006/SP', type: 'DIRECT', statut: 'PAYE_PARTIEL',
    dateTransmissionAC: '2026-03-18', totalPaye: 250000 },
  // Une ANNULATION transmise à l'AC n'est pas un impayé : elle ne doit pas y figurer.
  { ...opBase, id: 'annulTransmis', numero: 'N°0007/SP', type: 'ANNULATION', statut: 'TRANSMIS_AC',
    montant: -300000, dateTransmissionAC: '2026-03-18' },

  // --- À régulariser : un provisoire payé sans définitif
  { ...opBase, id: 'provSeul', numero: 'N°0008/SP', type: 'PROVISOIRE', statut: 'PAYE',
    datePaiement: '2026-01-05', totalPaye: 1000000 },
  // Celui-ci est régularisé : son définitif existe et est actif, il doit disparaître.
  { ...opBase, id: 'provRegle', numero: 'N°0009/SP', type: 'PROVISOIRE', statut: 'PAYE',
    datePaiement: '2026-01-05', totalPaye: 1000000 },
  { ...opBase, id: 'defRegle', numero: 'N°0010/SP', type: 'DEFINITIF', statut: 'VISE_CF',
    opProvisoireId: 'provRegle', dateVisaCF: '2026-03-20' },

  // --- À annuler : un provisoire encore vivant, sans annulation en face
  { ...opBase, id: 'provAAnnuler', numero: 'N°0013/SP', type: 'PROVISOIRE', statut: 'VISE_CF',
    dateVisaCF: '2026-03-19' },
  // Celui-ci a déjà son annulation : il doit sortir de la liste
  { ...opBase, id: 'provAnnule', numero: 'N°0014/SP', type: 'PROVISOIRE', statut: 'VISE_CF',
    dateVisaCF: '2026-03-19' },
  { ...opBase, id: 'annulDeProv', numero: 'N°0015/SP', type: 'ANNULATION', statut: 'TRANSMIS_CF',
    montant: -1000000, opProvisoireId: 'provAnnule' },

  // --- Jamais dans le rapport
  { ...opBase, id: 'supprime', numero: 'N°0011/SP', type: 'DIRECT', statut: 'SUPPRIME' },
  { ...opBase, id: 'traite', numero: 'N°0012/SP', type: 'DIRECT', statut: 'TRAITE' },
];

const mockContexte = {
  ops: ops(),
  beneficiaires: [{ id: 'B1', nom: 'ENTREPRISE ALPHA' }],
  sources: [{ id: 'S1', nom: 'Source principale', sigle: 'SP', couleur: '#2E9940' }],
  exercices: [{ id: 'E1', annee: 2026, actif: true }],
  exerciceActif: { id: 'E1', annee: 2026, actif: true },
  setConsultOpData: jest.fn(),
  setCurrentPage: jest.fn(),
  permissions: { canCreate: true, canEdit: true, canDelete: true },
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

const PageRapport = require('./PageRapport').default;

const boutons = (regex) => screen.getAllByRole('button').filter(b => regex.test(b.textContent));
// Le libellé d'un onglet est précédé de son icône, donc d'une espace.
const allerA = async (nom) => userEvent.click(boutons(new RegExp('^\\s*' + nom))[0]);

// Chaque test part de la même date de référence, pour que les délais soient stables.
const afficher = () => {
  render(<PageRapport />);
  fireEvent.change(screen.getByDisplayValue(/^\d{4}-\d{2}-\d{2}$/), { target: { value: DATE_REF } });
};

const lignes = () => within(screen.getAllByRole('rowgroup')[1]).queryAllByRole('row');
const numeros = () => lignes()
  .map(l => within(l).queryAllByRole('cell')[1]?.textContent.trim())
  .filter(Boolean);
const ligneDe = (numero) => lignes().find(l => l.textContent.includes(numero));

beforeEach(() => {
  jest.clearAllMocks();
  mockContexte.ops = ops();
});

describe('Rapport — les cinq listes', () => {
  test('les cinq onglets sont proposés avec leur nombre d\'OP', () => {
    afficher();
    for (const nom of ['En cours compta', 'Non visés CF', 'Non soldés', 'À annuler', 'À régulariser']) {
      expect(boutons(new RegExp('^\\s*' + nom))[0]).toBeInTheDocument();
    }
  });

  test('un OP supprimé ou déjà traité n\'apparaît dans aucune liste', () => {
    afficher();
    expect(screen.queryByText('N° 0011/SP')).not.toBeInTheDocument();
    expect(screen.queryByText('N° 0012/SP')).not.toBeInTheDocument();
  });

  test('rien n\'est écrit à l\'affichage de la page', () => {
    afficher();
    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('Rapport — En cours compta', () => {
  test('les OP encore chez le comptable y figurent, pas ceux déjà transmis', () => {
    afficher();
    expect(numeros()).toEqual(expect.arrayContaining(['N° 0001/SP', 'N° 0002/SP', 'N° 0003/SP']));
    expect(numeros()).not.toContain('N° 0004/SP');   // transmis au CF
  });

  test('le motif d\'un différé est proposé comme observation par défaut', () => {
    afficher();
    expect(screen.getByText(/Motif différé : Pièce manquante/)).toBeInTheDocument();
  });

  test('un OP en cours rappelle ce qu\'il reste à faire', () => {
    afficher();
    expect(screen.getByText('À transférer au CF')).toBeInTheDocument();
    expect(screen.getAllByText("À transférer à l'AC").length).toBeGreaterThan(0);
  });
});

describe('Rapport — Non visés CF', () => {
  // Le délai est compté en jours ouvrés : du lundi 16 au lundi 23 mars, les deux
  // jours du week-end ne comptent pas.
  test('le délai est compté en jours ouvrés depuis la transmission', async () => {
    afficher();
    await allerA('Non visés CF');
    expect(within(ligneDe('N° 0004/SP')).getByText('5 j ouvrés')).toBeInTheDocument();
  });

  test('changer la date de référence change le délai', async () => {
    afficher();
    await allerA('Non visés CF');
    fireEvent.change(screen.getByDisplayValue(DATE_REF), { target: { value: '2026-03-18' } });
    expect(within(ligneDe('N° 0004/SP')).getByText('2 j ouvrés')).toBeInTheDocument();
  });

  // La correction des différés : un OP réintroduit garde la trace de son passage,
  // et le rapport doit la montrer.
  test('un OP déjà différé porte une pastille rappelant son historique', async () => {
    afficher();
    await allerA('Non visés CF');
    const pastille = within(ligneDe('N° 0004/SP')).getByText('1 différé');
    expect(pastille).toBeInTheDocument();
    expect(pastille.getAttribute('title')).toContain('Facture illisible');
  });
});

describe('Rapport — Non soldés', () => {
  test('les OP en attente de paiement y figurent', async () => {
    afficher();
    await allerA('Non soldés');
    expect(numeros()).toEqual(expect.arrayContaining(['N° 0005/SP', 'N° 0006/SP']));
  });

  // Une annulation n'est pas une dette : elle n'a rien à faire dans les impayés.
  test('une annulation n\'est pas comptée comme un impayé', async () => {
    afficher();
    await allerA('Non soldés');
    expect(numeros()).not.toContain('N° 0007/SP');
  });

  test('le reste à payer est calculé d\'après ce qui a déjà été versé', async () => {
    afficher();
    await allerA('Non soldés');
    // 1 000 000 − 250 000 déjà payés = 750 000
    expect(within(ligneDe('N° 0006/SP')).getByText(/750\s?000/)).toBeInTheDocument();
  });
});

describe('Rapport — À régulariser', () => {
  // La question métier : un provisoire payé doit être suivi d'un définitif.
  // Tant qu'il ne l'est pas, il est à régulariser — et dès qu'il l'est, il sort.
  test('un provisoire payé sans définitif est à régulariser', async () => {
    afficher();
    await allerA('À régulariser');
    expect(numeros()).toContain('N° 0008/SP');
  });

  test('un provisoire déjà régularisé sort de la liste', async () => {
    afficher();
    await allerA('À régulariser');
    expect(numeros()).not.toContain('N° 0009/SP');
  });

  test('le délai de régularisation est compté en jours calendaires', async () => {
    afficher();
    await allerA('À régulariser');
    // du 05/01 au 23/03/2026 = 77 jours
    expect(within(ligneDe('N° 0008/SP')).getByText('77 jours')).toBeInTheDocument();
  });
});

describe('Rapport — À annuler', () => {
  // Un provisoire qui n'a pas été régularisé ni annulé reste à annuler. Dès
  // qu'une annulation le vise, il sort de la liste : c'est la même règle que
  // celle du Tableau de bord, écrite une seule fois pour les deux pages.
  test('un provisoire encore vivant est à annuler', async () => {
    afficher();
    await allerA('À annuler');
    expect(numeros()).toContain('N° 0013/SP');
  });

  test('un provisoire déjà visé par une annulation sort de la liste', async () => {
    afficher();
    await allerA('À annuler');
    expect(numeros()).not.toContain('N° 0014/SP');
  });

  test('un provisoire déjà payé n\'est plus à annuler', async () => {
    afficher();
    await allerA('À annuler');
    expect(numeros()).not.toContain('N° 0008/SP');
  });

  test('le délai court depuis le visa du CF', async () => {
    afficher();
    await allerA('À annuler');
    // du jeudi 19 au lundi 23 mars : vendredi et lundi, soit 2 jours ouvrés
    expect(within(ligneDe('N° 0013/SP')).getByText('2 j ouvrés')).toBeInTheDocument();
  });
});

describe('Rapport — les filtres et le tri', () => {
  test('filtrer sur le numéro réduit la liste', async () => {
    afficher();
    await userEvent.click(boutons(/^Filtres/)[0]);
    await userEvent.type(screen.getByPlaceholderText('0042'), '0002');
    expect(numeros()).toEqual(['N° 0002/SP']);
  });

  test('un filtre actif est annoncé par un compteur sur le bouton', async () => {
    afficher();
    await userEvent.click(boutons(/^Filtres/)[0]);
    await userEvent.type(screen.getByPlaceholderText("Mot de l'objet"), 'ramettes');
    expect(within(boutons(/Masquer les filtres/)[0]).getByText('1')).toBeInTheDocument();
  });

  test('un filtre sans résultat le dit, au lieu d\'un tableau vide', async () => {
    afficher();
    await userEvent.click(boutons(/^Filtres/)[0]);
    await userEvent.type(screen.getByPlaceholderText('0042'), 'ZZZZ');
    expect(screen.getByText('Aucun résultat trouvé')).toBeInTheDocument();
  });

  test('le tri par numéro s\'inverse au second clic', async () => {
    afficher();
    await userEvent.click(screen.getByTitle('Trier par N° OP'));
    const croissant = numeros();
    await userEvent.click(screen.getByTitle('Trier par N° OP'));
    expect(numeros()).toEqual([...croissant].reverse());
  });
});

describe('Rapport — les observations', () => {
  test('une observation est enregistrée sur chaque OP sélectionné', async () => {
    afficher();
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    await userEvent.click(within(ligneDe('N° 0002/SP')).getByRole('checkbox'));
    await userEvent.type(screen.getByPlaceholderText(/Saisir une observation/), 'Relancé par téléphone');
    await userEvent.click(boutons(/Enregistrer l'observation/)[0]);

    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(mockBatchUpdate.mock.calls.map(([ref, data]) => [ref.id, data.observation])).toEqual([
      ['enCours', 'Relancé par téléphone'],
      ['viseCF', 'Relancé par téléphone'],
    ]);
  });

  // Effacer le champ doit effacer l'observation, pas enregistrer une chaîne vide.
  test('une observation vidée est effacée, pas enregistrée vide', async () => {
    afficher();
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    await userEvent.click(boutons(/Enregistrer l'observation/)[0]);
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(mockBatchUpdate.mock.calls[0][1].observation).toBeNull();
  });

  // Rien à écrire sans sélection : la barre n'est même pas proposée.
  test('la barre d\'observation n\'apparaît qu\'avec une sélection', async () => {
    afficher();
    expect(screen.queryByPlaceholderText(/Saisir une observation/)).not.toBeInTheDocument();
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    expect(screen.getByPlaceholderText(/Saisir une observation/)).toBeInTheDocument();
  });

  test('changer d\'onglet remet la sélection et les filtres à zéro', async () => {
    afficher();
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    await allerA('Non visés CF');
    await allerA('En cours compta');
    expect(within(ligneDe('N° 0001/SP')).getByRole('checkbox')).not.toBeChecked();
  });
});
