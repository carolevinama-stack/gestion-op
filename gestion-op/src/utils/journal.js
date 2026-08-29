// ==================== JOURNAL DES ACTIONS SUR LES OP ====================
// Écrit une entrée d'historique à chaque action importante sur un OP (création,
// modification, suppression, restauration, changement de statut). Volontairement
// "best effort" : un échec d'écriture du journal n'empêche jamais l'action métier
// elle-même de réussir (le journal est une trace, pas une donnée critique).

import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

export const ACTIONS_JOURNAL = {
  CREATION: 'CREATION',
  MODIFICATION: 'MODIFICATION',
  SUPPRESSION: 'SUPPRESSION',
  RESTAURATION: 'RESTAURATION',
  CHANGEMENT_STATUT: 'CHANGEMENT_STATUT',
};

export const enregistrerJournal = async ({ action, opId, opNumero, details, utilisateur }) => {
  try {
    await addDoc(collection(db, 'journal'), {
      action,
      opId: opId || null,
      opNumero: opNumero || null,
      details: details || '',
      utilisateur: utilisateur || 'Inconnu',
      date: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Erreur écriture journal:', e);
  }
};

// Nom à afficher pour l'utilisateur ayant réalisé l'action (mêmes règles que "creePar" sur les OP).
export const nomUtilisateurJournal = (userProfile) => userProfile?.nom || userProfile?.email || 'Inconnu';
