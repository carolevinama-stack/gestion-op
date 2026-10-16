/**
 * ============================================================
 *  DONNÉES FICTIVES — pour l'essai et pour le site de démonstration
 * ============================================================
 *
 *  Tout est inventé : aucun nom de bénéficiaire réel, aucun RIB réel,
 *  aucun numéro de compte réel. Les banques sont des noms inventés.
 *
 *  Les formes de documents reproduisent exactement celles de la base :
 *  champs figés (beneficiaireNom, libelleLigne, dotationFigee), tableaux
 *  imbriqués (ribs, lignes, paiements), statuts du circuit CF puis AC.
 * ============================================================
 */

const STATUTS = ['EN_COURS', 'TRANSMIS_CF', 'VISE_CF', 'DIFFERE_CF', 'REJETE_CF',
                 'TRANSMIS_AC', 'DIFFERE_AC', 'REJETE_AC', 'PAYE_PARTIEL', 'PAYE'];
const TYPES    = ['PROVISOIRE', 'DEFINITIF', 'DIRECT', 'ANNULATION'];

// Générateur déterministe : deux exécutions donnent la même base, ce qui
// rend les comparaisons avant/après fiables.
let graine = 42;
const alea = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const parmi = (liste) => liste[Math.floor(alea() * liste.length)];
const entre = (min, max) => Math.floor(min + alea() * (max - min + 1));

const PRENOMS = ['Aya', 'Koffi', 'Mariam', 'Yao', 'Fatou', 'Ibrahim', 'Adjoua',
                 'Seydou', 'Akissi', 'Moussa', 'Affoué', 'Bakary'];
const NOMS     = ['Kouassi', 'Traoré', 'Diabaté', 'N\'Guessan', 'Ouattara', 'Bamba',
                  'Konan', 'Sylla', 'Yeboah', 'Cissé'];
const BANQUES  = ['Banque Fictive du Littoral', 'Crédit Imaginaire', 'Banque Exemple SA',
                  'Caisse Témoin', 'Banque de Démonstration'];
const OBJETS   = ['Fournitures de bureau', 'Carburant véhicules de service',
                  'Honoraires consultant', 'Location de salle — atelier régional',
                  'Frais de mission', 'Entretien du matériel informatique',
                  'Impression de supports de formation', 'Perdiem participants',
                  'Prestation de restauration', 'Achat de petit équipement'];
const PIECES   = ['Facture + bon de commande', 'Facture + PV de réception',
                  'Contrat + rapport d\'activité', 'État de paiement signé',
                  'Ordre de mission + justificatifs'];

export const donneesFictives = () => {
  // ---------- Sources et exercices ----------
  const sources = [
    { id: 'src-bm',  nom: 'Banque Mondiale',   sigle: 'BM',  couleur: '#2E9940' },
    { id: 'src-bad', nom: 'Banque Africaine',  sigle: 'BAD', couleur: '#1565C0' },
    { id: 'src-etat',nom: 'Budget National',   sigle: 'BN',  couleur: '#C62828' },
  ];
  const exercices = [
    { id: 'ex-2025', annee: 2025, actif: false },
    { id: 'ex-2026', annee: 2026, actif: true  },
  ];

  // ---------- Lignes budgétaires ----------
  // Codes volontairement mélangés dans la génération : c'est le tri par
  // code de l'application qui doit les remettre en ordre, pas la base.
  const lignes = [];
  for (const chap of [60, 61, 62, 63, 64]) {
    for (const art of [11, 12, 13, 21, 22, 31, 32, 41, 51, 52, 61, 71]) {
      lignes.push({
        id: `lb-${chap}${art}`,
        code: `${chap}${art}`,
        libelle: `${parmi(OBJETS)} — rubrique ${chap}.${art}`,
      });
    }
  }
  lignes.reverse(); // désordre délibéré

  // ---------- Bénéficiaires ----------
  const beneficiaires = [];
  for (let i = 1; i <= 28; i++) {
    const nbRibs = entre(0, 2); // certains sans RIB : cas réel connu
    beneficiaires.push({
      id: `ben-${String(i).padStart(3, '0')}`,
      nom: `${parmi(PRENOMS)} ${parmi(NOMS)}${alea() > 0.7 ? ' (ETS)' : ''}`,
      ncc: `CI-${entre(1000000, 9999999)}`,
      ribs: Array.from({ length: nbRibs }, () => ({
        banque: parmi(BANQUES),
        numero: `CI00${entre(10, 99)} ${entre(1000, 9999)} ${entre(1000, 9999)} ${entre(100000, 999999)}`,
      })),
    });
  }

  // ---------- Budgets : deux versions par source, pour l'exercice actif ----------
  const budgets = [];
  for (const src of sources) {
    for (const version of [1, 2]) {
      // Seules certaines lignes sont dotées : les autres n'ont jamais été
      // servies, ce qui permet d'éprouver le filtre du suivi budgétaire.
      const lignesDotees = lignes
        .filter(() => alea() > 0.45)
        .map(l => ({ code: l.code, libelle: l.libelle, dotation: entre(2, 60) * 500000 }));
      budgets.push({
        id: `bud-${src.sigle}-v${version}`,
        sourceId: src.id,
        exerciceId: 'ex-2026',
        version,
        nomVersion: version === 1 ? 'Budget initial' : 'Révision n°1',
        lignes: lignesDotees,
        createdAt: new Date(Date.UTC(2026, version === 1 ? 0 : 5, 15, 8, 0)).toISOString(),
        creePar: 'Administrateur Démo',
      });
    }
  }

  // ---------- Ordres de paiement ----------
  const ops = [];
  let compteur = 0;
  for (const src of sources) {
    const budgetCourant = budgets.find(b => b.sourceId === src.id && b.version === 2);
    for (let i = 0; i < 70; i++) {
      const ligne = parmi(budgetCourant.lignes);
      const ben   = parmi(beneficiaires);
      const type  = parmi(TYPES);
      const statut = parmi(STATUTS);
      const brut  = entre(1, 40) * 25000;
      const montant = type === 'ANNULATION' ? -brut : brut;
      compteur++;

      // Les règlements partiels n'existent que pour les statuts concernés.
      const paiements = (statut === 'PAYE_PARTIEL' || statut === 'PAYE')
        ? [{
            date: `2026-0${entre(1, 9)}-${String(entre(10, 28)).padStart(2, '0')}`,
            montant: statut === 'PAYE' ? montant : Math.round(montant * 0.6),
            mode: parmi(['VIREMENT', 'CHEQUE']),
            reference: `REG-${entre(10000, 99999)}`,
          }]
        : [];

      ops.push({
        id: `op-${src.sigle}-${String(i).padStart(3, '0')}`,
        numero: `N°${String(compteur).padStart(4, '0')}/PIF2-${src.sigle}/2026`,
        type,
        sourceId: src.id,
        exerciceId: 'ex-2026',
        beneficiaireId: ben.id,
        beneficiaireNom: ben.nom,                       // FIGÉ
        modeReglement: parmi(['VIREMENT', 'CHEQUE', 'ESPECES']),
        rib: ben.ribs[0] ? ben.ribs[0].numero : null,
        ligneBudgetaire: ligne.code,
        libelleLigne: ligne.libelle,                    // FIGÉ
        dotationFigee: ligne.dotation,                  // FIGÉ
        objet: parmi(OBJETS),
        piecesJustificatives: parmi(PIECES),
        montant,
        montantTVA: alea() > 0.6 ? Math.round(montant * 0.18) : null,
        tvaRecuperable: alea() > 0.5,
        statut,
        paiements,
        dateCreation: `2026-0${entre(1, 9)}-${String(entre(1, 28)).padStart(2, '0')}`,
        createdAt: new Date(Date.UTC(2026, entre(0, 8), entre(1, 28), entre(8, 17))).toISOString(),
        updatedAt: new Date(Date.UTC(2026, entre(0, 9), entre(1, 28), entre(8, 17))).toISOString(),
        creePar: 'Opérateur Démo',
      });
    }
  }

  // Quelques OP d'un exercice clos, pour éprouver l'archivage.
  for (let i = 0; i < 20; i++) {
    compteur++;
    ops.push({
      id: `op-archive-${String(i).padStart(3, '0')}`,
      numero: `N°${String(i + 1).padStart(4, '0')}/PIF2-BM/2025`,
      type: 'DEFINITIF',
      sourceId: 'src-bm',
      exerciceId: 'ex-2025',
      beneficiaireId: parmi(beneficiaires).id,
      beneficiaireNom: parmi(beneficiaires).nom,
      modeReglement: 'VIREMENT',
      rib: null,
      ligneBudgetaire: parmi(lignes).code,
      libelleLigne: 'Exercice clos',
      dotationFigee: 5000000,
      objet: parmi(OBJETS),
      piecesJustificatives: parmi(PIECES),
      montant: entre(1, 20) * 50000,
      montantTVA: null,
      tvaRecuperable: false,
      statut: 'ARCHIVE',
      paiements: [],
      dateCreation: '2025-11-20',
      createdAt: '2025-11-20T09:00:00.000Z',
      updatedAt: '2025-12-31T17:00:00.000Z',
      creePar: 'Opérateur Démo',
    });
  }

  // ---------- Bordereaux ----------
  const bordereaux = [];
  for (const src of sources) {
    for (let i = 1; i <= 4; i++) {
      const lot = ops
        .filter(o => o.sourceId === src.id && o.exerciceId === 'ex-2026')
        .slice((i - 1) * 5, i * 5)
        .map(o => o.id);
      bordereaux.push({
        id: `bt-${src.sigle}-${i}`,
        numero: `BT N°${String(i).padStart(3, '0')}/PIF2-${src.sigle}/2026`,
        sourceId: src.id,
        exerciceId: 'ex-2026',
        destination: i % 2 === 0 ? 'AC' : 'CF',
        opIds: lot,
        dateTransmission: `2026-0${entre(1, 9)}-${String(entre(1, 28)).padStart(2, '0')}`,
        createdAt: new Date(Date.UTC(2026, entre(0, 8), entre(1, 28))).toISOString(),
        creePar: 'Opérateur Démo',
      });
    }
  }

  // ---------- Journal ----------
  const journal = ops.slice(0, 120).map((o, i) => ({
    id: `jr-${String(i).padStart(4, '0')}`,
    action: parmi(['CREATION', 'CHANGEMENT_STATUT', 'MODIFICATION', 'SUPPRESSION']),
    opId: o.id,
    opNumero: o.numero,
    details: `OP ${o.type} — ${o.montant} FCFA — ${o.objet}`,
    utilisateur: parmi(['Administrateur Démo', 'Opérateur Démo', 'Contrôleur Démo']),
    date: o.updatedAt,
  }));

  // ---------- Comptes ----------
  // Aucun mot de passe ici : ils sont gérés par le service
  // d'authentification, jamais par la base.
  const users = [
    { id: 'uid-admin', email: 'admin@demo.local',      nom: 'Administrateur Démo', role: 'ADMIN',      actif: true },
    { id: 'uid-oper',  email: 'operateur@demo.local',  nom: 'Opérateur Démo',      role: 'OPERATEUR',  actif: true },
    { id: 'uid-lect',  email: 'lecteur@demo.local',    nom: 'Lecteur Démo',        role: 'LECTEUR',    actif: true },
  ];

  return {
    sources, exercices,
    lignesBudgetaires: lignes,
    beneficiaires, budgets, ops, bordereaux, journal, users,
  };
};
