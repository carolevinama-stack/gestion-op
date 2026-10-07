// ==================== ORDRE DES LIGNES BUDGÉTAIRES ====================
// Une ligne budgétaire est identifiée par son code, et c'est dans l'ordre de ces
// codes que la comptabilité lit un budget. Rien ne garantissait cet ordre : la
// liste de référence arrivait de la base telle quelle, et une ligne ajoutée à un
// budget se posait simplement à la fin. Deux écrans pouvaient donc présenter le
// même budget dans deux ordres différents.
//
// Le tri est ici, en un seul endroit, pour que tous les écrans, les exports et
// les documents imprimés le partagent.

// Comparaison « naturelle » : les nombres y sont comparés comme des nombres, pas
// comme du texte. Sans cela, 6.1.10 passerait avant 6.1.9 — et 611 avant 6011.
export const comparerCodesLignes = (a, b) =>
  String(a ?? '').localeCompare(String(b ?? ''), 'fr', { numeric: true, sensitivity: 'base' });

// Trie une liste de lignes par code, sans toucher à la liste reçue : celles qui
// viennent du contexte de l'application sont partagées par tous les écrans.
export const trierLignesParCode = (lignes) =>
  [...(lignes || [])].sort((a, b) => comparerCodesLignes(a?.code, b?.code));
