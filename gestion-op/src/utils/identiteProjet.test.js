import { buildOpPrintHtml } from './opPrint';
import { buildBordereauPrintHtml } from './bordereauPrint';
import { identiteProjet, PAYS_DEFAUT, DEVISE_DEFAUT } from './identiteProjet';
import { escapeHtml, formatMontant } from './formatters';
import { LOGO_PIF2, ARMOIRIE } from './logos';

// ==================== IDENTITÉ DE LA STRUCTURE ====================
// Ce qui désigne la structure sur un document imprimé — en-tête officiel,
// emblèmes, signataire, référence du financement — était écrit dans le code, au
// nom du PIF2. Ces valeurs viennent maintenant des paramètres, ce qui permet
// d'installer l'application pour une autre structure sans toucher au code.
//
// Deux exigences, de sens contraire, tiennent ces tests :
//   - l'installation en service ne doit RIEN voir changer sur ses documents ;
//   - une autre structure ne doit RIEN garder du PIF2 sur les siens.

const AUTRE_STRUCTURE = {
  pays: 'République du Sénégal',
  devise: 'Un Peuple – Un But – Une Foi',
  ministere: "MINISTÈRE DE L'ENVIRONNEMENT",
  nomProjet: 'PROJET FORESTIER DU SÉNÉGAL',
  coordonnateur: 'NDIAYE Fatou',
  titreCoordonnateur: 'LA DIRECTRICE',
  referenceFinancement: 'Financement BAD : Projet N° 2024-SN',
  logo: 'data:image/png;base64,AUTRELOGO',
  armoirie: 'data:image/png;base64,AUTREARMOIRIE',
};

const opDe = (projet) => buildOpPrintHtml({
  selectedOp: { numero: '0042', type: 'DIRECT', objet: 'Achat', piecesJustificatives: 'F12', ligneBudgetaire: 'L1', modeReglement: 'VIREMENT' },
  ben: { nom: 'ENTREPRISE ALPHA' }, src: { sigle: 'IDA', codeImputation: '21' },
  projet, exerciceActif: { annee: 2026 }, selectedRib: { numero: 'CI1', banque: 'BICICI' },
  engAnterieurs: 0, engActuel: 250000, dotation: 1000000,
  formatMontant, escapeHtml, LOGO_PIF2, ARMOIRIE,
});

const bordereauDe = (projet) => buildBordereauPrintHtml({
  bt: { numero: 'BT-01', opsIds: ['op1'], totalMontant: 250000, observations: '' },
  ops: [{ id: 'op1', numero: '0042', type: 'DIRECT', objet: 'Achat', montant: 250000 }],
  getBen: () => 'ENTREPRISE ALPHA',
  projet, montantEnLettres: () => 'deux cent cinquante mille',
  escapeHtml, LOGO_PIF2, ARMOIRIE, type: 'CF',
});

describe('Identité de la structure — l\'installation en service ne change pas', () => {
  // Les paramètres du PIF2 n'ont pas forcément ces champs enregistrés. Sans
  // eux, les documents doivent sortir exactement comme avant.
  test('sans paramètres, l\'OP garde l\'en-tête et les emblèmes d\'origine', () => {
    const html = opDe({ ministere: 'MINEF', nomProjet: 'PIF2' });
    expect(html).toContain(escapeHtml(PAYS_DEFAUT));
    expect(html).toContain(escapeHtml(DEVISE_DEFAUT));
    expect(html).toContain(LOGO_PIF2);
    expect(html).toContain(ARMOIRIE);
  });

  test('sans paramètres, le bordereau aussi', () => {
    const html = bordereauDe({ ministere: 'MINEF', nomProjet: 'PIF2' });
    expect(html).toContain(escapeHtml(PAYS_DEFAUT));
    expect(html).toContain(escapeHtml(DEVISE_DEFAUT));
  });

  // Le pays est saisi en minuscules dans les paramètres et imprimé en
  // capitales, comme l'exige l'en-tête officiel.
  test('le pays est imprimé en capitales, quelle que soit la saisie', () => {
    expect(identiteProjet({ pays: "république du Mali" }).pays).toBe('RÉPUBLIQUE DU MALI');
  });
});

describe('Identité de la structure — une autre structure ne garde rien du PIF2', () => {
  test('l\'OP porte le pays, la devise et les emblèmes de la structure', () => {
    const html = opDe(AUTRE_STRUCTURE);
    expect(html).toContain('RÉPUBLIQUE DU SÉNÉGAL');
    expect(html).toContain('Un Peuple – Un But – Une Foi');
    expect(html).toContain('AUTRELOGO');
    expect(html).toContain('AUTREARMOIRIE');
    expect(html).not.toContain('CÔTE D');
    expect(html).not.toContain('Discipline');
    expect(html).not.toContain(LOGO_PIF2);
  });

  test('le bordereau aussi, référence du financement comprise', () => {
    const html = bordereauDe(AUTRE_STRUCTURE);
    expect(html).toContain('RÉPUBLIQUE DU SÉNÉGAL');
    expect(html).toContain('Financement BAD : Projet N° 2024-SN');
    expect(html).not.toContain('TF088829-CI');
    expect(html).not.toContain('CÔTE D');
  });

  test('le signataire est celui de la structure, titre compris', () => {
    const html = opDe(AUTRE_STRUCTURE);
    expect(html).toContain('NDIAYE Fatou');
    expect(html).toContain('LA DIRECTRICE');
  });
});

// Le cas qui justifie à lui seul ce travail : un document qui engage ne doit
// jamais porter le nom d'une personne d'une autre structure. Un emplacement
// vide se voit ; un nom emprunté ne se voit pas.
describe('Identité de la structure — le signataire n\'a pas de valeur de repli', () => {
  test('sans signataire enregistré, l\'emplacement reste vide', () => {
    const html = opDe({ nomProjet: 'UNE AUTRE STRUCTURE' });
    expect(html).not.toContain('ABE-KOFFI');
    expect(html).not.toContain('LA COORDONNATRICE');
  });

  test('et sur le bordereau également', () => {
    const html = bordereauDe({ nomProjet: 'UNE AUTRE STRUCTURE' });
    expect(html).not.toContain('ABE-KOFFI');
    expect(html).not.toContain('COORDONNATRICE DU PIF');
  });

  test('identiteProjet ne fabrique jamais de nom', () => {
    expect(identiteProjet({}).signataire).toBe('');
    expect(identiteProjet(null).signataire).toBe('');
  });
});
