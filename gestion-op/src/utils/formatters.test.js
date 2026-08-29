import {
  escapeHtml,
  sanitizeForExport,
  formatMontant,
  formatNumeroOp,
  formatDate,
  montantEnLettres,
} from './formatters';

describe('escapeHtml', () => {
  test('échappe les caractères HTML spéciaux', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });

  test("échappe l'esperluette et l'apostrophe", () => {
    expect(escapeHtml(`Tom & Jerry's`)).toBe('Tom &amp; Jerry&#39;s');
  });

  test('gère null/undefined sans planter', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('sanitizeForExport', () => {
  test('préfixe une apostrophe si le texte commence par = + - @', () => {
    expect(sanitizeForExport('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(sanitizeForExport('+1234')).toBe("'+1234");
    expect(sanitizeForExport('-1234')).toBe("'-1234");
    expect(sanitizeForExport('@user')).toBe("'@user");
  });

  test('laisse le texte normal inchangé', () => {
    expect(sanitizeForExport('Bonjour')).toBe('Bonjour');
  });

  test('gère null/undefined sans planter', () => {
    expect(sanitizeForExport(null)).toBe('');
  });
});

describe('formatMontant', () => {
  test('formate un nombre avec séparateur de milliers français', () => {
    expect(formatMontant(1000)).toBe('1 000');
    expect(formatMontant(1500000)).toBe('1 500 000');
  });

  test('formate zéro/null/undefined comme 0', () => {
    expect(formatMontant(0)).toBe('0');
    expect(formatMontant(null)).toBe('0');
    expect(formatMontant(undefined)).toBe('0');
  });
});

describe('formatNumeroOp', () => {
  test('ajoute un espace après "N°" quand absent', () => {
    expect(formatNumeroOp('N°0001/2026/PIF2')).toBe('N° 0001/2026/PIF2');
  });

  test("ne double pas l'espace si déjà présent", () => {
    expect(formatNumeroOp('N° 0001/2026/PIF2')).toBe('N° 0001/2026/PIF2');
  });

  test('gère null/undefined sans planter', () => {
    expect(formatNumeroOp(null)).toBe('');
    expect(formatNumeroOp(undefined)).toBe('');
  });
});

describe('formatDate', () => {
  test('formate une date JS en format français', () => {
    expect(formatDate(new Date(2026, 0, 15))).toBe('15/01/2026');
  });

  test('formate un Timestamp Firestore (objet avec toDate())', () => {
    const fakeTimestamp = { toDate: () => new Date(2026, 5, 3) };
    expect(formatDate(fakeTimestamp)).toBe('03/06/2026');
  });

  test('retourne une chaîne vide si aucune date', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
  });
});

describe('montantEnLettres', () => {
  test.each([
    [0, 'zéro'],
    [1, 'un'],
    [15, 'quinze'],
    [21, 'vingt et un'],
    [71, 'soixante et onze'],
    [80, 'quatre-vingts'],
    [90, 'quatre-vingt-dix'],
    [91, 'quatre-vingt-onze'],
    [99, 'quatre-vingt-dix-neuf'],
    [100, 'cent'],
    [101, 'cent un'],
    [200, 'deux cents'],
    [1000, 'mille'],
    [2000, 'deux mille'],
    [1500000, 'un million cinq cents mille'],
    [123456789, 'cent vingt-trois millions quatre cent cinquante-six mille sept cent quatre-vingt-neuf'],
    [-123, 'moins cent vingt-trois'],
    [-1500, 'moins mille cinq cents'],
  ])('convertit %i en "%s"', (n, expected) => {
    expect(montantEnLettres(n)).toBe(expected);
  });
});
