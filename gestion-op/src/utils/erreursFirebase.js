// ==================== MESSAGES D'ERREUR LISIBLES ====================
// Firebase renvoie un code technique (permission-denied, unavailable…) que
// l'application affichait jusqu'ici sous la forme d'un unique « Erreur système ».
// Résultat : impossible de distinguer un problème de droits d'une coupure réseau
// sans ouvrir la console du navigateur.
//
// Chaque message dit ce qui s'est passé ET ce que la personne peut faire. Le code
// technique est conservé en fin de message : c'est ce qui permet de diagnostiquer
// à distance, sur simple lecture de la capture d'écran.

const MESSAGES = {
  'permission-denied': {
    titre: 'Droits insuffisants',
    message: "Votre compte n'a pas le droit d'effectuer cette action. Demandez à un administrateur de vérifier votre rôle, puis déconnectez-vous et reconnectez-vous.",
  },
  'unauthenticated': {
    titre: 'Session expirée',
    message: 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.',
  },
  'unavailable': {
    titre: 'Connexion indisponible',
    message: "Impossible de joindre la base de données. Vérifiez votre connexion internet, puis réessayez. Cette opération a besoin d'être connectée : elle ne peut pas être mise en attente.",
  },
  'deadline-exceeded': {
    titre: 'Délai dépassé',
    message: 'La base de données a mis trop de temps à répondre, probablement à cause de la connexion. Réessayez.',
  },
  'aborted': {
    titre: 'Opération interrompue',
    message: "Une autre personne a enregistré en même temps que vous. Réessayez : c'est une sécurité qui évite deux OP portant le même numéro.",
  },
  'failed-precondition': {
    titre: 'Opération impossible',
    message: "La base de données a refusé l'opération. Si le problème persiste, fermez les autres onglets de l'application et rechargez la page.",
  },
  'resource-exhausted': {
    titre: 'Quota atteint',
    message: "Le quota quotidien de la base de données est atteint. L'application redeviendra disponible demain. Prévenez l'administrateur.",
  },
  'invalid-argument': {
    titre: 'Donnée refusée',
    message: "Une des informations saisies n'a pas été acceptée par la base de données. Prévenez l'administrateur en indiquant le code ci-dessous.",
  },
};

const PAR_DEFAUT = {
  titre: 'Erreur inattendue',
  message: "L'opération n'a pas abouti. Réessayez, et si le problème persiste, transmettez le code ci-dessous à l'administrateur.",
};

// Renvoie { titre, message } prêts à afficher. Le code technique et, à défaut,
// le message brut, sont toujours joints : sans eux on ne peut rien diagnostiquer.
export const messageErreur = (error) => {
  const code = error?.code || '';
  const base = MESSAGES[code] || MESSAGES[String(code).replace(/^[a-z]+\//, '')] || PAR_DEFAUT;
  const detail = code || error?.message || 'inconnu';
  return {
    titre: base.titre,
    message: `${base.message}\n\nCode technique : ${detail}`,
  };
};
