// ==================== IMAGES D'IDENTITÉ (LOGO, ARMOIRIE) ====================
// Les emblèmes choisis dans Paramètres sont rangés avec le reste des paramètres
// du projet, dans la base, encodés en texte. C'est ce qui permet de changer de
// structure sans toucher au code — mais cela impose deux garde-fous.
//
// 1. Un document de la base ne peut pas dépasser 1 Mo. Une photo prise au
//    téléphone en fait plusieurs : on la réduit avant de l'enregistrer, et on
//    refuse ce qui reste trop lourd plutôt que de laisser l'enregistrement
//    échouer avec un message incompréhensible.
// 2. Ces paramètres sont relus à chaque ouverture de l'application. Une image
//    lourde ralentirait tout le monde, tous les jours.

export const TYPES_ACCEPTES = ['image/png', 'image/jpeg', 'image/webp'];
export const TAILLE_MAX_FICHIER = 5 * 1024 * 1024; // avant réduction
export const TAILLE_MAX_ENREGISTREE = 220 * 1024;  // après réduction
export const COTE_MAX = 480; // pixels

// Refus lisibles, décidés avant toute lecture du fichier.
export const refusFichierLogo = (fichier) => {
  if (!fichier) return 'Aucun fichier choisi.';
  if (!TYPES_ACCEPTES.includes(fichier.type)) return 'Format non reconnu : choisissez une image PNG, JPEG ou WEBP.';
  if (fichier.size > TAILLE_MAX_FICHIER) return 'Image trop lourde : choisissez un fichier de moins de 5 Mo.';
  return null;
};

// Poids réel de l'image une fois encodée en texte : 4 caractères pour 3 octets.
export const poidsEncode = (dataUrl) => {
  if (!dataUrl) return 0;
  const virgule = dataUrl.indexOf(',');
  const corps = virgule === -1 ? dataUrl : dataUrl.slice(virgule + 1);
  return Math.floor(corps.length * 3 / 4);
};

export const refusImageEnregistree = (dataUrl) =>
  poidsEncode(dataUrl) > TAILLE_MAX_ENREGISTREE
    ? "Image encore trop lourde après réduction : choisissez une image plus simple, ou un logo plutôt qu'une photo."
    : null;

// Réduction côté navigateur : l'image n'est jamais envoyée ailleurs pour être
// transformée. Le PNG est conservé pour les logos à fond transparent, que le
// JPEG noircirait.
export const reduireImage = (fichier, coteMax = COTE_MAX) => new Promise((resoudre, rejeter) => {
  const lecteur = new FileReader();
  lecteur.onerror = () => rejeter(new Error('Lecture du fichier impossible.'));
  lecteur.onload = () => {
    const image = new Image();
    image.onerror = () => rejeter(new Error("Ce fichier n'est pas une image lisible."));
    image.onload = () => {
      const facteur = Math.min(1, coteMax / Math.max(image.width, image.height));
      const largeur = Math.max(1, Math.round(image.width * facteur));
      const hauteur = Math.max(1, Math.round(image.height * facteur));
      const toile = document.createElement('canvas');
      toile.width = largeur;
      toile.height = hauteur;
      toile.getContext('2d').drawImage(image, 0, 0, largeur, hauteur);
      const transparence = fichier.type === 'image/png' || fichier.type === 'image/webp';
      resoudre(toile.toDataURL(transparence ? 'image/png' : 'image/jpeg', 0.9));
    };
    image.src = lecteur.result;
  };
  lecteur.readAsDataURL(fichier);
});
