import {
  refusFichierLogo, refusImageEnregistree, poidsEncode,
  TAILLE_MAX_FICHIER, TAILLE_MAX_ENREGISTREE,
} from './imageLogo';

// ==================== EMBLÈMES CHOISIS DEPUIS L'ÉCRAN ====================
// Les emblèmes sont rangés dans le document des paramètres, que la base limite
// à 1 Mo et que l'application relit à chaque ouverture. Une photo déposée sans
// contrôle ferait échouer l'enregistrement — ou ralentirait tout le monde tous
// les jours. Ces refus arrivent donc AVANT l'écriture, et ils se lisent.

const fichier = (type, taille) => ({ type, size: taille, name: 'image' });

describe('Emblèmes — ce qui est refusé, et pourquoi on le dit', () => {
  test('un format non reconnu est refusé, avec les formats acceptés', () => {
    const refus = refusFichierLogo(fichier('application/pdf', 1000));
    expect(refus).toMatch(/PNG, JPEG ou WEBP/);
  });

  test('un fichier trop lourd est refusé avant toute lecture', () => {
    expect(refusFichierLogo(fichier('image/png', TAILLE_MAX_FICHIER + 1))).toMatch(/trop lourde/);
  });

  test('une image ordinaire est acceptée', () => {
    expect(refusFichierLogo(fichier('image/png', 300 * 1024))).toBeNull();
    expect(refusFichierLogo(fichier('image/jpeg', 2 * 1024 * 1024))).toBeNull();
  });

  test('aucun fichier : on le dit plutôt que de ne rien faire', () => {
    expect(refusFichierLogo(null)).toMatch(/Aucun fichier/);
  });
});

describe('Emblèmes — le poids réellement enregistré', () => {
  // L'encodage en texte ajoute un tiers : c'est ce poids-là qui compte pour la
  // limite de la base, pas celui du fichier d'origine.
  test('le poids est mesuré sur l\'image encodée, en-tête exclu', () => {
    const corps = 'A'.repeat(4000); // 4000 caractères = 3000 octets
    expect(poidsEncode('data:image/png;base64,' + corps)).toBe(3000);
  });

  test('une image absente ne pèse rien', () => {
    expect(poidsEncode(null)).toBe(0);
    expect(poidsEncode('')).toBe(0);
  });

  // Après réduction, une image peut rester trop lourde : une photo détaillée,
  // par exemple. On refuse en disant quoi faire.
  test('au-delà de la limite, le refus propose une solution', () => {
    const trop = 'data:image/png;base64,' + 'A'.repeat(Math.ceil(TAILLE_MAX_ENREGISTREE * 4 / 3) + 100);
    expect(refusImageEnregistree(trop)).toMatch(/logo plutôt qu'une photo/);
  });

  test('une image réduite normale passe', () => {
    expect(refusImageEnregistree('data:image/png;base64,' + 'A'.repeat(20000))).toBeNull();
  });
});
