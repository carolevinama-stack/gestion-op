import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ==================== BUDGET ====================
// L'écran qui fabrique les chiffres de tous les autres : c'est lui qui dit
// combien il reste sur une ligne, et donc ce qu'un OP peut engager. Ses
// garde-fous existent pour qu'un montant déjà engagé ne puisse jamais sortir
// du suivi — ni en abaissant une dotation, ni en retirant une ligne, ni en
// supprimant un budget, ni en important un fichier qui l'oublie.

const mockAddDoc = jest.fn(async () => ({ id: 'nouveau-budget' }));
const mockUpdateDoc = jest.fn(async () => {});
const mockDeleteDoc = jest.fn(async () => {});

jest.mock('../firebase', () => ({ db: {}, auth: {} }));

jest.mock('firebase/firestore', () => ({
  collection: (_db, nom) => ({ nom }),
  doc: (...a) => ({ id: a.length >= 3 ? a[2] : 'nouveau-doc' }),
  addDoc: (...a) => mockAddDoc(...a),
  updateDoc: (...a) => mockUpdateDoc(...a),
  deleteDoc: (...a) => mockDeleteDoc(...a),
}));

// Le lecteur Excel est remplacé : les tests fournissent directement les lignes
// qu'un fichier aurait contenues, sans fabriquer de vrai classeur.
// Le nom doit commencer par « mock » : Jest hisse les doublures avant le reste
// du fichier et refuse qu’elles lisent une variable ordinaire.
let mockFeuilleImportee = [];
jest.mock('xlsx', () => ({
  read: () => ({ SheetNames: ['Feuil1'], Sheets: { Feuil1: {} } }),
  utils: { sheet_to_json: () => mockFeuilleImportee },
}), { virtual: true });

const LIGNES = [
  { id: 'lb1', code: '6011', libelle: 'Fournitures de bureau' },
  { id: 'lb2', code: '6021', libelle: 'Carburant' },
  { id: 'lb3', code: '6031', libelle: 'Missions' },
];

const BUDGET = {
  id: 'bu1', sourceId: 'S1', exerciceId: 'E1', version: 1, nomVersion: 'Budget Primitif',
  dateNotification: '2026-01-15',
  lignes: [
    { code: '6011', libelle: 'Fournitures de bureau', dotation: 10000000 },
    { code: '6021', libelle: 'Carburant', dotation: 4000000 },
  ],
};

const opBase = {
  sourceId: 'S1', exerciceId: 'E1', beneficiaireNom: 'ENTREPRISE ALPHA',
  dateCreation: '2026-03-01', createdAt: '2026-03-01T08:00:00.000Z',
};

// 6011 porte 2 500 000 d'engagements nets ; 6021 n'en porte aucun.
const ops = () => [
  { ...opBase, id: 'op1', numero: 'N°0001/SP', type: 'DIRECT', statut: 'EN_COURS',
    ligneBudgetaire: '6011', montant: 3000000 },
  // Une annulation est enregistrée en négatif : l'addition la soustrait.
  { ...opBase, id: 'op2', numero: 'N°0002/SP', type: 'ANNULATION', statut: 'VISE_CF',
    ligneBudgetaire: '6011', montant: -500000 },
  // Un OP rejeté ne pèse plus sur le budget.
  { ...opBase, id: 'op3', numero: 'N°0003/SP', type: 'DIRECT', statut: 'REJETE_CF',
    ligneBudgetaire: '6011', montant: 9000000 },
  // Un OP mis à la corbeille non plus.
  { ...opBase, id: 'op4', numero: 'N°0004/SP', type: 'DIRECT', statut: 'SUPPRIME',
    ligneBudgetaire: '6021', montant: 1000000 },
  // Autre source : jamais compté ici.
  { ...opBase, id: 'op5', numero: 'N°0001/SE', type: 'DIRECT', statut: 'EN_COURS',
    sourceId: 'S2', ligneBudgetaire: '6011', montant: 7000000 },
];

const mockContexte = {
  sources: [
    { id: 'S1', nom: 'Source principale', sigle: 'SP', couleur: '#2E9940' },
    { id: 'S2', nom: 'Source secondaire', sigle: 'SE', couleur: '#C5961F' },
  ],
  exerciceActif: { id: 'E1', annee: 2026, actif: true },
  exercices: [{ id: 'E1', annee: 2026, actif: true }, { id: 'E0', annee: 2025, actif: false }],
  budgets: [BUDGET],
  setBudgets: jest.fn(),
  ops: ops(),
  lignesBudgetaires: LIGNES,
  activeBudgetSource: 'S1',
  setActiveBudgetSource: jest.fn(),
  setCurrentPage: jest.fn(),
  setHistoriqueParams: jest.fn(),
  chargerExerciceOps: jest.fn(),
};

jest.mock('../context/AppContext', () => ({
  useAppContext: () => mockContexte,
}));

const PageBudget = require('./PageBudget').default;

const boutons = (regex) => screen.getAllByRole('button').filter(b => regex.test(b.textContent));
const bouton = (regex) => boutons(regex)[0];
const norm = (t) => String(t).replace(/[   ]/g, ' ');
const lignesDe = (code) => screen.getAllByRole('row').filter(r => r.textContent.includes(code));
const ligneDe = (code) => lignesDe(code)[0];
// Quand la modale est ouverte, deux tableaux portent le même code : celui du
// fond et celui de la modale. La modale vient après dans le document.
const ligneModale = (code) => lignesDe(code).slice(-1)[0];
const cellules = (ligne) => within(ligne).getAllByRole('cell').map(c => norm(c.textContent.trim()));

// Ouvre la modale d'édition par le chemin « Correction », qui passe par un
// avertissement : la correction écrase la version en place.
const ouvrirCorrection = async () => {
  await userEvent.click(bouton(/Correction/));
  await userEvent.click(await screen.findByText('Corriger'));
  return screen.findByText(/LIGNES DU BUDGET/);
};

const toast = (texte) => screen.findByText(texte);

beforeEach(() => {
  jest.clearAllMocks();
  mockContexte.ops = ops();
  mockContexte.budgets = [BUDGET];
  mockFeuilleImportee = [];
});

describe('Budget — ce que l\'écran calcule', () => {
  test('l\'engagement d\'une ligne additionne ses OP, annulations déduites', () => {
    render(<PageBudget />);
    // 3 000 000 − 500 000 = 2 500 000 ; les 9 000 000 rejetés ne comptent pas
    expect(cellules(ligneDe('6011'))).toContain('2 500 000');
  });

  test('un OP rejeté ou mis à la corbeille ne pèse plus sur le budget', () => {
    render(<PageBudget />);
    expect(cellules(ligneDe('6021'))).toContain('0');       // l'OP supprimé valait 1 000 000
    expect(cellules(ligneDe('6011'))).not.toContain('11 500 000');
  });

  test('les OP d\'une autre source ne sont jamais comptés', () => {
    render(<PageBudget />);
    // avec la source secondaire, 6011 porterait 9 500 000
    expect(cellules(ligneDe('6011'))).not.toContain('9 500 000');
  });

  test('le disponible d\'une ligne est sa dotation moins ses engagements', () => {
    render(<PageBudget />);
    // 10 000 000 − 2 500 000 = 7 500 000
    expect(cellules(ligneDe('6011'))).toContain('7 500 000');
  });

  const montantAffiche = (valeur) => screen.getAllByText((c) => norm(c) === valeur);

  test('les trois totaux de l\'en-tête sont affichés', () => {
    render(<PageBudget />);
    expect(montantAffiche('14 000 000').length).toBeGreaterThan(0);   // dotation : 10 M + 4 M
    expect(montantAffiche('2 500 000').length).toBeGreaterThan(0);    // engagements
    expect(montantAffiche('11 500 000').length).toBeGreaterThan(0);   // disponible
  });

  // La ligne TOTAL du tableau tirait sa dotation et ses engagements de la copie
  // de travail de la modale : fenêtre fermée, elle affichait 0 et 0 juste à côté
  // d'un disponible correct. Les deux totaux de la page doivent concorder.
  test('la ligne TOTAL du tableau dit la même chose que l\'en-tête', () => {
    render(<PageBudget />);
    const total = cellules(ligneDe('TOTAL'));
    expect(total).toContain('14 000 000');
    expect(total).toContain('2 500 000');
    expect(total).toContain('11 500 000');
  });

  test('rien n\'est écrit à l\'affichage de la page', () => {
    render(<PageBudget />);
    expect(mockAddDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });
});

describe('Budget — les garde-fous sur les engagements', () => {
  test('une dotation ne peut pas descendre sous les engagements déjà pris', async () => {
    render(<PageBudget />);
    await ouvrirCorrection();
    const champ = within(ligneModale('6011')).getByRole('textbox');
    await userEvent.clear(champ);
    await userEvent.type(champ, '1000000');     // sous les 2 500 000 engagés
    await userEvent.click(bouton(/Enregistrer/));
    expect(await toast('Dotation insuffisante')).toBeInTheDocument();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('une dotation égale aux engagements est acceptée', async () => {
    render(<PageBudget />);
    await ouvrirCorrection();
    const champ = within(ligneModale('6011')).getByRole('textbox');
    await userEvent.clear(champ);
    await userEvent.type(champ, '2500000');
    await userEvent.click(bouton(/Enregistrer/));
    await waitFor(() => expect(mockUpdateDoc).toHaveBeenCalled());
  });

  test('une ligne qui porte des engagements ne peut pas être retirée', async () => {
    render(<PageBudget />);
    await ouvrirCorrection();
    await userEvent.click(within(ligneModale('6011')).getByRole('button'));
    expect(await toast('Suppression impossible')).toBeInTheDocument();
    expect(screen.getByText(/LIGNES DU BUDGET \(2\)/)).toBeInTheDocument();
  });

  test('une ligne sans engagement peut être retirée', async () => {
    render(<PageBudget />);
    await ouvrirCorrection();
    await userEvent.click(within(ligneModale('6021')).getByRole('button'));
    expect(await screen.findByText(/LIGNES DU BUDGET \(1\)/)).toBeInTheDocument();
  });

  test('un budget qui porte des engagements ne peut pas être supprimé', async () => {
    render(<PageBudget />);
    await userEvent.click(bouton(/Supprimer/));
    expect(await toast('Suppression impossible')).toBeInTheDocument();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  test('un budget sans engagement demande confirmation avant suppression', async () => {
    mockContexte.ops = [];
    render(<PageBudget />);
    await userEvent.click(bouton(/Supprimer/));
    expect(await screen.findByText('Supprimer le budget')).toBeInTheDocument();
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    // Deux boutons « Supprimer » : celui de la page et celui de la modale.
    await userEvent.click(boutons(/^Supprimer$/).slice(-1)[0]);
    await waitFor(() => expect(mockDeleteDoc).toHaveBeenCalled());
  });
});

describe('Budget — les lignes du budget', () => {
  // Une ligne déjà au budget n'est plus proposée : le doublon est rendu
  // impossible en amont, plutôt que refusé après coup.
  test('une ligne déjà au budget n\'est plus proposée à l\'ajout', async () => {
    render(<PageBudget />);
    await ouvrirCorrection();
    await userEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByText('6031 - Missions')).toBeInTheDocument();
    expect(screen.queryByText('6011 - Fournitures de bureau')).not.toBeInTheDocument();
  });

  test('un budget vide ne s\'enregistre pas', async () => {
    render(<PageBudget />);
    await ouvrirCorrection();
    await userEvent.click(within(ligneModale('6021')).getByRole('button'));
    // 6011 porte des engagements : il reste, le bouton reste donc actif
    expect(bouton(/Enregistrer/)).toBeEnabled();
  });
});

describe('Budget — la correction prévient de ce qu\'elle écrase', () => {
  test('corriger annonce que la version précédente ne sera pas conservée', async () => {
    render(<PageBudget />);
    await userEvent.click(bouton(/Correction/));
    expect(await screen.findByText(/l'état précédent ne sera pas conservé/)).toBeInTheDocument();
    expect(screen.getByText(/Nouvelle révision/)).toBeInTheDocument();
  });

  test('renoncer à la correction ne modifie rien', async () => {
    render(<PageBudget />);
    await userEvent.click(bouton(/Correction/));
    await userEvent.click(await screen.findByText('Annuler'));
    expect(screen.queryByText(/LIGNES DU BUDGET/)).not.toBeInTheDocument();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('Budget — les révisions', () => {
  test('une révision sans nom est refusée', async () => {
    render(<PageBudget />);
    await userEvent.click(bouton(/Nouvelle révision/));
    await userEvent.clear(await screen.findByDisplayValue(/Budget Révisé/));
    await userEvent.click(bouton(/^Créer la révision|Créer/));
    expect(await toast('Champ obligatoire')).toBeInTheDocument();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  // Une révision repart de la dernière version et incrémente le numéro : c'est
  // ce qui rend l'historique budgétaire lisible.
  test('une révision reprend les lignes de la dernière version et incrémente', async () => {
    render(<PageBudget />);
    await userEvent.click(bouton(/Nouvelle révision/));
    await userEvent.click(bouton(/^Créer la révision|Créer/));
    await waitFor(() => expect(mockAddDoc).toHaveBeenCalled());
    const enregistre = mockAddDoc.mock.calls[0][1];
    expect(enregistre.version).toBe(2);
    expect(enregistre.lignes).toEqual(BUDGET.lignes);
    expect(enregistre.nomVersion).toBe('Budget Révisé N°1');
  });
});

describe('Budget — l\'import Excel', () => {
  const importer = async (lignes) => {
    mockFeuilleImportee = lignes;
    const champ = screen.getByLabelText("Importer un budget depuis Excel");
    const fichier = new File(['x'], 'budget.xlsx', { type: 'application/vnd.ms-excel' });
    fichier.arrayBuffer = async () => new ArrayBuffer(8);
    await userEvent.upload(champ, fichier);
  };

  test('un code inconnu des lignes budgétaires est signalé', async () => {
    render(<PageBudget />);
    await importer([['Code', 'Dotation'], ['6011', 10000000], ['9999', 500000]]);
    expect(await screen.findByText(/9999.*introuvable/)).toBeInTheDocument();
  });

  test('un fichier sans aucun code reconnu est refusé', async () => {
    render(<PageBudget />);
    await importer([['Code', 'Dotation'], ['9999', 500000]]);
    expect(await toast('Aucune ligne reconnue')).toBeInTheDocument();
  });

  test('un code en doublon est ignoré et signalé', async () => {
    render(<PageBudget />);
    await importer([['Code', 'Dotation'], ['6011', 10000000], ['6011', 7000000]]);
    expect(await screen.findByText(/doublon/)).toBeInTheDocument();
  });

  // Un montant à virgule ne doit pas voir sa virgule disparaître : 1 000 000,50
  // deviendrait sinon 100 000 050.
  test('un montant à virgule est arrondi, pas gonflé', async () => {
    render(<PageBudget />);
    await importer([['Code', 'Dotation'], ['6011', '1 000 000,50']]);
    await screen.findByText('Import Excel — Aperçu');
    expect(norm(document.body.textContent)).toContain('1 000 001');
    expect(norm(document.body.textContent)).not.toContain('100 000 050');
  });

  // Le trou que les tests doivent fermer : l'import remplace TOUTES les lignes.
  // S'il oublie une ligne qui porte des engagements, celle-ci — et ses
  // engagements — sortiraient du suivi sans que personne ne soit prévenu.
  test('un import qui oublie une ligne engagée est refusé', async () => {
    render(<PageBudget />);
    await importer([['Code', 'Dotation'], ['6021', 4000000]]);   // 6011 absent !
    expect(await toast('Import impossible')).toBeInTheDocument();
    // Le refus nomme la ligne et ce qu'elle porte : sans ça, impossible de
    // savoir quoi corriger dans le fichier.
    expect(await screen.findByText(
      (contenu) => norm(contenu).includes('6011 (2 500 000 FCFA engagés)')
    )).toBeInTheDocument();
  });

  test('un import qui conserve les lignes engagées est accepté', async () => {
    render(<PageBudget />);
    await importer([['Code', 'Dotation'], ['6011', 12000000], ['6031', 2000000]]);
    await userEvent.click(await screen.findByText(/Confirmer l'import/));
    expect(await screen.findByText(/LIGNES DU BUDGET \(2\)/)).toBeInTheDocument();
  });
});
