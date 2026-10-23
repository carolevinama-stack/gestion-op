import { construireLigneExportOp, formatDateExport } from './exportOp';

// Cette définition sert à DEUX boutons : l'export de la Liste OP et la
// sauvegarde Excel complète des Paramètres. La feuille OP de la sauvegarde
// n'avait que 12 colonnes et perdait tout le circuit — bordereaux, dates de
// visa et de transmission, paiements, motifs, archivage.

const opComplet = () => ({
  numero: 'N°0042/PIF2-BM/2026',
  type: 'DIRECT',
  statut: 'PAYE',
  dateCreation: '2026-03-01',
  beneficiaireNom: 'ENTREPRISE ALPHA',
  objet: 'Achat de ramettes',
  ligneBudgetaire: '6011',
  dotationFigee: 10000000,
  montant: 250000,
  modeReglement: 'VIREMENT',
  montantTVA: 45000,
  bordereauCF: 'BT-CF-0003/PIF2-BM/2026',
  dateTransmissionCF: '2026-03-10',
  dateVisaCF: '2026-03-12',
  bordereauAC: 'BT-AC-0001/PIF2-BM/2026',
  dateTransmissionAC: '2026-03-15',
  paiements: [
    { montant: 150000, reference: 'VIR-10', date: '2026-04-01' },
    { montant: 50000, reference: 'VIR-11', date: '2026-04-20' },
  ],
  dateArchivage: '2026-05-02',
  boiteArchivage: 'BOITE-07',
});

describe('construireLigneExportOp — tout le circuit de l\'OP', () => {
  test('le circuit CF est repris en entier', () => {
    const l = construireLigneExportOp(opComplet());
    expect(l['N° Bordereau CF']).toBe('BT-CF-0003/PIF2-BM/2026');
    expect(l['Date transmission CF']).toBe('10/03/2026');
    expect(l['Date visa CF']).toBe('12/03/2026');
  });

  test('le circuit AC est repris en entier', () => {
    const l = construireLigneExportOp(opComplet());
    expect(l['N° Bordereau AC']).toBe('BT-AC-0001/PIF2-BM/2026');
    expect(l['Date transmission AC']).toBe('15/03/2026');
  });

  // Les paiements sont une liste dans l'OP : ils doivent devenir des colonnes
  // lisibles, pas disparaître.
  test('les paiements donnent le total, le solde, les références et les dates', () => {
    const l = construireLigneExportOp(opComplet());
    expect(l['Montant total payé']).toBe(200000);
    expect(l['Solde restant']).toBe(50000);
    expect(l['Références paiement']).toBe('VIR-10, VIR-11');
    expect(l['Dates paiement']).toBe('01/04/2026, 20/04/2026');
  });

  test('l\'archivage est repris', () => {
    const l = construireLigneExportOp(opComplet());
    expect(l['Date archivage']).toBe('02/05/2026');
    expect(l['Référence boîte']).toBe('BOITE-07');
  });

  test('un OP sans paiement donne un solde égal au montant', () => {
    const l = construireLigneExportOp({ montant: 250000 });
    expect(l['Montant total payé']).toBe(0);
    expect(l['Solde restant']).toBe(250000);
  });

  // Le motif affiché est celui qui s'applique : rejet d'abord, différé sinon.
  test('le motif de rejet prime sur celui du différé', () => {
    expect(construireLigneExportOp({ motifRejet: 'Facture non conforme', motifDiffere: 'Crédit insuffisant' })['Motif CF'])
      .toBe('Facture non conforme');
    expect(construireLigneExportOp({ motifDiffere: 'Crédit insuffisant' })['Motif CF'])
      .toBe('Crédit insuffisant');
  });

  test('un OP vide ne fait pas échouer l\'export', () => {
    const l = construireLigneExportOp({});
    expect(l['N° OP']).toBe('');
    expect(l['Montant']).toBe(0);
    expect(Object.keys(l)).toHaveLength(26);
  });

  test('le nom du bénéficiaire fourni prime sur celui enregistré dans l\'OP', () => {
    expect(construireLigneExportOp(opComplet(), { beneficiaireNom: 'NOM À JOUR' })['Bénéficiaire'])
      .toBe('NOM À JOUR');
  });
});

// Une date écrite « 2026-03-01 » repassée par new Date() recule d'un jour dans
// les fuseaux à l'ouest de Greenwich. Le découpage de chaîne l'évite.
describe('formatDateExport', () => {
  test('une date ISO est rendue en jour/mois/année, sans décalage', () => {
    expect(formatDateExport('2026-03-01')).toBe('01/03/2026');
    expect(formatDateExport('2026-01-01T00:00:00.000Z')).toBe('01/01/2026');
  });

  test('une date absente donne une cellule vide, pas « Invalid Date »', () => {
    expect(formatDateExport(null)).toBe('');
    expect(formatDateExport(undefined)).toBe('');
    expect(formatDateExport('')).toBe('');
  });

  test('une valeur inattendue est rendue telle quelle', () => {
    expect(formatDateExport('à venir')).toBe('à venir');
  });
});
