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
 *  writeBatch REFUSE un lot qui écrit dans plusieurs tables. Il pourrait
 *  le découper, mais alors un bordereau pourrait être créé sans que ses OP
 *  changent de statut. Ces cas-là doivent passer par une fonction SQL, et
 *  l'erreur levée ici garantit qu'aucun ne sera oublié en silence.
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
export const orderBy = (champ, sens = 'asc')      => ({ __c: 'orderBy', champ, sens });
export const limit   = (n)                        => ({ __c: 'limit', n });

export const query = (ref, ...contraintes) => ({
  __type: 'query',
  nom: ref.nom,
  contraintes: contraintes.filter(Boolean),
});

// ---------- Construction de la requête Supabase ----------

const construire = (q) => {
  let r = supabase.from(nomTable(q.nom)).select('id, data');

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
    .select('id, data')
    .eq('id', ref.id)
    .maybeSingle();
  if (error) throw erreur(error);
  if (!data) return { id: ref.id, exists: () => false, data: () => undefined };
  return unDoc(data);
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

// setDoc REMPLACE le document, comme chez Firestore.
export const setDoc = async (ref, valeurs) => {
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

export const writeBatch = () => {
  const operations = [];
  const api = {
    set:    (ref, valeurs) => { operations.push({ genre: 'set',    ref, valeurs }); return api; },
    update: (ref, champs)  => { operations.push({ genre: 'update', ref, champs  }); return api; },
    delete: (ref)          => { operations.push({ genre: 'delete', ref          }); return api; },

    commit: async () => {
      const tables = new Set(operations.map(o => nomTable(o.ref.nom)));

      // Refus délibéré. Un lot sur plusieurs tables doit être atomique ;
      // l'exécuter table par table laisserait un état incohérent possible.
      // Ces cas passent par une fonction SQL dédiée.
      if (tables.size > 1) {
        throw new Error(
          `writeBatch : ce lot écrit dans ${tables.size} tables ` +
          `(${[...tables].join(', ')}). Il doit passer par une fonction SQL ` +
          `transactionnelle — voir transmettre_bordereau() dans ` +
          `supabase/fonctions.sql.`
        );
      }
      if (operations.length === 0) return;

      const table = [...tables][0];

      // Même table : chaque genre part en une seule instruction, donc
      // chacune est atomique.
      const aEcrire = operations.filter(o => o.genre === 'set')
        .map(o => ({ id: o.ref.id, data: o.valeurs }));
      if (aEcrire.length) {
        const { error } = await supabase.from(table).upsert(aEcrire);
        if (error) throw erreur(error);
      }

      const aSupprimer = operations.filter(o => o.genre === 'delete').map(o => o.ref.id);
      if (aSupprimer.length) {
        const { error } = await supabase.from(table).delete().in('id', aSupprimer);
        if (error) throw erreur(error);
      }

      for (const o of operations.filter(o => o.genre === 'update')) {
        const { error } = await supabase.rpc('maj_document', {
          p_table: table, p_id: o.ref.id, p_patch: o.champs,
        });
        if (error) throw erreur(error);
      }
    },
  };
  return api;
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

const correspond = (document, contraintes) =>
  (contraintes || []).every((c) => {
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
  });

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
// Le code d'erreur est conservé dans `code`, comme le faisait Firebase :
// utils/erreursFirebase.js continue de distinguer un refus de droits
// d'une coupure réseau sans être modifié.

const erreur = (e) => {
  const err = new Error(e.message || 'Erreur de base de données');
  err.code = e.code;
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

export const transmettreBordereau = async ({ bordereauId, bordereauData, opIds, patchOps }) => {
  const { error } = await supabase.rpc('transmettre_bordereau', {
    p_bordereau_id: bordereauId, p_bordereau_data: bordereauData,
    p_op_ids: opIds, p_patch_ops: patchOps,
  });
  if (error) throw erreur(error);
};
