/**
 * ============================================================
 *  ÉPREUVE DES RÈGLES DE SÉCURITÉ
 * ============================================================
 *
 *  Vérifie que supabase/securite.sql accorde EXACTEMENT les mêmes droits
 *  que firestore.rules — ni plus, ni moins.
 *
 *  Pour chaque profil (anonyme, inconnu, désactivé, consultation,
 *  opérateur, administrateur), le script tente une série d'opérations et
 *  compare ce que PostgreSQL permet à ce qui DOIT être permis.
 *
 *  Un droit accordé à tort est une fuite. Un droit refusé à tort est une
 *  panne. Les deux sont signalés.
 *
 *  Chaque tentative se fait dans une transaction annulée ensuite : la
 *  base n'est pas modifiée.
 *
 *  Usage :  node scripts/essai-securite.mjs
 * ============================================================
 */

import pg from 'pg';

const URL = process.env.PG_URL || 'postgresql://postgres@/gestionop?host=/tmp&port=54322';

const ADMIN      = '11111111-1111-4111-8111-111111111111';
const OPERATEUR  = '22222222-2222-4222-8222-222222222222';
const CONSULT    = '33333333-3333-4333-8333-333333333333';
const DESACTIVE  = '44444444-4444-4444-8444-444444444444';
const SANS_ACTIF = '55555555-5555-4555-8555-555555555555';
const INCONNU    = '99999999-9999-4999-8999-999999999999';

const PROFILS = [
  ['anonyme',          null],
  ['inconnu',          INCONNU],
  ['désactivé',        DESACTIVE],
  ['consultation',     CONSULT],
  ['opérateur',        OPERATEUR],
  ['sans champ actif', SANS_ACTIF],
  ['administrateur',   ADMIN],
];

// Chaque opération : [nom, requête]. La requête doit renvoyer des lignes
// (lecture) ou écrire (écriture) ; un refus lève une erreur ou ne touche
// aucune ligne.
const OPERATIONS = {
  'lire les OP':
    { sql: `select 1 from ops limit 1`, lecture: true },
  'créer un OP':
    { sql: `insert into ops (id, data) values ('essai-secu', '{"statut":"EN_COURS"}'::jsonb)` },
  'modifier un OP':
    { sql: `update ops set data = data || '{"objet":"touché"}'::jsonb where id = 'op-BM-000'` },
  'SUPPRIMER un OP':
    { sql: `delete from ops where id = 'op-BM-000'` },
  'lire le journal':
    { sql: `select 1 from journal limit 1`, lecture: true },
  'ajouter au journal':
    { sql: `insert into journal (id, data) values ('essai-jr', '{"action":"TEST"}'::jsonb)` },
  'modifier le journal':
    { sql: `update journal set data = data || '{"action":"FALSIFIE"}'::jsonb where id = 'jr-0000'` },
  'supprimer du journal':
    { sql: `delete from journal where id = 'jr-0000'` },
  'lire les paramètres':
    { sql: `select 1 from parametres limit 1`, lecture: true },
  'modifier les paramètres':
    { sql: `update parametres set data = data || '{"sigle":"PIRATE"}'::jsonb where id = 'projet'` },
  'lire les bénéficiaires':
    { sql: `select 1 from beneficiaires limit 1`, lecture: true },
  'modifier un bénéficiaire':
    { sql: `update beneficiaires set data = data || '{"nom":"MODIFIE"}'::jsonb where id = 'ben-001'` },
  'créer un utilisateur':
    { sql: `insert into users (id, data) values ('66666666-6666-4666-8666-666666666666', '{"role":"ADMIN"}'::jsonb)` },
  // Essentiel : sans la lecture de son propre profil, l'application ne peut
  // pas connaître le rôle de la personne connectée, et tout s'arrête. Un
  // compte désactivé doit tout de même pouvoir le lire — c'est ce qui
  // permet à l'application de lui dire pourquoi elle le refuse plutôt que
  // d'afficher une erreur incompréhensible.
  'lire son propre profil':
    { sql: `select 1 from users where id = coalesce(nullif(current_setting('essai.uid', true), ''), '-')`, lecture: true },
  'corriger son propre nom':
    { sql: `update users set data = data || '{"nom":"Nouveau Nom"}'::jsonb
              where id = coalesce(nullif(current_setting('essai.uid', true), ''), '-')` },
  "lire l'annuaire complet":
    { sql: `select 1 from users where id <> coalesce(nullif(current_setting('essai.uid', true), ''), '-') limit 1`, lecture: true },
  'se promouvoir ADMIN':
    { sql: `update users set data = data || '{"role":"ADMIN"}'::jsonb
              where id = coalesce(nullif(current_setting('essai.uid', true), ''), '-')` },
};

// Ce que firestore.rules autorise. true = doit passer, false = doit être
// refusé. La suppression d'un OP est refusée à TOUT LE MONDE, y compris à
// l'administrateur : l'application passe l'OP au statut SUPPRIME, et
// interdire delete empêche de contourner la corbeille et le journal.
const ATTENDU = {
  //                          anon  inconnu désact. consult opér.  sansActif admin
  'lire les OP':              [false, false, false, true,  true,  true,  true ],
  'créer un OP':              [false, false, false, false, true,  true,  true ],
  'modifier un OP':           [false, false, false, false, true,  true,  true ],
  'SUPPRIMER un OP':          [false, false, false, false, false, false, false],
  'lire le journal':          [false, false, false, false, false, false, true ],
  'ajouter au journal':       [false, false, false, false, true,  true,  true ],
  'modifier le journal':      [false, false, false, false, false, false, false],
  'supprimer du journal':     [false, false, false, false, false, false, false],
  'lire les paramètres':      [false, false, false, true,  true,  true,  true ],
  'modifier les paramètres':  [false, false, false, false, false, false, true ],
  'lire les bénéficiaires':   [false, false, false, true,  true,  true,  true ],
  'modifier un bénéficiaire': [false, false, false, false, true,  true,  true ],
  'créer un utilisateur':     [false, false, false, false, false, false, true ],
  // Chacun lit son propre profil, même désactivé : c'est la règle fondée
  // sur auth.uid() et non sur est_connecte().
  'lire son propre profil':   [false, false, true,  true,  true,  true,  true ],
  // Chacun corrige son profil (nom, etc.) — mais pas son rôle ni son
  // statut, ce que vérifie la ligne « se promouvoir ADMIN ».
  'corriger son propre nom':  [false, false, true,  true,  true,  true,  true ],
  "lire l'annuaire complet":  [false, false, false, false, false, false, true ],
  'se promouvoir ADMIN':      [false, false, false, false, false, false, true ],
};

const essayer = async (client, uid, op) => {
  await client.query('begin');
  try {
    await client.query(`set local role authenticated`);
    // Deux manières de désigner l'utilisateur, posées toutes les deux :
    //   - essai.uid        pour l'imitation locale d'auth.uid() ;
    //   - request.jwt.claims  pour la VRAIE fonction auth.uid() de
    //     Supabase, qui y lit le champ « sub » du jeton de session.
    // Le script fonctionne ainsi contre un PostgreSQL ordinaire comme
    // contre un vrai Supabase — y compris une base qui vient d'être
    // déplacée d'un serveur à un autre.
    await client.query(`select set_config('essai.uid', $1, true)`, [uid || '']);
    await client.query(
      `select set_config('request.jwt.claims', $1, true)`,
      [uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : '']
    );
    const r = await client.query(op.sql);
    // Une lecture autorisée mais sans ligne visible compte comme refusée :
    // c'est exactement ce que fait RLS, qui masque les lignes plutôt que
    // de lever une erreur.
    const passe = op.lecture ? r.rowCount > 0 : r.rowCount > 0;
    return passe;
  } catch (e) {
    return false;
  } finally {
    await client.query('rollback');
  }
};

const client = new pg.Client({ connectionString: URL });
await client.connect();

console.log('');
console.log('  ' + 'OPÉRATION'.padEnd(26) + PROFILS.map(([n]) => n.slice(0, 7).padStart(8)).join(''));
console.log('  ' + '-'.repeat(26 + 8 * PROFILS.length));

let fuites = 0, pannes = 0;
for (const [nom, op] of Object.entries(OPERATIONS)) {
  const cases = [];
  for (let i = 0; i < PROFILS.length; i++) {
    const obtenu = await essayer(client, PROFILS[i][1], op);
    const attendu = ATTENDU[nom][i];
    if (obtenu === attendu) cases.push((obtenu ? 'oui' : 'non').padStart(8));
    else if (obtenu && !attendu) { fuites++; cases.push('FUITE!'.padStart(8)); }
    else { pannes++; cases.push('PANNE!'.padStart(8)); }
  }
  console.log('  ' + nom.padEnd(26) + cases.join(''));
}

await client.end();

console.log('  ' + '-'.repeat(26 + 8 * PROFILS.length));
console.log('');
console.log(`  Droits accordés à tort (fuites)  : ${fuites}`);
console.log(`  Droits refusés à tort (pannes)   : ${pannes}`);
console.log('');
console.log(fuites === 0 && pannes === 0
  ? '  ✓ LES DROITS CORRESPONDENT EXACTEMENT À firestore.rules'
  : '  ✗ ÉCART AVEC firestore.rules');
process.exit(fuites === 0 && pannes === 0 ? 0 : 1);
