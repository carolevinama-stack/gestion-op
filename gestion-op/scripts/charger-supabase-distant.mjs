/**
 * ============================================================
 *  CHARGER LES DONNÉES DE DÉMONSTRATION DANS UN SUPABASE EN LIGNE
 * ============================================================
 *
 *  Remplit un projet Supabase hébergé avec les données fictives, en
 *  passant par l'API — donc sans avoir à coller des centaines de
 *  kilo-octets de SQL dans l'éditeur du navigateur, qui tronque
 *  silencieusement les gros collages.
 *
 *  ⚠️ LE PREMIER PROFIL DOIT EXISTER AVANT DE LANCER CE SCRIPT.
 *
 *  C'est le serpent qui se mord la queue, et c'est voulu : les règles
 *  d'accès exigent d'être ADMIN pour écrire, et il faut écrire pour
 *  devenir ADMIN. Personne ne peut donc s'attribuer un rôle.
 *
 *  Le tout premier profil se crée depuis l'éditeur SQL de Supabase,
 *  seul endroit qui passe au-dessus des règles :
 *
 *      insert into users (id, data)
 *      select u.id::text, jsonb_build_object(
 *        'uid', u.id::text, 'email', u.email,
 *        'nom', 'Administrateur', 'role', 'ADMIN', 'actif', true)
 *        from auth.users u where u.email = '<adresse de l administrateur>'
 *      on conflict (id) do update set data = excluded.data;
 *
 *  ------------------------------------------------------------
 *  USAGE — aucune clé n'est écrite dans ce fichier
 *
 *    SUPABASE_URL="https://xxxxx.supabase.co" \
 *    SUPABASE_KEY="sb_publishable_..." \
 *    SUPABASE_EMAIL="admin@demo.local" \
 *    SUPABASE_PASSWORD="..." \
 *    node scripts/charger-supabase-distant.mjs
 *
 *  La clé attendue est la clé PUBLIABLE (anon), jamais la clé secrète :
 *  celle-ci contourne toutes les règles et n'a rien à faire ici.
 * ============================================================
 */

import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { donneesFictives } from './donnees-fictives.mjs';

// Node n'utilise pas automatiquement le proxy de l'environnement :
// sans cette ligne, il ne résout même pas le nom de domaine.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));

const URL_BASE = process.env.SUPABASE_URL;
const CLE      = process.env.SUPABASE_KEY;
const EMAIL    = process.env.SUPABASE_EMAIL || 'admin@demo.local';
const MDP      = process.env.SUPABASE_PASSWORD;

if (!URL_BASE || !CLE || !MDP) {
  console.error('\n  Il manque SUPABASE_URL, SUPABASE_KEY ou SUPABASE_PASSWORD.\n');
  process.exit(1);
}

// ---------- Connexion ----------

const connexion = await (await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: CLE, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: MDP }),
})).json();

if (!connexion.access_token) {
  console.error('\n  Connexion refusée :', connexion.error_description || connexion.msg || JSON.stringify(connexion).slice(0, 200), '\n');
  process.exit(1);
}
console.log(`\n  Connecté : ${EMAIL}`);

const entetes = {
  apikey: CLE,
  Authorization: `Bearer ${connexion.access_token}`,
  'Content-Type': 'application/json',
  // merge-duplicates : le script peut être relancé sans rien casser.
  Prefer: 'resolution=merge-duplicates',
};

// ---------- Chargement ----------

const TABLES = {
  parametres: 'parametres', sources: 'sources', exercices: 'exercices',
  lignesBudgetaires: 'lignes_budgetaires', beneficiaires: 'beneficiaires',
  budgets: 'budgets', ops: 'ops', bordereaux: 'bordereaux', journal: 'journal',
};

const donnees = donneesFictives();
let echecs = 0;

console.log('');
for (const [collection, table] of Object.entries(TABLES)) {
  const docs = (donnees[collection] || []).map(({ id, ...champs }) => ({ id: String(id), data: champs }));
  let envoyes = 0, erreur = null;

  // Par lots de 100 : un seul appel pour 230 OP échouerait sur la taille.
  for (let i = 0; i < docs.length; i += 100) {
    const lot = docs.slice(i, i + 100);
    const reponse = await fetch(`${URL_BASE}/rest/v1/${table}`, {
      method: 'POST', headers: entetes, body: JSON.stringify(lot),
    });
    if (!reponse.ok) { erreur = (await reponse.text()).slice(0, 200); break; }
    envoyes += lot.length;
  }

  if (erreur) echecs++;
  console.log(`  ${erreur ? '✗' : '✓'} ${String(envoyes).padStart(4)}  ${collection}${erreur ? '\n        ' + erreur : ''}`);
}

console.log(echecs ? `\n  ✗ ${echecs} collection(s) en échec.\n` : '\n  ✓ Chargement terminé.\n');
process.exit(echecs ? 1 : 0);
