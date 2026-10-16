/**
 * ============================================================
 *  ÉPREUVE DE CONCURRENCE — le mécanisme des transactions
 * ============================================================
 *
 *  Vérifie que vingt paiements enregistrés EN MÊME TEMPS sur le même OP
 *  sont tous conservés, sans qu'aucun n'écrase l'autre.
 *
 *  Le script reproduit exactement ce que fait runTransaction de
 *  src/db.js : lire le document et son empreinte, calculer en
 *  JavaScript, puis écrire seulement si l'empreinte n'a pas bougé —
 *  et rejouer le calcul sinon. C'est le mécanisme de Firestore.
 *
 *  Il parle à PostgreSQL directement (pg) et non via Supabase, pour
 *  éprouver le mécanisme lui-même sans dépendre d'une instance en
 *  ligne.
 *
 *  Usage :  node scripts/essai-concurrence.mjs
 *  (base d'essai locale remplie par cloner-vers-postgres.mjs --fictif)
 * ============================================================
 */
import pg from 'pg';
const URL = 'postgresql://postgres@/gestionop?host=/tmp&port=54322';
const OP = 'op-BM-020';

const unPaiement = async (n) => {
  const client = new pg.Client({ connectionString: URL });
  await client.connect();
  try {
    for (let essai = 1; essai <= 8; essai++) {
      // --- lecture (tx.get) ---
      const { rows } = await client.query(
        'select data, empreinte from ops where id = $1', [OP]);
      const avant = rows[0].data;
      const empreinte = rows[0].empreinte;

      // --- CALCUL EN JAVASCRIPT : la logique métier, inchangée ---
      const paiements = [...(avant.paiements || []), { montant: 1000, reference: `REG-${n}` }];
      const total = paiements.reduce((s, p) => s + (p.montant || 0), 0);
      const reste = Math.round((avant.montant || 0) - total);
      const statut = reste === 0 ? 'PAYE' : 'PAYE_PARTIEL';

      // --- écriture conditionnelle ---
      const { rows: r } = await client.query(
        'select ecrire_lot_si_inchange($1::jsonb, $2::jsonb) as ok',
        [JSON.stringify([{ table: 'ops', id: OP, empreinte }]),
         JSON.stringify([{ table: 'ops', id: OP, genre: 'update',
                           data: { paiements, totalPaye: total, statut } }])]);
      if (r[0].ok) return { n, essais: essai };

      // Même attente progressive que runTransaction dans src/db.js.
      const base = 15 * Math.pow(2, essai - 1);
      await new Promise((ok) => setTimeout(ok, base + Math.random() * base));
    }
    return { n, essais: 'ÉCHEC' };
  } finally { await client.end(); }
};

const client = new pg.Client({ connectionString: URL });
await client.connect();
await client.query(`update ops set data = data || '{"paiements":[],"totalPaye":0}'::jsonb where id = $1`, [OP]);
const { rows: init } = await client.query(`select data->>'montant' as m from ops where id=$1`, [OP]);
console.log(`  OP ${OP}, montant ${init[0].m} FCFA, aucun paiement au départ.\n`);

const resultats = await Promise.all(Array.from({ length: 20 }, (_, i) => unPaiement(i + 1)));

const { rows: fin } = await client.query(
  `select jsonb_array_length(data->'paiements') as nb, data->>'totalPaye' as total, data->>'statut' as statut
     from ops where id = $1`, [OP]);
await client.end();

const rejouees = resultats.filter(r => r.essais > 1).length;
console.log(`  Paiements enregistrés   : ${fin[0].nb} / 20`);
console.log(`  Total calculé           : ${fin[0].total}`);
console.log(`  Statut                  : ${fin[0].statut}`);
console.log(`  Transactions rejouées   : ${rejouees} sur 20  (conflits détectés et repris)`);
console.log(`  Échecs                  : ${resultats.filter(r => r.essais === 'ÉCHEC').length}`);
// Deux verdicts distincts, à ne pas confondre :
//  - un paiement ÉCRASÉ serait une perte de données silencieuse : grave ;
//  - une transaction ABANDONNÉE est refusée avec une erreur explicite,
//    donc sans perte — l'utilisateur est averti et recommence.
const abandons = resultats.filter(r => r.essais === 'ÉCHEC').length;
const ecrases = 20 - abandons - Number(fin[0].nb);
console.log('');
console.log(`  Paiements écrasés (perte silencieuse) : ${ecrases}`);
console.log(`  Transactions abandonnées (erreur)     : ${abandons}`);
console.log(`\n  ${ecrases === 0 && abandons === 0
    ? '✓ LES 20 PAIEMENTS SONT ENREGISTRÉS, AUCUNE PERTE'
    : ecrases === 0
      ? '~ aucune perte, mais ' + abandons + ' transaction(s) abandonnée(s)'
      : '✗ PERTE DE DONNÉES'}`);
