import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==================== CIRCUIT CF ====================
// L'écran où les OP changent d'état. Un OP qui passe au visa devient payable ;
// un OP différé ressort du circuit ; un OP rejeté crée une écriture inverse.
// Ces décisions sont écrites en lot (writeBatch) : les tests espionnent ce lot
// et vérifient exactement ce qui part en base, et surtout ce qui n'y part pas.

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockCommit = jest.fn(async () => {});
const mockUpdateDoc = jest.fn(async () => {});
const mockGetDocs = jest.fn(async () => ({ docs: [] }));

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

// doc() renvoie une référence qui porte l'identifiant visé : c'est ce qui permet
// aux tests de dire QUEL OP a été écrit, et pas seulement qu'il y a eu écriture.
// Déclarées en fonctions simples, et non en jest.fn : Create React App remet les
// doublures à zéro avant chaque test, ce qui effacerait leur comportement.
jest.mock('firebase/firestore', () => ({
  collection: (_db, nom) => ({ nom }),
  doc: (...a) => ({ id: a.length >= 3 ? a[2] : 'nouveau-doc', cible: a[1]?.nom || a[1] }),
  updateDoc: (...a) => mockUpdateDoc(...a),
  getDocs: (...a) => mockGetDocs(...a),
  query: () => ({}),
  where: () => ({}),
  writeBatch: () => ({ set: mockBatchSet, update: mockBatchUpdate, delete: mockBatchDelete, commit: mockCommit }),
}));

jest.mock('../utils/journal', () => ({
  enregistrerJournal: jest.fn(),
  nomUtilisateurJournal: () => 'Testeuse',
  ACTIONS_JOURNAL: { CHANGEMENT_STATUT: 'CHANGEMENT_STATUT' },
}));

// L'impression du bordereau ouvre une fenêtre : on la neutralise.
jest.mock('../utils/bordereauPrint', () => ({ buildBordereauPrintHtml: () => '<html></html>' }));

const opBase = {
  sourceId: 'S1', exerciceId: 'E1', beneficiaireId: 'B1', beneficiaireNom: 'ENTREPRISE ALPHA',
  ligneBudgetaire: 'L1', objet: 'Achat de ramettes', montant: 1000000,
  dateCreation: '2026-03-01', createdAt: '2026-03-01T08:00:00.000Z',
};

const ops = () => [
  // Éligible : jamais mis sur un bordereau
  { ...opBase, id: 'op1', numero: 'N°0001/SP', type: 'DIRECT', statut: 'EN_COURS' },
  // Éligible aussi : un différé repart dans un nouveau bordereau
  { ...opBase, id: 'op2', numero: 'N°0002/SP', type: 'DIRECT', statut: 'DIFFERE_CF',
    dateTransmissionCF: '2026-03-04', dateDiffere: '2026-03-08', motifDiffere: 'Pièce manquante', bordereauCF: null },
  // Pas éligible : déjà visé
  { ...opBase, id: 'op3', numero: 'N°0003/SP', type: 'DIRECT', statut: 'VISE_CF', dateVisaCF: '2026-03-07' },
  // Transmis : c'est sur lui que le CF se prononce
  { ...opBase, id: 'op4', numero: 'N°0004/SP', type: 'DIRECT', statut: 'TRANSMIS_CF',
    bordereauCF: 'BT-CF-0003/PIF2-SP/2026', dateTransmissionCF: '2026-03-10' },
  // Une ANNULATION transmise : son visa ne la rend pas payable, il la clôt.
  { ...opBase, id: 'op5', numero: 'N°0005/SP', type: 'ANNULATION', statut: 'TRANSMIS_CF',
    montant: -500000, bordereauCF: 'BT-CF-0003/PIF2-SP/2026', dateTransmissionCF: '2026-03-10' },
  // Rejeté : visible dans le suivi. Il garde son bordereau d'origine, et son OP
  // de rejet — le négatif qui annule l'engagement — vit à côté, sans bordereau.
  { ...opBase, id: 'op6', numero: 'N°0006/SP', type: 'DIRECT', statut: 'REJETE_CF',
    bordereauCF: 'BT-CF-0003/PIF2-SP/2026', dateVisaCF: null,
    dateRejet: '2026-03-11', motifRejet: 'Montant erroné' },
  { ...opBase, id: 'op6r', numero: 'N°0006/SP-R', type: 'REJET', statut: 'REJETE_CF',
    montant: -1000000, opOriginalId: 'op6', bordereauCF: null, bordereauAC: null,
    dateRejet: '2026-03-11', motifRejet: 'Montant erroné' },
  // Autre source : ne doit jamais apparaître sur la source principale
  { ...opBase, id: 'op7', numero: 'N°0001/SE', type: 'DIRECT', statut: 'EN_COURS', sourceId: 'S2' },
];

const mockContexte = {
  projet: { sigle: 'PIF2', motDePasseAdmin: 'secret' },
  sources: [
    { id: 'S1', nom: 'Source principale', sigle: 'SP', couleur: '#2E9940' },
    { id: 'S2', nom: 'Source secondaire', sigle: 'SE', couleur: '#C5961F' },
  ],
  exercices: [{ id: 'E1', annee: 2026, actif: true }],
  beneficiaires: [{ id: 'B1', nom: 'ENTREPRISE ALPHA' }],
  ops: ops(),
  bordereaux: [
    { id: 'bt3', numero: 'BT-CF-0003/PIF2-SP/2026', type: 'CF', sourceId: 'S1', exerciceId: 'E1',
      statut: 'ENVOYE', opsIds: ['op4', 'op5'], nbOps: 2, totalMontant: 500000,
      dateCreation: '2026-03-09', dateTransmission: '2026-03-10' },
  ],
  userProfile: { nom: 'Testeuse', role: 'OPERATEUR' },
  chargerExerciceBordereaux: jest.fn(),
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

const PageCircuitCF = require('./PageCircuitCF').default;

// « Retour CF » nomme à la fois un onglet et le bouton d'action : l'onglet est
// en haut de page, le bouton en bas. On les distingue par leur position.
const boutons = (regex) => screen.getAllByRole('button').filter(b => regex.test(b.textContent));
const allerA = async (nom) => userEvent.click(boutons(new RegExp('^' + nom))[0]);
const boutonAction = (regex) => boutons(regex).slice(-1)[0];

// Les lignes d'OP se cochent au clic : on vise la ligne par son numéro.
const cocher = async (numero) => {
  const ligne = screen.getAllByRole('row').find(r => r.textContent.includes(numero));
  await userEvent.click(within(ligne).getByRole('checkbox'));
};

// La confirmation partagée exécute son action après un court délai : on attend.
const confirmer = async () => userEvent.click(await screen.findByText('Confirmer'));

// Les annulations de différé et de rejet réclament le mot de passe
// administrateur : la confirmation seule ne suffit plus.
const confirmerAvecMotDePasse = async (motDePasse = 'secret') => {
  await userEvent.type(await screen.findByPlaceholderText('Mot de passe administrateur'), motDePasse);
  await userEvent.click(screen.getByText('Confirmer'));
};

const refus = (titre) => screen.findByRole('heading', { level: 3, name: titre });

const aujourdhui = new Date().toISOString().split('T')[0];

// Les écritures du lot, ramenées à { id de l'OP, champs écrits }.
const ecrituresOps = () => mockBatchUpdate.mock.calls.map(([ref, data]) => ({ id: ref.id, ...data }));

beforeEach(() => {
  jest.clearAllMocks();
  mockContexte.ops = ops();
});

describe('Circuit CF — la file d\'attente', () => {
  test('seuls les OP en cours ou différés, hors bordereau, sont proposés', () => {
    render(<PageCircuitCF />);
    const file = screen.getByRole('table');
    expect(file.textContent).toContain('N° 0001/SP');
    expect(file.textContent).toContain('N° 0002/SP');
    expect(file.textContent).not.toContain('N° 0003/SP');   // déjà visé
    expect(file.textContent).not.toContain('N° 0004/SP');   // déjà transmis
  });

  test('les OP d\'une autre source ne sont jamais mêlés', () => {
    render(<PageCircuitCF />);
    expect(screen.getByRole('table').textContent).not.toContain('N° 0001/SE');
  });

  test('un différé est signalé comme tel dans la file', () => {
    render(<PageCircuitCF />);
    expect(screen.getByText('Différé')).toBeInTheDocument();
  });

  test('rien n\'est écrit à l\'affichage de la page', () => {
    render(<PageCircuitCF />);
    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('Circuit CF — générer un bordereau', () => {
  test('le total des OP cochés est annoncé avant de générer', async () => {
    render(<PageCircuitCF />);
    await cocher('N° 0001/SP');
    await cocher('N° 0002/SP');
    expect(screen.getByText(/2 OP sélectionnés/)).toBeInTheDocument();
  });

  // Le numéro repart du plus élevé existant, et non d'un compteur : un bordereau
  // supprimé libère ainsi son numéro.
  test('le bordereau prend le numéro suivant le plus élevé existant', async () => {
    render(<PageCircuitCF />);
    await cocher('N° 0001/SP');
    await userEvent.click(screen.getByText('Générer Bordereau'));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(mockBatchSet.mock.calls[0][1]).toMatchObject({
      numero: 'BT-CF-0004/PIF2-SP/2026', type: 'CF', statut: 'EN_COURS', nbOps: 1,
    });
  });

  test('les OP retenus portent le numéro du bordereau', async () => {
    render(<PageCircuitCF />);
    await cocher('N° 0001/SP');
    await userEvent.click(screen.getByText('Générer Bordereau'));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(ecrituresOps()).toEqual([
      expect.objectContaining({ id: 'op1', bordereauCF: 'BT-CF-0004/PIF2-SP/2026' }),
    ]);
  });

  test('renoncer à la confirmation n\'écrit rien', async () => {
    render(<PageCircuitCF />);
    await cocher('N° 0001/SP');
    await userEvent.click(screen.getByText('Générer Bordereau'));
    await userEvent.click(await screen.findByText('Annuler'));
    expect(mockCommit).not.toHaveBeenCalled();
  });
});

describe('Circuit CF — transmettre un bordereau', () => {
  const ouvrirBordereau = async () => {
    await allerA('Bordereaux');
    await userEvent.click(screen.getByText('BT-CF-0003/PIF2-SP/2026'));
  };

  test('le bordereau liste les OP qu\'il porte', async () => {
    render(<PageCircuitCF />);
    await ouvrirBordereau();
    expect(screen.getByText('N° 0004/SP')).toBeInTheDocument();
    expect(screen.getByText('N° 0005/SP')).toBeInTheDocument();
  });

  // Un bordereau dont des OP ont avancé ne se retouche plus : le verrou est
  // annoncé sur le bouton, pas découvert au clic.
  test('un bordereau dont les OP ont avancé est signalé verrouillé', async () => {
    mockContexte.ops = ops().map(o => o.id === 'op4' ? { ...o, statut: 'VISE_CF' } : o);
    render(<PageCircuitCF />);
    await allerA('Bordereaux');
    expect(screen.getByTitle('Verrouillé')).toBeInTheDocument();
  });
});

describe('Circuit CF — la décision du CF', () => {
  const ouvrirRetour = async (numeros = ['N° 0004/SP']) => {
    await allerA('Retour CF');
    for (const n of numeros) await cocher(n);
    await userEvent.click(boutonAction(/^Retour CF/));
  };

  test('un différé sans motif est refusé, et rien n\'est écrit', async () => {
    render(<PageCircuitCF />);
    await ouvrirRetour();
    await userEvent.click(screen.getByText('Différé'));
    await userEvent.click(screen.getByText(/Valider/));
    expect(await refus('Erreur')).toBeInTheDocument();
    expect(screen.getByText('Motif obligatoire.')).toBeInTheDocument();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  // Le CF ne peut pas se prononcer avant d'avoir reçu le bordereau.
  test('une date antérieure à la transmission est refusée, en nommant l\'OP', async () => {
    render(<PageCircuitCF />);
    await ouvrirRetour();
    fireEvent.change(screen.getByDisplayValue(aujourdhui), { target: { value: '2026-03-01' } });
    await userEvent.click(screen.getByText(/Valider/));
    expect(await refus('Erreur')).toBeInTheDocument();
    expect(screen.getByText(/N°0004\/SP/)).toBeInTheDocument();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  test('un visa passe l\'OP à « visé » avec sa date', async () => {
    render(<PageCircuitCF />);
    await ouvrirRetour();
    await userEvent.click(screen.getByText(/Valider/));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(ecrituresOps()[0]).toMatchObject({ id: 'op4', statut: 'VISE_CF' });
    expect(ecrituresOps()[0].dateVisaCF).toBeTruthy();
  });

  // Règle métier : une ANNULATION visée n'est pas un OP payable. Elle est close
  // et archivée du même geste.
  test('une ANNULATION visée est clôturée, pas rendue payable', async () => {
    render(<PageCircuitCF />);
    await ouvrirRetour(['N° 0005/SP']);
    await userEvent.click(screen.getByText(/Valider/));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    const ecriture = ecrituresOps()[0];
    expect(ecriture).toMatchObject({ id: 'op5', statut: 'ANNULE' });
    expect(ecriture.dateArchivage).toBeTruthy();
  });

  test('un différé motivé enregistre la date et le motif', async () => {
    render(<PageCircuitCF />);
    await ouvrirRetour();
    await userEvent.click(screen.getByText('Différé'));
    await userEvent.type(screen.getByPlaceholderText(/Justification/), 'Facture absente');
    await userEvent.click(screen.getByText(/Valider/));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(ecrituresOps()[0]).toMatchObject({
      id: 'op4', statut: 'DIFFERE_CF', motifDiffere: 'Facture absente',
    });
  });

  // Un rejet ne se contente pas de marquer l'OP : il crée une écriture inverse,
  // pour que le budget engagé soit rendu.
  test('un rejet crée une écriture inverse du montant', async () => {
    render(<PageCircuitCF />);
    await ouvrirRetour();
    await userEvent.click(screen.getByText('Rejeté'));
    await userEvent.type(screen.getByPlaceholderText(/Justification/), 'Montant erroné');
    await userEvent.click(screen.getByText(/Valider/));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    expect(ecrituresOps()[0]).toMatchObject({ id: 'op4', statut: 'REJETE_CF', motifRejet: 'Montant erroné' });
    const clone = mockBatchSet.mock.calls[0][1];
    expect(clone).toMatchObject({ type: 'REJET', numero: 'N°0004/SP-R', opOriginalId: 'op4' });
    expect(clone.montant).toBe(-1000000);   // l'original valait +1 000 000
    expect(clone.id).toBeUndefined();       // le clone ne réutilise pas l'identifiant
  });
});

describe('Circuit CF — le suivi des différés et des rejets', () => {
  test('un différé est listé avec sa date et son motif', async () => {
    render(<PageCircuitCF />);
    await allerA('Suivi');
    expect(screen.getByText('08/03/2026')).toBeInTheDocument();
    expect(screen.getByText('Pièce manquante')).toBeInTheDocument();
  });

  test('un rejet est listé avec son motif', async () => {
    render(<PageCircuitCF />);
    await allerA('Suivi');
    await userEvent.click(screen.getByText('Rejetés'));
    expect(screen.getByText('Montant erroné')).toBeInTheDocument();
  });

  // Les deux gestes se ressemblent et ne font pas la même chose : la flèche
  // efface, « Réintroduire » conserve. L'infobulle doit le dire.
  test('la flèche d\'annulation annonce qu\'elle efface', async () => {
    render(<PageCircuitCF />);
    await allerA('Suivi');
    expect(screen.getByTitle(/Annuler le différé — efface la date et le motif/)).toBeInTheDocument();
  });

  test('l\'annulation d\'un différé prévient que tout sera effacé et propose l\'autre geste', async () => {
    render(<PageCircuitCF />);
    await allerA('Suivi');
    await userEvent.click(screen.getByTitle(/Annuler le différé/));
    expect(await screen.findByText(/DÉFINITIVEMENT EFFACÉS/)).toBeInTheDocument();
    expect(screen.getByText(/Réintroduire/)).toBeInTheDocument();
    expect(screen.getAllByText(/Pièce manquante/).length).toBeGreaterThan(1);  // dans le tableau ET dans l'avertissement
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('confirmer l\'annulation d\'un différé remet l\'OP à « transmis » et efface la trace', async () => {
    render(<PageCircuitCF />);
    await allerA('Suivi');
    await userEvent.click(screen.getByTitle(/Annuler le différé/));
    await confirmerAvecMotDePasse();
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
    expect(mockUpdateDoc.mock.calls[0][1]).toMatchObject({
      statut: 'TRANSMIS_CF', dateDiffere: null, motifDiffere: null,
    });
  });

  // Réintroduire, c'est retransmettre : la nouvelle date devient la date de
  // transmission au CF, et le différé passé rejoint l'historique.
  test('réintroduire conserve le différé dans l\'historique et redate la transmission', async () => {
    render(<PageCircuitCF />);
    await allerA('Suivi');
    await cocher('N° 0002/SP');
    await userEvent.click(boutonAction(/^Réintroduire \(1\)/));
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    const ecriture = ecrituresOps()[0];
    expect(ecriture.id).toBe('op2');
    expect(ecriture.statut).toBe('TRANSMIS_CF');
    expect(ecriture.dateTransmissionCF).toBe(ecriture.dateReintroduction);
    expect(ecriture.historiqueDifferes).toHaveLength(1);
    expect(ecriture.historiqueDifferes[0]).toMatchObject({ motifDiffere: 'Pièce manquante' });
    expect(ecriture.dateDiffere).toBeNull();
  });
});

// La ligne entière est cliquable, et la case à l'intérieur l'est aussi. Le clic
// sur la case remontait à la ligne, qui décochait aussitôt : cliquer la case ne
// faisait donc RIEN. Les deux gestes doivent cocher, et une seule fois.
describe('Circuit CF — cocher une ligne', () => {
  const ligneDe = (numero) => screen.getAllByRole('row').find(r => r.textContent.includes(numero));

  test('cliquer la case à cocher coche la ligne', async () => {
    render(<PageCircuitCF />);
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    expect(within(ligneDe('N° 0001/SP')).getByRole('checkbox')).toBeChecked();
  });

  test('cliquer ailleurs sur la ligne coche aussi', async () => {
    render(<PageCircuitCF />);
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByText('N° 0001/SP'));
    expect(within(ligneDe('N° 0001/SP')).getByRole('checkbox')).toBeChecked();
  });

  test('recliquer la case décoche', async () => {
    render(<PageCircuitCF />);
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    await userEvent.click(within(ligneDe('N° 0001/SP')).getByRole('checkbox'));
    expect(within(ligneDe('N° 0001/SP')).getByRole('checkbox')).not.toBeChecked();
  });
});

// ==================== ANNULER UN REJET ====================
// Annuler un rejet défaisait le rejet à moitié : l'OP d'origine repartait bien,
// mais son OP de rejet — le négatif qui le matérialise — restait en base, et
// continuait de figurer dans la liste des OP et dans le Rapport comme un rejet
// qui n'existe plus. Et la date comme le motif du rejet étaient effacés sans
// trace, alors qu'il n'existe aucun « Réintroduire » pour les rejets.
describe('Circuit CF — annuler un rejet', () => {
  const ouvrirAnnulationRejet = async () => {
    await allerA('Suivi');
    await userEvent.click(screen.getByText('Rejetés'));
    await userEvent.click(screen.getByTitle(/Annuler le rejet/));
  };

  test('l\'infobulle annonce ce que le geste fait vraiment', async () => {
    render(<PageCircuitCF />);
    await allerA('Suivi');
    await userEvent.click(screen.getByText('Rejetés'));
    expect(screen.getByTitle(/conserve la trace et met l'OP de rejet à la corbeille/)).toBeInTheDocument();
  });

  test('l\'avertissement annonce la trace conservée et le négatif supprimé', async () => {
    render(<PageCircuitCF />);
    await ouvrirAnnulationRejet();
    expect(await screen.findByText(/CONSERVÉ dans l'historique des rejets/)).toBeInTheDocument();
    expect(screen.getByText(/sera mis à la corbeille/)).toBeInTheDocument();
    expect(screen.getByText(/Il reste récupérable/)).toBeInTheDocument();
  });

  // Le mot de passe administrateur, comme pour restaurer un OP de la corbeille.
  test('sans mot de passe, rien n\'est écrit', async () => {
    render(<PageCircuitCF />);
    await ouvrirAnnulationRejet();
    await confirmer();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  test('un mauvais mot de passe refuse l\'annulation, et n\'écrit rien', async () => {
    render(<PageCircuitCF />);
    await ouvrirAnnulationRejet();
    await confirmerAvecMotDePasse('faux');
    expect(await refus('Erreur')).toBeInTheDocument();
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  // La demande de Carole : la date du rejet ne doit plus disparaître.
  test('le rejet est conservé dans l\'historique de l\'OP', async () => {
    render(<PageCircuitCF />);
    await ouvrirAnnulationRejet();
    await confirmerAvecMotDePasse();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    const ecriture = ecrituresOps().find(e => e.id === 'op6');
    expect(ecriture.statut).toBe('TRANSMIS_CF');
    expect(ecriture.historiqueRejets).toHaveLength(1);
    expect(ecriture.historiqueRejets[0]).toMatchObject({
      dateRejet: '2026-03-11', motifRejet: 'Montant erroné', dateAnnulation: aujourdhui, type: 'CF', parQui: 'Testeuse',
    });
    expect(ecriture.dateRejet).toBeNull();
    expect(ecriture.motifRejet).toBeNull();
  });

  // Le défaut lui-même : sans ce geste, un OP de −1 000 000 F reste dans les
  // listes comme le rejet d'un OP qui n'est plus rejeté.
  test('l\'OP de rejet part à la corbeille dans le même lot', async () => {
    render(<PageCircuitCF />);
    await ouvrirAnnulationRejet();
    await confirmerAvecMotDePasse();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    const negatif = ecrituresOps().find(e => e.id === 'op6r');
    expect(negatif).toMatchObject({ statut: 'SUPPRIME', supprimePar: 'Testeuse' });
    expect(negatif.motifSuppression).toMatch(/N°0006\/SP/);
  });

  // firestore.rules porte « allow delete: if false » sur ops : un lot qui tente
  // un delete est refusé EN ENTIER, et l'annulation échoue silencieusement.
  // C'est exactement ce qui s'est produit en test.
  test('aucune suppression n\'est tentée : les règles l\'interdisent', async () => {
    render(<PageCircuitCF />);
    await ouvrirAnnulationRejet();
    await confirmerAvecMotDePasse();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(mockBatchDelete).not.toHaveBeenCalled();
  });

  // Règle métier de Carole : l'OP d'origine reste sur son bordereau initial.
  // L'annulation du rejet ne doit pas y toucher non plus.
  test('le bordereau d\'origine n\'est pas touché', async () => {
    render(<PageCircuitCF />);
    await ouvrirAnnulationRejet();
    await confirmerAvecMotDePasse();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(ecrituresOps().find(e => e.id === 'op6')).not.toHaveProperty('bordereauCF');
  });

  // Un seul OP touché et un seul supprimé : le négatif d'un autre OP ne doit
  // jamais partir au passage.
  test('seuls l\'OP visé et son propre négatif sont écrits', async () => {
    render(<PageCircuitCF />);
    await ouvrirAnnulationRejet();
    await confirmerAvecMotDePasse();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(ecrituresOps().map(e => e.id).sort()).toEqual(['op6', 'op6r']);
  });
});

// ==================== RATTACHEMENT À UN BORDEREAU ====================
// Un OP sur un bordereau, c'est le même fait écrit à DEUX endroits : le
// bordereau liste l'OP, et l'OP porte le numéro du bordereau. Les deux doivent
// toujours concorder.
//
// Ces quatre gestes les écrivaient l'un après l'autre, en deux allers-retours
// séparés jusqu'à la base. Une panne entre les deux — réseau coupé, onglet
// fermé, refus de permission — laissait le premier écrit enregistré et le
// second perdu : le bordereau comptait un OP qui s'ignorait, l'OP restait dans
// la file d'attente et pouvait partir sur un SECOND bordereau. Compté deux fois.
//
// Un seul lot : la base applique les deux écritures, ou aucune.
describe('Circuit CF — bordereau et OP écrits ensemble', () => {
  const ouvrirLeBordereau = async () => {
    // getDocs sert à recharger les OP du bordereau à l'ouverture de la modale.
    // Son implémentation est remise à zéro avant chaque test : on la repose.
    mockGetDocs.mockImplementation(async () => ({
      docs: ops().map(o => ({ id: o.id, data: () => o })),
    }));
    await allerA('Bordereaux');
    await userEvent.click(screen.getByTitle('Modifier'));
    await screen.findByText(/Gestion Bordereau CF/);
  };

  test('ajouter un OP écrit le bordereau et l\'OP dans le même lot', async () => {
    render(<PageCircuitCF />);
    await ouvrirLeBordereau();
    await userEvent.click(screen.getAllByTitle('Ajouter')[0]);
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    const ecritures = mockBatchUpdate.mock.calls.map(([ref, data]) => ({ id: ref.id, cible: ref.cible, ...data }));
    expect(ecritures).toHaveLength(2);
    expect(ecritures.find(e => e.cible === 'bordereaux')).toMatchObject({ id: 'bt3', nbOps: 3 });
    expect(ecritures.find(e => e.cible === 'ops')).toMatchObject({ bordereauCF: 'BT-CF-0003/PIF2-SP/2026' });
  });

  // La garantie : aucune écriture isolée ne part à côté du lot.
  test('ajouter un OP ne fait aucune écriture hors du lot', async () => {
    render(<PageCircuitCF />);
    await ouvrirLeBordereau();
    await userEvent.click(screen.getAllByTitle('Ajouter')[0]);
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('retirer un OP écrit le bordereau et l\'OP dans le même lot', async () => {
    render(<PageCircuitCF />);
    await ouvrirLeBordereau();
    await userEvent.click(screen.getAllByTitle('Retirer')[0]);
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    const ecritures = mockBatchUpdate.mock.calls.map(([ref, data]) => ({ id: ref.id, cible: ref.cible, ...data }));
    expect(ecritures).toHaveLength(2);
    expect(ecritures.find(e => e.cible === 'bordereaux')).toMatchObject({ id: 'bt3', nbOps: 1 });
    expect(ecritures.find(e => e.cible === 'ops')).toMatchObject({ bordereauCF: null, statut: 'EN_COURS' });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  // Les OP portent le NUMÉRO du bordereau, pas son identifiant : renuméroter
  // oblige à réécrire chaque OP. Une panne en cours de route laissait une
  // partie des OP sur un numéro que plus aucun bordereau ne porte.
  test('renuméroter réécrit le bordereau et TOUS ses OP dans le même lot', async () => {
    render(<PageCircuitCF />);
    await ouvrirLeBordereau();
    const champ = screen.getByDisplayValue('BT-CF-0003/PIF2-SP/2026');
    await userEvent.clear(champ);
    await userEvent.type(champ, 'BT-CF-0009/PIF2-SP/2026');
    await userEvent.click(screen.getByText('Sauver'));
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    const ecritures = mockBatchUpdate.mock.calls.map(([ref, data]) => ({ id: ref.id, cible: ref.cible, ...data }));
    expect(ecritures).toHaveLength(3);   // le bordereau + ses deux OP
    expect(ecritures.filter(e => e.cible === 'ops').map(e => e.id).sort()).toEqual(['op4', 'op5']);
    expect(ecritures.every(e => e.cible !== 'ops' || e.bordereauCF === 'BT-CF-0009/PIF2-SP/2026')).toBe(true);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  // La date de transmission est recopiée sur chaque OP : c'est d'elle que
  // repart le décompte des délais dans le Rapport.
  test('corriger la date de transmission réécrit le bordereau et TOUS ses OP dans le même lot', async () => {
    render(<PageCircuitCF />);
    await ouvrirLeBordereau();
    const champ = screen.getByDisplayValue('2026-03-10');
    fireEvent.change(champ, { target: { value: '2026-03-16' } });
    await userEvent.click(screen.getByText('Sauver Date'));
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());

    const ecritures = mockBatchUpdate.mock.calls.map(([ref, data]) => ({ id: ref.id, cible: ref.cible, ...data }));
    expect(ecritures).toHaveLength(3);
    expect(ecritures.find(e => e.cible === 'bordereaux')).toMatchObject({ dateTransmission: '2026-03-16' });
    expect(ecritures.filter(e => e.cible === 'ops').every(e => e.dateTransmissionCF === '2026-03-16')).toBe(true);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

// Le bouton « Actualiser » a été retiré : il effaçait le bordereau des OP dont
// le bordereau n'était pas chargé en mémoire. Les OP et les bordereaux se
// chargeant exercice par exercice et INDÉPENDAMMENT, consulter un exercice clos
// suffisait à le faire effacer en bloc des rattachements parfaitement valides.
test('le bouton « Actualiser » n\'existe plus', async () => {
  render(<PageCircuitCF />);
  expect(screen.queryByText('Actualiser')).not.toBeInTheDocument();
});

// Un OP mis à la corbeille alors qu'il était sur un bordereau y restait
// compté : un fantôme. Consulter OP refuse désormais cette suppression, mais
// les fantômes d'avant doivent pouvoir être retirés des bordereaux — sans être
// ressuscités au passage, ce que faisait le statut rendu automatiquement.
describe('Circuit CF — retirer un OP à la corbeille', () => {
  const ouvrirAvecFantome = async () => {
    const liste = ops().map(o => o.id === 'op4' ? { ...o, statut: 'SUPPRIME' } : o);
    mockContexte.ops = liste;
    mockGetDocs.mockImplementation(async () => ({ docs: liste.map(o => ({ id: o.id, data: () => o })) }));
    render(<PageCircuitCF />);
    await allerA('Bordereaux');
    await userEvent.click(screen.getByTitle('Modifier'));
    await screen.findByText(/Gestion Bordereau CF/);
    await userEvent.click(screen.getAllByTitle('Retirer')[0]);
    await confirmer();
    await waitFor(() => expect(mockCommit).toHaveBeenCalled());
  };

  test('le retrait détache l\'OP du bordereau', async () => {
    await ouvrirAvecFantome();
    const ecriture = mockBatchUpdate.mock.calls.map(([ref, data]) => ({ id: ref.id, ...data })).find(e => e.id === 'op4');
    expect(ecriture).toMatchObject({ bordereauCF: null });
  });

  // La garantie : un OP à la corbeille retiré d'un bordereau Y RESTE.
  test('le retrait ne ressuscite pas un OP à la corbeille', async () => {
    await ouvrirAvecFantome();
    const ecriture = mockBatchUpdate.mock.calls.map(([ref, data]) => ({ id: ref.id, ...data })).find(e => e.id === 'op4');
    expect(ecriture).not.toHaveProperty('statut');
  });

  test('le bordereau est bien recalculé', async () => {
    await ouvrirAvecFantome();
    const bordereau = mockBatchUpdate.mock.calls.map(([ref, data]) => ({ id: ref.id, ...data })).find(e => e.id === 'bt3');
    expect(bordereau).toMatchObject({ nbOps: 1 });
  });
});
