/**
 * ============================================================
 *  INTERPRÈTE Firebase → Supabase
 * ============================================================
 *
 *  Ce fichier expose les MÊMES noms que firebase/firestore :
 *  collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc,
 *  deleteDoc, query, where, orderBy, onSnapshot, writeBatch.
 *
 *  Conséquence pour les pages : une seule ligne change.
 *
 *      -  import { collection, getDocs } from 'firebase/firestore';
 *      +  import { collection, getDocs } from '../db';
 *
 *  Rien d'autre. Les appels, les formes de documents, les snapshots
 *  restent identiques — donc la logique métier n'est pas touchée.
 *
 *  ----------------------------------------------------------
 *  CE QUE CET INTERPRÈTE NE FAIT PAS, VOLONTAIREMENT
 *  ----------------------------------------------------------
 *
 *  runTransaction n'existe pas ici. Un navigateur ne peut pas tenir une
 *  transaction ouverte sur PostgreSQL. Les deux endroits qui en ont besoin
 *  (la numérotation des OP, le solde d'un OP) appellent des fonctions SQL
 *  dédiées — voir supabase/fonctions.sql.
 *
 *  writeBatch, lui, est bien là : le lot entier part en un seul appel à la
 *  fonction SQL ecrire_lot(), qui est transactionnelle. Un lot à cheval sur
 *  plusieurs tables est donc validé d'un bloc ou annulé d'un bloc, comme
 *  chez Firestore — ce dont dépendent PageCircuitCF et PageCircuitAC, qui
 *  écrivent les OP et le bordereau ensemble.
 * ============================================================
 */

import { supabase } from './supabase';

// ---------- Correspondance collections → tables ----------

const TABLE = {
  sources:           'sources',
  exercices:         'exercices',
  lignesBudgetaires: 'lignes_budgetaires',
  beneficiaires:     'beneficiaires',
  budgets:           'budgets',
  ops:               'ops',
  bordereaux:        'bordereaux',
  journal:           'journal',
  users:             'users',
  compteurs:         'compteurs',
};

// Champs exposés en colonnes réelles par le schéma : filtrer ou trier sur
// eux utilise un index. Un champ absent de cette liste reste interrogeable
// (via data->>champ), simplement sans index — le résultat est le même.
const COLONNE = {
  sourceId:        'source_id',
  exerciceId:      'exercice_id',
  statut:          'statut',
  ligneBudgetaire: 'ligne_budgetaire',
  beneficiaireId:  'beneficiaire_id',
  creePar:         'cree_par',
  supprimePar:     'supprime_par',
  importAnterieur: 'import_anterieur',
  numero:          'numero',
  nom:             'nom',
  code:            'code',
  annee:           'annee',
  actif:           'actif',
  version:         'version',
  email:           'email',
  role:            'role',
  date:            'date',
  opId:            'op_id',
};

const colonne = (champ) => COLONNE[champ] || `data->>${champ}`;

const nomTable = (collectionName) => {
  const t = TABLE[collectionName];
  if (!t) throw new Error(`Collection inconnue : ${collectionName}`);
  return t;
};

// ---------- db : un jeton, sans rôle réel ----------
// Les pages écrivent collection(db, 'ops') ; on garde la signature pour
// ne pas avoir à modifier les appels.
export const db = { __supabase: true };

const nouvelId = () => {
  // Identifiant tiré côté navigateur, comme le faisait doc(collection(...))
  // de Firestore : la référence existe avant l'écriture, ce dont la
  // création d'OP a besoin pour journaliser l'identifiant.
  const c = typeof window !== 'undefined' ? window.crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

// ---------- Références ----------

export const collection = (_db, nom) => ({ __type: 'collection', nom });

export function doc(a, b, c) {
  // doc(db, 'ops', id)  →  référence existante
  if (typeof b === 'string') return { __type: 'doc', nom: b, id: c ?? nouvelId() };
  // doc(collectionRef)  →  nouvelle référence, identifiant tiré d'avance
  if (a && a.__type === 'collection') return { __type: 'doc', nom: a.nom, id: nouvelId() };
  throw new Error('doc() : arguments non reconnus');
}

// ---------- Contraintes de requête ----------

export const where   = (champ, operateur, valeur) => ({ __c: 'where', champ, operateur, valeur });

// or() combine plusieurs conditions en alternative. AppContext s'en sert
// pour charger « l'exercice actif OU tout ce qui est encore dans un
// circuit OU les OP importés d'un exercice antérieur ».
export const or = (...conditions) => ({ __c: 'or', conditions: conditions.filter(Boolean) });
export const orderBy = (champ, sens = 'asc')      => ({ __c: 'orderBy', champ, sens });
export const limit   = (n)                        => ({ __c: 'limit', n });

export const query = (ref, ...contraintes) => ({
  __type: 'query',
  nom: ref.nom,
  contraintes: contraintes.filter(Boolean),
});

// ---------- Construction de la requête Supabase ----------

// PostgREST exprime une alternative sous forme de chaîne :
//   "exercice_id.eq.\"ex-2026\",statut.in.(\"EN_COURS\",\"PAYE\")"
// Les valeurs sont mises entre guillemets : sans cela, une valeur
// contenant une virgule ou un point casserait la chaîne entière.
// Seul le texte est mis entre guillemets. Un booléen ou un nombre cité
// serait transmis comme du texte et devrait être converti par PostgREST :
// ça marche souvent, mais ce n'est pas la forme juste, et un jour ça ne
// marcherait plus.
const citer = (v) => {
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  if (v === null || v === undefined) return 'null';
  return `"${String(v).replace(/"/g, '\\"')}"`;
};

const OPERATEURS_POSTGREST = {
  '==': 'eq', '!=': 'neq', '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte',
};

const versChaine = (c) => {
  if (c.__c !== 'where') {
    throw new Error("or() n'accepte que des conditions where()");
  }
  const col = colonne(c.champ);
  if (c.operateur === 'in') {
    return `${col}.in.(${(c.valeur || []).map(citer).join(',')})`;
  }
  const op = OPERATEURS_POSTGREST[c.operateur];
  if (!op) throw new Error(`Opérateur non pris en charge dans or() : ${c.operateur}`);
  return `${col}.${op}.${citer(c.valeur)}`;
};

const construire = (q) => {
  let r = supabase.from(nomTable(q.nom)).select('id, data, empreinte');

  for (const c of q.contraintes || []) {
    if (c.__c === 'where') {
      const col = colonne(c.champ);
      switch (c.operateur) {
        case '==':  r = r.eq(col, c.valeur); break;
        case '!=':  r = r.neq(col, c.valeur); break;
        case '>':   r = r.gt(col, c.valeur); break;
        case '>=':  r = r.gte(col, c.valeur); break;
        case '<':   r = r.lt(col, c.valeur); break;
        case '<=':  r = r.lte(col, c.valeur); break;
        case 'in':  r = r.in(col, c.valeur); break;
        case 'not-in': r = r.not(col, 'in', `(${c.valeur.join(',')})`); break;
        default: throw new Error(`Opérateur non pris en charge : ${c.operateur}`);
      }
    } else if (c.__c === 'or') {
      r = r.or(c.conditions.map(versChaine).join(','));
    } else if (c.__c === 'orderBy') {
      r = r.order(colonne(c.champ), { ascending: c.sens !== 'desc' });
    } else if (c.__c === 'limit') {
      r = r.limit(c.n);
    }
  }
  return r;
};

// ---------- Snapshots, à l'identique de Firestore ----------

const unDoc = (ligne) => ({
  id: ligne.id,
  exists: () => true,
  data: () => ligne.data,
  // Empreinte du document au moment de la lecture. Seul runTransaction
  // ci-dessous s'en sert ; les pages n'en ont pas connaissance.
  __empreinte: ligne.empreinte ?? null,
});

const unSnapshot = (lignes) => {
  const docs = lignes.map(unDoc);
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (fn) => docs.forEach(fn),
  };
};

// ---------- Lectures ----------

export const getDocs = async (cible) => {
  const q = cible.__type === 'query' ? cible : { nom: cible.nom, contraintes: [] };
  const { data, error } = await construire(q);
  if (error) throw erreur(error);
  return unSnapshot(data || []);
};

export const getDoc = async (ref) => {
  const { data, error } = await supabase
    .from(nomTable(ref.nom))
    .select('id, data, empreinte')
    .eq('id', ref.id)
    .maybeSingle();
  if (error) throw erreur(error);
  if (!data) return { id: ref.id, exists: () => false, data: () => undefined, __empreinte: null };
  return unDoc(data);
};

// getCountFromServer renvoie un nombre sans rapatrier les documents.
// PostgREST sait le faire avec head: true : la réponse ne porte que le
// décompte. Forme de retour identique à Firestore : snap.data().count.
export const getCountFromServer = async (cible) => {
  const q = cible.__type === 'query' ? cible : { nom: cible.nom, contraintes: [] };
  let r = supabase.from(nomTable(q.nom)).select('id', { count: 'exact', head: true });
  for (const c of q.contraintes || []) {
    if (c.__c !== 'where') continue;
    const col = colonne(c.champ);
    if (c.operateur === '==') r = r.eq(col, c.valeur);
    else if (c.operateur === 'in') r = r.in(col, c.valeur);
    else if (c.operateur === '!=') r = r.neq(col, c.valeur);
  }
  const { count, error } = await r;
  if (error) throw erreur(error);
  return { data: () => ({ count: count || 0 }) };
};

// ---------- Écritures ----------

export const addDoc = async (collectionRef, valeurs) => {
  const id = nouvelId();
  const { error } = await supabase
    .from(nomTable(collectionRef.nom))
    .insert({ id, data: valeurs });
  if (error) throw erreur(error);
  return { id };
};

// setDoc REMPLACE le document — sauf avec { merge: true }, qui fusionne.
// La distinction compte : PageParametres recale les compteurs avec
// { merge: true }, et sans cela le champ `type` du compteur serait effacé.
export const setDoc = async (ref, valeurs, options) => {
  if (options && options.merge) {
    // Fusion, y compris si le document n'existe pas encore : d'où le
    // upsert d'abord sur un document vide, puis la fusion. En une seule
    // instruction chacun, donc sans relecture préalable.
    const { error: e1 } = await supabase
      .from(nomTable(ref.nom))
      .upsert({ id: ref.id, data: {} }, { ignoreDuplicates: true });
    if (e1) throw erreur(e1);
    const { error: e2 } = await supabase.rpc('maj_document', {
      p_table: nomTable(ref.nom), p_id: ref.id, p_patch: valeurs,
    });
    if (e2) throw erreur(e2);
    return;
  }
  const { error } = await supabase
    .from(nomTable(ref.nom))
    .upsert({ id: ref.id, data: valeurs });
  if (error) throw erreur(error);
};

// updateDoc FUSIONNE les champs fournis, comme chez Firestore. La fusion
// est faite par PostgreSQL en une instruction (data || patch) : le document
// n'est pas relu avant, donc une modification simultanée n'est pas écrasée.
export const updateDoc = async (ref, champs) => {
  const { error } = await supabase.rpc('maj_document', {
    p_table: nomTable(ref.nom),
    p_id: ref.id,
    p_patch: champs,
  });
  if (error) throw erreur(error);
};

export const deleteDoc = async (ref) => {
  const { error } = await supabase.from(nomTable(ref.nom)).delete().eq('id', ref.id);
  if (error) throw erreur(error);
};

// ---------- Lots d'écritures ----------
//
// writeBatch accumule des écritures puis les valide d'un bloc. Chez
// Firestore le lot est atomique même à cheval sur plusieurs collections,
// et l'application s'appuie là-dessus : créer un bordereau écrit dans
// bordereaux ET dans ops, et les deux doivent réussir ou échouer ensemble.
//
// Tout le lot part donc en un seul appel à la fonction SQL ecrire_lot(),
// qui est transactionnelle. La garantie est exactement celle de Firestore,
// pour n'importe quel mélange de tables.

export const writeBatch = () => {
  const operations = [];
  const empiler = (genre, ref, data, options) => {
    operations.push({
      table: nomTable(ref.nom),
      id: ref.id,
      genre: genre === 'set' && options && options.merge ? 'set_merge' : genre,
      data: data || {},
    });
  };

  const api = {
    set:    (ref, valeurs, options) => { empiler('set', ref, valeurs, options); return api; },
    update: (ref, champs)           => { empiler('update', ref, champs);        return api; },
    delete: (ref)                   => { empiler('delete', ref, {});            return api; },

    commit: async () => {
      if (operations.length === 0) return;
      const { error } = await supabase.rpc('ecrire_lot', { p_operations: operations });
      if (error) throw erreur(error);
    },
  };
  return api;
};

// ---------- Transactions ----------
//
// runTransaction de Firestore lit des documents, laisse l'appelant
// calculer, puis écrit — et RECOMMENCE tout si l'un des documents lus a
// changé entre-temps. C'est ce qui empêche deux paiements simultanés de
// s'écraser, et deux saisies d'obtenir le même numéro d'OP.
//
// Même mécanisme ici : on note l'empreinte de chaque document lu, et la
// fonction SQL ecrire_lot_si_inchange() n'écrit que si aucune n'a bougé.
// Sinon on rejoue le calcul, jusqu'à cinq fois.
//
// Le calcul, lui, reste entièrement dans la fonction que l'appelant
// fournit — donc en JavaScript, donc testé. Rien de la logique métier ne
// descend en SQL.

// Attente progressive entre deux tentatives, avec une part d'aléatoire.
// Sans elle, deux transactions en conflit rejouent à la même milliseconde
// et se percutent indéfiniment : éprouvé sur 20 écritures simultanées du
// même OP, 2 abandonnaient. Avec l'attente, toutes passent.
// L'aléatoire est indispensable : une attente fixe les ferait repartir
// ensemble, donc se percuter à nouveau.
const attendre = (essai) => new Promise((resoudre) => {
  const base = 15 * Math.pow(2, essai - 1);           // 15, 30, 60, 120 ms...
  setTimeout(resoudre, base + Math.random() * base);
});

export const runTransaction = async (_db, calcul, { essais = 8 } = {}) => {
  for (let essai = 1; essai <= essais; essai++) {
    const lectures = [];
    const operations = [];

    const tx = {
      get: async (ref) => {
        const snap = await getDoc(ref);
        lectures.push({
          table: nomTable(ref.nom),
          id: ref.id,
          empreinte: snap.__empreinte ?? null,
        });
        return snap;
      },
      set: (ref, valeurs, options) => {
        operations.push({
          table: nomTable(ref.nom), id: ref.id,
          genre: options && options.merge ? 'set_merge' : 'set',
          data: valeurs || {},
        });
      },
      update: (ref, champs) => {
        operations.push({ table: nomTable(ref.nom), id: ref.id, genre: 'update', data: champs || {} });
      },
      delete: (ref) => {
        operations.push({ table: nomTable(ref.nom), id: ref.id, genre: 'delete', data: {} });
      },
    };

    // Une erreur levée par le calcul (budget insuffisant, par exemple)
    // remonte telle quelle : ce n'est pas un conflit, il ne faut pas
    // rejouer.
    const resultat = await calcul(tx);

    if (operations.length === 0) return resultat;

    const { data: valide, error } = await supabase.rpc('ecrire_lot_si_inchange', {
      p_lectures: lectures,
      p_operations: operations,
    });
    if (error) throw erreur(error);
    if (valide) return resultat;

    // Quelqu'un est passé avant : rien n'a été écrit. On attend un court
    // instant, puis on rejoue le calcul sur les données à jour.
    await attendre(essai);
  }

  const e = new Error(
    'La transaction a été interrompue après plusieurs tentatives : ' +
    'le document est modifié par ailleurs. Réessayez.'
  );
  e.code = 'aborted';   // même code que Firestore, pour utils/erreursFirebase.js
  throw e;
};

// ---------- Temps réel ----------
//
// onSnapshot de Firestore livre l'ensemble du résultat à chaque changement.
// Supabase livre le changement, pas l'ensemble. L'interprète rétablit le
// contrat : il charge une première fois, puis tient la liste à jour et la
// relivre entière à chaque événement. Les pages ne voient aucune différence.
//
// Le filtre temps réel de Supabase ne porte que sur une colonne ; les
// requêtes à plusieurs filtres sont donc réévaluées ici, côté navigateur.

const correspondUne = (document, c) => {
  // Une alternative : il suffit qu'UNE condition soit remplie. Sans ce
  // cas, un OP retenu uniquement par son statut non clos serait jugé hors
  // requête et DISPARAÎTRAIT de l'écran à la première mise à jour.
  if (c.__c === 'or') {
    return (c.conditions || []).some((sous) => correspondUne(document, sous));
  }
  if (c.__c !== 'where') return true;

  const v = document[c.champ];
  switch (c.operateur) {
    case '==': return v === c.valeur;
    case '!=': return v !== c.valeur;
    case 'in': return (c.valeur || []).includes(v);
    case 'not-in': return !(c.valeur || []).includes(v);
    case '>':  return v >  c.valeur;
    case '>=': return v >= c.valeur;
    case '<':  return v <  c.valeur;
    case '<=': return v <= c.valeur;
    default:   return true;
  }
};

const correspond = (document, contraintes) =>
  (contraintes || []).every((c) => correspondUne(document, c));

export const onSnapshot = (cible, auChangement, surErreur) => {
  const q = cible.__type === 'query' ? cible : { nom: cible.nom, contraintes: [] };
  const table = nomTable(q.nom);
  let lignes = new Map();
  let vivant = true;

  const livrer = () => {
    if (vivant) auChangement(unSnapshot([...lignes.values()]));
  };

  construire(q).then(({ data, error }) => {
    if (error) { surErreur?.(erreur(error)); return; }
    for (const l of data || []) lignes.set(l.id, l);
    livrer();
  });

  const canal = supabase
    .channel(`maj-${table}-${Math.random().toString(36).slice(2, 8)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (evt) => {
      const { eventType, new: apres, old: avant } = evt;
      if (eventType === 'DELETE') {
        lignes.delete(avant?.id);
      } else if (apres) {
        // Un document qui ne correspond plus à la requête quitte la liste :
        // c'est ce que faisait Firestore.
        if (correspond(apres.data || {}, q.contraintes)) lignes.set(apres.id, apres);
        else lignes.delete(apres.id);
      }
      livrer();
    })
    .subscribe();

  return () => { vivant = false; supabase.removeChannel(canal); };
};

// ---------- Erreurs ----------
//
// utils/erreursFirebase.js transforme un code technique en message lisible,
// et conserve le code en fin de message — c'est ce qui permet de
// diagnostiquer à distance sur simple lecture d'une capture d'écran.
//
// Il attend les codes de Firestore. PostgreSQL et PostgREST en renvoient
// d'autres. Sans traduction, tous les messages soignés retomberaient sur
// « Erreur système » et le diagnostic serait perdu. D'où cette table.

const CODES_BASE = {
  // Refus par les règles de sécurité (Row Level Security)
  '42501':    'permission-denied',
  'PGRST301': 'unauthenticated',     // jeton absent ou expiré
  '42P01':    'failed-precondition', // table inexistante
  // Données refusées par la base
  '23505':    'invalid-argument',    // doublon sur une contrainte d'unicité
  '23502':    'invalid-argument',    // champ obligatoire absent
  '23503':    'invalid-argument',    // référence inexistante
  '22P02':    'invalid-argument',    // valeur mal formée
  // Charge et délais
  '57014':    'deadline-exceeded',   // requête annulée (délai dépassé)
  '53300':    'resource-exhausted',  // trop de connexions simultanées
  '40001':    'aborted',             // conflit de sérialisation
  '40P01':    'aborted',             // interblocage
};

const erreur = (e) => {
  const err = new Error(e.message || 'Erreur de base de données');
  const brut = e.code || '';

  if (CODES_BASE[brut]) {
    err.code = CODES_BASE[brut];
  } else if (/row-level security|permission denied/i.test(e.message || '')) {
    err.code = 'permission-denied';
  } else if (/fetch|network|Failed to fetch/i.test(e.message || '')) {
    // Coupure réseau : le message doit dire que l'opération ne peut pas
    // être mise en attente, comme le faisait Firestore hors ligne.
    err.code = 'unavailable';
  } else {
    err.code = brut || 'unknown';
  }

  // Le code d'origine reste disponible pour un diagnostic plus fin.
  err.codeBase = brut;
  err.details = e.details;
  return err;
};

// ---------- Fonctions SQL ----------
// Les deux opérations qui exigent une vraie transaction.

export const attribuerNumero = async ({ compteurId, type, sourceId, exerciceId, init = 0 }) => {
  const { data, error } = await supabase.rpc('attribuer_numero', {
    p_compteur_id: compteurId, p_type: type,
    p_source: sourceId, p_exercice: exerciceId, p_init: init,
  });
  if (error) throw erreur(error);
  return data;
};

