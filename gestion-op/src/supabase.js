import { createClient } from '@supabase/supabase-js';

// ==================== CONNEXION SUPABASE ====================
// Les deux valeurs viennent des variables d'environnement, jamais du code,
// exactement comme les clés Firebase aujourd'hui.
//
// La clé « anon » est publique par construction : elle n'ouvre rien par
// elle-même. Ce qui protège les données, ce sont les règles de sécurité
// (Row Level Security) côté base — l'équivalent de firestore.rules.
// Une base Supabase sans ces règles est une base ouverte : elles ne sont
// pas optionnelles.
//
// En test, aucune variable n'est définie : on fournit des valeurs factices
// pour que createClient ne jette pas, puisque aucun appel réseau n'a lieu.
const url = process.env.REACT_APP_SUPABASE_URL || 'http://localhost:54321';
const cle = process.env.REACT_APP_SUPABASE_ANON_KEY || 'cle-de-test';

export const supabase = createClient(url, cle, {
  auth: { persistSession: true, autoRefreshToken: true },
});
