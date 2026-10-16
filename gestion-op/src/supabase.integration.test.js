/**
 * @jest-environment node
 */
/**
 * ============================================================
 *  ESSAI BOUT EN BOUT CONTRE UN VRAI SUPABASE
 * ============================================================
 *
 *  Les 418 autres tests remplacent la base par une doublure : ils
 *  vérifient la logique métier, pas le dialogue avec le serveur. Ce
 *  fichier-ci fait l'inverse — il exerce src/db.js et src/auth.js contre
 *  un Supabase réel, par le réseau.
 *
 *  C'est ce qui éprouve ce qu'aucune doublure ne peut éprouver : la
 *  syntaxe exactement transmise à PostgREST, les règles d'accès, les
 *  fonctions SQL, le temps réel, et la traduction des codes d'erreur.
 *
 *  IGNORÉ PAR DÉFAUT. Pour le lancer :
 *
 *    npx supabase start -x vector,logflare,studio,imgproxy,\
 *        storage-api,edge-runtime,postgres-meta,supavisor,mailpit
 *    psql "$PG" -f supabase/schema.sql -f supabase/fonctions.sql \
 *                -f supabase/securite.sql
 *    node scripts/preparer-supabase-local.mjs
 *    ESSAI_SUPABASE=true REACT_APP_SUPABASE_URL=... \
 *      REACT_APP_SUPABASE_ANON_KEY=... \
 *      CI=true npx react-scripts test --watchAll=false \
 *      --testPathPattern=supabase.integration
 * ============================================================
 */

/* eslint-disable jest/no-conditional-expect */

const actif = process.env.ESSAI_SUPABASE === 'true';
const decrire = actif ? describe : describe.skip;

// L'environnement de test de Create React App n'expose pas les fonctions
// réseau de Node (fetch, Headers, Request, Response) : il crée un contexte
// isolé qui ne les reprend pas. La bibliothèque Supabase en a besoin dès
// sa création. Dans un navigateur elles existent toujours — ce supplément
// ne concerne donc que les tests.
if (actif && typeof globalThis.Headers === 'undefined') {
  // Dans l'ordre : les flux web d'abord, car la bibliothèque réseau en
  // dépend elle-même.
  const flux = require('node:stream/web');
  for (const n of ['ReadableStream', 'WritableStream', 'TransformStream',
                   'ByteLengthQueuingStrategy', 'CountQueuingStrategy']) {
    if (!globalThis[n] && flux[n]) globalThis[n] = flux[n];
  }
  const util = require('node:util');
  if (!globalThis.TextEncoder) globalThis.TextEncoder = util.TextEncoder;
  if (!globalThis.TextDecoder) globalThis.TextDecoder = util.TextDecoder;
  const tampon = require('node:buffer');
  if (!globalThis.Blob) globalThis.Blob = tampon.Blob;
  if (!globalThis.File) globalThis.File = tampon.File;
  if (!globalThis.MessageChannel) {
    const wt = require('node:worker_threads');
    globalThis.MessageChannel = wt.MessageChannel;
    globalThis.MessagePort = wt.MessagePort;
  }
  if (!globalThis.DOMException) {
    // La bibliothèque réseau en hérite pour ses erreurs de connexion ;
    // elle a seulement besoin que la classe existe.
    globalThis.DOMException = class DOMException extends Error {
      constructor(message, name) { super(message); this.name = name || 'Error'; }
    };
  }
  if (!globalThis.structuredClone) {
    globalThis.structuredClone = (v) => JSON.parse(JSON.stringify(v));
  }

  const undici = require('undici');
  globalThis.fetch = undici.fetch;
  globalThis.Headers = undici.Headers;
  globalThis.Request = undici.Request;
  globalThis.Response = undici.Response;
  globalThis.FormData = undici.FormData;
  globalThis.WebSocket = undici.WebSocket;   // pour le temps réel
}

// src/auth.js utilise window.location.origin pour le lien de
// réinitialisation ; en environnement Node il n'existe pas.
if (!global.window) {
  global.window = { location: { origin: 'http://localhost:3000' } };
}

const MDP = 'motdepasse-essai-123';
const ADMIN = { email: 'admin@demo.local', uid: '11111111-1111-4111-8111-111111111111' };
const OPERATEUR = { email: 'operateur@demo.local', uid: '22222222-2222-4222-8222-222222222222' };
const LECTEUR = { email: 'lecteur@demo.local', uid: '33333333-3333-4333-8333-333333333333' };

let bd, authent;

beforeAll(async () => {
  if (!actif) return;
  bd = require('./db');
  authent = require('./auth');
});

afterEach(async () => {
  if (actif && authent) await authent.signOut().catch(() => {});
});

const connecter = async (compte) => {
  const { user } = await authent.signInWithEmailAndPassword(authent.auth, compte.email, MDP);
  return user;
};

// ============================================================
decrire('Supabase réel — authentification', () => {
  test("la connexion renvoie un utilisateur dont l'identifiant s'appelle uid", async () => {
    const user = await connecter(OPERATEUR);
    // Firebase nomme ce champ uid, Supabase le nomme id. Toute
    // l'application lit user.uid : c'est le point qui casserait tout.
    expect(user.uid).toBe(OPERATEUR.uid);
    expect(user.email).toBe(OPERATEUR.email);
  });

  test('un mot de passe faux est refusé', async () => {
    await expect(
      authent.signInWithEmailAndPassword(authent.auth, OPERATEUR.email, 'faux')
    ).rejects.toThrow();
  });

  test("onAuthStateChanged annonce l'état même quand personne n'est connecté", async () => {
    // C'est ce premier appel qui met fin à l'écran « Connexion au
    // système... » dans App.js. Sans lui, l'application reste bloquée.
    const vu = await new Promise((resoudre) => {
      const stop = authent.onAuthStateChanged(authent.auth, (u) => { stop(); resoudre(u); });
    });
    expect(vu === null || typeof vu === 'object').toBe(true);
  });
});

// ============================================================
decrire('Supabase réel — lectures', () => {
  test('getDocs sans filtre ramène les documents', async () => {
    await connecter(OPERATEUR);
    const snap = await bd.getDocs(bd.collection(bd.db, 'sources'));
    expect(snap.size).toBe(3);
    expect(snap.docs[0].data().nom).toBeTruthy();
  });

  test('un filtre simple est transmis correctement', async () => {
    await connecter(OPERATEUR);
    const snap = await bd.getDocs(bd.query(
      bd.collection(bd.db, 'ops'),
      bd.where('exerciceId', '==', 'ex-2025')
    ));
    expect(snap.size).toBe(20);
  });

  test("l'alternative or() du chargement initial ramène le bon ensemble", async () => {
    await connecter(OPERATEUR);
    const STATUTS = ['EN_COURS', 'TRANSMIS_CF', 'VISE_CF', 'DIFFERE_CF', 'REJETE_CF',
                     'TRANSMIS_AC', 'DIFFERE_AC', 'REJETE_AC', 'PAYE_PARTIEL', 'PAYE', 'ANNULE'];
    const snap = await bd.getDocs(bd.query(
      bd.collection(bd.db, 'ops'),
      bd.or(
        bd.where('exerciceId', '==', 'ex-2026'),
        bd.where('statut', 'in', STATUTS),
        bd.where('importAnterieur', '==', true)
      )
    ));
    // 230 OP au total, dont 20 archivés d'un exercice clos qui doivent
    // rester dehors.
    expect(snap.size).toBe(210);
  });

  test('les tableaux imbriqués ressortent intacts', async () => {
    await connecter(OPERATEUR);
    const snap = await bd.getDocs(bd.collection(bd.db, 'beneficiaires'));
    const avecRibs = snap.docs.map(d => d.data()).filter(b => (b.ribs || []).length > 0);
    expect(avecRibs.length).toBeGreaterThan(0);
    expect(avecRibs[0].ribs[0]).toHaveProperty('banque');
    expect(avecRibs[0].ribs[0]).toHaveProperty('numero');
  });

  test('getDoc sur un document absent renvoie exists() === false', async () => {
    await connecter(OPERATEUR);
    const snap = await bd.getDoc(bd.doc(bd.db, 'ops', 'op-qui-nexiste-pas'));
    expect(snap.exists()).toBe(false);
  });

  test('getCountFromServer compte sans rapatrier les documents', async () => {
    await connecter(OPERATEUR);
    const snap = await bd.getCountFromServer(bd.query(
      bd.collection(bd.db, 'ops'),
      bd.where('exerciceId', '==', 'ex-2025')
    ));
    expect(snap.data().count).toBe(20);
  });

  test('orderBy et limit sont transmis', async () => {
    await connecter(OPERATEUR);
    const snap = await bd.getDocs(bd.query(
      bd.collection(bd.db, 'beneficiaires'),
      bd.orderBy('nom', 'asc'),
      bd.limit(5)
    ));
    expect(snap.size).toBe(5);
    const noms = snap.docs.map(d => d.data().nom);
    expect([...noms].sort((a, b) => a.localeCompare(b))).toEqual(noms);
  });
});

// ============================================================
decrire('Supabase réel — écritures', () => {
  test('addDoc crée et renvoie un identifiant', async () => {
    await connecter(OPERATEUR);
    const ref = await bd.addDoc(bd.collection(bd.db, 'beneficiaires'),
      { nom: 'ESSAI INTEGRATION', ncc: 'CI-0000001', ribs: [] });
    expect(ref.id).toBeTruthy();
    const relu = await bd.getDoc(bd.doc(bd.db, 'beneficiaires', ref.id));
    expect(relu.data().nom).toBe('ESSAI INTEGRATION');
    await bd.deleteDoc(bd.doc(bd.db, 'beneficiaires', ref.id));
  });

  test('updateDoc FUSIONNE au lieu de remplacer', async () => {
    await connecter(OPERATEUR);
    const ref = bd.doc(bd.db, 'beneficiaires', 'ben-001');
    const avant = (await bd.getDoc(ref)).data();
    await bd.updateDoc(ref, { ncc: 'CI-9999999' });
    const apres = (await bd.getDoc(ref)).data();
    expect(apres.ncc).toBe('CI-9999999');
    // Le point qui compte : le reste du document n'a pas été effacé.
    expect(apres.nom).toBe(avant.nom);
    expect(apres.ribs).toEqual(avant.ribs);
    await bd.updateDoc(ref, { ncc: avant.ncc });
  });

  test('un lot à cheval sur deux tables est validé ensemble', async () => {
    await connecter(OPERATEUR);
    const lot = bd.writeBatch(bd.db);
    const btRef = bd.doc(bd.collection(bd.db, 'bordereaux'));
    lot.set(btRef, { numero: 'BT-ESSAI-INT', type: 'CF', sourceId: 'src-bm', exerciceId: 'ex-2026', statut: 'EN_COURS' });
    lot.update(bd.doc(bd.db, 'ops', 'op-BM-030'), { bordereauCF: 'BT-ESSAI-INT' });
    lot.update(bd.doc(bd.db, 'ops', 'op-BM-031'), { bordereauCF: 'BT-ESSAI-INT' });
    await lot.commit();

    expect((await bd.getDoc(btRef)).data().numero).toBe('BT-ESSAI-INT');
    expect((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-030'))).data().bordereauCF).toBe('BT-ESSAI-INT');
    expect((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-031'))).data().bordereauCF).toBe('BT-ESSAI-INT');

    const nettoyage = bd.writeBatch(bd.db);
    nettoyage.delete(btRef);
    await nettoyage.commit();
  });

  test("un lot dont un OP est introuvable n'écrit RIEN", async () => {
    await connecter(OPERATEUR);
    const btRef = bd.doc(bd.db, 'bordereaux', 'bt-fantome-int');
    const statutAvant = (await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-032'))).data().statut;

    const lot = bd.writeBatch(bd.db);
    lot.set(btRef, { numero: 'BT FANTOME' });
    lot.update(bd.doc(bd.db, 'ops', 'op-BM-032'), { statut: 'TRANSMIS_CF' });
    lot.update(bd.doc(bd.db, 'ops', 'op-INEXISTANT'), { statut: 'TRANSMIS_CF' });

    await expect(lot.commit()).rejects.toThrow();

    // Ni le bordereau créé, ni l'OP modifié : tout ou rien.
    expect((await bd.getDoc(btRef)).exists()).toBe(false);
    expect((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-032'))).data().statut).toBe(statutAvant);
  });

  test('runTransaction lit, calcule en JavaScript, puis écrit', async () => {
    await connecter(OPERATEUR);
    const ref = bd.doc(bd.db, 'ops', 'op-BM-040');
    await bd.updateDoc(ref, { paiements: [], totalPaye: 0 });

    const resultat = await bd.runTransaction(bd.db, async (tx) => {
      const snap = await tx.get(ref);
      const op = snap.data();
      const paiements = [...(op.paiements || []), { montant: 1000, reference: 'INT-1' }];
      const total = paiements.reduce((s, p) => s + p.montant, 0);
      // La règle du statut : en JavaScript, pas en SQL.
      const statut = Math.round(op.montant) - total === 0 ? 'PAYE' : 'PAYE_PARTIEL';
      tx.update(ref, { paiements, totalPaye: total, statut });
      return { total, statut };
    });

    expect(resultat.total).toBe(1000);
    const relu = (await bd.getDoc(ref)).data();
    expect(relu.totalPaye).toBe(1000);
    expect(relu.paiements).toHaveLength(1);
  });

  test('attribuer_numero ne rend jamais deux fois le même numéro', async () => {
    await connecter(OPERATEUR);
    const resultats = await Promise.all(
      Array.from({ length: 10 }, () => bd.attribuerNumero({
        compteurId: 'OP_integration_essai', type: 'OP',
        sourceId: 'src-bm', exerciceId: 'ex-2026', init: 0,
      }))
    );
    expect(new Set(resultats).size).toBe(10);
  });
});

// ============================================================
decrire("Supabase réel — règles d'accès", () => {
  test('un compte CONSULTATION lit les OP mais ne peut pas en créer', async () => {
    await connecter(LECTEUR);
    const snap = await bd.getDocs(bd.collection(bd.db, 'ops'));
    expect(snap.size).toBeGreaterThan(0);

    await expect(
      bd.addDoc(bd.collection(bd.db, 'ops'), { statut: 'EN_COURS', montant: 1 })
    ).rejects.toThrow();
  });

  test("le refus porte le code permission-denied, pour que le message soit lisible", async () => {
    await connecter(LECTEUR);
    // utils/erreursFirebase.js traduit ce code en message clair ; sans la
    // traduction, l'utilisateur verrait « Erreur système ».
    const erreur = await bd.addDoc(bd.collection(bd.db, 'ops'), { statut: 'EN_COURS' })
      .then(() => null, (e) => e);
    expect(erreur).not.toBeNull();
    expect(erreur.code).toBe('permission-denied');
  });

  test("un OPERATEUR ne voit pas le journal, un ADMIN le voit", async () => {
    await connecter(OPERATEUR);
    const vuOperateur = await bd.getDocs(bd.collection(bd.db, 'journal'));
    expect(vuOperateur.size).toBe(0);   // masqué, pas en erreur

    await authent.signOut();
    await connecter(ADMIN);
    const vuAdmin = await bd.getDocs(bd.collection(bd.db, 'journal'));
    expect(vuAdmin.size).toBeGreaterThan(0);
  });

  test('personne ne peut supprimer un OP, pas même un ADMIN', async () => {
    await connecter(ADMIN);
    const avant = (await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-050'))).exists();
    expect(avant).toBe(true);
    // La suppression ne lève pas forcément d'erreur : RLS n'autorise
    // simplement aucune ligne. L'OP doit être toujours là.
    await bd.deleteDoc(bd.doc(bd.db, 'ops', 'op-BM-050')).catch(() => {});
    expect((await bd.getDoc(bd.doc(bd.db, 'ops', 'op-BM-050'))).exists()).toBe(true);
  });

  test('un OPERATEUR ne peut pas se promouvoir ADMIN', async () => {
    await connecter(OPERATEUR);
    await bd.updateDoc(bd.doc(bd.db, 'users', OPERATEUR.uid), { role: 'ADMIN' })
      .catch(() => {});
    const profil = (await bd.getDoc(bd.doc(bd.db, 'users', OPERATEUR.uid))).data();
    expect(profil.role).toBe('OPERATEUR');
  });

  test("un OPERATEUR ne voit pas l'annuaire des autres comptes", async () => {
    await connecter(OPERATEUR);
    const snap = await bd.getDocs(bd.collection(bd.db, 'users'));
    expect(snap.size).toBe(1);                       // le sien seulement
    expect(snap.docs[0].id).toBe(OPERATEUR.uid);
  });
});

// ============================================================
decrire('Supabase réel — temps réel', () => {
  test('onSnapshot livre la liste puis la relivre après une modification', async () => {
    await connecter(OPERATEUR);

    const livraisons = [];
    const stop = bd.onSnapshot(
      bd.query(bd.collection(bd.db, 'bordereaux'), bd.where('exerciceId', '==', 'ex-2026')),
      (snap) => livraisons.push(snap.size),
      (e) => { throw e; }
    );

    // Première livraison : l'ensemble, comme le faisait Firestore.
    await new Promise((r) => setTimeout(r, 2500));
    expect(livraisons.length).toBeGreaterThan(0);
    const premiere = livraisons[livraisons.length - 1];
    expect(premiere).toBe(12);

    // Un ajout doit provoquer une nouvelle livraison, sans rien demander.
    const ref = await bd.addDoc(bd.collection(bd.db, 'bordereaux'),
      { numero: 'BT-TEMPS-REEL', type: 'CF', sourceId: 'src-bm', exerciceId: 'ex-2026', statut: 'EN_COURS' });

    await new Promise((r) => setTimeout(r, 3000));
    expect(livraisons[livraisons.length - 1]).toBe(premiere + 1);

    stop();
    await bd.deleteDoc(bd.doc(bd.db, 'bordereaux', ref.id));
  }, 30000);
});
