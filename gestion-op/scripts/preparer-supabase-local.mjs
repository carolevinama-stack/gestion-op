/**
 * ============================================================
 *  PRÉPARATION D'UN SUPABASE LOCAL POUR L'ESSAI BOUT EN BOUT
 * ============================================================
 *
 *  Crée de VRAIS comptes d'authentification (avec les identifiants
 *  attendus par les données fictives), puis charge les données.
 *
 *  À lancer après `supabase start` et après avoir appliqué schema.sql,
 *  fonctions.sql et securite.sql.
 *
 *  Les clés ci-dessous sont celles du Supabase LOCAL de développement :
 *  elles sont publiées dans la documentation de Supabase et identiques
 *  pour tout le monde. Ce ne sont pas des secrets.
 *
 *  Usage :  node scripts/preparer-supabase-local.mjs
 * ============================================================
 */

import pg from 'pg';
import { donneesFictives } from './donnees-fictives.mjs';

const API = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE = process.env.SUPABASE_SERVICE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const PG = process.env.PG_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const MOT_DE_PASSE = 'motdepasse-essai-123';

const creerCompte = async ({ id, email }) => {
  const r = await fetch(`${API}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id, email, password: MOT_DE_PASSE, email_confirm: true,
    }),
  });
  const corps = await r.json();
  if (!r.ok && !/already|exists|registered/i.test(JSON.stringify(corps))) {
    throw new Error(`${email} : ${JSON.stringify(corps)}`);
  }
  return r.ok ? 'créé' : 'déjà là';
};

const main = async () => {
  const data = donneesFictives();

  console.log('\n  COMPTES D\'AUTHENTIFICATION');
  for (const u of data.users) {
    const etat = await creerCompte(u);
    console.log(`    ${etat.padEnd(9)} ${u.email.padEnd(24)} ${u.role || '(sans rôle)'}`);
  }

  console.log('\n  DONNÉES');
  const client = new pg.Client({ connectionString: PG });
  await client.connect();
  const TABLES = {
    parametres: 'parametres', sources: 'sources', exercices: 'exercices',
    lignesBudgetaires: 'lignes_budgetaires', beneficiaires: 'beneficiaires',
    budgets: 'budgets', ops: 'ops', bordereaux: 'bordereaux',
    journal: 'journal', users: 'users',
  };
  await client.query('begin');
  await client.query(`truncate ${Object.values(TABLES).join(', ')}`);
  for (const [collection, table] of Object.entries(TABLES)) {
    for (const doc of data[collection] || []) {
      const { id, ...champs } = doc;
      await client.query(
        `insert into ${table} (id, data) values ($1, $2)`,
        [String(id), JSON.stringify(champs)]
      );
    }
    console.log(`    ${String((data[collection] || []).length).padStart(5)}  ${collection}`);
  }
  await client.query('commit');
  await client.end();

  console.log(`\n  ✓ Prêt. Mot de passe des comptes d'essai : ${MOT_DE_PASSE}\n`);
};

main().catch((e) => { console.error('\n  ✗', e.message, '\n'); process.exit(1); });
