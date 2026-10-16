/**
 * ============================================================
 *  ESSAI BOUT EN BOUT CONTRE UN VRAI SUPABASE
 * ============================================================
 *
 *  Les 418 tests remplacent la base par une doublure : ils vérifient la
 *  logique métier, pas le dialogue avec le serveur. Ce script fait
 *  l'inverse — il exerce src/db.js et src/auth.js contre un Supabase
 *  réel, par le réseau.
 *
 *  C'est ce qu'aucune doublure ne peut éprouver : la syntaxe exactement
 *  transmise à PostgREST, les règles d'accès, les fonctions SQL, le temps
 *  réel, et la traduction des codes d'erreur.
 *
 *  ----------------------------------------------------------
 *  POURQUOI UN SCRIPT ET NON UN FICHIER DE TEST
 *  ----------------------------------------------------------
 *
 *  Première tentative : un fichier .test.js lancé par react-scripts.
 *  Impossible. L'environnement de test de Create React App crée un
 *  contexte isolé et remplace les modules de Node par des imitations
 *  destinées au navigateur — son module `events` n'a pas
 *  removeAbortListener, dont la pile réseau de Node a besoin. Aucun
 *  rapiéçage n'en vient à bout.
 *
 *  Ici, Node tourne normalement : fetch, WebSocket et le reste
 *  fonctionnent nativement, sans rien fournir.
 *
 *  Le script importe des COPIES de src/supabase.js, src/db.js et
 *  src/auth.js, inchangées sauf l'extension et les chemins d'import —
 *  Node exige .mjs pour lire des modules ES dans ce projet. Le code
 *  éprouvé est donc bien celui de l'application.
 *
 *  ----------------------------------------------------------
 *  USAGE
 *  ----------------------------------------------------------
 *
 *    npx supabase start -x vector,logflare,studio,imgproxy,\
 *        storage-api,edge-runtime,postgres-meta,supavisor,mailpit
 *    psql "$PG" -f supabase/schema.sql -f supabase/fonctions.sql \
 *                -f supabase/securite.sql
 *    node scripts/essai-bout-en-bout.mjs
 *
 *  Le script recharge lui-même les données avant de commencer, pour que
 *  deux exécutions de suite donnent le même résultat.
 * ============================================================
 */

import { setGlobalDispatcher, ProxyAgent } from 'undici';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

// Node n'utilise pas automatiquement le proxy de l'environnement : sans
// cela, un Supabase EN LIGNE n'est même pas résolu. Sans effet en local.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy) setGlobalDispatcher(new ProxyAgent(proxy));

const API = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const ANON = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

process.env.REACT_APP_SUPABASE_URL = API;
process.env.REACT_APP_SUPABASE_ANON_KEY = ANON;

// ---------- Copies .mjs du code applicatif ----------

// Les copies vivent DANS le projet : hors de son arborescence, Node ne
// retrouverait pas @supabase/supabase-js. Dossier ignoré par git.
const TEMP = '.essai-mjs';
rmSync(TEMP, { recursive: true, force: true });
mkdirSync(TEMP, { recursive: true });
for (const nom of ['supabase', 'db', 'auth']) {
  const source = readFileSync(join('src', `${nom}.js`), 'utf8')
    .replace(/from '\.\/supabase'/g, "from './supabase.mjs'")
    .replace(/from '\.\/db'/g, "from './db.mjs'")
    .replace(/from '\.\/auth'/g, "from './auth.mjs'");
  writeFileSync(join(TEMP, `${nom}.mjs`), source);
}

// ---------- Données fraîches ----------

// Le rechargement n'a de sens qu'en local : il passe par PostgreSQL en
// direct. Contre un Supabase en ligne, les données sont déjà en place.
if (process.env.SANS_RECHARGEMENT === 'true') {
  console.log('\n  (données déjà en place, pas de rechargement)');
} else {
  console.log('\n  Rechargement des données...');
  execFileSync('node', ['scripts/preparer-supabase-local.mjs'], { stdio: 'pipe' });
}

// Import dynamique : Node exige une adresse de fichier complète, un
// chemin relatif étant interprété comme un nom de bibliothèque.
const bd = await import(pathToFileURL(resolve(TEMP, 'db.mjs')).href);
const authent = await import(pathToFileURL(resolve(TEMP, 'auth.mjs')).href);

// ---------- Vérifications ----------

const MDP = process.env.MDP_ADMIN || 'motdepasse-essai-123';
const MDP_AUTRES = process.env.MDP_AUTRES || MDP;
// Les épreuves de droits exigent les comptes opérateur et lecteur. Quand
// leurs mots de passe ne sont pas connus, elles sont annoncées comme non
// exécutées plutôt que comptées en échec — un test qu'on ne peut pas
// faire n'est pas un test raté.
const AUTRES_DISPONIBLES = process.env.AUTRES_COMPTES !== 'non';
const ADMIN = { email: 'admin@demo.local', uid: '11111111-1111-4111-8111-111111111111' };
const OPERATEUR = { email: 'operateur@demo.local', uid: '22222222-2222-4222-8222-222222222222' };
const LECTEUR = { email: 'lecteur@demo.local', uid: '33333333-3333-4333-8333-333333333333' };

let reussites = 0;
const echecs = [];
let groupe = '';

const titre = (t) => { groupe = t; console.log(`\n  ${t}`); };

const verifier = async (nom, fn) => {
  try {
    await fn();
    reussites++;
    console.log(`    ✓ ${nom}`);
  } catch (e) {
    echecs.push({ groupe, nom, message: e.message });
    console.log(`    ✗ ${nom}`);
    console.log(`        ${String(e.message).split('\n')[0].slice(0, 160)}`);
  }
};

const egal = (obtenu, attendu, quoi = '') => {
  const a = JSON.stringify(obtenu), b = JSON.stringify(attendu);
  if (a !== b) throw new Error(`${quoi} attendu ${b}, obtenu ${a}`);
};
const vrai = (c, quoi) => { if (!c) throw new Error(quoi || 'condition fausse'); };

const connecter = async (compte) => {
  await authent.signOut().catch(() => {});
  const mdp = compte === ADMIN ? MDP : MDP_AUTRES;
  const { user } = await authent.signInWithEmailAndPassword(authent.auth, compte.email, mdp);
  return user;
};

const ignores = [];
const verifierSiPossible = async (nom, fn) => {
  if (!AUTRES_DISPONIBLES) { ignores.push(nom); console.log(`    – ${nom}  (compte non disponible)`); return; }
  return verifier(nom, fn);
};

// ============================================================
titre('AUTHENTIFICATION');

await verifier("la connexion renvoie un utilisateur dont l'identifiant s'appelle uid", async () => {
  const cible = AUTRES_DISPONIBLES ? OPERATEUR : ADMIN;
  const user = await connecter(cible);
  // Firebase nomme ce champ uid, Supabase le nomme id. Toute
  // l'application lit user.uid : c'est le point qui casserait tout.
  egal(typeof user.uid, 'string', 'uid présent');
  egal(user.email, cible.email, 'email');
});

await verifier('un mot de passe faux est refusé', async () => {
  let refuse = false;
  await authent.signInWithEmailAndPassword(authent.auth, ADMIN.email, 'faux')
    .catch(() => { refuse = true; });
  vrai(refuse, 'la connexion avec un mauvais mot de passe a été acceptée');
});

await verifier("onAuthStateChanged annonce l'état dès le premier appel", async () => {
  // C'est ce premier appel qui met fin à l'écran « Connexion au
  // système... » dans App.js. Sans lui, l'application reste bloquée.
  await authent.signOut().catch(() => {});
  const vu = await new Promise((resoudre, rejeter) => {
    const minuteur = setTimeout(() => rejeter(new Error('aucun appel en 5 s')), 5000);
    const stop = authent.onAuthStateChanged(authent.auth, (u) => {
      clearTimeout(minuteur); stop(); resoudre(u);
    });
  });
  vrai(vu === null || typeof vu === 'object', 'état inattendu');
});

// ============================================================
titre('LECTURES');

await verifier('getDocs sans filtre ramène les documents', async () => {
  await connecter(AUTRES_DISPONIBLES ? OPERATEUR : ADMIN);
  const snap = await bd.getDocs(bd.collection(bd.db, 'sources'));
  egal(snap.size, 3, 'nombre de sources');
  vrai(snap.docs[0].data().nom, 'le champ nom est vide');
});

await verifier('un filtre simple est transmis correctement', async () => {
  const snap = await bd.getDocs(bd.query(
    bd.collection(bd.db, 'ops'), bd.where('exerciceId', '==', 'ex-2025')));
  egal(snap.size, 20, 'OP de 2025');
});

await verifier("l'alternative or() du chargement initial ramène le bon ensemble", async () => {
  const STATUTS = ['EN_COURS', 'TRANSMIS_CF', 'VISE_CF', 'DIFFERE_CF', 'REJETE_CF',
                   'TRANSMIS_AC', 'DIFFERE_AC', 'REJETE_AC', 'PAYE_PARTIEL', 'PAYE', 'ANNULE'];
  const snap = await bd.getDocs(bd.query(bd.collection(bd.db, 'ops'), bd.or(
    bd.where('exerciceId', '==', 'ex-2026'),
    bd.where('statut', 'in', STATUTS),
    bd.where('importAnterieur', '==', true))));
  // 230 OP au total, dont 20 archivés d'un exercice clos qui restent dehors.
  egal(snap.size, 210, 'OP chargés');
});

await verifier('les tableaux imbriqués ressortent intacts', async () => {
  const snap = await bd.getDocs(bd.collection(bd.db, 'beneficiaires'));
  const avecRibs = snap.docs.map(d => d.data()).filter(b => (b.ribs || []).length > 0);
  vrai(avecRibs.length > 0, 'aucun bénéficiaire avec RIB');
  vrai(avecRibs[0].ribs[0].banque, 'banque absente');
  vrai(avecRibs[0].ribs[0].numero, 'numéro absent');
});

await verifier('getDoc sur un document absent renvoie exists() === false', async () => {
  const snap = await bd.getDoc(bd.doc(bd.db, 'ops', 'op-qui-nexiste-pas'));
  egal(snap.exists(), false, 'exists()');
});

await verifier('getCountFromServer compte sans rapatrier les documents', async () => {
  const snap = await bd.getCountFromServer(bd.query(
    bd.collection(bd.db, 'ops'), bd.where('exerciceId', '==', 'ex-2025')));
  egal(snap.data().count, 20, 'décompte');
});

await verifier('orderBy et limit sont transmis', async () => {
  const snap = await bd.getDocs(bd.query(
    bd.collection(bd.db, 'beneficiaires'), bd.orderBy('nom', 'asc'), bd.limit(5)));
  egal(snap.size, 5, 'nombre');
  const noms = snap.docs.map(d => d.data().nom);
  egal(noms, [...noms].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)), 'ordre');
});

// ============================================================
titre('ÉCRITURES');

await verifier('addDoc crée et renvoie un identifiant', async () => {
  const ref = await bd.addDoc(bd.collection(bd.db, 'beneficiaires'),
    { nom: 'ESSAI BOUT EN BOUT', ncc: 'CI-0000001', ribs: [] });
  vrai(ref.id, 'identifiant absent');
  const relu = await bd.getDoc(bd.doc(bd.db, 'beneficiaires', ref.id));
  egal(relu.data().nom, 'ESSAI BOUT EN BOUT', 'nom relu');
  await bd.deleteDoc(bd.doc(bd.db, 'beneficiaires', ref.id));
});

await verifier('updateDoc FUSIONNE au lieu de remplacer', async () => {
  const ref = bd.doc(bd.db, 'beneficiaires', 'ben-001');
  const avant = (await bd.getDoc(ref)).data();
  await bd.updateDoc(ref, { ncc: 'CI-9999999' });
  const apres = (await bd.getDoc(ref)).data();
  egal(apres.ncc, 'CI-9999999', 'ncc');
  // Le point qui compte : le reste du document n'a pas été effacé.
  egal(apres.nom, avant.nom, 'nom préservé');
  egal(apres.ribs, avant.ribs, 'RIB préservés');
});

await verifier('un lot à cheval sur deux tables est validé ensemble', async () => {
  const lot = bd.writeBatch(bd.db);
  const btRef = bd.doc(bd.collection(bd.db, 'bordereaux'));
  lot.set(btRef, { numero: 'BT-ESSAI-BEB', type: 'CF', sourceId: 'src-bm', exerciceId: 'ex-2026', statut: 'EN_COURS' });
  lot.update(bd.doc(bd.db, 'ops', 'op-BM-030'), { bordereauCF: 'BT-ESSAI-BEB' });
  lot.update(bd.doc(bd.db, 'ops', 'op-BM-031'), { bordereauCF: 'BT-ESSAI-BEB' });
  await lot.commit();

  egal((await bd.getDoc(btRef)).data().numero, 'BT-ESSAI-BEB', 'bordereau');
  egal((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-030'))).data().bordereauCF, 'BT-ESSAI-BEB', 'OP 030');
  egal((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-031'))).data().bordereauCF, 'BT-ESSAI-BEB', 'OP 031');

  const nettoyage = bd.writeBatch(bd.db);
  nettoyage.delete(btRef);
  await nettoyage.commit();
});

await verifier("un lot dont un OP est introuvable n'écrit RIEN", async () => {
  const btRef = bd.doc(bd.db, 'bordereaux', 'bt-fantome-beb');
  const statutAvant = (await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-032'))).data().statut;

  const lot = bd.writeBatch(bd.db);
  lot.set(btRef, { numero: 'BT FANTOME' });
  lot.update(bd.doc(bd.db, 'ops', 'op-BM-032'), { statut: 'TRANSMIS_CF' });
  lot.update(bd.doc(bd.db, 'ops', 'op-INEXISTANT'), { statut: 'TRANSMIS_CF' });

  let refuse = false;
  await lot.commit().catch(() => { refuse = true; });
  vrai(refuse, 'le lot a été accepté alors qu\'un OP est introuvable');

  // Ni le bordereau créé, ni l'OP modifié : tout ou rien.
  egal((await bd.getDoc(btRef)).exists(), false, 'bordereau fantôme');
  egal((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-032'))).data().statut, statutAvant, 'statut inchangé');
});

await verifier('runTransaction lit, calcule en JavaScript, puis écrit', async () => {
  const ref = bd.doc(bd.db, 'ops', 'op-BM-040');
  await bd.updateDoc(ref, { paiements: [], totalPaye: 0 });

  const resultat = await bd.runTransaction(bd.db, async (tx) => {
    const op = (await tx.get(ref)).data();
    const paiements = [...(op.paiements || []), { montant: 1000, reference: 'BEB-1' }];
    const total = paiements.reduce((s, p) => s + p.montant, 0);
    // La règle du statut : en JavaScript, pas en SQL.
    const statut = Math.round(op.montant) - total === 0 ? 'PAYE' : 'PAYE_PARTIEL';
    tx.update(ref, { paiements, totalPaye: total, statut });
    return { total, statut };
  });

  egal(resultat.total, 1000, 'total renvoyé');
  const relu = (await bd.getDoc(ref)).data();
  egal(relu.totalPaye, 1000, 'total enregistré');
  egal(relu.paiements.length, 1, 'nombre de paiements');
});

await verifier('20 paiements simultanés : aucun écrasé', async () => {
  const ref = bd.doc(bd.db, 'ops', 'op-BM-041');
  await bd.updateDoc(ref, { paiements: [], totalPaye: 0 });

  const unPaiement = (n) => bd.runTransaction(bd.db, async (tx) => {
    const op = (await tx.get(ref)).data();
    const paiements = [...(op.paiements || []), { montant: 500, reference: `C-${n}` }];
    tx.update(ref, { paiements, totalPaye: paiements.reduce((s, p) => s + p.montant, 0) });
  });

  await Promise.all(Array.from({ length: 20 }, (_, i) => unPaiement(i + 1)));
  const relu = (await bd.getDoc(ref)).data();
  egal(relu.paiements.length, 20, 'paiements conservés');
  egal(relu.totalPaye, 10000, 'total');
});

await verifier('attribuer_numero ne rend jamais deux fois le même numéro', async () => {
  const resultats = await Promise.all(Array.from({ length: 10 }, () => bd.attribuerNumero({
    compteurId: 'OP_beb_essai', type: 'OP', sourceId: 'src-bm', exerciceId: 'ex-2026', init: 0,
  })));
  egal(new Set(resultats).size, 10, 'numéros distincts');
});

// ============================================================
titre("RÈGLES D'ACCÈS");

await verifierSiPossible('un compte CONSULTATION lit les OP mais ne peut pas en créer', async () => {
  await connecter(LECTEUR);
  const snap = await bd.getDocs(bd.collection(bd.db, 'ops'));
  vrai(snap.size > 0, 'un lecteur ne voit aucun OP');

  let refuse = false;
  await bd.addDoc(bd.collection(bd.db, 'ops'), { statut: 'EN_COURS', montant: 1 })
    .catch(() => { refuse = true; });
  vrai(refuse, 'un lecteur a pu créer un OP');
});

await verifierSiPossible('le refus porte le code permission-denied', async () => {
  // utils/erreursFirebase.js traduit ce code en message clair ; sans la
  // traduction, l'utilisateur verrait « Erreur système ».
  const erreur = await bd.addDoc(bd.collection(bd.db, 'ops'), { statut: 'EN_COURS' })
    .then(() => null, (e) => e);
  vrai(erreur, 'aucune erreur levée');
  egal(erreur.code, 'permission-denied', 'code');
});

await verifierSiPossible('un OPERATEUR ne voit pas le journal, un ADMIN le voit', async () => {
  await connecter(OPERATEUR);
  egal((await bd.getDocs(bd.collection(bd.db, 'journal'))).size, 0, 'journal vu par un opérateur');
  await connecter(ADMIN);
  vrai((await bd.getDocs(bd.collection(bd.db, 'journal'))).size > 0, 'un admin ne voit pas le journal');
});

await verifier('personne ne peut supprimer un OP, pas même un ADMIN', async () => {
  await connecter(ADMIN);
  vrai((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-050'))).exists(), 'OP absent au départ');
  // La suppression ne lève pas forcément d'erreur : les règles
  // n'autorisent simplement aucune ligne. L'OP doit être toujours là.
  await bd.deleteDoc(bd.doc(bd.db, 'ops', 'op-BM-050')).catch(() => {});
  vrai((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-050'))).exists(), 'un ADMIN a supprimé un OP');
});

await verifierSiPossible('un OPERATEUR ne peut pas se promouvoir ADMIN', async () => {
  await connecter(OPERATEUR);
  await bd.updateDoc(bd.doc(bd.db, 'users', OPERATEUR.uid), { role: 'ADMIN' }).catch(() => {});
  const profil = (await bd.getDoc(bd.doc(bd.db, 'users', OPERATEUR.uid))).data();
  egal(profil.role, 'OPERATEUR', 'rôle');
});

await verifierSiPossible("un OPERATEUR ne voit pas l'annuaire des autres comptes", async () => {
  const snap = await bd.getDocs(bd.collection(bd.db, 'users'));
  egal(snap.size, 1, 'comptes visibles');
  egal(snap.docs[0].id, OPERATEUR.uid, 'identifiant du seul compte visible');
});

// ============================================================
titre('TEMPS RÉEL');

await verifier('onSnapshot livre la liste puis la relivre après un ajout', async () => {
  await connecter(AUTRES_DISPONIBLES ? OPERATEUR : ADMIN);
  const livraisons = [];
  const stop = bd.onSnapshot(
    bd.query(bd.collection(bd.db, 'bordereaux'), bd.where('exerciceId', '==', 'ex-2026')),
    (snap) => livraisons.push(snap.size),
    (e) => { throw e; });

  try {
    // Première livraison : l'ensemble, comme le faisait Firestore.
    await new Promise((r) => setTimeout(r, 3000));
    vrai(livraisons.length > 0, 'aucune livraison initiale');
    const premiere = livraisons[livraisons.length - 1];
    egal(premiere, 12, 'bordereaux livrés');

    // Un ajout doit provoquer une nouvelle livraison, sans rien demander.
    const ref = await bd.addDoc(bd.collection(bd.db, 'bordereaux'),
      { numero: 'BT-TEMPS-REEL', type: 'CF', sourceId: 'src-bm', exerciceId: 'ex-2026', statut: 'EN_COURS' });
    await new Promise((r) => setTimeout(r, 4000));
    egal(livraisons[livraisons.length - 1], premiere + 1, 'après ajout');
    await bd.deleteDoc(bd.doc(bd.db, 'bordereaux', ref.id));
  } finally {
    stop();
  }
});

// ============================================================

console.log('\n  ' + '='.repeat(62));
console.log(`  ${reussites} réussites, ${echecs.length} échec(s)` + (ignores.length ? `, ${ignores.length} non exécutée(s)` : '') + ` sur ${reussites + echecs.length + ignores.length}`);
if (echecs.length) {
  console.log('');
  for (const e of echecs) console.log(`    ✗ [${e.groupe}] ${e.nom}\n        ${String(e.message).slice(0, 200)}`);
}
console.log('  ' + '='.repeat(62) + '\n');
process.exit(echecs.length ? 1 : 0);
