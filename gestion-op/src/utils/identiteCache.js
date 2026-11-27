// ==================== IDENTITÉ RETENUE POUR L'ÉCRAN DE CONNEXION ====================
// L'écran de connexion s'affiche AVANT toute authentification : il ne peut pas
// lire les paramètres du projet, que les règles de sécurité réservent aux
// utilisateurs connectés. Il affichait donc le nom et le logo du PIF2, écrits
// dans le code.
//
// On retient donc, à chaque ouverture de session, le strict nécessaire pour
// l'accueil : le nom de la structure et son logo. Rien de confidentiel — ce qui
// figure déjà en tête de chaque document imprimé.
//
// Cette mémoire est propre au navigateur : elle peut être vide, refusée (mode
// privé, données effacées) ou lever une erreur. L'écran doit donc s'afficher
// correctement sans elle, et c'est pourquoi chaque accès est protégé.
const CLE = 'identite_structure_v1';

export const retenirIdentite = (projet) => {
  if (!projet) return;
  try {
    window.localStorage.setItem(CLE, JSON.stringify({
      nomProjet: projet.nomProjet || '',
      pays: projet.pays || '',
      logo: projet.logo || '',
    }));
  } catch (e) { /* mémoire indisponible : l'accueil garde son affichage neutre */ }
};

export const identiteRetenue = () => {
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return null;
    const lu = JSON.parse(brut);
    return lu && typeof lu === 'object' ? lu : null;
  } catch (e) {
    return null;
  }
};
