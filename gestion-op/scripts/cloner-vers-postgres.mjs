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
 *    node scripts/cloner-vers-postgres.mjs --export <dossier>
 *        lit <dossier>/ops.json, budgets.json, etc. et les importe.
 *        Chaque fichier contient soit un tableau d'objets possédant un
 *        champ `id`, soit un objet dont les clés sont les identifiants.
 *
 *  Dans les deux cas, le script RECOMPTE à la fin : nombre de documents
 *  lus contre nombre de lignes présentes en base. Un clonage qui perd un
 *  document se voit immédiatement.
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

const verifier = async (client, attendus) => {
  console.log('\n  VÉRIFICATION');
  console.log('  ' + '-'.repeat(52));
  let toutBon = true;
  for (const [collection, table] of Object.entries(TABLES)) {
    const { rows } = await client.query(`select count(*)::int as n from ${table}`);
    const enBase = rows[0].n;
    const attendu = attendus[collection] ?? 0;
    const ok = enBase === attendu;
    if (!ok) toutBon = false;
    console.log(
      `  ${ok ? '✓' : '✗'} ${collection.padEnd(20)} lus ${String(attendu).padStart(6)}   en base ${String(enBase).padStart(6)}`
    );
  }
  console.log('  ' + '-'.repeat(52));
  return toutBon;
};

// ------------------------------------------------------------

const main = async () => {
  const args = process.argv.slice(2);
  let data;

  if (args.includes('--fictif')) {
    const { donneesFictives } = await import('./donnees-fictives.mjs');
    data = donneesFictives();
    console.log('  Source : données FICTIVES (aucun nom ni RIB réel)\n');
  } else {
    const i = args.indexOf('--export');
    if (i === -1 || !args[i + 1]) {
      console.error('Usage : --fictif   ou   --export <dossier>');
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

  const ok = await verifier(client, attendus);
  await client.end();

  console.log(ok ? '\n  ✓ Clonage complet et vérifié.\n' : '\n  ✗ Écart détecté.\n');
  process.exit(ok ? 0 : 1);
};

main();
