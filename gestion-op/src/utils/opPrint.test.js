import { buildOpPrintHtml } from './opPrint';
import { escapeHtml, formatMontant } from './formatters';

// ==================== GABARIT D'IMPRESSION DE L'OP ====================
// Le même document sert deux usages : la fenêtre d'impression, et le panneau
// d'aperçu affiché dans l'application. Ce qui les sépare tient à l'option
// `integre`, et c'est elle qui est vérifiée ici — notamment le fait que le
// panneau ne propose pas d'imprimer un OP qui n'existe pas encore en base.

const parametres = (extra = {}) => ({
  selectedOp: {
    numero: '0042', type: 'DIRECT', objet: 'Achat de ramettes',
    piecesJustificatives: 'Facture 12', ligneBudgetaire: 'L1', modeReglement: 'VIREMENT',
  },
  ben: { nom: 'ENTREPRISE ALPHA' },
  src: { sigle: 'IDA', codeImputation: '21' },
  projet: { nomProjet: 'PIF2', ministere: 'MINEF', codeImputation: '513' },
  exerciceActif: { annee: 2026 },
  selectedRib: { numero: 'CI0001', banque: 'BICICI' },
  engAnterieurs: 100000, engActuel: 250000, dotation: 10000000,
  formatMontant, escapeHtml, LOGO_PIF2: '', ARMOIRIE: '',
  ...extra,
});

describe('Gabarit d\'impression — la barre d\'outils du document', () => {
  // La fenêtre d'impression n'a pas d'autre commande : la barre du document
  // est le seul endroit où cliquer pour imprimer.
  test('la fenêtre d\'impression garde ses boutons Imprimer et Exporter PDF', () => {
    const html = buildOpPrintHtml(parametres());
    expect(html).toContain('window.print()');
    expect(html).toContain('>Imprimer<');
  });

  // Dans le panneau de Nouvel OP, le document affiché est un aperçu : l'OP
  // n'est pas enregistré et son numéro est provisoire. Un bouton Imprimer dans
  // le document laisserait sortir un papier portant un numéro non attribué.
  test('le panneau intégré ne propose pas d\'imprimer depuis le document', () => {
    const html = buildOpPrintHtml(parametres({ integre: true }));
    expect(html).not.toContain('window.print()');
    expect(html).not.toContain('class="toolbar"');
  });

  // La page fait 200 mm de large, soit plus qu'un panneau latéral : sans
  // réduction, le document se lirait à l'horizontale, à la barre de défilement.
  test('le panneau intégré réduit la page pour la faire tenir', () => {
    const html = buildOpPrintHtml(parametres({ integre: true }));
    expect(html).toContain('zoom');
    // La réduction ne vaut qu'à l'écran : le papier reste au format A4.
    expect(html).toContain('@media screen and (max-width: 820px)');
    expect(html).toContain('@page { size: A4 portrait');
  });

  test('la fenêtre d\'impression, elle, n\'est pas réduite', () => {
    expect(buildOpPrintHtml(parametres())).not.toContain('zoom');
  });

  // Les deux usages affichent bien le même document.
  test('le contenu de l\'OP est le même dans les deux cas', () => {
    const fenetre = buildOpPrintHtml(parametres());
    const panneau = buildOpPrintHtml(parametres({ integre: true }));
    ['0042', 'ENTREPRISE ALPHA', 'Achat de ramettes', 'BICICI'].forEach(attendu => {
      expect(fenetre).toContain(attendu);
      expect(panneau).toContain(attendu);
    });
  });
});
