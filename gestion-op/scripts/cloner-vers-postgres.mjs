#!/usr/bin/env node
/**
 * ============================================================
 *  CLONAGE Firestore → PostgreSQL
 * ============================================================
 *
 *  Ce script ne se connecte JAMAIS à Firestore. Il lit un export JSON
 *  déjà produit, et l'écrit dans PostgreSQL. C'est volontaire : aucun
 *  risque qu'un essai touche la base de production.
 *
 *  Deux usages :
 *
 *    node scripts/cloner-vers-postgres.mjs --fictif
 *        remplit la base avec des données inventées (aucun nom réel,
 *        aucun RIB réel) pour éprouver le schéma et l'application.
 *
 *    node scripts/cloner-vers-postgres.mjs --fichier Export_Complet_20261017.json
 *        lit le fichier produit par le bouton « Exporter tout (JSON) »
 *        de l'application (Paramètres → Maintenance). C'est le chemin
 *        normal d'une migration : un clic, un fichier, une commande.
 *
 *    node scripts/cloner-vers-postgres.mjs --export <dossier>
 *        lit <dossier>/ops.json, budgets.json, etc. et les importe.
 *        Chaque fichier contient soit un tableau d'objets possédant un
 *        champ `id`, soit un objet dont les clés sont les identifiants.
 *
 *  Dans les deux cas, le script RECOMPTE à la fin : nombre de documents
 *  lus contre nombre de lignes présentes en base. Un clonage qui perd un
 *  document se voit immédiatement.
 *
 *  --vider : repartir d'une base vide, ce qu'exige une vraie migration.
 *            Le vidage se fait dans la même transaction que le clonage :
 *            si celui-ci échoue, les données d'avant sont toujours là.
 *
 *  Connexion : variable PG_URL, par défaut la base d'essai locale.
 * ============================================================
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';

const PG_URL = process.env.PG_URL
  || 'postgresql://postgres@/gestionop?host=/tmp&port=54322';

// Collection Firestore → table PostgreSQL
const TABLES = {
  sources:            'sources',
  exercices:          'exercices',
  lignesBudgetaires:  'lignes_budgetaires',
  beneficiaires:      'beneficiaires',
  budgets:            'budgets',
  ops:                'ops',
  bordereaux:         'bordereaux',
  journal:            'journal',
  users:              'users',
  parametres:         'parametres',
};

// ------------------------------------------------------------
//  Lecture d'un export
// ------------------------------------------------------------

const lireExport = (dossier) => {
  const data = {};
  for (const collection of Object.keys(TABLES)) {
    const chemin = join(dossier, `${collection}.json`);
    if (!existsSync(chemin)) {
      console.warn(`  ⚠ ${collection}.json absent — collection ignorée`);
      data[collection] = [];
      continue;
    }
    const brut = JSON.parse(readFileSync(chemin, 'utf8'));
    // Tableau d'objets avec `id`, ou objet indexé par identifiant
    data[collection] = Array.isArray(brut)
      ? brut
      : Object.entries(brut).map(([id, champs]) => ({ id, ...champs }));
  }
  return data;
};

// ------------------------------------------------------------
//  Lecture du fichier produit par le bouton « Exporter tout (JSON) »
// ------------------------------------------------------------
//
//  Ce bouton, dans Paramètres → Maintenance, produit UN SEUL fichier
//  contenant toutes les collections, plus un en-tête _export qui compte
//  les documents collection par collection.
//
//  Cet en-tête est précieux : il a été écrit par l'application au moment
//  de l'export, donc AVANT tout transport du fichier. Le comparer après
//  import vérifie la chaîne entière — l'export, le transfert, et le
//  chargement — et pas seulement la dernière étape.

const lireFichierUnique = (chemin) => {
  const brut = JSON.parse(readFileSync(chemin, 'utf8'));
  const data = {};
  for (const collection of Object.keys(TABLES)) {
    data[collection] = brut[collection] || [];
  }
  return { data, entete: brut._export || null };
};

// ------------------------------------------------------------
//  Écriture
// ------------------------------------------------------------

const ecrire = async (client, collection, documents) => {
  const table = TABLES[collection];
  if (!table) throw new Error(`Collection inconnue : ${collection}`);

  for (const doc of documents) {
    const { id, ...champs } = doc;
    if (!id) throw new Error(`Document sans identifiant dans ${collection}`);
    // Le document entier part dans `data`. Les colonnes filtrables sont
    // calculées par PostgreSQL lui-même : rien à mapper ici, donc rien
    // à oublier.
    await client.query(
      `insert into ${table} (id, data) values ($1, $2)
       on conflict (id) do update set data = excluded.data`,
      [String(id), JSON.stringify(champs)]
    );
  }
  return documents.length;
};

// ------------------------------------------------------------
//  Vérification : ce qui est entré est-il bien là ?
// ------------------------------------------------------------

const verifier = async (client, attendus, entete) => {
  console.log('\n  VÉRIFICATION');
  console.log('  ' + '-'.repeat(60));
  let manquants = 0;
  let surnumeraires = 0;
  for (const [collection, table] of Object.entries(TABLES)) {
    const { rows } = await client.query(`select count(*)::int as n from ${table}`);
    const enBase = rows[0].n;
    const attendu = attendus[collection] ?? 0;
    // Deux écarts de nature très différente, à ne pas confondre :
    //  - MOINS de lignes qu'attendu : le clonage a perdu des documents. Grave.
    //  - PLUS de lignes qu'attendu : la table n'était pas vide avant. Sans
    //    gravité en soi, mais il faut le dire — sur une vraie migration, la
    //    base de destination doit être vide (voir --vider).
    let note = '';
    if (enBase < attendu) { manquants += attendu - enBase; note = `  ⚠ ${attendu - enBase} PERDU(S)`; }
    else if (enBase > attendu) { surnumeraires += enBase - attendu; note = `  (+${enBase - attendu} déjà présent(s))`; }
    console.log(
      `  ${enBase < attendu ? '✗' : enBase > attendu ? '~' : '✓'} ${collection.padEnd(20)}` +
      ` lus ${String(attendu).padStart(6)}   en base ${String(enBase).padStart(6)}${note}`
    );
  }
  console.log('  ' + '-'.repeat(60));
  // Comparaison avec ce que l'application avait compté AU MOMENT de
  // l'export : c'est ce qui vérifie la chaîne entière et non la seule
  // dernière étape.
  if (entete && entete.collections) {
    console.log('');
    // On compte les DOCUMENTS manquants, pas les collections en écart :
    // annoncer « 1 perdu » quand il en manque trente serait pire que de
    // ne rien annoncer.
    let perdusEnChemin = 0;
    for (const [collection, compte] of Object.entries(entete.collections)) {
      if (!TABLES[collection]) continue;   // compteurs, non clonés ici
      const lu = attendus[collection] ?? 0;
      if (lu !== compte) {
        perdusEnChemin += Math.abs(compte - lu);
        console.log(`  ✗ ${collection} : l'application en avait exporté ${compte}, le fichier en contient ${lu}`);
      }
    }
    console.log(perdusEnChemin
      ? `  ✗ ${perdusEnChemin} document(s) perdu(s) ENTRE l'export et ici — fichier tronqué ou incomplet.`
      : `  ✓ Conforme à l'export du ${String(entete.date).split('T')[0]} : rien n'a été perdu en chemin.`);
    manquants += perdusEnChemin;
  }

  if (manquants) console.log(`\n  ✗ ${manquants} document(s) PERDU(S) — le clonage est incomplet.`);
  else if (surnumeraires) console.log(`\n  ~ Clonage complet. ${surnumeraires} ligne(s) préexistante(s) dans la base.`);
  else console.log('\n  ✓ Clonage complet et vérifié, base exactement conforme.');
  return manquants === 0;
};

// ------------------------------------------------------------

const main = async () => {
  const args = process.argv.slice(2);
  let data;

  let entete = null;

  if (args.includes('--fictif')) {
    const { donneesFictives } = await import('./donnees-fictives.mjs');
    data = donneesFictives();
    console.log('  Source : données FICTIVES (aucun nom ni RIB réel)\n');
  } else if (args.includes('--fichier')) {
    const chemin = args[args.indexOf('--fichier') + 1];
    if (!chemin) { console.error('Usage : --fichier <Export_Complet_*.json>'); process.exit(1); }
    ({ data, entete } = lireFichierUnique(chemin));
    console.log(`  Source : ${chemin}`);
    if (entete) console.log(`  Export du ${String(entete.date).split('T')[0]}, ${entete.total} documents annoncés\n`);
    else console.log('  (aucun en-tête de contrôle dans ce fichier)\n');
  } else {
    const i = args.indexOf('--export');
    if (i === -1 || !args[i + 1]) {
      console.error('Usage : --fictif | --fichier <export.json> | --export <dossier>   [--vider]');
      process.exit(1);
    }
    data = lireExport(args[i + 1]);
    console.log(`  Source : export ${args[i + 1]}\n`);
  }

  const client = new pg.Client({ connectionString: PG_URL });
  await client.connect();

  const attendus = {};
  try {
    // Un seul bloc transactionnel : si une collection échoue, rien n'est
    // écrit du tout. Pas de base à moitié clonée.
    await client.query('begin');

    // --vider : repartir d'une base vide, ce qu'exige une vraie migration.
    // Dans la même transaction que le clonage : si celui-ci échoue, les
    // données d'avant sont toujours là.
    if (args.includes('--vider')) {
      const tables = Object.values(TABLES).join(', ');
      await client.query(`truncate ${tables}`);
      console.log(`  (tables vidées avant clonage)\n`);
    }
    for (const collection of Object.keys(TABLES)) {
      const documents = data[collection] || [];
      attendus[collection] = await ecrire(client, collection, documents);
      console.log(`  → ${collection.padEnd(20)} ${String(documents.length).padStart(6)} documents`);
    }
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    console.error('\n  ✗ ÉCHEC — rien n\'a été écrit :', e.message);
    await client.end();
    process.exit(1);
  }

  const ok = await verifier(client, attendus, entete);
  await client.end();

  console.log('');
  process.exit(ok ? 0 : 1);
};

main();
