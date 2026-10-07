import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==================== LISTE OP ====================
// L'écran le plus consulté : c'est lui qui dit l'état du portefeuille. Ses
// calculs — engagement antérieur, disponible, total — sont cumulés ligne par
// ligne dans l'ordre de création, et une erreur ici fausserait la lecture
// budgétaire de toute l'équipe sans rien casser visiblement.
//
// La base et le contexte sont remplacés par des doublures. updateDoc est
// espionné : il ne doit s'exécuter qu'au terme d'une restauration confirmée.

const mockUpdateDoc = jest.fn(async () => {});

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'op' })),
  updateDoc: (...a) => mockUpdateDoc(...a),
}));

jest.mock('../utils/journal', () => ({
  enregistrerJournal: jest.fn(),
  nomUtilisateurJournal: () => 'Testeuse',
  ACTIONS_JOURNAL: { RESTAURATION: 'RESTAURATION' },
}));

// Les OP sont volontairement donnés dans le désordre : la page doit les
// recumuler elle-même dans l'ordre de création.
const OPS = [
  {
    id: 'op1', numero: 'N°0001/SP', type: 'DIRECT', statut: 'EN_COURS',
    sourceId: 'S1', exerciceId: 'E1', beneficiaireId: 'B1', beneficiaireNom: 'ENTREPRISE ALPHA',
    ligneBudgetaire: 'L1', dotationFigee: 10000000, objet: 'Achat de ramettes',
    montant: 1000000, dateCreation: '2026-03-01', createdAt: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'op2', numero: 'N°0002/SP', type: 'PROVISOIRE', statut: 'VISE_CF',
    sourceId: 'S1', exerciceId: 'E1', beneficiaireId: 'B2', beneficiaireNom: 'ENTREPRISE BETA',
    ligneBudgetaire: 'L1', dotationFigee: 10000000, objet: 'Carburant du mois',
    montant: 2500000, dateCreation: '2026-03-05', createdAt: '2026-03-05T08:00:00.000Z',
  },
  // Payé partiellement : il doit apparaître dans l'onglet « OP payés ».
  {
    id: 'op3', numero: 'N°0003/SP', type: 'DIRECT', statut: 'PAYE_PARTIEL',
    sourceId: 'S1', exerciceId: 'E1', beneficiaireId: 'B1', beneficiaireNom: 'ENTREPRISE ALPHA',
    ligneBudgetaire: 'L2', dotationFigee: 4000000, objet: 'Mission terrain',
    montant: 800000, dateCreation: '2026-03-10', createdAt: '2026-03-10T08:00:00.000Z',
    paiements: [{ montant: 500000, reference: 'VIR-77', date: '2026-04-02' }],
  },
  // Mis à la corbeille : absent de la liste, présent dans la corbeille.
  {
    id: 'op4', numero: 'N°0004/SP', type: 'DIRECT', statut: 'SUPPRIME',
    sourceId: 'S1', exerciceId: 'E1', beneficiaireNom: 'ENTREPRISE GAMMA',
    ligneBudgetaire: 'L1', objet: 'Saisie erronée', montant: 300000,
    dateCreation: '2026-03-12', createdAt: '2026-03-12T08:00:00.000Z',
    updatedAt: '2026-03-13T09:00:00.000Z', supprimePar: 'Awa',
  },
  // Exercice précédent : il ne doit pas polluer l'exercice actif.
  {
    id: 'op5', numero: 'N°0099/SP', type: 'DIRECT', statut: 'PAYE',
    sourceId: 'S1', exerciceId: 'E0', beneficiaireNom: 'ENTREPRISE DELTA',
    ligneBudgetaire: 'L1', objet: 'Reste de 2025', montant: 9000000,
    dateCreation: '2025-06-01', createdAt: '2025-06-01T08:00:00.000Z',
  },
  // Autre source : masqué dès qu'on choisit la source principale.
  {
    id: 'op6', numero: 'N°0001/SE', type: 'DIRECT', statut: 'EN_COURS',
    sourceId: 'S2', exerciceId: 'E1', beneficiaireNom: 'ENTREPRISE EPSILON',
    ligneBudgetaire: 'L5', dotationFigee: 2000000, objet: 'Fournitures secondaires',
    montant: 400000, dateCreation: '2026-03-02', createdAt: '2026-03-02T08:00:00.000Z',
  },
];

const mockContexte = {
  sources: [
    { id: 'S1', nom: 'Source principale', sigle: 'SP', couleur: '#2E9940' },
    { id: 'S2', nom: 'Source secondaire', sigle: 'SE', couleur: '#C5961F' },
  ],
  beneficiaires: [
    { id: 'B1', nom: 'ENTREPRISE ALPHA', ncc: '1234' },
    { id: 'B2', nom: 'ENTREPRISE BETA', ncc: '5678' },
  ],
  budgets: [{
    id: 'BU1', sourceId: 'S1', exerciceId: 'E1', version: 1,
    lignes: [
      { code: 'L1', libelle: 'Fournitures', dotation: 10000000 },
      { code: 'L2', libelle: 'Missions', dotation: 4000000 },
    ],
  }],
  ops: OPS,
  exerciceActif: { id: 'E1', annee: 2026, actif: true },
  exercices: [{ id: 'E1', annee: 2026, actif: true }, { id: 'E0', annee: 2025, actif: false }],
  projet: { sigle: 'PIF2', motDePasseAdmin: 'secret' },
  setCurrentPage: jest.fn(),
  setConsultOpData: jest.fn(),
  permissions: { canCreate: true, canEdit: true, canDelete: true },
  userProfile: { nom: 'Testeuse', role: 'OPERATEUR' },
  chargerExerciceOps: jest.fn(),
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

const PageListeOP = require('./PageListeOP').default;

// Intl sépare les milliers par une espace insécable fine : on la ramène à une
// espace ordinaire pour comparer des montants lisiblement dans les tests.
const norm = (t) => String(t).replace(/[\u00a0\u202f\u2009]/g, ' ');

// Les lignes du corps du tableau, hors en-tête et hors ligne de total : le
// tableau compte trois groupes de lignes, et le corps est le deuxième.
const lignesAffichees = () => {
  const corps = screen.getAllByRole('rowgroup')[1];
  return within(corps).queryAllByRole('row');
};

const cellules = (ligne) => within(ligne).getAllByRole('cell').map(c => norm(c.textContent.trim()));

const numerosAffiches = () => lignesAffichees().map(ligne => cellules(ligne)[0]);

const ligneDe = (numero) => lignesAffichees().find(l => l.textContent.includes(numero));

const saisirFiltre = async (placeholder, valeur) => {
  await userEvent.type(screen.getByPlaceholderText(placeholder), valeur);
};

beforeEach(() => jest.clearAllMocks());

describe('Liste OP — le périmètre de la liste', () => {
  test('les OP de l\'exercice actif sont listés', () => {
    render(<PageListeOP />);
    expect(numerosAffiches()).toEqual(expect.arrayContaining(['N° 0001/SP', 'N° 0002/SP', 'N° 0003/SP']));
  });

  test('un OP d\'un exercice antérieur n\'est pas mélangé à l\'exercice actif', () => {
    render(<PageListeOP />);
    expect(screen.queryByText('Reste de 2025')).not.toBeInTheDocument();
  });

  // Mettre un OP à la corbeille ne doit pas le faire disparaître des yeux
  // seulement : il doit sortir des totaux aussi.
  test('un OP mis à la corbeille sort de la liste', () => {
    render(<PageListeOP />);
    expect(screen.queryByText('Saisie erronée')).not.toBeInTheDocument();
  });

  test('le plus récent est présenté en premier', () => {
    render(<PageListeOP />);
    expect(numerosAffiches()[0]).toBe('N° 0003/SP');
  });

  test('le total est la somme des montants affichés', () => {
    render(<PageListeOP />);
    // 1 000 000 + 2 500 000 + 800 000 + 400 000 (toutes sources) = 4 700 000
    expect(screen.getByText(/4\s?700\s?000 F/)).toBeInTheDocument();
  });
});

describe('Liste OP — les sources', () => {
  test('en cumul général, toutes les sources sont mêlées', () => {
    render(<PageListeOP />);
    expect(numerosAffiches()).toContain('N° 0001/SE');
  });

  test('choisir une source écarte les OP des autres', async () => {
    render(<PageListeOP />);
    await userEvent.click(screen.getByText('SP'));
    expect(numerosAffiches()).not.toContain('N° 0001/SE');
    expect(numerosAffiches()).toContain('N° 0001/SP');
  });

  // Le suivi budgétaire n'a de sens que source par source : une dotation
  // appartient à une source, la cumuler entre sources ne voudrait rien dire.
  test('les colonnes budgétaires n\'apparaissent que source par source', async () => {
    render(<PageListeOP />);
    expect(screen.queryByText('Dotation')).not.toBeInTheDocument();
    expect(screen.queryByText('Disponible')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('SP'));
    expect(screen.getByText('Dotation')).toBeInTheDocument();
    expect(screen.getByText('Engag. Ant.')).toBeInTheDocument();
    expect(screen.getByText('Disponible')).toBeInTheDocument();
  });

  // Le cœur du calcul : l'engagement antérieur d'un OP, c'est ce qui a été
  // engagé sur SA ligne AVANT lui, dans l'ordre de création.
  test('l\'engagement antérieur et le disponible se cumulent par ligne', async () => {
    render(<PageListeOP />);
    await userEvent.click(screen.getByText('SP'));

    const ligne0002 = cellules(ligneDe('N° 0002/SP'));
    // L1 : 0001 a engagé 1 000 000 avant lui, donc antérieur = 1 000 000
    // et disponible = 10 000 000 − (1 000 000 + 2 500 000) = 6 500 000
    expect(ligne0002).toContain('1 000 000');
    expect(ligne0002).toContain('6 500 000');
  });
});

describe('Liste OP — les filtres', () => {
  test('filtrer sur le numéro réduit la liste', async () => {
    render(<PageListeOP />);
    await saisirFiltre('0042', '0002');
    expect(numerosAffiches()).toEqual(['N° 0002/SP']);
  });

  test('filtrer sur un mot de l\'objet réduit la liste', async () => {
    render(<PageListeOP />);
    await saisirFiltre("Mot de l'objet", 'carburant');
    expect(numerosAffiches()).toEqual(['N° 0002/SP']);
  });

  test('un filtre qui ne correspond à rien vide la liste, sans erreur', async () => {
    render(<PageListeOP />);
    await saisirFiltre('0042', 'ZZZZ');
    expect(lignesAffichees()).toHaveLength(0);
  });

  test('« Effacer » rend la liste complète', async () => {
    render(<PageListeOP />);
    await saisirFiltre('0042', '0002');
    expect(numerosAffiches()).toHaveLength(1);
    await userEvent.click(screen.getByText('Effacer'));
    expect(numerosAffiches().length).toBeGreaterThan(1);
  });

  // Un filtre actif dans un panneau replié rendrait la liste vide sans raison
  // visible : le compteur sur le bouton existe pour ça.
  test('un filtre détaillé actif est annoncé par un compteur', async () => {
    render(<PageListeOP />);
    await userEvent.click(screen.getByText(/Filtres détaillés/));
    await userEvent.type(screen.getByPlaceholderText('0'), '2000000');
    expect(numerosAffiches()).toEqual(['N° 0002/SP']);
    expect(within(screen.getByText(/Filtres détaillés/)).getByText('1')).toBeInTheDocument();
  });
});

describe('Liste OP — l\'onglet OP payés', () => {
  test('seuls les OP ayant au moins un paiement y figurent', async () => {
    render(<PageListeOP />);
    await userEvent.click(screen.getByText('OP PAYÉS'));
    expect(numerosAffiches()).toEqual(['N° 0003/SP']);
  });

  test('le montant payé et le solde restant sont affichés', async () => {
    render(<PageListeOP />);
    await userEvent.click(screen.getByText('OP PAYÉS'));
    expect(screen.getByText('Mtt Payé')).toBeInTheDocument();
    expect(screen.getByText('Solde')).toBeInTheDocument();
    const ligne = cellules(lignesAffichees()[0]).join(' ');
    expect(ligne).toContain('500 000');   // payé
    expect(ligne).toContain('300 000');   // solde restant
    expect(ligne).toContain('VIR-77');    // référence du virement
  });
});

describe('Liste OP — l\'aperçu', () => {
  test('le ℹ ouvre le suivi détaillé de l\'OP', async () => {
    render(<PageListeOP />);
    await userEvent.click(screen.getByTitle("Suivi détaillé de l'OP N°0002/SP"));
    expect(screen.getByText('SUIVI DÉTAILLÉ DE L\'OP')).toBeInTheDocument();
    expect(screen.getByText('CHRONOLOGIE DES ÉTAPES')).toBeInTheDocument();
  });

  // L'aperçu était écrit deux fois dans la page : la version complète et un
  // reste d'ébauche superposé derrière elle. Elle ne doit plus apparaître
  // qu'une fois.
  test('l\'aperçu n\'est affiché qu\'une seule fois', async () => {
    render(<PageListeOP />);
    await userEvent.click(screen.getByTitle("Suivi détaillé de l'OP N°0002/SP"));
    expect(screen.getAllByText('Ouvrir le dossier complet')).toHaveLength(1);
    expect(screen.queryByText('Fermer')).not.toBeInTheDocument();
  });

  test('une étape non franchie est annoncée « En attente », pas vide', async () => {
    render(<PageListeOP />);
    await userEvent.click(screen.getByTitle("Suivi détaillé de l'OP N°0001/SP"));
    expect(screen.getAllByText('En attente').length).toBeGreaterThan(0);
  });

  test('un OP déjà différé montre son historique dans l\'aperçu', async () => {
    mockContexte.ops = [{
      ...OPS[0],
      historiqueDifferes: [{
        dateDiffere: '2026-03-03', motifDiffere: 'Pièce justificative manquante',
        dateReintroduction: '2026-03-20', type: 'CF',
      }],
    }];
    render(<PageListeOP />);
    await userEvent.click(screen.getByTitle("Suivi détaillé de l'OP N°0001/SP"));
    expect(screen.getByText('HISTORIQUE DES DIFFÉRÉS')).toBeInTheDocument();
    expect(screen.getByText('Pièce justificative manquante')).toBeInTheDocument();
    mockContexte.ops = OPS;
  });
});

describe('Liste OP — la corbeille', () => {
  const ouvrirCorbeille = async () => {
    await userEvent.click(screen.getByTitle('Corbeille (OP supprimés)'));
    return screen.getByText(/CORBEILLE \(OP SUPPRIMÉS\)/);
  };

  test('la corbeille liste les OP supprimés, avec leur auteur', async () => {
    render(<PageListeOP />);
    await ouvrirCorbeille();
    expect(screen.getByText('Saisie erronée')).toBeInTheDocument();
    expect(screen.getByText('Awa')).toBeInTheDocument();
  });

  test('restaurer réclame le mot de passe administrateur, et n\'écrit rien avant', async () => {
    render(<PageListeOP />);
    await ouvrirCorbeille();
    await userEvent.click(screen.getByTitle(/Restaurer l'OP/));
    expect(screen.getByText('CONFIRMER LA RESTAURATION')).toBeInTheDocument();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('un mauvais mot de passe refuse la restauration, et n\'écrit rien', async () => {
    render(<PageListeOP />);
    await ouvrirCorbeille();
    await userEvent.click(screen.getByTitle(/Restaurer l'OP/));
    await userEvent.type(screen.getByPlaceholderText('Mot de passe administrateur'), 'faux');
    await userEvent.click(screen.getByText('Confirmer'));
    expect(screen.getByText('Mot de passe incorrect')).toBeInTheDocument();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  // Un OP restauré repart au début du circuit : il ne retrouve pas le statut
  // qu'il avait avant sa suppression.
  test('le bon mot de passe restaure l\'OP au début du circuit', async () => {
    render(<PageListeOP />);
    await ouvrirCorbeille();
    await userEvent.click(screen.getByTitle(/Restaurer l'OP/));
    await userEvent.type(screen.getByPlaceholderText('Mot de passe administrateur'), 'secret');
    await userEvent.click(screen.getByText('Confirmer'));
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1]).toMatchObject({
      statut: 'EN_COURS', motifSuppression: null, supprimePar: null,
    });
  });
});
