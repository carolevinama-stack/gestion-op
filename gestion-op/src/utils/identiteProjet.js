// ==================== IDENTITÉ DE LA STRUCTURE ====================
// Tout ce qui, sur un document imprimé ou à l'écran, désigne la structure qui
// utilise l'application : l'en-tête officiel, les emblèmes, le signataire.
//
// Ces valeurs étaient écrites dans le code, au nom du PIF2. Elles viennent
// maintenant du document « parametres/projet », que la page Paramètres
// renseigne — une autre structure se configure donc depuis l'écran, sans
// toucher au code.
//
// Les valeurs de repli existent pour une raison précise : l'installation en
// service n'a pas forcément enregistré ces champs, et ses documents doivent
// sortir exactement comme avant. Elles disparaissent dès le premier
// enregistrement de la page Paramètres.
import { LOGO_PIF2, ARMOIRIE } from './logos';

// Écrit exactement comme l'en-tête d'origine, capitales et accents compris :
// l'installation en service ne doit rien voir changer sur ses documents tant
// qu'elle n'a pas saisi ce champ. Une fois saisi, c'est l'orthographe de la
// page Paramètres qui s'imprime, en capitales.
export const PAYS_DEFAUT = "REPUBLIQUE DE CÔTE D'IVOIRE";
export const DEVISE_DEFAUT = 'Union – Discipline – Travail';

// Le nom d'une personne, lui, n'a pas de repli : imprimer le signataire d'une
// autre structure serait une erreur silencieuse sur un document qui engage.
// Mieux vaut un emplacement vide, qui se voit.
export const identiteProjet = (projet) => ({
  pays: (projet?.pays || PAYS_DEFAUT).toUpperCase(),
  devise: projet?.devise || DEVISE_DEFAUT,
  signataire: projet?.coordonnateur || '',
  titreSignataire: projet?.titreCoordonnateur || '',
  logo: projet?.logo || LOGO_PIF2,
  armoirie: projet?.armoirie || ARMOIRIE,
});
