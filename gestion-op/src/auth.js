/**
 * ============================================================
 *  INTERPRÈTE Firebase Auth → Supabase Auth
 * ============================================================
 *
 *  Expose les mêmes noms que firebase/auth :
 *    signInWithEmailAndPassword, signOut, onAuthStateChanged,
 *    sendPasswordResetEmail, createUserWithEmailAndPassword.
 *
 *  Les pages ne changent donc qu'une ligne d'import.
 *
 *  ----------------------------------------------------------
 *  TROIS POINTS D'ATTENTION
 *  ----------------------------------------------------------
 *
 *  1. La forme de l'utilisateur. Firebase l'appelle `uid`, Supabase `id`.
 *     L'interprète renvoie les deux, donc user.uid continue de marcher
 *     partout dans l'application (App.js, AppContext, PageAdmin).
 *
 *  2. Les codes d'erreur. L'application teste 'auth/email-already-in-use'
 *     et 'auth/invalid-email' pour afficher des messages clairs. Les codes
 *     Supabase sont traduits vers ceux-là.
 *
 *  3. La création d'un compte sans déconnecter l'administrateur.
 *     C'est le point délicat — voir le commentaire détaillé plus bas.
 * ============================================================
 */

import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// `auth` n'est qu'un jeton : les pages écrivent signOut(auth), on garde la
// signature pour ne pas toucher aux appels.
export const auth = { __supabase: true };

// ---------- Forme de l'utilisateur ----------

const versUtilisateur = (u) =>
  u ? { ...u, uid: u.id, email: u.email } : null;

// ---------- Erreurs ----------

const CODES = {
  user_already_exists: 'auth/email-already-in-use',
  email_exists:        'auth/email-already-in-use',
  email_address_invalid: 'auth/invalid-email',
  validation_failed:   'auth/invalid-email',
};

const erreurAuth = (e) => {
  const err = new Error(e.message || "Erreur d'authentification");
  // D'abord le code renvoyé par Supabase, puis le message en repli : les
  // codes ont changé de nom entre deux versions de la bibliothèque, le
  // message est plus stable.
  const brut = e.code || e.error_code || '';
  if (CODES[brut]) err.code = CODES[brut];
  else if (/already registered|already been registered|already exists/i.test(e.message || '')) {
    err.code = 'auth/email-already-in-use';
  } else if (/invalid format|invalid email|validate email/i.test(e.message || '')) {
    err.code = 'auth/invalid-email';
  } else {
    err.code = brut || 'auth/unknown';
  }
  return err;
};

// ---------- Connexion ----------

export const signInWithEmailAndPassword = async (_auth, email, motDePasse) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(),
    password: motDePasse,
  });
  if (error) throw erreurAuth(error);
  return { user: versUtilisateur(data.user) };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw erreurAuth(error);
};

// ---------- Changement d'état ----------
//
// onAuthStateChanged de Firebase appelle la fonction fournie UNE PREMIÈRE
// FOIS avec l'état courant, y compris quand personne n'est connecté.
// App.js s'appuie là-dessus : c'est ce premier appel qui met fin à l'écran
// « Connexion au système... ». Sans lui, l'application resterait bloquée
// sur le chargement quand aucune session n'existe.
//
// L'interprète garantit donc ce premier appel, puis relaie les suivants.

export const onAuthStateChanged = (_auth, auChangement) => {
  let vivant = true;

  supabase.auth.getSession().then(({ data }) => {
    if (vivant) auChangement(versUtilisateur(data?.session?.user || null));
  });

  const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => {
    if (vivant) auChangement(versUtilisateur(session?.user || null));
  });

  return () => { vivant = false; abonnement?.subscription?.unsubscribe(); };
};

// ---------- Mot de passe oublié ----------

export const sendPasswordResetEmail = async (_auth, email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(
    String(email || '').trim().toLowerCase(),
    { redirectTo: `${window.location.origin}/` }
  );
  if (error) throw erreurAuth(error);
};

// ---------- Création d'un compte par l'administrateur ----------
//
// LE POINT DÉLICAT. Créer un compte connecte normalement ce nouveau compte
// — l'administrateur se retrouverait déconnecté au milieu de son travail.
//
// Avec Firebase, l'application contournait cela en ouvrant une
// « application secondaire » le temps de la création. L'équivalent exact
// ici est un SECOND CLIENT Supabase configuré avec persistSession: false :
// la session du nouveau compte n'est écrite nulle part, celle de
// l'administrateur n'est pas touchée.
//
// ⚠️ CECI SUPPOSE QUE LES INSCRIPTIONS SOIENT AUTORISÉES dans le projet
// Supabase (Authentication → Sign Ups). Si elles sont fermées — ce qui est
// plus sûr pour une application interne — la création doit passer par une
// fonction côté serveur (Edge Function) qui vérifie que l'appelant est
// bien ADMIN. C'est le SEUL endroit de toute la migration où un morceau
// côté serveur peut devenir nécessaire.
//
// Dans les deux cas, la clé de service (service_role) ne doit JAMAIS se
// trouver dans le navigateur : elle contourne toutes les règles de
// sécurité.

const clientIsole = () => createClient(
  process.env.REACT_APP_SUPABASE_URL || 'http://localhost:54321',
  process.env.REACT_APP_SUPABASE_ANON_KEY || 'cle-de-test',
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export const createUserWithEmailAndPassword = async (_auth, email, motDePasse) => {
  const isole = clientIsole();
  const { data, error } = await isole.auth.signUp({
    email: String(email || '').trim(),
    password: motDePasse,
  });
  if (error) throw erreurAuth(error);
  if (!data.user) {
    const e = new Error("Le compte n'a pas pu être créé.");
    e.code = 'auth/unknown';
    throw e;
  }
  return { user: versUtilisateur(data.user) };
};
